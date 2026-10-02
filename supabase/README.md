# Supabase (Stufe B)

Projekt **PilsBuddy**, Ref `rwqpljpnotnyovvuxjgl`, Region eu-central-1.

| Tabelle | Inhalt | Zugriff (RLS) |
|---|---|---|
| `beers` | Ergänzungen zu `src/data/beers.json` (`data` = Bier-Objekt ohne `id`) | veröffentlichte Biere öffentlich lesbar, schreiben nur Admin |
| `profiles` | ein Profil je (anonymem) Nutzer: Buddy-Nr., Archetyp, DNA, `visible` | eigenes lesen/schreiben; fremde nur bei `visible = true` (Opt-in) |
| `ratings` | eine Zeile je Nutzer und Bier, `at` entscheidet beim Sync; `deleted` = Tombstone | nur eigene |
| `sync_codes` | Hash des Sync-Codes je Nutzer | keine – nur die Edge Function (service_role) |
| `breweries` | Brauereien DE/AT/CH/CA/US aus OpenStreetMap, Wikidata und Open Brewery DB, `id` = Quell-ID (`osm-n123`, `wd-q123`, `obdb-<uuid>`) | veröffentlichte öffentlich lesbar, schreiben nur der Import |
| `regional_beers` | bis zu 5 Hauptbiere je Brauerei (`id` = `r-<EAN>` / `r-q<n>`, Stil, ABV, Gebinde, `source` + kurze `source_ref`) | veröffentlichte öffentlich lesbar, schreiben nur der Import |
| `beer_sources` | die wenigen Quellen (Open Food Facts, Wikidata, Website, openbeer, 5 = Meldung aus der App) mit Lizenz und Link-Vorlage | öffentlich lesbar, nur per Migration |
| `places` | Postleitzahlen DE/AT/CH/US und kanadische FSA (nur die ersten 3 Zeichen) mit Ort und Mittelpunkt (GeoNames) | öffentlich lesbar, schreiben nur der Import |
| `feedback` | In-App-Feedback („Wünsch dir was!“): Typ, Text, Build, grober Gerätetyp – anonym; `tool/feedback_bot.py` (Workflow „Feedback Bot“, alle 2 h) macht daraus Issues und löscht verarbeitete Zeilen nach 30 Tagen | nur `insert` (vier Spalten) für alle, Trigger: max. 30 je 10 min, gleicher Text 1× am Tag; lesen nur service_role |
| `beer_submissions` | R6 „Bier fehlt? Eintragen“: Brauerei (`brewery_id` oder Name + PLZ/Ort), Link oder Name/Stil/ABV, Notiz, Build, Gerätetyp – anonym; `tool/beer_bot.py` (Workflow „Beer Reports“, alle 2 h) macht daraus Issues `bier-meldung`, das Label `freigegeben` trägt das (im Issue korrigierbare) Bier als `r-app<Issue>` (Quelle 5) ein, eine neue Brauerei als `app-<Issue>` am PLZ-Mittelpunkt; verarbeitete Zeilen nach 30 Tagen gelöscht | nur `insert` (zehn Spalten) für alle, Trigger: max. 20 je 10 min, gleiches Bier 1× pro Woche; dazu 5 je Gerät und Tag in der App; lesen nur service_role |

**Rechte & Upgrade-Pfad (Q1):** Neue Tabellen bekommen für anon/authenticated **keine** Rechte mehr per Default
(`20261003130000_explicit_grants.sql` – das Live-Projekt gab vorher `arwdDxtm` auf jede neue Tabelle, lokal nur
`Dxtm`). Jede Migration vergibt, was die App braucht; `tool/db/grants_check.sql` kennt die erlaubten Rechte je
Tabelle und schlägt bei allem anderen an. CI-Job „DB upgrade path“: leerer Stack mit den alten Live-Standardrechten
→ Migrationen von `main` → Bestand (Katalog-Fixture, `tool/db/seed_existing.sql`) → nur die neuen Migrationen →
Rechte-Check + App-Queries (`tool/db/schema_check.sh`, liest die Abfragen aus `src/`). Außerdem: ausgelieferte
Migrationen unverändert, neue Versionen nach der letzten ausgelieferten.

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

**Regionalkatalog (Stufe R, N5):** befüllt nur von `tools/catalog` – nie von der App. Die Länder und ihre Quellen
(Wikidata-Item, OFF-Tag, Sprache, OSM-Teilgebiete, Open-Brewery-DB-Land, openbeer-Repos, Mindestzahl Brauereien)
stehen zentral in `tools/catalog/countries.json`; Skripte, Merge und Workflow lesen sie dort. Ablauf:

