---
name: pils-issue
description: Ein PilsBuddy-Issue oder Roadmap-Paket umsetzen – vom Issue bis zum PR mit Auto-Merge. Verwenden, wenn ein Issue (#N), ein Wunsch aus der App oder das nächste Roadmap-Paket umgesetzt werden soll.
---

# Issue → PR

Kleine, klare Wünsche: ohne Plan und Rückfragen direkt umsetzen. Größere (neue Tabelle, neuer Dienst, Datenfluss vom
Gerät weg, Designentscheidung): erst kurz den Plan nennen und fragen.

## Start
1. Status lesen (der SessionStart-Hook zeigt ihn; sonst `python3 tool/session_status.py`). Offene
   `release-failed`-Issues gehen vor.
2. Issue mit Kommentaren lesen (`gh api repos/MacBuchi/PilsBuddy/issues/N` und `…/comments`).
3. Frischer Branch von `origin/main` (`git fetch origin main && git checkout -B <branch> origin/main`).
4. Nur die betroffenen Docs lesen: den Abschnitt in `docs/ROADMAP.md`, bei Flaschen den Skill
   `pilsbuddy-flaschendesign`, bei DB-Änderungen `supabase/README.md`.

## Fertig machen
- Nur die betroffenen Tests: `npx vitest run <dateien> --reporter=dot`, dann `npm run typecheck` (UI: `npm run dev`).
  Das volle Gate läuft in CI.
- Texte immer in beiden Dateien: `src/data/copy.ts` und `src/data/copy.en.ts`.
- Geht etwas vom Gerät weg: `src/data/legal.ts` im selben PR.
- Roadmap-Häkchen mit PR-Nummer im selben PR (kein eigener Roadmap-PR).
- PR-Text mit `Closes #N`, dann Auto-Merge (squash). Nie `--admin`, nie selbst promoten.
