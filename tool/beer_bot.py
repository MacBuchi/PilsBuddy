#!/usr/bin/env python3
"""Beer report bot for PilsBuddy (R6, „Bier fehlt? Eintragen“).

  python3 tool/beer_bot.py              rows of `beer_submissions` → one GitHub issue each (label `bier-meldung`),
                                        stamps each row right away, deletes rows processed > 30 days ago
  python3 tool/beer_bot.py approve N    issue N got the label `freigegeben` → put its beer into the catalogue
  python3 tool/beer_bot.py --self-test  no network

The ISSUE is what gets approved, not the database row: the maintainer can correct name, style, ABV or place
right in the issue before setting the label. An approved beer becomes `regional_beers` row `r-app<N>` (source 5,
`source_ref` = the link); an unknown brewery becomes `breweries` row `app-<N>`, placed at the centre of its
postcode/town from `places`. Taste is never stored – the app derives it from the style („Stil-Schätzung“).
Something unclear → a comment on the issue, the label comes off, nothing is written.

Environment: SUPABASE_SERVICE_ROLE_KEY, GH_TOKEN (the workflow provides both).
"""
import json
import re
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone

from feedback_bot import RETENTION_DAYS, api, defuse, existing_issue, run

STYLE_FILE = "src/domain/styleProfile.ts"
LABEL = "bier-meldung"
APPROVED = "freigegeben"
NONE = "_keine Angabe_"
SECTIONS = [  # heading → field; order is the issue's order
    ("Brauerei", "brewery_name"),
    ("Brauerei-ID", "brewery_id"),
    ("PLZ oder Ort", "brewery_place"),
    ("Bier", "beer_name"),
    ("Stil", "style"),
    ("Alkohol (% vol)", "abv"),
    ("Link", "link"),
    ("Notiz", "note"),
]
SELECT = "id,brewery_id,brewery_name,brewery_place,link,beer_name,style,abv,note,app_version,platform,created_at"


def styles() -> list[str]:
    """The canonical styles of the app (keys of STYLE_PROFILES), so the bot never accepts one the app doesn't know."""
    with open(STYLE_FILE, encoding="utf-8") as f:
        block = f.read().split("STYLE_PROFILES", 1)[1].split("\n}\n", 1)[0]
    return [a or b for a, b in re.findall(r"^  (?:'([^']+)'|([^\s:']+)): \{", block, re.M)]


def one_line(v) -> str:
    return " ".join(defuse(str(v)).split()) if v not in (None, "") else ""


def catalogue_link(brewery_id: str) -> str | None:
    m = re.fullmatch(r"osm-([nwr])(\d+)", brewery_id or "")
    if m:
        return f"https://www.openstreetmap.org/{ {'n': 'node', 'w': 'way', 'r': 'relation'}[m[1]] }/{m[2]}"
    m = re.fullmatch(r"wd-q(\d+)", brewery_id or "")
    return f"https://www.wikidata.org/wiki/Q{m[1]}" if m else None


def issue_title(row: dict) -> str:
    what = one_line(row.get("beer_name")) or urllib.parse.urlsplit(row.get("link") or "").hostname or "?"
    return f"Bier-Meldung: {what[:60]} – {one_line(row['brewery_name'])[:50]}"


