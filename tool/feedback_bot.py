#!/usr/bin/env python3
"""Feedback bot for PilsBuddy (pattern: TrailBuddy/PilzBuddy tool/feedback_bot.py).

Reads unprocessed rows of the Supabase table `feedback` (in-app „Wünsch dir was!“), creates one public
GitHub issue per row (label `enhancement` or `bug`) and stamps the row right away with processed_at and
the issue number – a run that dies halfway must not create duplicates. Rows processed more than 30 days
ago are deleted, as the privacy text promises.

The feedback is anonymous: the issue carries the quoted text, app build, platform and date – nothing
about the person. @-mentions are defused, a public issue must not ping anyone.

V2 – beer reports („Problem melden“, type `beer`): the issue (label `bier-problem`) names the beer, the problem and
what the catalogue holds about it. The label `ausblenden` on such an issue (`feedback_bot.py hide N`, run by the
workflow) hides a regional beer for good: regional_beers.hidden, which the catalogue import never touches.

Environment: SUPABASE_SERVICE_ROLE_KEY, GH_TOKEN (the workflow provides both). The project URL comes
from src/sync/config.ts, the file the app reads, so it cannot drift.

Self-test without network:
    python3 tool/feedback_bot.py --self-test
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

CONFIG = "src/sync/config.ts"
RETENTION_DAYS = 30
TITLE_CHARS = 60
USER_AGENT = "pilsbuddy-feedback-bot/1.0 (+https://github.com/MacBuchi/PilsBuddy)"
BEER_LABEL = "bier-problem"
HIDE_LABEL = "ausblenden"
PROBLEMS = {  # feedback.problem → issue wording (German, like the maintainer's other issues)
    "not_a_beer": "Das ist kein Bier",
    "not_exists": "Gibt es nicht (mehr)",
    "wrong_values": "Stil oder Alkohol falsch",
    "wrong_brewery": "Falsche Brauerei oder Ort",
    "duplicate": "Doppelt",
    "other": "Etwas anderes",
}
SOURCES = {1: "Open Food Facts", 2: "Wikidata", 3: "Brauerei-Website", 4: "beer.db (openbeer)", 5: "Meldung aus der App"}
QUALITY = {0: "fraglich", 1: "gefunden", 2: "bestätigt", 3: "geprüft"}
BEER_MARKER = re.compile(r"<!-- beer-id: ([a-z0-9-]{1,60}) -->")


def supabase_url() -> str:
    if os.environ.get("SUPABASE_URL"):  # local stack for tests; the workflows never set it
        return os.environ["SUPABASE_URL"]
    with open(CONFIG, encoding="utf-8") as f:
        m = re.search(r"VITE_SUPABASE_URL \?\? '([^']+)'", f.read())
    if not m or not m.group(1).startswith("https://"):
        raise SystemExit(f"No live https URL in {CONFIG}")
    return m.group(1)


def api(method: str, path: str, body=None, prefer: str = "return=minimal"):
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    # Cloudflare in front of Supabase blocks the default Python-urllib agent.
    headers = {"apikey": key, "Content-Type": "application/json", "User-Agent": USER_AGENT, "Prefer": prefer}
    # Legacy service_role keys are JWTs and also go into Authorization; sb_secret_* keys only use apikey.
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(supabase_url() + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text = response.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path.split('?')[0]} → HTTP {e.code}: {e.read().decode(errors='replace')[:500]}") from None


def run(*cmd: str) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout.strip()


def defuse(text: str) -> str:
    """No pings from a public issue: `@name` → `@​name`."""
    return re.sub(r"@(?=[A-Za-z0-9])", "@​", text)


def issue_title(row: dict) -> str:
    if row["type"] == "beer":
        name = " ".join(defuse(row.get("beer_name") or "").split())[:TITLE_CHARS]
        return f"Bier-Problem: {name} – {PROBLEMS.get(row.get('problem'), 'Etwas anderes')}"
    prefix = "Bug report: " if row["type"] == "bug" else "Feature request: "
    text = " ".join(defuse(row["message"]).split())
    return prefix + text[:TITLE_CHARS] + ("…" if len(text) > TITLE_CHARS else "")


def catalogue_facts(beer_id: str, lookup=None) -> str:
    """What the catalogue holds about a regional beer (service key reads hidden/unpublished rows too)."""
    if not beer_id.startswith("r-"):
        return "Kuratiertes Bier – Korrektur von Hand in `src/data/beers.json` (oder der Tabelle `beers`)."
    rows = (lookup or api)("GET", f"/rest/v1/regional_beers?id=eq.{beer_id}&select=name,style,abv,source,source_ref,quality,published,"
                           "breweries(id,name,city,website)", prefer="count=none") or []
    if not rows:
        return "Nicht (mehr) im Regionalkatalog."
    r = rows[0]
    b = r.get("breweries") or {}
    lines = [
        f"- Brauerei: {defuse(b.get('name') or '?')} ({defuse(b.get('city') or '–')}, `{b.get('id')}`)",
        f"- Stil: {r.get('style') or 'unbekannt'} · Alkohol: {r.get('abv') if r.get('abv') is not None else 'unbekannt'}",
        f"- Quelle: {SOURCES.get(r.get('source'), r.get('source'))} – `{defuse(str(r.get('source_ref') or ''))}`",
        f"- Datenlage: {QUALITY.get(r.get('quality'), '?')}" + ("" if r.get("published") else " · nicht veröffentlicht"),
    ]
    if b.get("website"):
        lines.append(f"- Website: {b['website']}")
    return "\n".join(lines)


def issue_body(row: dict, lookup=None) -> str:
    """Mirrors .github/ISSUE_TEMPLATE: Description, App version, Platform."""
    quoted = "\n".join("> " + line if line.strip() else ">" for line in defuse(row["message"].strip()).splitlines())
    if row["type"] == "beer":
        hint = (f"Bestätigt? Label `{HIDE_LABEL}` blendet das Bier aus (bleibt auch nach dem nächsten Katalog-Import weg)."
                if row["beer_id"].startswith("r-") else "Bestätigt? Bitte von Hand korrigieren und das Issue schließen.")
        return (
            f"### Bier\n\n{defuse(row['beer_name'])} (`{row['beer_id']}`)\n\n"
            f"### Problem\n\n{PROBLEMS.get(row['problem'], row['problem'])}\n\n"
            f"### Description\n\n{quoted}\n\n"
            f"### Katalog\n\n{catalogue_facts(row['beer_id'], lookup)}\n\n"
            f"### App version\n\n{row.get('app_version') or 'unbekannt'}\n\n"
            f"### Platform\n\n{row.get('platform') or 'unbekannt'}\n\n"
            f"{hint}\n\n"
            f"_Gemeldet in der App am {row['created_at'][:10]}, automatisch erstellt vom Feedback-Bot._\n"
            f"<!-- beer-id: {row['beer_id']} -->"
        )
    return (
        f"### Description\n\n{quoted}\n\n"
        f"### App version\n\n{row.get('app_version') or 'unbekannt'}\n\n"
        f"### Platform\n\n{row.get('platform') or 'unbekannt'}\n\n"
        f"_Eingereicht in der App am {row['created_at'][:10]}, automatisch erstellt vom Feedback-Bot._"
    )


def issue_label(row: dict) -> str:
    return BEER_LABEL if row["type"] == "beer" else "bug" if row["type"] == "bug" else "enhancement"


def ensure_labels() -> None:
    """The two V2 labels exist before the first beer issue (`--force` only updates colour/description)."""
    run("gh", "label", "create", BEER_LABEL, "--color", "d4a017", "--force", "--description", "Problem mit einem Bier, gemeldet in der App")
    run("gh", "label", "create", HIDE_LABEL, "--color", "b60205", "--force", "--description", "Bier-Problem bestätigt: Regionalbier ausblenden")


def hide(number: int) -> None:
    """Issue N (label bier-problem) got the label `ausblenden` → hide its regional beer, comment, close."""
    issue = json.loads(run("gh", "issue", "view", str(number), "--json", "body,labels,state"))
    labels = {label["name"] for label in issue["labels"]}
    if BEER_LABEL not in labels or HIDE_LABEL not in labels or issue["state"] != "OPEN":
        print(f"#{number}: not an open {BEER_LABEL} issue with {HIDE_LABEL} – nothing to do")
        return
    m = BEER_MARKER.search(issue["body"] or "")
    if not m or not m.group(1).startswith("r-"):
        run("gh", "issue", "comment", str(number), "--body",
            "Kein Regionalbier in diesem Issue – ausblenden geht nur dort. Kuratierte Biere bitte von Hand korrigieren.")
        run("gh", "issue", "edit", str(number), "--remove-label", HIDE_LABEL)
        return
    beer_id = m.group(1)
    api("PATCH", f"/rest/v1/regional_beers?id=eq.{beer_id}", {"hidden": True})
    run("gh", "issue", "comment", str(number), "--body",
        f"🙈 `{beer_id}` ist ausgeblendet – die App findet es nicht mehr, auch nach dem nächsten Katalog-Import nicht. "
        "Geräte mit gecachter Umgebung sehen es spätestens nach 30 Tagen nicht mehr.")
    run("gh", "issue", "close", str(number), "--reason", "completed")
    print(f"#{number} → {beer_id} hidden")


def existing_issue(title: str) -> int | None:
    out = run("gh", "issue", "list", "--state", "all", "--limit", "100", "--search", title, "--json", "title,number")
    return next((item["number"] for item in json.loads(out or "[]") if item["title"] == title), None)


def process() -> None:
    rows = api("GET", "/rest/v1/feedback?processed_at=is.null&order=created_at.asc&limit=50&select=id,type,message,beer_id,beer_name,problem,app_version,platform,created_at") or []
    if any(row["type"] == "beer" for row in rows):
        ensure_labels()
    for row in rows:
        title = issue_title(row)
        number = existing_issue(title)
        if number is None:
            url = run("gh", "issue", "create", "--title", title, "--body", issue_body(row), "--label", issue_label(row))
            number = int(url.rstrip("/").rsplit("/", 1)[-1])
            print(f"#{number} {title}")
        else:
            print(f"#{number} already there: {title}")
        # stamp each row right away – a crash later must not file it twice
        now = datetime.now(timezone.utc).isoformat()
        api("PATCH", f"/rest/v1/feedback?id=eq.{row['id']}", {"processed_at": now, "issue_number": number})
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    api("DELETE", f"/rest/v1/feedback?processed_at=lt.{cutoff.replace('+', '%2B')}")
    print(f"{len(rows)} new, processed rows older than {RETENTION_DAYS} days deleted")


def self_test() -> None:
    row = {"type": "bug", "message": "Beim Swipen @macbuchi hängt es\n\nzweite Zeile " + "x" * 80,
           "app_version": "a74e951", "platform": "iOS · App", "created_at": "2026-10-02T10:00:00+00:00"}
    title = issue_title(row)
    assert title.startswith("Bug report: Beim Swipen @​macbuchi"), title
    assert title.endswith("…") and len(title) == len("Bug report: ") + TITLE_CHARS + 1, title
    body = issue_body(row)
    assert "> Beim Swipen @​macbuchi hängt es\n>\n> zweite Zeile" in body, body
    assert "### App version\n\na74e951" in body and "### Platform\n\niOS · App" in body, body
    assert issue_label(row) == "bug" and issue_label({**row, "type": "feature"}) == "enhancement"
    assert issue_title({**row, "type": "feature", "message": "Kurz"}) == "Feature request: Kurz"
    os.environ.pop("SUPABASE_URL", None)
    assert supabase_url() == "https://rwqpljpnotnyovvuxjgl.supabase.co"
    beer = {**row, "type": "beer", "message": "„T-Shirt Schwarz“: Das ist kein Bier – @shop", "beer_id": "r-wb412292101b0b4d0",
            "beer_name": "T-Shirt Schwarz", "problem": "not_a_beer"}
    assert issue_title(beer) == "Bier-Problem: T-Shirt Schwarz – Das ist kein Bier", issue_title(beer)
    assert issue_label(beer) == BEER_LABEL
    fake = lambda *_a, **_k: [{"name": "T-Shirt Schwarz", "style": "Schwarzbier", "abv": None, "source": 3, "source_ref": "/shop",
                               "quality": 1, "published": True, "breweries": {"id": "osm-n1", "name": "Schlossbräu", "city": "Kronach", "website": "https://schloss.de"}}]
    body = issue_body(beer, fake)
    assert "### Problem\n\nDas ist kein Bier" in body and "Quelle: Brauerei-Website – `/shop`" in body, body
    assert "Datenlage: gefunden" in body and "@​shop" in body and f"Label `{HIDE_LABEL}`" in body, body
    assert BEER_MARKER.search(body).group(1) == "r-wb412292101b0b4d0"
    curated = issue_body({**beer, "beer_id": "jever-pilsener", "beer_name": "Jever"}, fake)
    assert "Kuratiertes Bier" in curated and HIDE_LABEL not in curated, curated
    print("self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    elif len(sys.argv) == 3 and sys.argv[1] == "hide":
        hide(int(sys.argv[2]))
    else:
        process()
