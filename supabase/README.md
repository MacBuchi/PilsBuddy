# Supabase (Stufe B)

Projekt **PilsBuddy**, Ref `rwqpljpnotnyovvuxjgl`, Region eu-central-1.

| Tabelle | Inhalt | Zugriff (RLS) |
|---|---|---|
| `beers` | Spiegel von `src/data/beers.json` (`data` = Bier-Objekt) | veröffentlichte Biere öffentlich lesbar, schreiben nur Admin |
| `profiles` | ein Profil je (anonymem) Nutzer: Buddy-Nr., Archetyp, DNA, `visible` | eigenes lesen/schreiben; fremde nur bei `visible = true` (Opt-in) |
| `ratings` | eine Zeile je Nutzer und Bier, `at` entscheidet beim Sync; `deleted` = Tombstone | nur eigene |
| `sync_codes` | Hash des Sync-Codes je Nutzer | keine – nur die Edge Function (service_role) |

Edge Function `sync-code` (`verify_jwt = false`, prüft den JWT bei `create` selbst):
`create` erzeugt einen neuen Code für den angemeldeten Nutzer (alter wird ungültig), `redeem` tauscht einen
Code gegen einen Magic-Link-Token, mit dem `auth.verifyOtp` ein zweites Gerät ins selbe anonyme Konto holt.
Dafür bekommt der Nutzer beim ersten Einlösen eine interne Platzhalter-Adresse `<uuid>@sync.pilsbuddy.invalid`
(wird nie angeschrieben).

Auth-Einstellungen (Dashboard, nicht per CLI gepusht): anonyme Anmeldung an, Site URL
`https://pilsbuddy.mcbuchi.de`.

Löscht man den Auth-Nutzer, verschwinden Profil und Bewertungen mit (`on delete cascade`).

## Arbeiten

```sh
supabase db start            # lokale DB (Docker) mit allen Migrationen
supabase test db             # RLS-Tests in supabase/tests/
supabase db advisors --local # Sicherheits-/Performance-Hinweise
supabase start -x studio,imgproxy,vector,logflare,supavisor,mailpit,realtime,storage-api   # + Auth + Functions
supabase functions deploy sync-code   # nach dem Merge
supabase db push             # nach dem Merge: Migrationen ins Projekt (vorher: supabase link --project-ref rwqpljpnotnyovvuxjgl)
```

App gegen den lokalen Stack + Zwei-Geräte-Test:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<PUBLISHABLE_KEY aus supabase status> npx vite --port 5179
node e2e/sync.mjs http://localhost:5179/   # braucht playwright neben dem Skript, siehe e2e/README.md
```

Neue Änderungen immer als neue Datei in `migrations/` (nie eine bestehende ändern) plus Test.