def issue_body(row: dict) -> str:
    known = row.get("brewery_id")
    where = f"[{known}]({catalogue_link(known)})" if known and catalogue_link(known) else (known or "neu")
    head = (
        f"Gemeldet in der App am {row['created_at'][:10]} · App-Version {row.get('app_version') or 'unbekannt'} · "
        f"{row.get('platform') or 'unbekannt'} · Brauerei im Katalog: {where}\n\n"
        f"**Prüfen:** Gibt es das Bier, passt die Brauerei? Bei Bedarf die Abschnitte unten direkt im Issue korrigieren "
        f"(Bier und Brauerei müssen gesetzt sein, Stil nur aus der Liste der App, sonst `{NONE}`), dann das Label "
        f"`{APPROVED}` setzen. Der Workflow trägt das Bier ein und schließt das Issue. Notiz und Link werden nicht als "
        f"Text übernommen, der Link nur als Quelle.\n"
    )
    parts = [head]
    for heading, field in SECTIONS:
        value = row.get(field)
        if field == "note" and value:
            text = "\n".join("> " + line for line in defuse(str(value)).splitlines())
        elif field == "abv" and value is not None:
            text = str(value)
        else:
            text = one_line(value) or NONE
        parts.append(f"### {heading}\n\n{text}\n")
    parts.append(f"_Automatisch erstellt vom Bier-Bot. Stile der App: {', '.join(styles())}_")
    return "\n".join(parts)


def parse_body(body: str) -> dict:
    """Sections of a (possibly edited) issue body → fields; `_keine Angabe_` and empty → None."""
    fields = {}
    names = dict(SECTIONS)
    chunks = re.split(r"^### (.+?)\s*$", body.replace("\r\n", "\n"), flags=re.M)
    for heading, text in zip(chunks[1::2], chunks[2::2]):
        field = names.get(heading.strip())
        if not field:
            continue
        text = text.split("\n_Automatisch erstellt", 1)[0].strip()
        if field == "note":
            text = "\n".join(line.removeprefix(">").strip() for line in text.splitlines()).strip()
        fields[field] = None if text in ("", NONE) else text
    return fields


def check(fields: dict, known_styles: list[str]) -> tuple[dict | None, str | None]:
    """Fields → clean values for the catalogue, or the problem to tell the maintainer."""
    name = (fields.get("beer_name") or "").strip()
    brewery = (fields.get("brewery_name") or "").strip()
    if not 1 <= len(name) <= 200:
        return None, "Der Name des Biers fehlt (Abschnitt „Bier“)."
    if not 2 <= len(brewery) <= 200:
        return None, "Der Name der Brauerei fehlt (Abschnitt „Brauerei“)."
    style = fields.get("style")
    if style and style not in known_styles:
        return None, f"Stil „{style}“ kennt die App nicht. Erlaubt: {', '.join(known_styles)} – oder `{NONE}`."
    abv = None
    if fields.get("abv"):
        try:
            abv = round(float(fields["abv"].replace(",", ".").replace("%", "").strip()), 1)
        except ValueError:
            abv = -1
        if not 0 <= abv <= 20:
            return None, f"Alkohol „{fields['abv']}“ ist keine Zahl zwischen 0 und 20."
    brewery_id = fields.get("brewery_id")
    if brewery_id and brewery_id != "neu" and not re.fullmatch(r"(osm-[nwr]|wd-q|app-)\d{1,20}", brewery_id):
        return None, f"Brauerei-ID „{brewery_id}“ sieht falsch aus (`osm-n123`, `wd-q123`, `app-12` oder `{NONE}`)."
    link = fields.get("link")
    if link and not re.fullmatch(r"https?://\S{4,295}", link):
        link = None  # only a source hint – a bad one is dropped, not fatal
    return {
        "beer_name": name, "brewery_name": brewery, "style": style, "abv": abv,
        "brewery_id": brewery_id if brewery_id not in (None, "neu") else None,
        "brewery_place": (fields.get("brewery_place") or "").strip() or None, "link": link,
    }, None


def split_place(place: str) -> tuple[str | None, str | None]:
    """„74906 Bad Rappenau“ → ('74906', 'Bad Rappenau'); „Bad Rappenau“ → (None, 'Bad Rappenau')."""
    m = re.fullmatch(r"(?:(?:D|A|CH)-)?(\d{4,5})(?:\s+(.+))?", place.strip(), re.I)
    return (m[1], (m[2] or "").strip() or None) if m else (None, place.strip())


