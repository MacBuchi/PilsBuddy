# PilsBuddy – Roadmap nach dem MVP

Stand: 2026-10-02 · Live: <https://pilsbuddy.mcbuchi.de> · MVP (Phasen 1–12 des Briefs) ist fertig.

Reihenfolge folgt der Produktpriorität des Konzepts: erst Spaß & Nutzbarkeit lokal (A), dann
Backend (B), dann Pils-Match (C), dann optionale KI (D). Vorgezogen auf Wunsch: Minispiele (E1) und
**Biere aus deiner Nähe (R) – nächste Stufe**, danach E2–E6, C2/C3, D. Jedes Paket ist für sich releasebar und
endet mit dem Gate – seit Q3 komplett in CI: Lint · Test · Build · E2E (Screenshots als Artefakt) · DB-Tests ·
Upgrade-Pfad, nach dem Merge Beta-Deploy · Smoke · Pre-Release, nach Freigabe Promote · Prod-Smoke · Release. Das Häkchen setzt der Paket-PR selbst.

Aufwand: S ≈ ½ Tag · M ≈ 1–2 Tage · L ≈ 3+ Tage.

## Fahrplan – die nächsten PRs in dieser Reihenfolge

Arbeitsliste für die Umsetzung (Absprache 2026-10-02): oben anfangen, je Zeile ein Branch + PR, Gate,
mergen, live prüfen, hier abhaken – dann die nächste. Neue Wünsche werden hier einsortiert, nicht nebenher gebaut.
Details stehen beim jeweiligen Paket weiter unten.