1. Workflow „Regional catalogue (fetch)“ (`gh workflow run catalog.yml --ref <branch>`) lädt OSM (Overpass,
   mit Spiegel-Servern; DE, CA, US je Bundesland/Provinz/Staat), Open Brewery DB (MIT, US + Kanada), Wikidata (Brauereien + `--beers`), den Open-Food-Facts-Export, die openbeer-Repos
   (beer.db, gemeinfrei, Stand ~2014) und die GeoNames-Postleitzahlen; Artefakt `catalog-raw` nach
   `tools/catalog/raw/` entpacken.
   Website-Biere: Workflow „Regional catalogue (brewery websites)“ (`gh workflow run catalog-web.yml`)
   besucht die Websites der veröffentlichten Brauereien (`tools/catalog/crawl.ts`: robots.txt, eigener
   User-Agent `PilsBuddyBot`, ≤ 4 Seiten je Site, 1 s Pause, Filter und `Accept-Language` nach Land der
   Brauerei – deutsch für DACH, englisch für CA/US; 12 Shards) und liefert `web-<n>.json` (Artefakte
   `catalog-web-<n>`) – ebenfalls nach `tools/catalog/raw/`. Übernommen werden nur Name + Alkohol aus
   schema.org-Produkten oder Überschriften mit Bierstil; `source_ref` ist der Pfad auf der Brauerei-Website.
2. `npm run catalog:build` → `tools/catalog/out/*.sql` + `report.txt`: Brauereien dedupliziert (gleicher Name
   < 300 m, Wikidata per Tag oder Name < 500 m, Open Brewery DB per Name < 1 km; ohne Koordinaten an die Mitte
   ihrer PLZ, dann Name < 5 km), Biere einer Brauerei zugeordnet (alle Namensteile der Brauerei
   in Marke/Hersteller, gleichnamige nur mit passendem Herstellungsort), davon die **Hauptbiere**: je Stil eines
   (Größen/Gebinde fallen zusammen), höchstens 5, Radler/Alkoholfreies zuletzt, unbekannter Stil nur ohne
   Alternative; bei Gleichstand gewinnt die aktuellere Quelle (OFF > Wikidata > Website > openbeer).
   Zuordnung auch über einen abweichenden Wikidata-Namen und ohne Adjektiv-„-er“ („Zwettler“ = „Zwettl“);
   allgemeine Namen („Hofbräu“, „Die Weisse“) nur mit passendem Ort; Listen mit vollen Brauereinamen
   (openbeer) streng: Ort passt, oder gleicher Name und Brauerei ohne bekannten Ort.
   Alle Länder werden immer zusammen gebaut (sonst setzt `30-unpublish.sql` die fehlenden auf unveröffentlicht);
   bricht ab, wenn ein Land unter seiner Mindestzahl liegt (unvollständiger Download).
3. Lokal prüfen: `for f in tools/catalog/out/*.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done`
4. Live: Workflow „Regional catalogue (import)“ (`gh workflow run catalog-import.yml` = Probelauf mit Report,
   `-f apply=true` = Import nach Freigabe im Environment `production`; nimmt die Artefakte des letzten fetch-
   und Website-Laufs). Er spielt die Dateien per `supabase db query --linked -f "$f"` ein. Jede Datei ist eine
   Transaktion; Upserts per Quell-ID ändern nur, was anders ist (`updated_at` bleibt sonst), `30-unpublish.sql`
   setzt Brauereien/Biere, die nicht mehr in den Quellen sind, auf `published = false` (Zeilen bleiben) – außer
   den freigegebenen Meldungen aus der App (Quelle 5, Brauereien `app-…`).

Geschmack wird nicht gespeichert – die App leitet ihn aus Stil + ABV ab (`tasteFromStyle`, „Stil-Schätzung“).
Lizenzen: OpenStreetMap und Open Food Facts ODbL (Namensnennung, abgeleitete DB bleibt ODbL), Open Brewery DB MIT, Wikidata CC0,
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
```

**Live-Auslieferung (Q2):** nicht von Hand. Nach dem Merge auf `main` prüft der CI-Job „Live database check“
(read-only: `db push --dry-run`, `tool/db/live_advisors.sh`). Hat der Push Migrationen oder Edge Functions
geändert, wartet „Live database (migrations · functions)“ auf die Freigabe im Environment `production`
(Reviewer: Maintainer), spielt dann `supabase db push --linked` und `supabase functions deploy <name> --use-api`
ein und prüft live `tool/db/grants_check.sql` und die Advisors – erst danach deployt CI die App. Secret:
`SUPABASE_ACCESS_TOKEN` (ohne Secret überspringen beide Jobs sichtbar).

App gegen den lokalen Stack + Zwei-Geräte-Test:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<PUBLISHABLE_KEY aus supabase status> npx vite --port 5179
node e2e/sync.mjs http://localhost:5179/   # braucht playwright neben dem Skript, siehe e2e/README.md
```

Neue Änderungen immer als neue Datei in `migrations/` (nie eine bestehende ändern) plus Test.