def find_place(place: str) -> tuple[dict | None, str | None]:
    postcode, name = split_place(place)
    query = "select=country,postcode,name,lat,lon&limit=50"
    if postcode:
        query += f"&postcode=eq.{postcode}"
    if name:
        query += "&name=ilike." + urllib.parse.quote(re.sub(r"[%*_\\]", "", name))
    rows = api("GET", f"/rest/v1/places?{query}", prefer="count=none") or []
    if not rows:
        return None, f"„{place}“ steht nicht in der PLZ-Liste. Bitte unter „PLZ oder Ort“ eine PLZ eintragen."
    if len({r["country"] for r in rows}) > 1:
        return None, f"„{place}“ gibt es in mehreren Ländern. Bitte PLZ und Ort angeben, z. B. „74906 Bad Rappenau“."
    return rows[0], None


def fail(number: int, problem: str) -> None:
    run("gh", "issue", "comment", str(number), "--body", f"⚠️ Nicht eingetragen: {problem}\n\nBitte im Issue korrigieren und das Label `{APPROVED}` neu setzen.")
    run("gh", "issue", "edit", str(number), "--remove-label", APPROVED)
    print(f"#{number}: {problem}")


def approve(number: int) -> None:
    issue = json.loads(run("gh", "issue", "view", str(number), "--json", "body,labels,state"))
    labels = {label["name"] for label in issue["labels"]}
    if LABEL not in labels or issue["state"] != "OPEN":
        raise SystemExit(f"#{number} is not an open {LABEL} issue")
    values, problem = check(parse_body(issue["body"]), styles())
    if problem:
        return fail(number, problem)

    brewery_id = values["brewery_id"]
    if brewery_id:
        found = api("GET", f"/rest/v1/breweries?id=eq.{brewery_id}&select=id,name", prefer="count=none")
        if not found:
            return fail(number, f"Brauerei-ID `{brewery_id}` gibt es nicht. Leer lassen (`{NONE}`) und „PLZ oder Ort“ angeben.")
        brewery_name = found[0]["name"]
    else:
        if not values["brewery_place"]:
            return fail(number, "Neue Brauerei ohne Ort. Bitte unter „PLZ oder Ort“ eintragen.")
        place, problem = find_place(values["brewery_place"])
        if problem:
            return fail(number, problem)
        brewery_id, brewery_name = f"app-{number}", values["brewery_name"]
        api("POST", "/rest/v1/breweries?on_conflict=id", {
            "id": brewery_id, "name": brewery_name, "lat": place["lat"], "lon": place["lon"], "city": place["name"],
            "postcode": place["postcode"], "country": place["country"], "sources": ["app"], "published": True,
        }, prefer="resolution=merge-duplicates,return=minimal")

    beer_id = f"r-app{number}"
    others = api("GET", f"/rest/v1/regional_beers?brewery_id=eq.{brewery_id}&id=neq.{beer_id}&published=is.true&select=id", prefer="count=none") or []
    api("POST", "/rest/v1/regional_beers?on_conflict=id", {
        "id": beer_id, "brewery_id": brewery_id, "name": values["beer_name"], "style": values["style"], "abv": values["abv"],
        "pack": None, "rank": min(len(others), 99), "source": 5, "source_ref": values["link"], "published": True,
    }, prefer="resolution=merge-duplicates,return=minimal")

    run("gh", "issue", "comment", str(number), "--body",
        f"✅ Eingetragen: **{defuse(values['beer_name'])}** (`{beer_id}`) bei **{defuse(brewery_name)}** (`{brewery_id}`), "
        f"Stil {values['style'] or 'unbekannt'}. Sichtbar für jede neue Abfrage im Finder; Geräte mit gecachter Umgebung "
        f"sehen es spätestens nach 30 Tagen.")
    run("gh", "issue", "close", str(number), "--reason", "completed")
    print(f"#{number} → {beer_id} @ {brewery_id}")


