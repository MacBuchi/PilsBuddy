# Supabase (Stufe B)

Projekt **PilsBuddy**, Ref `rwqpljpnotnyovvuxjgl`, Region eu-central-1.

| Tabelle | Inhalt | Zugriff (RLS) |
|---|---|---|
| `beers` | Spiegel von `src/data/beers.json` (`data` = Bier-Objekt) | veröffentlichte Biere öffentlich lesbar, schreiben nur Admin |
| `profiles` | ein Profil je (anonymem) Nutzer: Buddy-Nr., Archetyp, DNA, `visible` | eigenes lesen/schreiben; fremde nur bei `visible = true` (Opt-in) |
| `ratings` | eine Zeile je Nutzer und Bier, `at` entscheidet beim Sync | nur eigene |

Löscht man den Auth-Nutzer, verschwinden Profil und Bewertungen mit (`on delete cascade`).

## Arbeiten

```sh
supabase db start            # lokale DB (Docker) mit allen Migrationen
supabase test db             # RLS-Tests in supabase/tests/
supabase db advisors --local # Sicherheits-/Performance-Hinweise
supabase db push             # nach dem Merge: Migrationen ins Projekt (vorher: supabase link --project-ref rwqpljpnotnyovvuxjgl)
```

Neue Änderungen immer als neue Datei in `migrations/` (nie eine bestehende ändern) plus Test.