1. [x] **R6** „Bier fehlt? Eintragen“ – Meldung → Issue → Label `freigegeben` → Katalog (#38, live 2026-10-02)
2. [x] **Q1** Integrationstest Patch-Kompatibilität (Upgrade-Pfad mit Bestand, Live-Rechte, App-Queries) – #37 (#40, live 2026-10-02)
3. [ ] ~~**Q2** Live-Migration per CI~~ – freigegeben 2026-10-02, jetzt Punkt 7 (#51)
4. [x] **R5** Regional im Alltag (Deck-Modus, „Lokalpatriot“, Share-Card) (#42, live 2026-10-02)
5. [x] **I1** Englische Version – automatisch nach Browsersprache, umschaltbar (#46) (#48, live 2026-10-02)
6. [x] **Q3** Release-Pipeline: Smoke nach jedem Deploy, Release + Rollback, Gate in CI statt lokal (#50, live 2026-10-02)
7. [x] **Q2** (neu freigegeben 2026-10-02) Live-Migrationen + Edge Functions per CI, Approve im Environment `production` (#51, 2026-10-02)
8. [x] **Q4** Promote: jeder Merge → beta.pilsbuddy.mcbuchi.de + Pre-Release, Nutzer erst nach Freigabe (#52, live 2026-10-02)
9. [x] **R8** Bierbibliothek mit Filtern (#53, 2026-10-02)
10. [ ] **N1–N5** Nordamerika (#54): kanadische und US-Biere – N1 Stile (#55) · N2 Klassiker Kanada (#PR_N2) ·
    N3 Klassiker USA · N4 Regionalkatalog Schema + Client · N5 Pipeline + Crawler + Live-Import
11. [ ] **R7** Aktualität (monatlicher Pipeline-Dry-Run)
12. [ ] **E2 → E6** Minispiele, dann **C2/C3**, dann **D1/D2**

**Avatar ≠ Flasche:** Der Avatar ist der Nutzer (Glas-Charakter aus Bier-DNA, `src/domain/avatar.ts`).
Flaschen sind die Biere (Karte, Detail, Match). Beides bleibt getrennt.

## Gap-Analyse: Konzept vs. Stand

| Konzeptpunkt | Stand | Lücke |
| --- | --- | --- |
| Spaß beim ersten Öffnen | Welcome, Onboarding, Swipe-Coach auf der ersten Karte, „?“-Hilfe | – |
| Bier-Swipe | Touch/Maus/Tasten/Buttons, Stempel, Fly-out, Undo (1 Schritt) | – |
| Bierdatenmodell | 60 Biere, 8 Achsen, illustrierte Flaschen, `image` optional | eigene Flaschen-Designs fehlen |
| DNA / Persona / Matching | deterministisch, getestet, kuratiertes Deck, Nächstes-Match-Chip | – |
| Avatar | 8 Archetypen, 4 Stufen, Sticker, Schaum, Lieblingsfarbe | – |
| Gamification | 10 Achievements, Toast + Vollbild-Momente | – |
| Humor | 12 Quips je Rating, Meilensteine, Persona-Zeilen, `disLikeQuip` für alle | – |
| WANT_TO_TRY | Interesse-Signal, Probierliste mit Nachbewertung | – |
| Persistenz | localStorage, versioniert, Export/Import, offline-fähig | geräteübergreifend erst mit Stufe B |
| Share | Bild-Karte (Story-Format) + Text-Fallback | – |
| Social | Buddy-Link-Vergleich (C1) ohne Backend | öffentlicher Pils-Match braucht Stufe B |
| Qualität | Domain-, Reducer-, Komponententests, E2E in CI | Auto-Deploy wartet auf Secrets |

## Stufe A – Spaß & Nutzbarkeit (kein Backend)

Reihenfolge: A0 → A1 → A2 → A9 → A3 → A4 → A5 → A6 → A7 → A8.

### A0 · Swipe-Anleitung auf der ersten Karte (S) ✅

- [x] `SwipeCoach.tsx`: Richtungs-Chips am Kartenrand in den Aktionsfarben + „Geister-Hand“, die
      die echte Karte einmal nach rechts kippt (`SwipeDeck`-Prop `coachOffset`)
- [x] verschwindet beim ersten `pointerdown`/Commit; „?“ im Swipe-Header öffnet Gesten-Legende
      (`GestureLegend.tsx`, auch in `Howto.tsx` verwendet)
- [x] Copy unter `coach` in `data/copy.ts`; reduced-motion: statische Chips

Akzeptanz: erste Karte zeigt Chips + Hand, danach weg; „?“ öffnet Legende; E2E grün.

### A1 · Bier-Visuals: Flaschenfotos + Illustrations-Fallback (M–L)

Teil 1 – Flaschen-Designs (Nutzer gestaltet in Claude Design)

- [x] `docs/FLASCHEN.md`: Design-Brief je Bier (Form, Farben, Charakter, Tags) + Export-Spec,
      generiert aus `beers.json` via `node tools/bottles/build-brief.mjs`
- [x] 42 Designs mit Gesicht + Animation (Claude Design) als `public/bottles/<id>.svg`, Schriften auf
      die benutzten Zeichen reduziert (`tools/bottles/optimize.py`, 6,4 MB → 0,6 MB)
- [x] `beers.json`: `image` gesetzt; `BeerBottle` wählt Design oder Fallback in allen Screens
- [x] Restliche 18 Biere (aus A3) – erledigt mit R3: sie bekommen ihre Flasche aus dem Baukasten (abgeleitet)

Hinweis: Eigene, stilisierte Designs statt Fotos – keine 1:1-Kopien realer Etiketten (Markenrecht).

Teil 2 – Illustrations-Fallback ✅ (Dev-Galerie: `/?gallery=bottles`)

- [x] `domain/bottle.ts`: `buildBottle(beer) → BottleSpec` (Form je Stil, Etikettfarbe aus `color`)
- [x] `BottleArt.tsx` (SVG) in BeerCard, Detail, Match, Matches, Profile, DesktopFrame; Platzhalter raus

Akzeptanz: kein „Flaschenfoto“-Text mehr; dunkle Biere lesbar; Bundle < +1,5 MB (PNG ggf. als WebP).

### A2 · Undo („Zurückholen“) (S) ✅

- [x] Reducer `UNRATE` + `lastRated`; Rewind-Button + `Backspace`; Rückflug-Animation im `SwipeDeck`
- [x] Copy „Zurückgeholt. Wir sagen nichts.“; `reducer.test.ts`

Akzeptanz: Undo im Deck und nach Detail-Bewertung; Zähler/DNA gehen zurück.

### A3 · Kuratiertes Deck, breiteres Referenz-Set, mehr Biere (M) ✅

- [x] Referenz-Set auf 14 Biere über alle Stilfamilien (Pils, Helles, Weißbier, Schwarzbier, Pale Ale,
      Lager, Rauchbier, IPA, Kölsch, Stout, Doppelbock, Belgier); Test koppelt es an `DECODE_TARGET`
- [x] Datensatz auf 60 Biere (Alkoholfrei, Craft DE, International, Regional, Berliner Weisse),
      alle mit `disLikeQuip`; Flaschen-Brief um die neuen Biere ergänzt
- [x] `buildDeck`: nach dem Referenz-Set 2 × „Für dich · 94 %“ : 1 × „Mal was anderes“,
      deterministisch; Badge als Sticker auf der Karte; Kartennummer zählt fortlaufend

### A4 · Probierliste + „Nächstes Match“ im Header (M) ✅

- [x] Segment „Probierliste“ in Matches; „Probiert!“ → `RateSheet` (Mag ich / Nicht meins / Ganz okay)
- [x] Achievement „Wort gehalten“ (3 nachbewertet); `RatingEntry.previous`; Achievement-Toast zentral in `rate()`
- [x] Swipe-Header-Chip „♥ Schönramer Pils 93 %“ → Detail (ersetzt nach dem Onboarding die DNA-Pille)

### A5 · Humor- und Copy-Bank (S) ✅

- [x] 12 Quips je Rating (reihum, keine Wiederholung in 10 gleichen Swipes), Meilensteine 20/30/40/50,
      erstes Weißbier (Herz/Korb), erstes abgelehntes Kultbier, erstes alkoholfreies Herz,
      Persona-Zeilen jeden 7. Swipe, 8 Ladezeilen
- [x] Detail: „Warum passt es zu dir?“ deterministisch aus `matchReason` + zwei größten Achsen-Abweichungen (`whyItFits`)
- [x] Tests: `quips.test.ts`, `whyItFits` in `matching.test.ts`

### A6 · Avatar-Entwicklung & Momente (M) ✅

- [x] Sticker aus großen Achievements (max. 2), Schaumhöhe = Aktivität 7 Tage, Stufe „Stammgast“ ab 25
      (Bierdeckel), Glasfarbe = bestes Lieblingsbier (`avatarExtras`, deterministisch bei gegebenem `now`)
- [x] `MomentOverlay` für Entschlüsselt (DNA 100 %), Wort gehalten, Hopfen-Herz, Pils-Flüsterer,
      Kasten-Kenner – einmalig, `Profile.seen` persistiert; Altprofile gelten beim Laden als „gesehen“
- [x] Hinweis nach der ersten Karte („So geht's. Noch 13, dann kennen wir dich.“)

### A7 · Share-Card (S) ✅

- [x] Canvas 1080×1350 mit Avatar (Canvas-Zwilling von `BuddyAvatar`, Sticker als Emoji), Persona,
      Eigenschaften, DNA-Balken, Herzbiere (Fallback: nächste Matches); Web Share mit Datei, sonst Download
- [x] Daten pur in `domain/shareCard.ts` (getestet); E2E prüft den PNG-Download

### A8 · PWA/Offline + Export/Import (S) ✅

- [x] `public/sw.js` (handgeschrieben): HTML network-first mit Offline-Kopie, `/assets`, `/bottles`,
      Fonts/Icons cache-first; nur in PROD registriert; geprüft: Offline-Reload + Swipen
- [x] iOS-Install-Hinweis einmalig im DNA-Screen (`seen: hint-ios-install`); Profil-Export/Import (JSON)
      im Profil und „Profil importieren“ auf dem Welcome-Screen (Neugerät); E2E: Export → Reset → Import

### A9 · Qualität & Auslieferung (S) ✅

- [x] `reducer.test.ts`, `SwipeDeck.test.tsx` (64 Tests gesamt)
- [x] GitHub Actions `ci.yml`: Lint · Test · Build → E2E-Flow gegen `vite preview` → Deploy (nur `main`)
- [x] Auto-Deploy aktivieren: Repo-Secrets `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“)
      und `CLOUDFLARE_ACCOUNT_ID` gesetzt (2026-10-01) – `main` deployt per CI
- [x] Dark-Mode-Kanten gesperrter Achievements, `aria-live` am Bottom-Toast, Fokus-Ring + Enter auf der Karte

## Stufe B – Backend (Supabase, Free Tier) – nach A0–A4

- [x] B1 Projekt `PilsBuddy` (`rwqpljpnotnyovvuxjgl`, eu-central-1) + Migrationen: `profiles`, `ratings`, `beers`; RLS mit 18 pgTAP-Tests (CI-Job „Database“); Advisor grün (S)
- [x] B2 Geräte-Sync (opt-in im Profil): anonyme Auth, Drei-Wege-Merge pro Bier („wer seit dem letzten
      Sync geändert hat, gewinnt; sonst neueste `at`“, Löschungen als Tombstones), **Sync-Code**
      `PILS-XXXX-…` (Edge Function `sync-code`, nur Hash gespeichert, erneuerbar) holt ein zweites Gerät
      ins selbe Konto; localStorage bleibt Quelle der Wahrheit, supabase-js wird erst bei Bedarf geladen.
      Zwei-Geräte-E2E (`e2e/sync.mjs`) läuft in der CI gegen eine lokale Supabase (M)
- [x] B3 Bierkatalog aus DB: Zeilen in `beers` (published) ergänzen oder ersetzen Biere aus `beers.json`
      per id (`src/data/catalog.ts`, geprüft, nur eigene Flaschenbilder); die App wartet nie aufs Netz – sie
      startet mit dem zuletzt geholten Stand, lädt im Hintergrund nach, neue Biere erscheinen beim nächsten
      Start. E2E `e2e/catalog.mjs` gegen lokale Supabase (auch mit abgeschaltetem Backend) (S)
- [x] B4 Impressum & Datenschutz (Screen `legal`, verlinkt in Welcome und Profil, Deeplink `#impressum` /
      `#datenschutz`, Text in `src/data/legal.ts`); „Profil zurücksetzen“ löscht das Sync-Konto serverseitig
      (Edge Function `sync-code` › `delete`, Cascade), „Daten aus der Cloud löschen“ nur die Cloud-Kopie;
      verbundene Geräte schalten ihren Sync dann selbst aus. Zwei-Geräte-E2E prüft das Löschen (S)
  - [x] Anbieterangaben fürs Impressum eintragen (`OPERATOR` in `src/data/legal.ts`)

## Stufe R – Biere aus deiner Nähe (Priorität seit 2026-10-01)

Nach dem Profiling findet der Buddy die passendsten Biere regionaler Brauereien im wählbaren Umkreis
(10 · 25 · 50 · 100 km). Datenbasis für DACH aus offenen Quellen: OpenStreetMap (Brauereien, ODbL),
Open Food Facts (Biere, ODbL), Wikidata (CC0), GeoNames-PLZ (CC-BY 4.0) – Namensnennung im
Datenschutz/Impressum, die abgeleitete Bier-DB bleibt offen.

Leitplanken:
- Eigene Tabellen `breweries`, `regional_beers`, `places` – nicht `beers` (das Swipe-Deck bleibt kuratiert).
- Importierte Biere haben keine Geschmacksachsen: `tasteFromStyle(style, abv, ibu?)` (rein, getestet,
  kalibriert an den kuratierten Bieren); die UI markiert das als „Stil-Schätzung“.
- Der Standort bleibt auf dem Gerät: abgefragt werden nur 0,5°-Rasterzellen (bzw. die eingegebene PLZ),
  Entfernung und Ranking rechnet der Client. Zellen werden 30 Tage gecacht.
- Live-Migration und Live-Import nur nach OK.

- [x] R0 **Datenprobe:** `tools/catalog/` (Overpass, Wikidata-SPARQL, OFF-API), Probe Bad Rappenau ± 50 km,
      Bericht `docs/REGIONAL.md` (Abdeckung, Duplikate, Bier→Brauerei-Zuordnung, Datenmenge je Zelle) (S)
      - umgesetzt: Abruf per GitHub Actions (`catalog.yml`), OFF aus dem Tagesexport. 2 427 Brauereien DACH,
        1 901 OFF-Biere; nur 7 % der Brauereien haben ein Bier in offenen Daten → Brauerei-Profil als Rückfall offen
- [x] R1 **Schema + Import-Pipeline:** Migration + pgTAP (öffentlich lesbar nur `published`, kein
      Schreibzugriff), Dedupe Brauereien (Name + < 300 m), Bier→Brauerei-Zuordnung mit Konfidenz,
      idempotente Upserts per Quell-ID, Lizenz-Nennung in `legal.ts` (L)
      - umgesetzt: Tabellen `breweries`, `regional_beers`, `places`, `beer_sources` (Quelle je Bier als
        smallint + kurze Referenz). Nur **Hauptbiere**: je Stil eins, max. 5 je Brauerei. Live seit 2026-10-01:
        2 428 Brauereien, 380 Hauptbiere bei 191 Brauereien (Open Food Facts + Wikidata), 46 761 PLZ
      - nächste Bier-Quellen (eigene Batches, gleiche Pipeline): openbeer/beer.db (Bayern, AT; Public Domain),
        danach Crawler für Brauerei-Websites (1 613 mit Website; robots.txt, nur Fakten, Pfad als Quelle)
- [x] R2 **Stilprofile** `src/domain/styleProfile.ts`: ~25 Stile mit Aliasen, `normalizeStyle`,
      `tasteFromStyle`; Leave-one-out-Test gegen die kuratierten Biere (M)
      - umgesetzt: 30 Stile (Basis = Mittel der kuratierten Biere, 8 Stile ohne kuratiertes Bier von Hand),
        ABV verschiebt Körper/Malz/Süffigkeit, IBU setzt die Bittere; Schätzfehler auf den 60 kuratierten
        Bieren Ø 5 Punkte je Achse. Flaschenparameter aus Produktdaten: `Beer.pack` (Füllmenge, Dose, Bügel,
        `parsePack` für OFF-Texte) und `Beer.founded` („SEIT 1872“) steuern `designFor`; unbekannter Stil → „BIER“.
        Prototyp über die R0-Rohdaten: 68 % der OFF-Biere bekommen einen Stil, 77 % ein Gebinde
- [x] R3 **Flaschen-Baukasten** (Wunsch 2026-10-01): keine SVG-Datei mehr je Bier, sondern ein Generator zur
      Laufzeit – Vorlagen + Parameter, abgeleitet aus Stil, Farbe und Charakter des Biers:
      - Formen: die ~11 Flaschenformen der 42 Designs als parametrische Pfade (Bauch, Schulter, Hals, Dose, Bügel)
      - Farben/Etikett: Glas, Etikett, Akzent, Wappen, Schrift-Paar (modern · Serif · Fraktur) aus `color`, Stil, Region
      - Gesicht: Vorlagen für Augen, Brauen, Mund; Feinschliff aus den Geschmacksachsen
        (z. B. bitter → strenge Brauen, süß → Lächeln, süffig → entspannt, Charakter → markanter Ausdruck)
      - Animation: Vorlagen (Wippen, Blinzeln, Hüpfen, Umschauen, Brauen heben, Schaum) mit Dauer/Verzögerung/
        Amplitude aus Charakter + `hashId` – deterministisch, `prefers-reduced-motion` respektiert
      - rein in `src/domain/bottleDesign.ts` (getestet), Renderer `BottleSvg.tsx` mit den App-Schriften statt
        eingebetteter Fonts; die 42 Designs werden zu Parameter-Overrides in `beers.json` (Vergleichsbilder alt/neu
        im PR), danach fallen `public/bottles/*.svg` (≈ 700 KB) und `BottleArt` weg. Deckt auch die offenen 18
        Biere aus A1 und alle Regionalbiere ab (M–L)
      - umgesetzt: 7 Formen (Umrisse zeichengenau wie die Designs, per Test fixiert), 33 Motive, ~350 Byte je
        Handdesign in `beers.json`; Ableitung `designFor` für alle anderen; DB-Designs nur über `sanitizeDesign`
- [x] R4 **Regional-Finder:** `src/domain/regional.ts` (Zellen, Haversine, `rankRegional`), Screen
      `regional` (Einstieg im DNA-Screen + Segment „In der Nähe“ in Matches), Standort oder PLZ,
      Radius-Chips, Liste mit Match-% und Entfernung, Brauerei-Sheet mit Route-Link, Probierliste;
      angefasste Regionalbiere (`r-<EAN>`) lokal als Snapshot im Katalog-Overlay. E2E mit Geolocation (L)
      - umgesetzt (2026-10-02, #34): Segment heißt „Nähe“; Brauereien ohne bekannte Biere stehen separat nach
        Entfernung, ohne erfundenes Profil. Keine Migration – der Client liest `breweries` + `regional_beers`
        eingebettet. Snapshots in `pilsbuddy.regional.beers` (nur `BEER_BY_ID`, nie im Deck). Offen: auf einem
        zweiten Gerät (Sync/Import) fehlen die Snapshots, diese Bewertungen werden dort ignoriert
- [x] R5 **Regional im Alltag:** Regional-Modus im Swipe-Deck (jede 3. Karte aus dem Umkreis),
      Achievement „Lokalpatriot“, Share-Card-Zeile (M). Umgesetzt: Pool = letztes Finder-Ergebnis (nur auf dem Gerät,
      max. 60), Regional-Karten mischen sich ab der ersten Karte ein (nicht erst nach dem Onboarding-Set)
- [x] R6 **„Bier fehlt? Eintragen“** (vor R5 gezogen, Wunsch 2026-10-02): Brauerei Pflicht (aus dem Finder oder
      frei mit PLZ/Ort), dazu ein Link oder die Daten (Name, Stil, Alkohol). Tabelle `beer_submissions` (anonym, nur
      `insert`, Trigger-Limit global + keine Doppelmeldung, 5 je Gerät und Tag) → `tool/beer_bot.py` legt je Meldung
      ein Issue `bier-meldung` an; Label `freigegeben` trägt das (im Issue korrigierbare) Bier als Quelle 5 in
      `regional_beers` ein, eine neue Brauerei als `app-<Issue>` mit Koordinaten aus `places`. Kein Konto statt
      „Limit je anonymer Session“ (Sessions gibt es nur mit Sync) (M)
      - umgesetzt (2026-10-02, #38): Workflow „Beer Reports“ (alle 2 h + bei Label), unklare Issues bekommen einen
        Kommentar und verlieren das Label; Katalog-Rebuild lässt Quelle 5 / `app-…` veröffentlicht. Offen: gecachte
        Finder-Zellen zeigen ein freigegebenes Bier erst nach bis zu 30 Tagen
- [ ] R7 **Aktualität:** monatlicher Pipeline-Dry-Run als PR mit Diff-Bericht, Übernahme nach OK (S)
- [x] R8 **Bierbibliothek** (Wunsch 2026-10-02): alle Biere durchsuchen und filtern – Name, PLZ/Region, Stil,
      Alkohol, eigene Bewertung; vorkategorisiert nach Stilgruppen (hell · dunkel · Weizen · Hopfen · alkoholfrei).
      Kuratierte Biere offline; Regionalbiere ohne Standort per Name/PLZ-Suche aus `regional_beers` (M)
      - umgesetzt (2026-10-02, #53): Screen `library` (Einstieg als Suchfeld oben in Matches), Logik in
        `src/domain/library.ts` (Stilgruppen, Alkohol-Bänder, Bewertung inkl. „unbewertet“). Offline: kuratierte +
        angefasste Regionalbiere; ab 3 Zeichen sucht `searchRegional` Bier-, Brauerei- und Ortsnamen, eine PLZ die
        Brauereien im Umkreis von 25 km. Keine Migration; die beiden Abfragen stehen in `schema_check.sh`

### Stufe Q – Qualität der Datenbank-Auslieferung (Wunsch 2026-10-02, #37)

Vorlage: Job `schema-dry-run` in PilzBuddy/TrailBuddy (`tool/db_migrate.sh`, `schema_check.sh`, `grants_check.sql`).

- [x] Q1 **Integrationstest Patch-Kompatibilität:** neuer CI-Job – Stack mit den Migrationen von `origin/main`,
      realistische Daten (Katalog-Fixture, Sync, Feedback, Meldungen), dann nur die neuen Migrationen des PRs;
      Live-Standardrechte (anon/authenticated bekommen alles auf neuen Tabellen) lokal nachgestellt +
      `grants_check.sql`; alle App-Queries per PostgREST gegen das aufgerüstete Schema; dazu Frischinstallation (M)
      - umgesetzt (2026-10-02, #40): Job „DB upgrade path (Bestand + neue Migrationen)“, seitdem Pflicht-Check;
        `tool/db/` (upgrade_check.sh, grants_check.sql, schema_check.sh, seed_existing.sql). Befund: live hatten
        anon/authenticated alle Rechte auf allen Tabellen (nur RLS schützte) → Migration `explicit_grants`, neue Tabellen
        ohne Standardrechte; live geprüft (Rechte, App-Queries, Prod-Smoke)
- [x] Q2 **Live-Migration per CI:** Job `live-db` (`supabase db push --linked`, Edge Functions, Rechte-Check live) nur bei
      geänderten Migrationen/Functions, vor dem Deploy, mit Approve im Environment `production`; dazu `live-check`
      (Dry-Run + Advisors, read-only) bei jedem Push und `catalog-import.yml` statt lokalem Import. Secret
      `SUPABASE_ACCESS_TOKEN`. Freigegeben 2026-10-02 (S)
- [x] Q3 **Release-Pipeline (Wunsch 2026-10-02):** Gate komplett in CI (actionlint, Bundle-Budget, Screenshots immer als
      Artefakt), Auto-Merge; nach dem Deploy Prod-Smoke gegen den neuen Commit (`/version.json`), dann GitHub Release
      `v<Datum>.<Run>` mit Notes und `dist.zip`, Version im Profil; `rollback.yml` spielt ein früheres Release ein;
      Fehler nach dem Merge → Issue `release-failed`. Roadmap-Haken im Paket-PR statt eigenem PR (S)
- [x] Q4 **Promote (Wunsch 2026-10-02):** jeder Merge geht auf beta.pilsbuddy.mcbuchi.de (Worker `pilsbuddy-beta`, gleiche
      DB) → Beta-Smoke → GitHub-Pre-Release; Job „Promote to production“ wartet auf das Approve im Environment
      `production`, deployt dasselbe `dist`, Prod-Smoke, Release wird „Latest“. Version im Profil zeigt „Beta“ (S)

### Stufe N – Nordamerika (Wunsch 2026-10-02, #54)

Bekannte kanadische und US-Biere als kuratierte Biere (ins Deck für alle, nicht ins Onboarding-Set) und der
Regionalkatalog für CA/US. Basis ist die CSV aus #54, jede Zeile wird gegen die Brauerei-Quelle geprüft.
Geschmack der Klassiker: `tasteFromStyle(Stil, ABV, IBU)` plus Abweichungen nur mit Quelle, per Test nachrechenbar.
Quellen: Open Brewery DB (MIT), OSM, Wikidata, Open Food Facts, openbeer, GeoNames (US-ZIP, kanadische FSA).
Nicht genutzt: Untappd, RateBeer, BeerAdvocate (AGB), BreweryDB (eingestellt).

- [x] N1 **Stile für Nordamerika** (S): American Lager, Light Lager, Cream Ale, Blonde Ale, Wheat Ale, Witbier,
      California Common, Bitter, Brown Ale, Scotch Ale, Double IPA, Hazy IPA, Milk Stout, Imperial Stout,
      Barleywine, Saison, Tripel, Dubbel, Quadrupel, Sour Ale – Profile nach BJCP 2021, Muster vor dem
      `ale`-Auffang, Flaschenregeln und Stilgruppen (#55)
- [x] N2 **Klassiker Kanada** (M): Recherchedatei mit Quelle je Feld, Ableitung `classicTaste`, Texte DE + EN
      - umgesetzt (#PR_N2): 48 Biere aus allen Provinzen + Yukon in `tools/classics/ca.json`, `npm run classics:build`
        schreibt `beers.json`/`beers.en.json`, Test rechnet jedes Profil nach; Workflow „Classics sources“ prüft die
        Quellen. Auswahl, CSV-Korrekturen und Quellen: `docs/research/NORDAMERIKA.md`
- [ ] N3 **Klassiker USA** (M): wie N2
- [ ] N4 **Regionalkatalog CA/US – Schema + Client** (M): Länder-CHECKs, Brauerei-IDs `obdb-…`, PLZ-Format
      ZIP/FSA, Auswahl bei gleicher PLZ in DE und USA, Datenschutztext
- [ ] N5 **Pipeline + Crawler CA/US** (L): zentrale Ländertabelle, Open Brewery DB, OSM je Bundesstaat,
      Wikidata/OFF/openbeer/GeoNames, englischer Crawler; Live-Import nach Freigabe

### Stufe I – Sprachen (Wunsch 2026-10-02, #46)

- [x] I1 **Englische Version:** Sprache beim Start aus gespeicherter Wahl, sonst Browsersprache (Deutsch, sonst
      Englisch); Wechsel im Profil und auf dem Welcome-Screen speichert und lädt neu. Komplett übersetzt: Oberfläche
      (`copy.en.ts`, gleiche Schlüssel per Typ erzwungen), Achievements, Rechtstexte (deutsche Fassung verbindlich),
      Texte der 60 kuratierten Biere (`beers.en.json`). Stilnamen bleiben deutsch; Biere aus der Datenbank bleiben
      deutsch, bis sie eine Übersetzung bekommen (L)
      - umgesetzt (2026-10-02, #48): Wechsel über Neuladen (Sprache je Sitzung fest), `?lang=en` für Links;
        E2E-Kontexte auf `de-DE` gepinnt + eigener Englisch-Schritt; Bundle ~206 kB gzip

## Stufe E – Minispiele (vorgezogen vor C, Wunsch 2026-10-01)

Eigener Tab „Spiele“. Regeln als reine, per Seed deterministische Domain-Logik (`src/domain/games/`),
damit derselbe Zustand später an Mitspieler gesendet werden kann. Keine Trinkregeln – Wissen und Geschick.

- [x] E1 **Bier-Quartett** gegen den Kneipen-Bot (Supertrumpf: Wert nennen, höherer gewinnt, Patt → Pot;
      10 Karten je Seite, max. 30 Runden). Bot nennt den Wert, mit dem seine Karte relativ am stärksten ist
      (Simulation: naiver Mensch gewinnt ~43 %, kluger ~62 %). Statistik im Profil, Achievement
      „Quartett-König“ (3 Siege) (M)
- [ ] E2 **Wie viel ist drin?** Füllmenge schätzen; Volumen aus der Glasform (Rotationskörper) berechnet –
      Stange, Tulpe, Weizen, Maß, Willibecher (M)
- [ ] E3 **Flaschen-Memory** mit den animierten Flaschen; Variante Flasche ↔ Bierstil (S)
- [ ] E4 **Mehrspieler-Gerüst:** Raum per Code/QR über Supabase Realtime (Broadcast + Presence, anonym),
      Gastgeber hält den Spielzustand (M)
- [ ] E5 **Quartett zu zweit** und „Wie viel ist drin?“ für alle im Raum auf E4 (M)
- [ ] E6 **Tasting-Abend:** Gastgeber startet, alle bewerten dasselbe Bier, gemeinsame Auflösung (M)

## Stufe C – Pils-Match (Social)

- [x] C1 Buddy-Link ohne Backend: `?buddy=<base64url(Buddy-Nr., Bewertungen)>` – Geschmack/Persona
      rechnet der Empfänger selbst; Vergleich in Matches › Menschen (Prozent, gemeinsame Herzbiere,
      Streitbiere, Tipps), Einladung per Share/Zwischenablage, Hinweis auf Welcome und im DNA-Screen
- [ ] C2 Feed über Edge Function `match_candidates` (nur `visible`-Profile; keine Fotos, keine
      Persönlichkeitsbewertung) (L)
- [ ] C3 Opt-in, Handle, Blockieren; kein Chat (S)

## Stufe D – Optionale KI-Schicht

- [ ] D1 `src/ai/provider.ts`: `disabled` (Default, deterministische Texte) · `ollama` · `cloud`;
      Zugriff nur über `useAiText()`, nie aus Komponenten (S)
- [ ] D2 Cloudflare Workers AI hinter `/api/ai`, Rate-Limit, Persona-Roast + „Warum passt es zu mir?“ (M)

Invariante: DNA, Matching, Persona, Avatar bleiben KI-frei.
