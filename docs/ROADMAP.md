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
10. [x] **N1–N5** Nordamerika (#54): kanadische und US-Biere – N1 Stile (#55) · N2 Klassiker Kanada (#56) ·
    N3 Klassiker USA (#57) · N4 Regionalkatalog Schema + Client (#59) · N5 Pipeline + Crawler (#60, #61) + Live-Import (2026-10-03)
11. [x] **R9** Brauerei-Weltkarte mit eigenem Standort (Wunsch 2026-10-03, vor R7 gezogen) (#64)
12. [x] **R7** Aktualität (monatlicher Pipeline-Dry-Run) (#67)
13. [x] **E2 → E6** Minispiele (E2 #68, E3 #69, E4 #70, E5 #71, E6 #72)
14. [x] **V1 → V3** Verlässliche Biere (Wunsch 2026-10-11, vor C gezogen): V1 Qualitätsstufe · V2 „Problem melden“ an
    jedem Bier · V3 Lieblingsbiere zu Beginn der DNA-Sequenzierung – V1 #73, V2 #74, V3 #75
15. [x] **C2/C3** Pils-Match: Feed, Anstoßen, Blockieren (Absprache 2026-10-11: Vergleich + Anstoßen, Feed nur für Sichtbare) (#78)
16. [x] **D1/D2** Optionale KI-Texte (Absprache 2026-10-11: Workers AI, nur Gratis-Kontingent, Opt-in im Profil) (#79)
17. [x] **E7** Bierquiz allein (Wunsch #45, eingeplant 2026-10-11) (#80)
18. [x] **E8** Bierquiz und „Mitspieler fragen“-Joker im Spielraum (#45, Mehrspieler auf E4) (#85)
19. [x] **E9** „Wer wird Bierionär?“ + Schätzfragen (Wunsch 2026-10-11, vor E8 gezogen) (#81)
20. [x] **V4** Qualitätsstufen verifizieren (Wunsch 2026-10-12, Absprache: nur automatisch): Crawler-Rohdaten → es gibt
    das Bier → alle Daten stimmen (#86)
21. [x] **R10** Brauerei-Profil als Rückfall für Brauereien ohne bekannte Biere (offen aus R0) (#88)
22. [x] **R11** Regional-Snapshots auf dem zweiten Gerät (Sync/Import, offen aus R4) (#89)
23. [x] **R12** Freigegebene Meldungen sofort im Finder statt nach bis zu 30 Tagen Zell-Cache (offen aus R6) (#90)
24. [x] **V5** Plausibilität im Katalog-Build: Alkohol passt nicht zum Stil → Wert verwerfen, Bier bleibt (Wunsch 2026-10-13) (#92)
25. [x] **V6** Korrekturen aus „Problem melden“: Label `korrigieren` setzt Name/Stil/Alkohol, überlebt Importe (#93)
26. [x] **V7** Quellen für die 60 handgepflegten Biere (DE/EU), Alkohol und Stil gegengeprüft, Tests für alle kuratierten (#95)
27. [x] **V8** Crawler-Diagnose: je Website der Grund, warum sie kein Bier liefert – Bericht entscheidet V9 (Wunsch 2026-10-14) (#96)
28. [x] **V9** Crawler-Ausbau nach dem V8-Befund: Erkennung lockern („missed“) + Sitemap/Links („no-beer-page“), dann JS-Seiten und PDF-Karten (Ziel: deutlich mehr als 22 % der Brauereien mit Bier)
29. [x] **V10** Zweite Quellen besser abgleichen: Wikidata-/Open-Food-Facts-Biere zuverlässiger den Brauereien zuordnen → „bestätigt“
30. [x] **V11** Alkohol nachtragen: Detailseiten der Biere lesen, wo die Übersicht keinen Wert zeigt (Voraussetzung für Stufe 3) (#104)
31. [x] **V12** Jede bestätigte Brauerei hat ein Bier: Recherche-Agenten mit Beleg-URL je Bier, zuerst DACH (Wunsch 2026-10-16) (#105)
32. [x] **V13** Bier-Meldungen per Claude-Triage (Skill `bier-triage`) + Nachrecherche der unklaren Brauereien in Baden-Württemberg (Wunsch 2026-10-17) (#109)
33. [x] **V14** Recherchierte Biere der eigenen Website nicht mehr am Crawler-Namensfilter verlieren (Befund nach dem V13-Import) (#110)
34. [x] **V15** Letzte Lücken in BW: fremde http-Belege, Dubletten ausblenden, Nachrecherche (Befund nach dem V14-Import) (#111)
35. [x] **V16** Nachrecherche aller übrigen DACH-Brauereien ohne Bier nach dem BW-Verfahren (#PR)

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
| KI | Optionale KI-Texte (D1/D2): Persona-Roast, „Warum passt es?“ – Opt-in, Standard aus | – |
| Social | Buddy-Link-Vergleich (C1), Pils-Match mit Anstoßen und Blockieren (C2/C3) | – |
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
- [x] R9 **Brauerei-Weltkarte** (Wunsch 2026-10-03): alle Brauereien auf einer einfachen Weltkarte, dazu der eigene
      Standort. Eigene Vektorkarte statt Kartenkacheln – kein Kartendienst sieht, wo man hinschaut (M)
      - umgesetzt (#64): Screen `map` (lazy, Einstieg „Weltkarte aller Brauereien“ im Finder), Umrisse Natural Earth
        1:50m als generierter SVG-Pfad (`src/data/world.ts`, `npm run map:build`, ≈ 67 KB gzip), Projektion/Ansicht/
        Clustering rein in `src/domain/worldMap.ts`. Marker = das PilsBuddy-Glas aus dem App-Icon, Cluster mit Zahl.
        Liste aller Brauereien (`id,name,lat,lon,country`, seitenweise) 30 Tage auf dem Gerät; ein angetipptes Glas
        lädt sein 0,5°-Kartenfeld wie der Finder und öffnet das Brauerei-Sheet. Start: eigener Standort (wenn schon
        erlaubt) bzw. PLZ, sonst das Land der Browsersprache. Keine Migration
- [x] R7 **Aktualität:** monatlicher Pipeline-Dry-Run als PR mit Diff-Bericht, Übernahme nach OK (S)
      - umgesetzt (#67): Workflow „Regional catalogue (monthly)“ (am 1., ruft fetch + Websites auf) baut den Import,
        `npm run catalog:diff` vergleicht ihn mit dem Live-Katalog (öffentliche API, `tools/catalog/diff.ts`), PR
        „Katalog-Stand“ mit `tools/catalog/stand.md`; Merge = OK → „Regional catalogue (import)“ mit genau diesem Lauf,
        nach Freigabe in `production`. CI startet per Dispatch (PR mit `GITHUB_TOKEN`)
- [x] R8 **Bierbibliothek** (Wunsch 2026-10-02): alle Biere durchsuchen und filtern – Name, PLZ/Region, Stil,
      Alkohol, eigene Bewertung; vorkategorisiert nach Stilgruppen (hell · dunkel · Weizen · Hopfen · alkoholfrei).
      Kuratierte Biere offline; Regionalbiere ohne Standort per Name/PLZ-Suche aus `regional_beers` (M)
      - umgesetzt (2026-10-02, #53): Screen `library` (Einstieg als Suchfeld oben in Matches), Logik in
        `src/domain/library.ts` (Stilgruppen, Alkohol-Bänder, Bewertung inkl. „unbewertet“). Offline: kuratierte +
        angefasste Regionalbiere; ab 3 Zeichen sucht `searchRegional` Bier-, Brauerei- und Ortsnamen, eine PLZ die
        Brauereien im Umkreis von 25 km. Keine Migration; die beiden Abfragen stehen in `schema_check.sh`
- [x] R10 **Brauerei-Profil als Rückfall** (offen aus R0, eingeplant 2026-10-12): nur 7 % der Brauereien haben ein Bier
      in offenen Daten. Für die übrigen ein ehrliches Profil der Brauerei (Region, typische Stile des Landes, Gründung) –
      ohne erfundene Biere oder Geschmackswerte (M)
      - umgesetzt (2026-10-13, #88): `src/domain/breweryProfile.ts` – Stile aus dem Namen (nur ausgeschriebene Stile),
        sonst Region aus den Koordinaten (Bierstädte als Kreise, Bayern-Umriss → Franken/Altbayern, Norden), sonst
        Land; im Brauerei-Sheet als „Brauerei-Profil“, in der Finder-Liste als „Typisch hier“. Keine Migration
- [x] R11 **Regional-Snapshots auf dem zweiten Gerät** (offen aus R4, eingeplant 2026-10-12): Bewertungen von
      Regionalbieren (`r-…`) gehen per Sync/Import nicht verloren – fehlende Snapshots werden per ID aus
      `regional_beers` nachgeladen (S–M)
      - umgesetzt (2026-10-13, #89): `restoreRegional` lädt fehlende `r-`-IDs einmal nach (nur IDs, nur veröffentlichte
        Biere), `AppState.beersRev` lässt DNA und Listen neu rechnen; offline beim nächsten Start erneut
- [x] R12 **Freigegebene Meldungen sofort sichtbar** (offen aus R6, eingeplant 2026-10-12): gecachte Finder-Zellen
      zeigen ein freigegebenes Bier heute erst nach bis zu 30 Tagen (S)
      - umgesetzt (2026-10-13, #90): höchstens stündlich fragt der Finder `updated_at > Marke` (nur der Zeitpunkt geht
        raus, Marke = Serverzeit) und lädt nur Zellen mit Änderungen neu; ≥ 500 Änderungen (Import) → alle. Zurückgezogene
        Biere (published = false) sieht RLS nicht – sie verschwinden weiter erst mit dem 30-Tage-Cache

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
      - umgesetzt (#56): 48 Biere aus allen Provinzen + Yukon in `tools/classics/ca.json`, `npm run classics:build`
        schreibt `beers.json`/`beers.en.json`, Test rechnet jedes Profil nach; Workflow „Classics sources“ prüft die
        Quellen. Auswahl, CSV-Korrekturen und Quellen: `docs/research/NORDAMERIKA.md`
- [x] N3 **Klassiker USA** (M): wie N2
      - umgesetzt (#57): 50 Biere aus 23 Bundesstaaten in `tools/classics/us.json` – Volumenmarken (Bud Light,
        Coors, Miller, PBR, Yuengling …) und Craft-Wegbereiter (Pliny, Heady Topper, Two Hearted, Dale's …)
- [x] N4 **Regionalkatalog CA/US – Schema + Client** (M): Länder-CHECKs, Brauerei-IDs `obdb-…`, PLZ-Format
      ZIP/FSA, Auswahl bei gleicher PLZ in DE und USA, Datenschutztext
      - umgesetzt (#59): Migration `north_america` (CA/US, `obdb-<uuid>`, FSA), `src/domain/postcode.ts` kürzt eine
        kanadische PLZ auf dem Gerät auf die FSA; gibt es die PLZ in mehreren Ländern, kommt das Land der
        Browsersprache zuerst, die anderen sind einen Tipp entfernt (Finder und Bibliothek)
- [x] N5 **Pipeline + Crawler CA/US** (L): zentrale Ländertabelle, Open Brewery DB, OSM je Bundesstaat,
      Wikidata/OFF/openbeer/GeoNames, englischer Crawler; Live-Import nach Freigabe
      - umgesetzt (#60): `tools/catalog/countries.json` steuert Skripte, Merge und Workflow; `fetch-obdb.mjs`
        (Brauereien ohne Koordinaten an der Mitte ihrer PLZ), GeoNames US-ZIP + kanadische FSA, `fl oz` im Gebinde,
        englische Firmenwörter beim Namensabgleich, Crawler-Sprachprofil je Land (englische Filter, „6.5% ABV“,
        Zahl am Namensanfang), 12 Shards, Mindestzahl Brauereien je Land; OSM-Abruf parallel je Land/Teil, unvollständige Overpass-Antworten
        werden wiederholt, `05-guard.sql` bricht den Import ab, wenn ein Land > 10 % seiner Brauereien verliert. Live-Import (fetch → import → Websites →
        import) läuft erst nach Freigabe im Environment `production`
      - Nachtrag (#61): Menü-/Event-Text aus US/CA-Websitenamen gefiltert, englisch „Triple“/„Blonde“ richtig zugeordnet
      - live 2026-10-03 (fetch 37062841573, Websites 37102663196, Import 37104983511): 14 055 Brauereien
        (US 10 567 · DE 1 949 · CA 1 046 · CH 268 · AT 225), 10 675 Hauptbiere (US 7 388 · DE 1 733 · CA 1 101 · CH 264 ·
        AT 189), 89 906 PLZ/ZIP/FSA

### Stufe V – Verlässliche Biere (Wunsch 2026-10-11, vor C gezogen)

Viele Regionalbiere sind automatisch gelesen (9 621 von 10 675 nur von Brauerei-Websites), nicht geprüft – dabei
auch Merch („T-Shirt Schwarz“ als Schwarzbier), Überschriften und falsche Werte. Die kuratierten Biere sind recherchiert.

- [x] V1 **Qualitätsstufe** (#73) je Bier, berechnet aus den Belegen: 0 fraglich (nur alte openbeer-Liste, oder weder Stil
      noch Alkohol) · 1 gefunden (eine aktuelle Quelle) · 2 bestätigt (Strichcode/Wikidata oder zwei Quellen, Alkohol
      bekannt) · 3 geprüft (von Hand recherchiert = kuratierte Biere). Spalte `regional_beers.quality`, Pipeline filtert
      Merch/Hashtags/Award-Zeilen und säubert Layout-Reste im Namen; Detail zeigt die Datenlage; die erste
      Sequenzierung (Referenz-Set) nur mit geprüften Bieren, „fraglich“ nie im Deck (M)
- [x] V2 **„Problem melden“** an jedem Bier (falsches Bier, falsche Werte, gibt es nicht) → Issue wie das Feedback (S–M)
      - umgesetzt (#74): Detail-Seite unten „Problem mit diesem Bier melden“ – Auswahl (kein Bier · gibt es nicht ·
        Stil/Alkohol falsch · Brauerei/Ort falsch · doppelt · anderes) + Notiz; Feedback-Tabelle mit `type = 'beer'`,
        Bot → Issue `bier-problem` mit Katalogdaten; Label `ausblenden` → `regional_beers.hidden` (überlebt den Import)
- [x] V3 **Lieblingsbiere zuerst:** vor dem Referenz-Set nach Lieblingsbieren fragen (Suche in Katalog + Regionalbieren);
      gefundene zählen als „Mag ich“, fehlende gehen als „Bier fehlt“-Meldung (R6) raus (M)
      - umgesetzt (#75): Screen `favorites` zwischen Anleitung und erstem Swipe (nur bei leerem Profil, optional):
        Suche kuratiert offline (`domain/favorites.ts`, Rangfolge Name > Wortanfang > Brauerei) + ab 3 Zeichen
        Regionalbiere (nicht „fraglich“), bis 5 Favoriten → „Mag ich“ (nie über eine vorhandene Bewertung);
        „Nicht dabei? Bier melden“ öffnet die R6-Meldung mit dem Suchtext als Biername
- [x] V4 **Qualitätsstufen verifizieren** (#86) (Wunsch 2026-10-12, Absprache: nur automatisch, kein Handschritt): die Stufen
      bedeuten 1 gefunden = Rohdaten des Crawlers (eine Quelle) · 2 bestätigt = es gibt das Bier (Strichcode, Wikidata
      oder zwei unabhängige Quellen; Alkohol nicht mehr nötig) · 3 geprüft = alle Daten stimmen (Stil bekannt, Alkohol
      von zwei Quellen übereinstimmend, keine Quelle widerspricht) – oder von Hand recherchiert (kuratiert). Regionalbiere
      können jetzt 3 erreichen; Widersprüche halten ein Bier auf 2 (S–M)
- [x] V5 **Plausibilität im Katalog-Build** (#92) (Wunsch 2026-10-13, Absprache: unplausibler Wert wird verworfen, das
      Bier bleibt): `ABV_RANGE` je Stil in `styleProfile.ts`, `tools/catalog/plausible.ts` prüft jeden Kandidaten vor der
      Auswahl – Stammwürze als Alkohol („Maibock 17,5“), Gebinde als Alkohol („Hell 1,0“), sonst außerhalb des Stils.
      Überschriften („Non-Alcoholic Offerings“, „Unser Sortiment“) sind kein Bier. Der Bericht (`report.txt` →
      „Katalog-Stand“-PR) zählt das Verworfene mit Beispielen. Live erst mit dem nächsten Import (S)
- [x] V6 **Korrekturen aus „Problem melden“** (#93): Spalte `regional_beers.correction` (Name, Stil, Alkohol), nie vom Import
      gesetzt; Label `korrigieren` am `bier-problem`-Issue → `tool/feedback_bot.py` setzt sie, der Client legt sie über die
      Importwerte (Stufe 3) (M)
      - umgesetzt (2026-10-14, #93): Migration `20261014120000_beer_corrections` (CHECK: nur `name`/`style`/`abv`, Alkohol
        0–20), Issue bekommt einen Abschnitt „Korrektur“ (Name/Stil/Alkohol), der Bot prüft Stil gegen `STYLE_PROFILES` und
        Alkohol gegen `ABV_RANGE`; `applyCorrection` im Client nimmt nur stimmige Werte. Kuratierte Biere weiter von Hand
- [x] V7 **Quellen für die handgepflegten Biere** (#95): `tools/classics/eu.json` mit Quelle, Prüfdatum, belegtem Alkohol und Stil
      für die 60 Biere ohne Herkunft; Tests: jedes kuratierte Bier hat eine Quelle, Stil bekannt, Alkohol in `ABV_RANGE` (M)
      - umgesetzt (2026-10-14, #95): 60/60 noch gebraut, Stile stimmen; korrigiert BRLO Pale Ale 5,5 → 5,0, Peroni
        Nastro Azzurro 5,1 → 5,0, Berliner Kindl Weisse 2,5 → 3,0. Details und schwächere Quellen: `docs/research/EUROPA.md`
- [x] V8 **Crawler-Diagnose** (#96) (Wunsch 2026-10-14: „sehr viele Brauereien ohne Bier und viele Biere mit niedriger
      Qualitätsstufe“): nur 3 037 von 14 086 Brauereien (22 %) haben ein Bier, obwohl 10 474 eine Website haben; der
      Crawler fand auf ≈ 2 500 von ≈ 9 600 Websites Biere, ≈ 1 900 antworteten nicht. `tools/catalog/diagnose.ts` gibt
      jeder Website einen Grund (robots · offline · blocked · http-error · not-html · offsite · beers · widget · js · pdf ·
      no-beer-page · unnamed · missed) samt Baukasten und Stilnamen auf der Seite; Job „Crawler diagnosis“ fasst das je
      Land zusammen (Artefakt `crawl-diagnosis`). Ändert den Katalog nicht (S)
      - Befund (2026-10-14, Lauf 38636176948, 9 677 Websites): Biere 2 498 (26 %) · **no-beer-page 1 785 (18 %)** – keine
        Bierseite verlinkt, keine Stilnamen auf der Startseite · **missed 1 352 (14 %)** – Stilnamen stehen da, die Erkennung
        nimmt keinen (871 Seiten mit ≥ 5 Stilnamen) · offline 900 (DNS 548 – oft aufgegebene Brauereien, 39 auf hugedomains) ·
        blocked 717 (fast nur 403, Bot-Schutz – wird respektiert) · js 660 · unnamed 548 (Bierseite ohne Stilwort) ·
        widget 499 (Untappd 374) · http-error 304 · pdf 244 (DE 71) · robots 139. Baukästen ohne Bier: WordPress 1 268 ·
        Squarespace 976 · Wix 603. US 18 % mit Bier der Websites, DE 34 %
- [x] V9 **Crawler-Ausbau** nach dem V8-Befund, in dieser Reihenfolge: (a) Erkennung über h1–h4 hinaus (h5/h6, Produkt-
      kacheln, Listen) mit denselben Filtern – Zielgruppe „missed“; (b) `sitemap.xml` und mehr Link-Wörter für die Bierseite –
      „no-beer-page“; (c) PDF-Getränkekarten als Text; (d) JS-Seiten nur, wenn (a)–(c) nicht reichen (Headless-Browser im
      CI). Untappd-Widgets nicht auslesen (Nutzungsbedingungen), Bot-Schutz nicht umgehen (M)
      - [x] (a) Blöcke (Kacheln, Listen, Tabellen, h5/h6) ab zwei Bieren pro Seite, Stil-Untertitel und Archivseiten
            ausgelassen, echte Namen vor reinen Stilzeilen: Websites mit Bier 26 → 35 %, Brauereien 2 787 → 3 801 (#97)
      - [x] (b) Getränke-/Menü-Links (schwächer als Bier-Links, ohne Speisen/Wein/Cocktails), `sitemap.xml` als Rückfall,
            Gastbiere (große Marken, „Brauerei – Bier“ anderer Katalog-Brauereien) und Speisen/Wein aussortiert, Diagnose
            `page-failed`: Websites mit Bier 35 → 39 %, „no-beer-page“ 1 794 → 1 081, Brauereien 3 761 → 4 167 (#99)
      - [x] (c) PDF-Getränkekarten (eigene Website oder Datei-Host des Baukastens, ≤ 2 je Website, nur ohne Bier im HTML)
            als Text in Zellen wie eine Tabelle; Speisen, umbrochene Beschreibungen und Auswahlzeilen aussortiert:
            Websites mit Bier 39 → 40 % (94 über PDF), „pdf“ 230 → 148 (#100)
      - [x] (d) JS-Seiten (Signal „js“, ohne Tap-Listen-Widget, ohne Bier aus HTML/PDF) in Chromium gerendert – Startseite
            + ≤ 2 Bierseiten, eigener User-Agent, ohne Bilder/Schriften, Untappd & Co. blockiert: 596 gerendert, 88 mit Bier,
            „js“ 609 → 508, Websites mit Bier 40 → 41 % (#101)
- [x] V10 **Zweite Quellen abgleichen:** Wikidata kennt 8 939 Biere, Open Food Facts 2 534 – als Bestätigung zählen nur
      wenige hundert. Zuordnung zur Brauerei über Wikidata-ID, Marke und Ort verbessern, OFF für alle Länder (M)
      - umgesetzt (2026-10-15, #102): Website der Wikidata-Brauerei (P856), Wikidata-Brauereinamen Wort für Wort (bisher
        z. B. „Hop Butcher“ → „World of Beer“), Firmen mit mehreren Einträgen (gleiche Website / ein Wikidata-Eintrag),
        Name ohne Ort, kurze Wörter und Zahlen zählen, „-er“ nur als ganze Marke, OFF-Marke aus dem Namen (Brauerei + Stil),
        Produkt außerhalb des Brauerei-Landes nur mit exaktem Namen, `off-other.json` (7 087 Biere, nur Wikidata-Brauereien);
        Zwillinge über Quellen (`twinKey`), bestätigte Biere zuerst. Gleiche Rohdaten: geprüft 13 → 28, bestätigt 811 → 1 034,
        Wikidata-Biere mit Brauerei 7 730 / 9 014. Grenze: nur ≈ 500 Brauereien haben eine zweite Quelle
- [x] V11 **Alkohol nachtragen:** nur 43 % der Regionalbiere haben einen Alkoholwert; Detailseiten der Biere lesen (S–M)
      - umgesetzt (2026-10-16, #104): Detailseite über Linktext = Biername oder Pfad-Slug (keine andere Variante),
        ≤ 8 je Website; Wert nach dem Namen; „Alkohol: 5,2 %“ auch auf der Übersicht, beschriftet vor „x % vol“.
        Gleiche übrige Rohdaten: Hauptbiere mit Alkohol 48 → 57 % (8 911 → 10 943), „Stammwürze statt Alkohol“ 231 → 184,
        geprüft 28 → 49; 4 873 Detailseiten, 2 911 mit Wert
- [x] V12 **Jede bestätigte Brauerei hat ein Bier** (Wunsch 2026-10-16; Absprache: zuerst DACH, Nordamerika danach;
      keine Brauerei → mit Beleg ausblenden; zwei Stufen: Sonnet über alle, Opus über die von Sonnet offen gelassenen): Agenten recherchieren je Brauerei ohne Bier die eigenen
      Biere (Website, Shop, Bierportale, Brauereiführer), ein zweiter Agent öffnet jede Beleg-URL erneut. Ergebnis als
      Daten im Repo (`tools/catalog/research/*.json`), der Build macht daraus Website-Biere (eigene Seite) oder Quelle 6
      „Recherche“ (andere Seite, Link am Bier), höchstens 3 je Brauerei; Qualität wie immer berechnet. „geschlossen“/„keine eigene Brauerei“ mit
      Beleg und Wikidata-Einträge ohne Website und ohne Bier (Baudenkmäler, längst geschlossene) werden nicht veröffentlicht;
      der Import-Schutz zählt den Download vor diesem Ausblenden (M)
      Ergebnis DACH (1 183 Brauereien ohne Bier): 610 mit Bier (2 141 Biere mit Beleg; Sonnet 410, Opus 200),
      65 ausgeblendet, 508 bleiben unklar (keine Web-Präsenz, Karten als Bild). Wirkt erst mit dem nächsten Katalog-Import
- [x] V13 **Bier-Meldungen per Claude-Triage + Nachrecherche BW** (#109) (Wunsch 2026-10-17: „ein reiner Crawler ist dafür zu
      starr“; Absprache: Triage auf Zuruf, Meldungen werden dabei freigegeben, Lücken über die V12-Recherche statt Issues):
      Skill `bier-triage` – Meldung gegen die Seite prüfen, korrigieren, Duplikate (live + `research/*.json`) schließen, sonst
      Label `freigegeben` (der Bot trägt ein, Qualität 2). Erste Triage: #106/#107 eingetragen (`r-app106/107`), #108 kommt mit
      V12. Nachrecherche der 57 BW-Brauereien ohne Bier, die V12 offen ließ (Opus, Faktencheck je Beleg-URL): 28 mit
      171 Bieren, 17 ausgeblendet (geschlossen / kein eigenes Bier), 4 Dubletten. BW-Brauereien ohne Bier (live 129):
      nach V12 63, nach V13 35 – davon 22 ausgeblendet, 13 bleiben unklar. Wirkt mit dem nächsten Katalog-Import (S)
- [x] V14 **Recherchierte Biere nicht mehr verlieren** (#110) (Befund 2026-10-17 nach dem V13-Import: in BW 26 statt 13
      Brauereien ohne Bier): Recherche-Biere auf der eigenen Website liefen durch `beerName()` wie gecrawlte Überschriften
      (Stilwort im Namen, keine führende Ziffer) – „Urvogel“, „1250er“, „Aufruhr“ fielen heraus. Jetzt `researchedWebRows`:
      nur `cleanName` + Gastbier-Filter, gecrawlte Zeilen unverändert. Gleiche Recherche: Website-Biere 547 → 896, Brauereien
      266 → 366 (DACH). Wirkt mit dem nächsten Katalog-Import (S)
- [x] V15 **Letzte Lücken in BW** (#111) (Befund 2026-10-17 nach dem V14-Import: in BW 13 Brauereien ohne Bier):
      Engel Rastatt verlor alle Recherche-Biere – Beleg `http://engel-rastatt.de`, die Website in OSM ist eine andere
      Domain, und fremde Links zählen nur über https. Gleicher Fall in DACH: Huber Bräu, Braukeller Pulsnitz, Traquenard
      (Belege auf https umgestellt, je Seite neu abgerufen); Rosengarten Einsiedeln bleibt (Seite antwortet 406). Der Build
      listet solche Einträge jetzt („Recherche ohne verwertbares Bier“). Neuer Status `duplicate` (ausgeblendet, nur mit
      Beleg) für 4 Dubletten (Ochsen = Spall, Hotel Adler = Dachsenfranz, Vater Strauss, Schwert Ehingen). Nachrecherche
      der 8 unklaren (Opus, Untappd-Suche, jede Beleg-URL neu geöffnet): Alte Werkstatt, TOMO Bräu, Beermanufaktur Heger,
      Ostel Bräu mit Bieren; Löffler Hardheim geschlossen (2021); Wirtshaus zum Farren = Farrenbräu (Dublette, Biere bei
      Farrenbräu ergänzt); Weißbier-Biergarten und Hausbrauerei Königsbronn bleiben unklar. BW-Brauereien ohne Bier:
      erwartet 2 statt 13. Wirkt mit dem nächsten Katalog-Import (S)
- [x] V16 **Nachrecherche DACH** (#PR) (Wunsch 2026-10-17: BW-Verfahren auf alle Bundesländer, effizient, ein PR):
      459 veröffentlichte Brauereien ohne Bier (DE ohne BW 366, AT 40, CH 53, alle zuvor Sonnet-„unklar“), 31 Pakete à 15
      (Opus, Dubletten-Kandidaten im 300-m-Umkreis + Namenssuche im Live-Katalog), Faktencheck je Paket, danach ein
      BeerTasting/Untappd-Nachlauf über die übrigen unklaren. Ergebnis: 236 mit Bieren, 18 geschlossen, 13 ohne eigenes
      Bier, 31 Dubletten, 161 bleiben unklar (DE 195/16/11/28/116 · AT 19/1/1/1/18 · CH 22/1/1/2/27). 4 Brauereien mit
      nur per http erreichbaren Belegseiten verlieren ihre Biere im Build (Bericht „Recherche ohne verwertbares Bier“).
      Neue Regeln: Lohngebraute Eigenmarken behalten ihre Biere; vorübergehende Pause ≠ geschlossen. Wirkt mit dem
      nächsten Katalog-Import (M)

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
- [x] E2 **Wie viel ist drin?** Füllmenge schätzen; Volumen aus der Glasform (Rotationskörper) berechnet –
      Stange, Tulpe, Weizen, Maß, Willibecher (M) (#68)
- [x] E3 **Flaschen-Memory** mit den animierten Flaschen; Variante Flasche ↔ Bierstil (S) (#69) – 8 Paare,
      Ziel 2 Züge je Paar (Sieg), Bestwert je Variante im Profil
- [x] E4 **Mehrspieler-Gerüst:** Raum per Code/QR über Supabase Realtime (Broadcast + Presence, anonym),
      Gastgeber hält den Spielzustand (M) (#70) – Regeln rein in `domain/games/room.ts` (Snapshots mit
      Laufnummer, Wünsche der Gäste), Netz lazy in `sync/room.ts`, ohne Tabelle und ohne Anmeldung; bis 8 am
      Tisch, Einladung per `?room=`; erste gemeinsame Runde: Anstoßen, wenn alle bereit sind
- [x] E5 **Quartett zu zweit** und „Wie viel ist drin?“ für alle im Raum auf E4 (M) (#71) – Regeln rein in
      `domain/games/party.ts`, der Gastgeber teilt aus (gebündelte Biere als Deck) und wertet; Quartett nur zu
      zweit (Dritte schauen zu), Schätzen für bis zu 8: alle schätzen, Auflösung von selbst oder per Gastgeber,
      Rangliste am Ende; geht ein Quartett-Spieler, zurück an den Tisch. Zählt nicht in die Solo-Statistik
- [x] E6 **Tasting-Abend:** Gastgeber startet, alle bewerten dasselbe Bier, gemeinsame Auflösung (M) (#72) – Regeln
      rein in `domain/games/tasting.ts`; Bier aus dem Katalog oder per Hand, reist mit Name/Profil im Snapshot;
      Sterne 1–5 + Bittere/Körper/Süße, Auflösung von selbst oder per Gastgeber, Tisch-Schnitt gegen das Profil,
      Streitbier ab 2 Sternen Abstand; bis 12 Biere, Abschluss mit Liebling des Abends; Urteil auf Wunsch in die
      eigenen Bewertungen (4–5 „Mag ich“, 1–2 „Nicht meins“)
- [x] E7 **Bierquiz** allein (Wunsch #45) (S) (#80) – Regeln rein in `domain/games/quiz.ts`: 10 Fragen mit je 4
      Antworten zum Mitlernen. 7 aus geprüftem Wissen (`COPY.quiz.facts`, de + en, 64 Fragen in fünf Themen:
      Geschichte, Herstellung, Reinheitsgebot & Recht, Sortenkunde, Zutaten – jedes Thema mindestens einmal pro
      Quiz, Wunsch 2026-10-11), 3 aus den kuratierten Bierdaten (Land, Stil ohne Fast-Zwillinge, stärkstes von vier
      mit ≥ 0,5 % Abstand); nach jeder Antwort die Auflösung mit einem Satz dazu, Sieg ab 7 richtig, Bestwert im Profil
- [x] E8 **Bierquiz im Spielraum** (#45) auf E4 (M) (#85) – Regeln rein in `domain/games/quizparty.ts`: Gastgeber
      teilt dieselben Fragen (Seed, seine Sprache) aus und schickt sie im Snapshot mit, alle antworten, Auflösung von
      selbst oder per Gastgeber, Rangliste am Ende. Dazu „Wer wird Bierionär?“ am Tisch: der Gastgeber setzt jemanden
      auf den Ratestuhl, alle sehen das Studio (`BierStudio.tsx`, geteilt mit E9), und der vierte Joker
      „Mitspieler fragen“ lässt die anderen abstimmen (schließt von selbst, wenn alle abgestimmt haben, oder per
      Kandidat/Gastgeber). Zählt nicht in die Solo-Statistik
- [x] E9 **„Wer wird Bierionär?“** (Wunsch 2026-10-11) (M) (#81) – Regeln rein in `domain/games/bierionaer.ts`:
      15 Fragen leicht → schwer (Stufe 1–3 je Frage im Katalog), Gewinnleiter in Kronkorken 50 … 1 000 000,
      Sicherheitsstufen nach Frage 5 und 10, Aussteigen jederzeit; Joker 50:50, Stammtisch (Abstimmung, bei schweren
      Fragen öfter daneben), Braumeister (Tipp, mal sicher, mal nicht) – per Seed deterministisch. Studio im
      PilsBuddy-Look (immer dunkel, Gold), Einloggen mit Spannungspause. Dazu 16 **Schätzfragen** (Zahlen, A/B
      oder 4-fach) im gemeinsamen Katalog – auch im Bierquiz

## Stufe C – Pils-Match (Social)

- [x] C1 Buddy-Link ohne Backend: `?buddy=<base64url(Buddy-Nr., Bewertungen)>` – Geschmack/Persona
      rechnet der Empfänger selbst; Vergleich in Matches › Menschen (Prozent, gemeinsame Herzbiere,
      Streitbiere, Tipps), Einladung per Share/Zwischenablage, Hinweis auf Welcome und im DNA-Screen
- [x] C2 Feed über Edge Function `match-candidates` (nur `visible`-Profile; keine Fotos, keine
      Persönlichkeitsbewertung) (L) – Vergleich wie beim Buddy-Link, „Anstoßen 🍻“: beide angestoßen = Buddys (#78)
- [x] C3 Opt-in, Handle, Blockieren; kein Chat (S) – Feed nur für selbst Sichtbare, Sync-Aus macht unsichtbar (#78)

## Stufe D – Optionale KI-Schicht

- [x] D1 `src/ai/provider.ts`: `disabled` (Default, deterministische Texte) · `ollama` · `cloud`;
      Zugriff nur über `useAiText()`, nie aus Komponenten (S) – Schalter „KI-Texte“ im Profil (#79)
- [x] D2 Cloudflare Workers AI hinter `/api/ai`, Rate-Limit, Persona-Roast + „Warum passt es zu mir?“ (M) –
      `worker/index.ts`: nur die zwei festen Anfragen, Cache, Tagesdeckel je Worker (Durable Object) unter dem
      Gratis-Kontingent, 4 Anfragen pro Gerät und Minute; die KI-Texte stehen zusätzlich unter den festen (#79)

Invariante: DNA, Matching, Persona, Avatar bleiben KI-frei.
