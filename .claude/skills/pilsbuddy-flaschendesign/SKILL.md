---
name: pilsbuddy-flaschendesign
description: Bierflaschen-Charaktere im PilsBuddy-Look gestalten – Flaschenform, Glas, Etikett, Motiv, Gesicht, Geste – über den Flaschen-Baukasten (src/domain/bottles, Design-Eintrag `bottle` in beers.json). Immer verwenden, wenn ein Bier ergänzt wird, eine Flasche umgestaltet, ein Steckbrief in eine Flasche übersetzt, die automatische Ableitung (designFor) angepasst oder ein neues Motiv/Gesichtsteil/Geste gebraucht wird.
---

# PilsBuddy Flaschendesign

Jede Flasche ist ein freundlicher Charakter im Bierdeckel-Look: dicke Kontur (#1D1811), harter
Versatzschatten, Bierfarbe wie eingeschenkt, Gesicht mit eigener Geste. Charmant und selbstironisch,
nie gemein.

## Wo was liegt

Seit Stufe R3 gibt es **keine SVG-Datei je Bier**. Die Flasche wird zur Laufzeit erzeugt.

| Was | Pfad |
|---|---|
| Formen (7 Vorlagen + Varianten Bügel/Weizenhals/Taille) | `src/domain/bottles/shapes.ts` |
| Motive (100er-Raster, Farbplätze `bg i a a2`, Strich `s`) | `src/domain/bottles/motifs.ts` |
| Gesicht, Accessoires, Gesten | `src/domain/bottles/face.ts`, `render.ts` |
| Ableitung aus Sorte/Farbe/Region/Tags/Geschmack | `src/domain/bottles/design.ts` (`designFor`) |
| Prüfung fremder Designs (DB) | `src/domain/bottles/sanitize.ts` |
| Handdesign je Bier (optional) | `"bottle": {…}` in `src/data/beers.json` |
| Vergleich Handdesign ↔ Ableitung | `npx tsx tools/bottles/compare.ts out.html` |
| Galerie | `npm run dev` → `/?gallery=bottles` („abgeleitet“ = kein Handdesign) |

Ein neues Bier braucht **nichts** – es bekommt automatisch eine passende Flasche. Ein `bottle`-Eintrag
lohnt sich nur für Biere, die einen eigenen Charakter verdienen. Das Original-Werkzeug aus Claude Design
(`bottles.js`) ist nicht mehr nötig; der Baukasten ist aus dessen 42 Exporten rekonstruiert.

## 1. Recht zuerst
- Steckbriefe liefern nur **Farbwelt und Stimmung**. Keine Logos, Wappen, Schriftzüge oder
  Etikettenlayouts nachbauen.
- Etikett zeigt standardmäßig die **Sorte** (PILS, HELL, WEISSE …), nicht den Markennamen.
  Markenname nur über den Tweak „Markenname“.
- Motive sind generische Symbole (Baum, Welle, Schiff), nie das echte Markenzeichen.
- Die Flaschenform darf der Marke entsprechen. Die Normformen sind nicht geschützt.

## 2. Flaschenform: nur diese Grundformen
Maße aus den Normflaschen (Boden y=1188). Neue Grundformen **nicht erfinden** – nur neue Varianten in
`bodyPath` (`shapes.ts`) mit Test.

| Key | Form | typisch für |
|---|---|---|
| `euro` | Euro 0,5 – breit, runde Schulter, kurzer Hals | Helles, Export, Bock |
| `steinie` | Steinie 0,33 – gedrungen, Kuppelschulter | Pils (Bitburger-Typ), Belgier, Doppelbock |
| `nrw` | NRW 0,5 – schlank, lang auslaufende Schulter | Alt, Keller, Pils |
| `longneck33` | Longneck 0,33 – kurze Schulter, langer gerader Hals | Kölsch, Craft, Lager |
| `vichy33` | Vichy 0,33 – schmal, kegelige Schulter | Zäpfle-Typ |
| `longneck` | Longneck 0,5 | Nordpils, Lager, Weißbier (mit `bulge`) |
| `can` | Dose | IPA, Pale Ale |

Varianten: `closure: "swing"` (Bügel, Mündung 16 tiefer, mit Geste `plopp`), `bulge: true` (Weizenhals),
`waist: true` (tailliert), `closure: "lime"` + `clear: true` (Klarglas mit Limette).

Vorgehen: zuerst die Originalflasche der Marke recherchieren, dann die passende Grundform wählen.
Bei Unsicherheit den Nutzer nach einem Foto fragen.

## 3. Eintrag `bottle` in beers.json

```json
"bottle": {
  "shape": "longneck", "closure": "crown", "glass": "#2E6B3B", "cap": "#F2B53A",
  "label": { "kind": "rect", "bg": "#16233F", "ink": "#F3E9CF", "a": "#D9A93A", "a2": "#D9A93A",
             "font": "serif", "frame": true, "word": "PILS", "region": "FRIESLAND", "badge": "seit 1848" },
  "neckLabel": { "bg": "#16233F", "a": "#D9A93A" },
  "motif": "shield", "eyes": "open", "brows": "stern", "mouth": "flat", "acc": [], "gestures": ["look"]
}
```
- `shape`: `longneck`, `longneck33`, `euro`, `nrw`, `steinie`, `vichy33`, `can`; dazu `bulge` (Weizenhals),
  `waist` (tailliert). `closure`: `crown`, `swing` (Bügel), `lime` (Klarglas + Limette), `can`.
- `glass`: Glasfarbe (`#6B3A17` braun, `#2E6B3B` grün, `#3B2414` dunkel, `#211812` schwarz) bzw. Dosenfarbe;
  `clear: true` zeigt das Bier in Bierfarbe. `cap`: Kronkorkenfarbe.
- **Etikett** `label`: `kind` `rect`/`oval`/`shield`/`none` (Dose), `font` `sans`/`serif`/`gothic`
  (Fraktur nur in Groß-/Kleinschreibung, nur sehr alte Häuser), `frame` Innenlinie in `a`, `badge` kurzer
  Text vor dem Alkohol. Wortgröße setzt der Renderer mit echten Schriftmaßen – keine Größen angeben.
- `motif`: Schlüssel aus `MOTIFS` (u. a. shield arch key fachwerk tree rock grapefruit lake heartanchor anchor
  swoosh ship seal castle waves gate crown monk bubbles dom confetti gable harp star horn devil bolt stripes
  monastery goat lozenge hexmount treemount).
- **Neues Motiv:** in `motifs.ts` als `(c, s) => svg` im 100er-Raster. Nur Farben aus `c` (`bg`, `i`, `a`,
  `a2`), Strichstärken als Vielfache von `s`, gleiche flache Formsprache, generisches Symbol.
- Max. 3 Etikettfarben plus Kontur. Kontrast Schrift ↔ Etikett mindestens 4,5 : 1.
- `extra`: `smoke` (Rauchbier) oder `goat` (Bock, hängt am Hals).

## 4. Gesicht und Geste
Felder `eyes`, `brows`, `mouth`, `acc` (Liste), `gestures` (Liste, max. 2).

- **Augen:** `open`, `happy` (Bogen), `sleepy` (halbes Lid), `dot` (klein)
- **Brauen:** `none`, `stern`, `thick`, `angry`, `worried`, `up`, `raised` (eine hochgezogen)
- **Mund:** `smile`, `flat`, `smirk`, `grin`, `tongue`
- **Accessoires:** `blush`, `mustache`, `lashes`, `glasses`, `monocle`, `patch`, `shades`, `bowtie`,
  `crown`, `mohawk`, `sailor`
- **Gesten:** `wink`, `blink`, `look`, `brow`, `hop`, `sway`, `wobble`, `nod`, `plopp` (nur Bügel),
  `shades` (nur mit Sonnenbrille)

Regeln:
- Ohne Eintrag macht `faceFor`/`gesturesFor` das aus den Geschmacksachsen (herb → strenge Brauen +
  flacher Mund, süß → Bäckchen + Grinsen, schwer → verschlafen + nicken, süffig → hüpfen, Hopfenbombe →
  Zunge). Von Hand: Charakter aus dem Steckbrief ableiten (`humorousBio`, `tags`): Was ist die eine
  Eigenheit? (Nordisch-herb → `stern flat` + `look`; Kölsch → `grin` + `hop`; Pirat → `patch` + `wink sway`)
- Höchstens 2 Gesten und 1–2 Accessoires. Eine Geste muss sich in einem Satz erklären lassen.
- `wobble` nur für augenzwinkernd „beschwipste“ Biere. Nie Betrunkenheit verspotten, keine Anspielung
  auf Exzess. **Alkoholfreie Biere nie `wobble`.**
- Timings werden pro `id` automatisch versetzt – nicht manuell synchronisieren.

## 5. Layout-Regeln (macht der Renderer)
- Gemeinsame Bodenlinie y=1188, Mitte x=300, viewBox 600×1200 (die App rechnet mit 1:2).
- Gesicht und Etikett-Box hängen an der Form (`SHAPES`), Motiv + Wort + Region + Alkohol werden als Block
  zentriert. Kontur 7, Schatten 15,4 nach rechts, Glanzlicht links 26 % (Klarglas 70 %).
- Nur SMIL-Animationen; Thumbnails (< 60 px) und `prefers-reduced-motion` bleiben still.

## 6. Prüfen
1. `npx tsx tools/bottles/compare.ts /tmp/b.html` öffnen (per Playwright screenshotten): Handdesign neben
   Ableitung auf der Bierfarbe; Galerie `/?gallery=bottles`; Karte + Detail hell/dunkel.
2. `npm test` (u. a. `src/domain/bottles/bottles.test.ts`: jedes Design gültig, deterministisch), Gate, PR.
3. Dem Nutzer melden, was aus dem Steckbrief abgeleitet und was frei gewählt ist.
