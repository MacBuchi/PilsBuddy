# PilsBuddy – Roadmap nach dem MVP

Stand: 2026-10-01 · Live: <https://pilsbuddy.mcbuchi.de> · MVP (Phasen 1–12 des Briefs) ist fertig.

Reihenfolge folgt der Produktpriorität des Konzepts: erst Spaß & Nutzbarkeit lokal (A), dann
Backend (B), dann Pils-Match (C), dann optionale KI (D). Jedes Paket ist für sich releasebar und
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
| Avatar | 8 Archetypen, 3 Stufen | Entwicklung endet bei 70 % |
| Gamification | 10 Achievements, Toast | kein Moment beim Freischalten |
| Humor | 12 Quips je Rating, Meilensteine, Persona-Zeilen, `disLikeQuip` für alle | – |
| WANT_TO_TRY | Interesse-Signal, Probierliste mit Nachbewertung | – |
| Persistenz | localStorage, versioniert | kein Export/Import, kein Offline |
| Share | Text | keine Share-Card |
| Social | `buddyMatch()` vorbereitet | keine UI, kein Backend |
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
- [ ] Designs als `public/bottles/<id>.png` (600 × 1200, transparent, gleiche Bodenlinie) ablegen
- [ ] `beers.json`: `image: "/bottles/<id>.png"` eintragen; Rendering in BeerCard/Detail/Match
      prüfen (Objektgröße, Schatten, dunkle Biere)

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

### A6 · Avatar-Entwicklung & Momente (M)

- [ ] Sticker aus Achievements, Schaumhöhe = Aktivität 7 Tage, Stufe „Stammgast“ (Untersetzer)
- [ ] `MomentOverlay` für Achievement und DNA-100 % (einmalig, `seenAchievements` persistiert)
- [ ] Hinweis nach der ersten Karte („Noch 13, dann kennen wir dich.“)

### A7 · Share-Card (S)

- [ ] Canvas 1080×1350 mit Avatar, Persona, DNA-Balken, Top-3; Web Share mit Datei, sonst Download

### A8 · PWA/Offline + Export/Import (S)

- [ ] `public/sw.js` (Precache aus Vite-Manifest, Network-first für `/`), nur in PROD registriert
- [ ] iOS-Install-Hinweis einmalig; Profil-Export/Import (JSON) im Profil

### A9 · Qualität & Auslieferung (S) ✅

- [x] `reducer.test.ts`, `SwipeDeck.test.tsx` (64 Tests gesamt)
- [x] GitHub Actions `ci.yml`: Lint · Test · Build → E2E-Flow gegen `vite preview` → Deploy (nur `main`)
- [ ] Auto-Deploy aktivieren: Repo-Secrets `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“)
      und `CLOUDFLARE_ACCOUNT_ID` setzen – bis dahin überspringt der Job und `npm run deploy` gilt
- [x] Dark-Mode-Kanten gesperrter Achievements, `aria-live` am Bottom-Toast, Fokus-Ring + Enter auf der Karte

## Stufe B – Backend (Supabase, Free Tier) – nach A0–A4

- [ ] B1 Projekt `pilsbuddy` (eu-west-1) + Migrationen: `profiles`, `ratings`, `beers`; RLS; Advisor grün (S)
- [ ] B2 Anonyme Auth + `supabaseStore` (gleiches `ProfileStore`-Interface), Merge „neueste `at` gewinnt“,
      localStorage bleibt Offline-Quelle (M)
- [ ] B3 Bierkatalog aus DB mit JSON-Fallback (S)
- [ ] B4 Impressum/Datenschutz, „Alles löschen“ serverseitig (S)

## Stufe C – Pils-Match (Social)

- [ ] C1 Buddy-Link ohne Backend: `?buddy=<base64url(taste, likes, archetype)>` → `BuddyCompare` mit
      `buddyMatch()`; kann schon in Stufe A (S)
- [ ] C2 Feed über Edge Function `match_candidates` (nur `visible`-Profile; keine Fotos, keine
      Persönlichkeitsbewertung) (L)
- [ ] C3 Opt-in, Handle, Blockieren; kein Chat (S)

## Stufe D – Optionale KI-Schicht

- [ ] D1 `src/ai/provider.ts`: `disabled` (Default, deterministische Texte) · `ollama` · `cloud`;
      Zugriff nur über `useAiText()`, nie aus Komponenten (S)
- [ ] D2 Cloudflare Workers AI hinter `/api/ai`, Rate-Limit, Persona-Roast + „Warum passt es zu mir?“ (M)

Invariante: DNA, Matching, Persona, Avatar bleiben KI-frei.
