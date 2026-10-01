# PilsBuddy – Roadmap nach dem MVP

Stand: 2026-10-01 · Live: <https://pilsbuddy.mcbuchi.de> · MVP (Phasen 1–12 des Briefs) ist fertig.

Reihenfolge folgt der Produktpriorität des Konzepts: erst Spaß & Nutzbarkeit lokal (A), dann
Backend (B), dann Pils-Match (C), dann optionale KI (D). Vorgezogen auf Wunsch: Minispiele (E1) und
**Biere aus deiner Nähe (R) – nächste Stufe**, danach E2–E6, C2/C3, D. Jedes Paket ist für sich releasebar und
endet mit dem Gate: `npm run build` · `npm test` · `npm run lint` · `e2e/flow.mjs` · Screenshots
mobil + desktop · `npm run deploy` · Häkchen hier setzen · Commit.

Aufwand: S ≈ ½ Tag · M ≈ 1–2 Tage · L ≈ 3+ Tage.

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
- [ ] Auto-Deploy aktivieren: Repo-Secrets `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“)
      und `CLOUDFLARE_ACCOUNT_ID` setzen – bis dahin überspringt der Job und `npm run deploy` gilt
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
- [ ] R5 **Regional im Alltag:** Regional-Modus im Swipe-Deck (jede 3. Karte aus dem Umkreis),
      Achievement „Lokalpatriot“, Share-Card-Zeile (M)
- [ ] R6 **„Bier fehlt? Eintragen“:** `beer_submissions` mit Freigabe-Queue, Limit je anonymer Session (M)
- [ ] R7 **Aktualität:** monatlicher Pipeline-Dry-Run als PR mit Diff-Bericht, Übernahme nach OK (S)

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