def process() -> None:
    rows = api("GET", f"/rest/v1/beer_submissions?processed_at=is.null&order=created_at.asc&limit=50&select={SELECT}", prefer="count=none") or []
    for row in rows:
        title = issue_title(row)
        number = existing_issue(title)
        if number is None:
            url = run("gh", "issue", "create", "--title", title, "--body", issue_body(row), "--label", LABEL)
            number = int(url.rstrip("/").rsplit("/", 1)[-1])
            print(f"#{number} {title}")
        else:
            print(f"#{number} already there: {title}")
        # stamp each row right away – a crash later must not file it twice
        now = datetime.now(timezone.utc).isoformat()
        api("PATCH", f"/rest/v1/beer_submissions?id=eq.{row['id']}", {"processed_at": now, "issue_number": number})
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    api("DELETE", f"/rest/v1/beer_submissions?processed_at=lt.{cutoff.replace('+', '%2B')}")
    print(f"{len(rows)} new, processed rows older than {RETENTION_DAYS} days deleted")


def self_test() -> None:
    known = styles()
    assert len(known) >= 25 and "Pils" in known and "Dunkles Weißbier" in known and "Pale Ale" in known, known
    row = {"brewery_id": "osm-n4711", "brewery_name": "Testbräu @macbuchi", "brewery_place": None, "link": "https://testbraeu.example/pils",
           "beer_name": "Kellerpils", "style": "Kellerbier", "abv": 5.2, "note": "nur vom Fass\nim Sommer", "app_version": "a74e951",
           "platform": "iOS · App", "created_at": "2026-10-02T10:00:00+00:00"}
    assert issue_title(row) == "Bier-Meldung: Kellerpils – Testbräu @​macbuchi", issue_title(row)
    body = issue_body(row)
    assert "[osm-n4711](https://www.openstreetmap.org/node/4711)" in body, body
    fields = parse_body(body)
    assert fields == {"brewery_name": "Testbräu @​macbuchi", "brewery_id": "osm-n4711", "brewery_place": None, "beer_name": "Kellerpils",
                      "style": "Kellerbier", "abv": "5.2", "link": "https://testbraeu.example/pils", "note": "nur vom Fass\nim Sommer"}, fields
    values, problem = check(fields, known)
    assert problem is None and values["abv"] == 5.2 and values["brewery_id"] == "osm-n4711", (values, problem)
    # a link-only report must get its name in the issue before approval
    link_only = {**row, "brewery_id": None, "brewery_place": "74906 Bad Rappenau", "beer_name": None, "style": None, "abv": None, "note": None}
    assert issue_title(link_only) == "Bier-Meldung: testbraeu.example – Testbräu @​macbuchi", issue_title(link_only)
    edited = issue_body(link_only).replace(f"### Bier\n\n{NONE}", "### Bier\n\nHinterhof Hell")
    values, problem = check(parse_body(edited), known)
    assert problem is None and values["beer_name"] == "Hinterhof Hell" and values["brewery_id"] is None and values["brewery_place"] == "74906 Bad Rappenau"
    assert check(parse_body(issue_body(link_only)), known)[1].startswith("Der Name des Biers fehlt")
    assert "kennt die App nicht" in check({**fields, "style": "Fantasie"}, known)[1]
    assert "keine Zahl" in check({**fields, "abv": "stark"}, known)[1]
    assert "sieht falsch aus" in check({**fields, "brewery_id": "x; drop"}, known)[1]
    assert check({**fields, "link": "javascript:alert(1)"}, known)[0]["link"] is None
    assert split_place("74906 Bad Rappenau") == ("74906", "Bad Rappenau")
    assert split_place("A-6020") == ("6020", None) and split_place("Bad Rappenau") == (None, "Bad Rappenau")
    assert catalogue_link("wd-q123") == "https://www.wikidata.org/wiki/Q123" and catalogue_link("app-3") is None
    print("self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    elif len(sys.argv) == 3 and sys.argv[1] == "approve" and sys.argv[2].isdigit():
        approve(int(sys.argv[2]))
    else:
        process()
