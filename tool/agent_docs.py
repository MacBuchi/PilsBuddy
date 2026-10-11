#!/usr/bin/env python3
"""Agent docs check (CI, issue #65).

- AGENTS.md (Codex) is a symlink to CLAUDE.md, and every skill under .agents/skills/ a symlink into .claude/skills/ –
  one source, no drifting copies.
- CLAUDE.md stays under 16 KB. Knowledge that would push it past goes into a CLAUDE.md in the folder it is about
  (src/domain/, src/sync/, supabase/, …), listed under „Folder notes“ in the root file; every listed file must exist.

    python3 tool/agent_docs.py
    python3 tool/agent_docs.py --self-test
"""
import re
import sys
from pathlib import Path

LIMIT = 16 * 1024


def problems(root: Path) -> list[str]:
    out = []
    agents = root / "AGENTS.md"
    if not agents.is_symlink() or agents.resolve() != (root / "CLAUDE.md").resolve():
        out.append("AGENTS.md must be a symlink to CLAUDE.md")
    skills = root / ".agents" / "skills"
    for s in sorted(skills.iterdir()) if skills.exists() else []:
        target = root / ".claude" / "skills" / s.name
        if not s.is_symlink() or s.resolve() != target.resolve():
            out.append(f".agents/skills/{s.name} must be a symlink to .claude/skills/{s.name}")
    claude = root / "CLAUDE.md"
    text = claude.read_text(encoding="utf-8")
    if len(text.encode()) > LIMIT:
        out.append(f"CLAUDE.md is {len(text.encode())} bytes (limit {LIMIT}) – move folder knowledge into a folder CLAUDE.md")
    for ref in re.findall(r"`([\w./-]+/CLAUDE\.md)`", text):
        if not (root / ref).exists():
            out.append(f"CLAUDE.md lists {ref}, which does not exist")
    return out


def self_test() -> None:
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        (root / "CLAUDE.md").write_text("notes, see `src/domain/CLAUDE.md`")
        (root / ".claude" / "skills" / "x").mkdir(parents=True)
        (root / ".agents" / "skills").mkdir(parents=True)
        (root / "AGENTS.md").write_text("copy")
        (root / ".agents" / "skills" / "x").mkdir()
        p = problems(root)
        assert any("AGENTS.md" in m for m in p) and any(".agents/skills/x" in m for m in p) and any("src/domain" in m for m in p), p
        (root / "AGENTS.md").unlink()
        (root / "AGENTS.md").symlink_to("CLAUDE.md")
        (root / ".agents" / "skills" / "x").rmdir()
        (root / ".agents" / "skills" / "x").symlink_to("../../.claude/skills/x")
        (root / "src" / "domain").mkdir(parents=True)
        (root / "src" / "domain" / "CLAUDE.md").write_text("")
        assert problems(root) == [], problems(root)
        (root / "CLAUDE.md").write_text("x" * (LIMIT + 1))
        assert any("limit" in m for m in problems(root))
    print("agent_docs self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
        sys.exit(0)
    found = problems(Path(__file__).resolve().parent.parent)
    for m in found:
        print(f"::error::{m}")
    print("agent docs ok" if not found else f"{len(found)} problem(s)")
    sys.exit(1 if found else 0)
