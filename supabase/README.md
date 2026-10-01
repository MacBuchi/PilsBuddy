# Supabase (Stufe B)

Projekt **PilsBuddy**, Ref `rwqpljpnotnyovvuxjgl`, Region eu-central-1.

| Tabelle | Inhalt | Zugriff (RLS) |
|---|---|---|
| `beers` | Ergänzungen zu `src/data/beers.json` (`data` = Bier-Objekt ohne `id`) | veröffentlichte Biere öffentlich lesbar, schreiben nur Admin |
| `profiles` | ein Profil je (anonymem) Nutzer: Buddy-Nr., Archetyp, DNA, `visible` | eigenes lesen/schreiben; fremde nur bei `visible = true` (Opt-in) |
| `ratings` | eine Zeile je Nutzer und Bier, `at` entscheidet beim Sync; `deleted` = Tombstone | nur eigene |
| `sync_codes` | Hash des Sync-Codes je Nutzer | keine – nur die Edge Function (service_role) |
| `breweries` | Brauereien DE/AT/CH aus OpenStreetMap + Wikidata, `id` = Quell-ID (`osm-n123`, `wd-q123`) | veröffentlichte öffentlich lesbar, schreiben nur der Import |
| `regional_beers` | bis zu 5 Hauptbiere je Brauerei (`id` = `r-<EAN>` / `r-q<n>`, Stil, ABV, Gebinde, `source` + kurze `source_ref`) | veröffentlichte öffentlich lesbar, schreiben nur der Import |
| `beer_sources` | die wenigen Quellen (Open Food Facts, Wikidata, Website, openbeer) mit Lizenz und Link-Vorlage | öffentlich lesbar, nur per Migration |
| `places` | Postleitzahlen DE/AT/CH mit Ort und Mittelpunkt (GeoNames) | öffentlich lesbar, schreiben nur der Import |

**Bierkatalog (B3):** Die Tabelle enthält *nur* Biere, die neu sind oder ein gebündeltes Bier ersetzen sollen
(gleiche `id`) – keine Kopie des ganzen JSON, sonst würde ein alter DB-Stand spätere JSON-Änderungen überdecken.
Pflege per Studio/SQL; `data` braucht alle Felder eines Biers (siehe `e2e/catalog-seed.sql`), `image` nur als
`/bottles/<id>.svg` (sonst gezeichnete Flasche), `sort` ordnet neue Biere hinter den gebündelten. Unvollständige
Zeilen ignoriert die App. Sichtbar wird eine Änderung beim übernächsten App-Start (holen → anwenden).
Ein gebündeltes Bier ausblenden geht nur per Deploy.

Edge Function `sync-code` (`verify_jwt = false`, prüft den JWT bei `create` und `delete` selbst):
`create` erzeugt einen neuen Code für den angemeldeten Nutzer (alter wird ungültig), `redeem` tauscht einen
Code gegen einen Magic-Link-Token, mit dem `auth.verifyOtp` ein zweites Gerät ins selbe anonyme Konto holt.
Dafür bekommt der Nutzer beim ersten Einlösen eine interne Platzhalter-Adresse `<uuid>@sync.pilsbuddy.invalid`
(wird nie angeschrieben).
`delete` (B4 „Alles löschen“) löscht den Auth-Nutzer; `profiles`, `ratings` und `sync_codes` gehen per
`on delete cascade` mit. Andere Geräte merken es beim nächsten Sync (Fremdschlüssel-Fehler bzw. unbekannter
Code), schalten ihren Sync aus und behalten ihre lokale Kopie.

Auth-Einstellungen (seit 2026-10-01 aktiv; gezielt per Management-API `PATCH /v1/projects/<ref>/config/auth`
gesetzt, nicht per `supabase config push`): `external_anonymous_users_enabled = true`, Site URL
`https://pilsbuddy.mcbuchi.de`, Rate-Limit 30 anonyme Anmeldungen/Stunde je IP (Default).

**Regionalkatalog (Stufe R):** befüllt nur von `tools/catalog` – nie von der App. Ablauf:

1. Workflow „Regional catalogue (fetch)“ (`gh workflow run catalog.yml --ref <branch>`) lädt OSM (Overpass,
   mit Spiegel-Servern), Wikidata, den Open-Food-Facts-Export und die GeoNames-Postleitzahlen; Artefakt
   `catalog-raw` nach `tools/catalog/raw/` entpacken.
2. `npm run catalog:build` → `tools/catalog/out/*.sql` + `report.txt`: Brauereien dedupliziert (gleicher Name
   < 300 m, Wikidata per Tag oder Name < 500 m), Biere einer Brauerei zugeordnet (alle Namensteile der Brauerei
   in Marke/Hersteller, gleichnamige nur mit passendem Herstellungsort), davon die **Hauptbiere**: je Stil eines
   (Größen/Gebinde fallen zusammen), höchstens 5, Radler/Alkoholfreies zuletzt, unbekannter Stil nur ohne
   Alternative. Bricht ab bei < 1000 Brauereien (unvollständiger Download).
3. Lokal prüfen: `for f in tools/catalog/out/*.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done`
4. Live (nur nach OK): dieselbe Schleife mit `supabase db query --linked -f "$f"`. Jede Datei ist eine
   Transaktion; Upserts per Quell-ID ändern nur, was anders ist (`updated_at` bleibt sonst), `30-unpublish.sql`
   setzt Brauereien/Biere, die nicht mehr in den Quellen sind, auf `published = false` (Zeilen bleiben).

Geschmack wird nicht gespeichert – die App leitet ihn aus Stil + ABV ab (`tasteFromStyle`, „Stil-Schätzung“).
Lizenzen: OpenStreetMap und Open Food Facts ODbL (Namensnennung, abgeleitete DB bleibt ODbL), Wikidata CC0,
GeoNames CC BY 4.0 – genannt in `src/data/legal.ts`.

Advisor: Die zwei WARN „Anonymous Access Policies“ (0012) für `profiles` und `ratings` sind gewollt – anonyme
Nutzer sind die Nutzer dieser App und sehen per RLS nur ihre eigenen Zeilen. Alles andere muss sauber bleiben.

Löscht man den Auth-Nutzer, verschwinden Profil und Bewertungen mit (`on delete cascade`).

## Arbeiten

```sh
supabase db start            # lokale DB (Docker) mit allen Migrationen
supabase test db             # RLS-Tests in supabase/tests/
supabase db advisors --local # Sicherheits-/Performance-Hinweise
supabase start -x studio,imgproxy,vector,logflare,supavisor,mailpit,realtime,storage-api   # + Auth + Functions
supabase functions deploy sync-code   # nach dem Merge
supabase db push             # nach dem Merge: Migrationen ins Projekt (vorher: supabase link --project-ref rwqpljpnotnyovvuxjgl)
# hängt `db push` (Host nur per IPv6): supabase db query --linked -f migrations/<datei>.sql, dann
# insert into supabase_migrations.schema_migrations (version, name) values ('<ts>', '<name>');
```

App gegen den lokalen Stack + Zwei-Geräte-Test:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<PUBLISHABLE_KEY aus supabase status> npx vite --port 5179
node e2e/sync.mjs http://localhost:5179/   # braucht playwright neben dem Skript, siehe e2e/README.md
```

Neue Änderungen immer als neue Datei in `migrations/` (nie eine bestehende ändern) plus Test.
