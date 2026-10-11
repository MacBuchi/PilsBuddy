#!/usr/bin/env python3
"""Session status for coding agents (SessionStart hook in .claude/settings.json, issue #65).

Prints one short block so a session does not have to rediscover where things stand:
branch vs. origin/main and uncommitted files, open PRs, open `release-failed` issues (fix those first),
a pending promotion (newest pre-release newer than the latest release) and the first open roadmap item.

Never fails and never blocks: every network step is capped at 5 s, a missing `gh` or network just drops
that line. Read-only – it fetches nothing into the working tree (`git fetch` only updates origin/main).

    python3 tool/session_status.py
    python3 tool/session_status.py --self-test
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMEOUT = 5
REPO = "MacBuchi/PilsBuddy"


def run(*cmd: str) -> str | None:
    try:
        out = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=TIMEOUT)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


def gh_json(path: str):
    """GitHub REST via `gh api` (works in cloud sessions too, which have no GraphQL)."""
    out = run("gh", "api", f"repos/{REPO}/{path}")
    try:
        return json.loads(out) if out else None
    except json.JSONDecodeError:
        return None


def first_open_item(roadmap: str) -> str | None:
    """`- [ ] E8 **Bierquiz im Spielraum** (#45) auf E4: …` → `E8 Bierquiz im Spielraum (#45)`."""
    for line in roadmap.splitlines():
        m = re.match(r"\s*- \[ \] (.+)", line)
        if m:
            text = m.group(1).replace("**", "")
            return re.split(r"[:–]", text, maxsplit=1)[0].strip()[:90]
    return None


def pending_promotion(releases: list) -> str | None:
    """Newest pre-release created after the newest full release → its tag."""
    pre = [r for r in releases if r.get("prerelease")]
    full = [r for r in releases if not r.get("prerelease")]
    if not pre:
        return None
    newest = max(pre, key=lambda r: r["created_at"])
    if full and max(r["created_at"] for r in full) >= newest["created_at"]:
        return None
    return newest["tag_name"]


def lines() -> list[str]:
    out = []
    branch = run("git", "rev-parse", "--abbrev-ref", "HEAD") or "?"
    run("git", "fetch", "-q", "origin", "main")
    counts = run("git", "rev-list", "--left-right", "--count", "origin/main...HEAD")
    dirty = run("git", "status", "--porcelain")
    pos = ""
    if counts:
        behind, ahead = counts.split()
        pos = f" – {ahead} ahead, {behind} behind origin/main"
    out.append(f"Branch {branch}{pos}" + (f", {len(dirty.splitlines())} uncommitted file(s)" if dirty else ""))

    prs = gh_json("pulls?state=open&per_page=10")
    if prs is not None:
        out.append("Open PRs: " + (", ".join(f"#{p['number']} {p['title'][:50]}" for p in prs) or "none"))
    failed = gh_json("issues?state=open&labels=release-failed&per_page=10")
    if failed:
        out.append("release-failed (fix first!): " + ", ".join(f"#{i['number']} {i['title'][:60]}" for i in failed))
    rel = gh_json("releases?per_page=10")
    tag = pending_promotion(rel) if rel else None
    if tag:
        out.append(f"Pending promotion: {tag} (maintainer approves – never yourself)")

    roadmap = ROOT / "docs" / "ROADMAP.md"
    item = first_open_item(roadmap.read_text(encoding="utf-8")) if roadmap.exists() else None
    out.append(f"Next roadmap item: {item}" if item else "Roadmap: nothing open")
    return out


def self_test() -> None:
    assert first_open_item("- [x] A1 done\n- [ ] E8 **Bierquiz im Spielraum** (#45) auf E4: Gastgeber …") == "E8 Bierquiz im Spielraum (#45) auf E4"
    assert first_open_item("- [x] all done") is None
    rel = [
        {"tag_name": "v1", "prerelease": False, "created_at": "2026-10-11T10:00:00Z"},
        {"tag_name": "v2", "prerelease": True, "created_at": "2026-10-11T12:00:00Z"},
    ]
    assert pending_promotion(rel) == "v2"
    assert pending_promotion(rel[:1]) is None
    assert pending_promotion([{**rel[0], "created_at": "2026-10-12T00:00:00Z"}, rel[1]]) is None
    assert run("definitely-not-a-command") is None
    print("session_status self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
        sys.exit(0)
    try:
        print("── PilsBuddy session status ──")
        print("\n".join(lines()))
    except Exception as e:  # never break a session start
        print(f"(session status unavailable: {e})")
