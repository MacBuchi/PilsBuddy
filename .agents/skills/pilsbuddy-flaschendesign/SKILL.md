---
name: pilsbuddy-flaschendesign
description: Neue Bierflaschen-Charaktere im PilsBuddy-Look gestalten, als SVG exportieren und in die App bringen – Flaschenform, Glas, Etikett, Gesicht, Geste. Immer verwenden, wenn ein Bier ergänzt wird (beers.json), eine Flasche umgestaltet, ein Steckbrief in eine Flaschengrafik übersetzt, eine Flasche als SVG exportiert oder ein Bier in der Galerie noch „gezeichnet“ ist.
---

# PilsBuddy Flaschendesign

Jede Flasche ist ein freundlicher Charakter im Bierdeckel-Look: dicke Kontur (#1D1811), harter
Versatzschatten, Bierfarbe wie eingeschenkt, Gesicht mit eigener Geste. Charmant und selbstironisch,
nie gemein.

## Wo was liegt

| Was | Pfad |
|---|---|
| Generator (Quelle der Wahrheit) | `docs/pilsbuddy-mobile-app-design/flaschen/bottles.js` |
| Vorschau + Export-Seite | `docs/pilsbuddy-mobile-app-design/flaschen/PilsBuddy Flaschen.dc.html` (+ `support.js`) |
| Roh-Export aus dem Design (Schriften voll eingebettet, ~150 KB) | `docs/pilsbuddy-mobile-app-design/bottles/<id>.svg` |
| Optimierte Flaschen für die App (~15 KB) | `public/bottles/<id>.svg` |
| Optimierer (Schriften auf benutzte Zeichen reduzieren) | `tools/bottles/optimize.py` |
| Bierdaten / Steckbriefe | `src/data/beers.json`, `docs/FLASCHEN.md` |
| Galerie (zeigt fehlende Designs als „gezeichnet“) | `npm run dev` → `/?gallery=bottles` |

Fehlt der Ordner `flaschen/` (Generator), den Nutzer bitten, `bottles.js`, `support.js` und
`PilsBuddy Flaschen.dc.html` aus dem Codex-Design-Projekt dorthin zu exportieren. Ohne Generator
keine neuen Flaschen von Hand zeichnen – die App fällt dann automatisch auf `BottleArt` zurück.

Nach jeder Änderung an `bottles.js` den Cache-Parameter im Import der Seite erhöhen
(`bottles.js?v=N` → `N+1`).

## 1. Recht zuerst
- Steckbriefe liefern nur **Farbwelt und Stimmung**. Keine Logos, Wappen, Schriftzüge oder
  Etikettenlayouts nachbauen.
- Etikett zeigt standardmäßig die **Sorte** (PILS, HELL, WEISSE …), nicht den Markennamen.
  Markenname nur über den Tweak „Markenname“.
- Motive sind generische Symbole (Baum, Welle, Schiff), nie das echte Markenzeichen.
- Die Flaschenform darf der Marke entsprechen. Die Normformen sind nicht geschützt.

## 2. Flaschenform: nur diese Grundformen
Maße aus dem Referenzfoto des Nutzers, Höhen aus Normmaßen (4,4 Einheiten/mm, Boden y=1188).
Neue Grundformen **nicht erfinden**.

| Key | Form | typisch für |
|---|---|---|
| `euro` | Euro 0,5 – breit, runde Schulter, kurzer Hals | Helles, Export, Bock |
| `steinie` | Steinie 0,33 – gedrungen, Kuppelschulter, wulstige Mündung | Pils (Bitburger-Typ), Belgier, Doppelbock |
| `nrw` / `euroLong` | NRW 0,5 – schlank, lang auslaufende Schulter | Alt, Keller, Pils |
| `longneck33` | Longneck 0,33 – kurze Schulter, langer gerader Hals | Kölsch, Craft, Lager |
| `vichy33` | Vichy 0,33 (NRW) – schmal, kegelige Schulter | Zäpfle-Typ |
| `longneck` | Longneck 0,5 (aus longneck33 abgeleitet) | Nordpils, Lager |

Varianten (gleicher Umriss, Detail obendrauf): `buegel` (Euro + Bügel), `buegel33` (Steinie + Bügel),
`hex` (Sechskanthals), `taille` (tailliert), `stepneck` (Prägekanten), `weizen` (Halswulst),
`corona` (Longneck 0,33 in Klarglas), `can` (Dose).

Vorgehen: zuerst die Originalflasche der Marke recherchieren, dann die passende Grundform wählen.
Bei Unsicherheit den Nutzer nach einem Foto fragen. Neue Geometrie nur als Variante über `F.*`
(`{ ...F.euro, swing: true }`).

**Glas** (`glass`): `brown`, `green`, `darkgreen`, `clear`, `black`, `dark`. Bei Klarglas zeigt der
Körper die Bierfarbe mit Schaumgrenze.
**Kapsel** (`cap`): Kronkorkenfarbe als Hex, `GOLD` oder `null` (Bügel/Limette).

## 3. Eintrag in `BEERS` (bottles.js)
```js
['id', 'Voller Name', 'Kurz', 'Sorte', 'ABV', 'Region', '#Bierfarbe', 'shape', 'glass', capHex,
  L(bgEtikett, tinte, akzent, akzent2, { shape, font, frame, motif, badge }),
  neckLabel /* { bg, a } oder null */, extra /* 'smoke' | 'lime' | 'goat' | null */],
```
- `id`: **exakt die `id` aus `src/data/beers.json`** (kebab-case ASCII) – wird zu `<id>.svg`.
- **Bierfarbe** = `color` aus beers.json (dort realistisch nach EBC: Pils ≈ #E6C150, Helles ≈ #F1C656,
  Weißbier ≈ #E8B84A, Alt ≈ #8B4A1E, Doppelbock ≈ #5A2E14, Stout ≈ #1E120C). Weichen beide ab,
  beers.json gewinnt.
- Name, ABV, Region, Sorte ebenfalls aus beers.json übernehmen (ABV mit Komma: „4,9 %“).
- **Sorte** muss in `WORD` existieren, sonst dort ergänzen (Großschrift, max. ca. 8 Zeichen).
  Für Alkoholfreies z. B. `ALKFREI`/`0,0`, für Berliner Weisse `BERLINER`.
- **Etikett** `L(...)`:
  - `shape`: `rect` (Standard), `oval`, `shield`, `none`
  - `font`: `sans` (Bricolage), `serif` (Young Serif, traditionell), `gothic` (Fraktur, nur sehr alte Häuser)
  - `frame: 1` für eine Innenlinie im Akzent
  - `badge`: kurzer Text, z. B. „seit 1405“
  - `motif`: shield arch key fachwerk tree rock grapefruit lake heartanchor anchor swoosh ship seal
    castle waves gate crown monk bubbles dom confetti gable harp star horn devil bolt stripes
    monastery goat lozenge hexmount treemount
- **Neues Motiv:** in `M` als `(c, s) => svg` im 100er-Raster. Nur Farben aus `c` (`a`, `a2`, `i`,
  `bg`), Strichstärke `s`, gleiche flache Formsprache.
- **Halsetikett** nur, wenn die Marke eines hat und der Hals lang genug ist (Longneck/NRW).
- Max. 3 Etikettfarben plus Kontur. Kontrast Schrift ↔ Etikett mindestens 4,5 : 1.

## 4. Gesicht und Geste (`FACE`)
Format: `'Augen Brauen Mund|Accessoires|Gesten'`, Teile mit Leerzeichen getrennt.

- **Augen:** `open`, `happy` (Bogen), `sleepy` (halbes Lid), `dot` (klein)
- **Brauen:** `-` (keine), `stern`, `thick`, `angry`, `worried`, `up`, `raised` (eine hochgezogen)
- **Mund:** `smile`, `flat`, `smirk`, `grin`, `tongue`
- **Accessoires:** `blush`, `mustache`, `lashes`, `glasses`, `monocle`, `patch`, `shades`, `bowtie`,
  `crown`, `mohawk`, `sailor`
- **Gesten:** `wink`, `blink`, `look`, `brow`, `hop`, `sway`, `wobble`, `nod`, `plopp` (nur Bügel),
  `shades` (nur mit Sonnenbrille)

Regeln:
- Charakter aus dem Steckbrief ableiten (`humorousBio`, `tags` in beers.json): Was ist die eine
  Eigenheit? (Nordisch-herb → `stern flat` + `look`; Kölsch → `grin` + `hop`; Pirat → `patch` + `wink sway`)
- Höchstens 2 Gesten und 1–2 Accessoires. Eine Geste muss sich in einem Satz erklären lassen.
- `wobble` nur für augenzwinkernd „beschwipste“ Biere. Nie Betrunkenheit verspotten, keine Anspielung
  auf Exzess. **Alkoholfreie Biere nie `wobble`.**
- Jede Geste braucht einen deutschen Text in `GEST_DE`.
- Timings werden pro `id` automatisch versetzt – nicht manuell synchronisieren.

## 5. Layout-Regeln (nicht brechen)
- Gemeinsame Bodenlinie y=1188, Mitte x=300, viewBox 600×1200 (die App rechnet mit 1:2).
- Gesicht unter der Schulter, Etikett darunter; gedrungene Formen bekommen das Gesicht automatisch
  kleiner/höher. Gesicht und Etikett überlappen nie.
- Kontur `S` = 7 bei 600 px, Schatten 2,2 × S nach rechts versetzt, keine Verläufe, keine Weichzeichner.
- Glanzlicht: weißer Streifen links, 26 % Deckkraft (Klarglas 70 %).
- Nur SMIL-Animationen (`<animate*>`) und eingebettete Schriften – die Datei läuft als `<img>`,
  ohne Skripte und ohne externe Ressourcen.

## 6. Export und Einbau in die App
1. Vorschau prüfen: `PilsBuddy Flaschen.dc.html` (z. B. per Playwright öffnen und die Karte der
   neuen Flasche screenshotten): Umriss gegen Produktfoto, Gesicht, Etikett, Geste; im Regal gleiche
   Bodenlinie und plausible Größe neben den Nachbarn.
2. Export „SVG laden (animiert)“ → `docs/pilsbuddy-mobile-app-design/bottles/<id>.svg`
   (bei mehreren Flaschen den Export der Seite per Playwright für jede `id` auslösen).
3. Optimieren (venv mit `pip install fonttools brotli`):
   `python3 tools/bottles/optimize.py` → schreibt alle nach `public/bottles/`. Ziel < 25 KB je Flasche.
4. In `src/data/beers.json` beim Bier `"image": "/bottles/<id>.svg"` direkt nach `"color"` eintragen.
   Keine Code-Änderung nötig: `BeerBottle` nimmt das Bild, sonst `BottleArt`.
5. Prüfen: `/?gallery=bottles` (kein „gezeichnet“ mehr beim Bier), Karte + Detail im Hell- und
   Dunkelmodus, dann das normale Gate (build, test, lint, E2E) – eigener Branch + PR.
6. Dem Nutzer melden, was aus dem Steckbrief abgeleitet und was frei erfunden ist, und welche Form
   ohne Foto gewählt wurde.
