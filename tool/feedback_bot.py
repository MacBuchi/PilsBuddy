#!/usr/bin/env python3
"""Feedback bot for PilsBuddy (pattern: TrailBuddy/PilzBuddy tool/feedback_bot.py).

Reads unprocessed rows of the Supabase table `feedback` (in-app „Wünsch dir was!“), creates one public
GitHub issue per row (label `enhancement` or `bug`) and stamps the row right away with processed_at and
the issue number – a run that dies halfway must not create duplicates. Rows processed more than 30 days
ago are deleted, as the privacy text promises.

The feedback is anonymous: the issue carries the quoted text, app build, platform and date – nothing
about the person. @-mentions are defused, a public issue must not ping anyone.

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


def supabase_url() -> str:
    with open(CONFIG, encoding="utf-8") as f:
        m = re.search(r"VITE_SUPABASE_URL \?\? '([^']+)'", f.read())
    if not m or not m.group(1).startswith("https://"):
        raise SystemExit(f"No live https URL in {CONFIG}")
    return m.group(1)


def api(method: str, path: str, body=None):
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    # Cloudflare in front of Supabase blocks the default Python-urllib agent.
    headers = {"apikey": key, "Content-Type": "application/json", "User-Agent": USER_AGENT, "Prefer": "return=minimal"}
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
    prefix = "Bug report: " if row["type"] == "bug" else "Feature request: "
    text = " ".join(defuse(row["message"]).split())
    return prefix + text[:TITLE_CHARS] + ("…" if len(text) > TITLE_CHARS else "")


def issue_body(row: dict) -> str:
    """Mirrors .github/ISSUE_TEMPLATE: Description, App version, Platform."""
    quoted = "\n".join("> " + line if line.strip() else ">" for line in defuse(row["message"].strip()).splitlines())
    return (
        f"### Description\n\n{quoted}\n\n"
        f"### App version\n\n{row.get('app_version') or 'unbekannt'}\n\n"
        f"### Platform\n\n{row.get('platform') or 'unbekannt'}\n\n"
        f"_Eingereicht in der App am {row['created_at'][:10]}, automatisch erstellt vom Feedback-Bot._"
    )


def issue_label(row: dict) -> str:
    return "bug" if row["type"] == "bug" else "enhancement"


def existing_issue(title: str) -> int | None:
    out = run("gh", "issue", "list", "--state", "all", "--limit", "100", "--search", title, "--json", "title,number")
    return next((item["number"] for item in json.loads(out or "[]") if item["title"] == title), None)


def process() -> None:
    rows = api("GET", "/rest/v1/feedback?processed_at=is.null&order=created_at.asc&limit=50&select=id,type,message,app_version,platform,created_at") or []
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
    assert supabase_url() == "https://rwqpljpnotnyovvuxjgl.supabase.co"
    print("self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        process()
