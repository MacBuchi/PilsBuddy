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
| Spaß beim ersten Öffnen | Welcome, Onboarding mit Gesten-Karten | Swipe-Anleitung nur vorab auf einem Textscreen |
| Bier-Swipe | Touch/Maus/Tasten/Buttons, Stempel, Fly-out | kein Undo |
| Bierdatenmodell | 42 Biere, 8 Achsen, `image` optional | keine Bilder; Referenz-Set Pils-lastig |
| DNA / Persona / Matching | deterministisch, getestet | Deck nach Onboarding unkuratiert; „nächstes Bier“ mobil nur im Matches-Tab |
| Avatar | 8 Archetypen, 3 Stufen | Entwicklung endet bei 70 % |
| Gamification | 9 Achievements, Toast | kein Moment beim Freischalten |
| Humor | Copy-Bank, Quips je Rating | 4 Biere mit `disLikeQuip`; Wiederholung nach ~15 Swipes |
| WANT_TO_TRY | Interesse-Signal | keine Probierliste |
| Persistenz | localStorage, versioniert | kein Export/Import, kein Offline |
| Share | Text | keine Share-Card |
| Social | `buddyMatch()` vorbereitet | keine UI, kein Backend |
| Qualität | Domain-/Storage-Tests, E2E ad hoc | keine Reducer-/Komponententests, kein CI |

## Stufe A – Spaß & Nutzbarkeit (kein Backend)

Reihenfolge: A0 → A1 → A2 → A9 → A3 → A4 → A5 → A6 → A7 → A8.

### A0 · Swipe-Anleitung auf der ersten Karte (S)

- [ ] `SwipeCoach.tsx`: Richtungs-Chips am Kartenrand in den Aktionsfarben + „Geister-Hand“, die
      die echte Karte einmal nach rechts kippt (`SwipeDeck`-Prop `coachOffset`)
- [ ] verschwindet beim ersten `pointerdown`/Commit; „?“ im Swipe-Header öffnet Gesten-Legende
      (`GestureLegend.tsx`, auch in `Howto.tsx` verwendet)
- [ ] Copy unter `coach` in `data/copy.ts`; reduced-motion: statische Chips

Akzeptanz: erste Karte zeigt Chips + Hand, danach weg; „?“ öffnet Legende; E2E grün.

### A1 · Bier-Visuals: Flaschenfotos + Illustrations-Fallback (M–L)

Teil 1 – Recherche & Extraktion

- [ ] `tools/bottles/fetch.mjs` prüft je Bier Wikimedia Commons (Lizenz via `extmetadata`) und
      Presse-/Mediabereiche; Ergebnis in `tools/bottles/sources.json` (id, url, lizenz, urheber, geprüft am)
- [ ] Fotos freistellen (`rembg`), 600 px, → `public/bottles/<id>.png`; `docs/BILDNACHWEIS.md`
- [ ] `beers.json`: `image` + `imageCredit`; Credit im Detail-Screen

Rechtlicher Rahmen: Markenrecht erlaubt die Abbildung eines Produkts zur Beschreibung ebendieses
Produkts; das Foto selbst braucht eine Lizenz → nur CC-/Pressefotos, keine Shop-Bilder.

Teil 2 – Illustrations-Fallback

- [ ] `domain/bottle.ts`: `buildBottle(beer) → BottleSpec` (Form je Stil, Etikettfarbe aus `color`)
- [ ] `BottleArt.tsx` (SVG) in BeerCard, Detail, Match, Matches, Profile, DesktopFrame; Platzhalter raus

Akzeptanz: kein „Flaschenfoto“-Text mehr; `sources.json` vollständig; dunkle Biere lesbar; Bundle < +1,5 MB.

### A2 · Undo („Zurückholen“) (S)

- [ ] Reducer `UNRATE` + `lastRated`; Rewind-Button + `Backspace`; Rückflug-Animation im `SwipeDeck`
- [ ] Copy „Zurückgeholt. Wir sagen nichts.“; `reducer.test.ts`

Akzeptanz: Undo im Deck und nach Detail-Bewertung; Zähler/DNA gehen zurück.

### A3 · Kuratiertes Deck, breiteres Referenz-Set, mehr Biere (M)

- [ ] Referenz-Set auf 14 Biere über alle Achsen (Weißbier, Dunkles, IPA, Leichtes, Belgier);
      `DECODE_TARGET` an Set-Größe koppeln
- [ ] Datensatz auf ~60 Biere (Alkoholfrei, Craft DE, International, Regional), alle mit `disLikeQuip`
- [ ] `deckQueue`: nach Onboarding 2 × „Für dich“ : 1 × „Mal was anderes“, deterministisch; Badge auf der Karte

Akzeptanz: Onboarding fragt alle Stilfamilien ab; 100 % nach dem Referenz-Set; Badges sichtbar.

### A4 · Probierliste + „Nächstes Match“ im Header (M)

- [ ] Segment „Probierliste“ in Matches; „Probiert!“ → `RateSheet` (Mag ich / Nicht meins / Kenn ich)
- [ ] Achievement „Wort gehalten“ (3 nachbewertet); `RatingEntry.previous`
- [ ] Swipe-Header-Chip „Nächstes Match: … · 93 %“ → Detail

Akzeptanz: Nachbewertung entfernt aus Liste und aktualisiert DNA; Chip öffnet Detail.

### A5 · Humor- und Copy-Bank (S)

- [ ] 10–12 Quips je Rating, Meilensteine (10/20/30, erstes Weißbier, Kultbier abgelehnt), Persona-Zeilen
- [ ] Detail: „Warum passt es zu dir?“ deterministisch aus `matchReason` + Achsen-Abweichungen
- [ ] Test: keine Wiederholung in 10 Swipes gleichen Ratings

### A6 · Avatar-Entwicklung & Momente (M)

- [ ] Sticker aus Achievements, Schaumhöhe = Aktivität 7 Tage, Stufe „Stammgast“ (Untersetzer)
- [ ] `MomentOverlay` für Achievement und DNA-100 % (einmalig, `seenAchievements` persistiert)
- [ ] Hinweis nach der ersten Karte („Noch 13, dann kennen wir dich.“)

### A7 · Share-Card (S)

- [ ] Canvas 1080×1350 mit Avatar, Persona, DNA-Balken, Top-3; Web Share mit Datei, sonst Download

### A8 · PWA/Offline + Export/Import (S)

- [ ] `public/sw.js` (Precache aus Vite-Manifest, Network-first für `/`), nur in PROD registriert
- [ ] iOS-Install-Hinweis einmalig; Profil-Export/Import (JSON) im Profil

### A9 · Qualität & Auslieferung (S)

- [ ] `reducer.test.ts`, `SwipeDeck.test.tsx`
- [ ] GitHub Actions: `ci.yml` (lint/test/build), `deploy.yml` (main → `wrangler deploy`;
      Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- [ ] Dark-Mode-Kanten gesperrter Achievements, `aria-live` am Bottom-Toast, Fokus-Ring auf der Karte

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
