# Nordamerika – Recherche der Klassiker (Stufe N, #54)

Stand: 2026-10-02. Gilt für die kuratierten Klassiker (`tools/classics/*.json` → `src/data/beers.json`).
Der Regionalkatalog CA/US (N4/N5) hat eigene Quellen, siehe unten.

## Auswahl

Ausgangspunkt war die CSV aus Issue #54 (100 Biere, nur 26 davon geprüft). Aufgenommen wird ein Bier, wenn es

- eine **Volumenmarke** ist, die jeder im Land kennt (Molson Canadian, Labatt Blue, Old Style Pilsner …),
- ein **Wegbereiter des Craft Beer** in seiner Region ist (La Fin du Monde, Péché Mortel, Fat Tug, Big Rock Traditional …), oder
- die **Region abdeckt**: jede Provinz mit nennenswerter Brauszene, auch Atlantikkanada, die Prärie und der Yukon.

Weitere Regeln:
- Es muss noch gebraut werden.
- Doppelte Biere sind ausgeschlossen (Sierra Nevada Pale Ale ist schon kuratiert).

Kanada (N2): 48 Biere – Ontario 14, Québec 11, Britisch-Kolumbien 11, Alberta 4, New Brunswick 2, Neuschottland 2, Saskatchewan, Manitoba, Neufundland und Yukon je 1.

USA (N3): 50 Biere aus 23 Bundesstaaten – Colorado 9, Kalifornien 6, Michigan, Missouri und Wisconsin je 4, New York 3,
Massachusetts, Oregon und Pennsylvanien je 2, je eins aus Alaska, Delaware, Florida, Georgia, Hawaii, Illinois, Indiana,
Iowa, Louisiana, Maine, Ohio, Rhode Island, Texas und Vermont. Dazu kommt das schon kuratierte Sierra Nevada Pale Ale.

### Korrekturen gegenüber der CSV

| CSV | Richtig |
|---|---|
| Category 12 – „Sumerian Brewing“ | kein Bier dieses Namens; gestrichen |
| „La Vache Folle“ bei Le Trou du Diable und Lac-Saint-Jean | La Vache Folle ist von der MicroBrasserie Charlevoix (Imperial Milk Stout, 9 %) |
| Sleeman „Original“ | das bekannte Bier ist die Sleeman Cream Ale |
| Driftwood Fat Tug 100 IBU | „80+ IBU“ laut Brauerei-Angaben im Handel |
| Parallel 49 Trash Panda 6,5 % | 5,5 % / 55 IBU laut Launch-Artikel |
| Strange Fellows Talisman 4,0 % | 4,2 % / 29 IBU |
| Rogue Dead Guy „Maibock“ | ein Ale im Stil eines Maibocks (Brauerei) – Stil `Bock`, 6,8 % / 40 IBU |
| Anchor Steam | seit 2023 nicht mehr gebraut; die Brauerei gehört seit 2024 Hamdi Ulukaya, ein Neustart ist angekündigt, aber noch nicht da – nicht aufgenommen |
| Fat Tire „Amber Ale“ | 2023 neu eingestellt: „Fat Tire Classic Ale“, 5,2 % / 15 IBU, heller und frischer; das alte Amber-Rezept gibt es nur noch im Mischkarton |
| Odell 90 Shilling „Scotch Ale“ | die Brauerei nennt es Amber Ale (5,3 % / 32 IBU) – Stil `Amber` |
| Alaskan Amber „Amber Ale“ | laut Brauerei ein Altbier („alt-style“) – Stil `Altbier` |
| Steamworks Pilsner, Brockton IPA, Juxtapose, Black Tusk, 101 Pilsner, Saison du Pinacle … | ersetzt durch bekanntere Biere derselben Region (u. a. English Bay Pale Ale, Molson Export, Labatt 50, Blanche de Chambly, Maudite, Iceberg, Yukon Gold) |

## Quellen und Prüfung

Jeder Datensatz nennt **eine Quelle** (`source`) und das **Prüfdatum** (`verified`):
1. Zuerst die Seite der Brauerei.
2. Sonst Handel mit Brauerei-Datenblatt (LCBO, Distributoren).
3. Danach Fachpresse (Canadian Beer News, The Growler, BYO) und Wikipedia.

Der Workflow „Classics sources“ (`tools/classics/verify.mjs`) prüft bei jedem Push auf `tools/classics/**`:
- Er ruft jede Quelle ab und sucht dort ABV und IBU.
- Abweichungen sind ein Hinweis für die nächste Handprüfung, kein Gate. Viele Brauereiseiten sperren Bots oder rendern per JavaScript.

**Nicht genutzt:**
- Untappd, RateBeer und BeerAdvocate: Die Nutzungsbedingungen verbieten Scraping. Höchstens als Hinweis bei der Auswahl, nie als Datenquelle.
- BreweryDB: eingestellt.

## Geschmack: belegt + Stilbasis

`classicTaste` (`src/domain/classicTaste.ts`) rechnet so:

```
taste = tasteFromStyle(Stil, ABV, IBU) + Σ adjust
```

- Den Stil liefern die BJCP-2021-Profile aus N1. ABV und IBU kommen aus der Quelle.
- Ein `adjust` ist nur erlaubt, wenn die Quelle die Abweichung ausdrücklich nennt. Beispiele:
  - „lightly hopped“ (Keith's)
  - „mild bitterness“ (Trash Panda)
  - „less sweet than Westmalle“ (La Buteuse)
- Jedes Delta trägt Begründung und URL.
- Der Test `tools/classics/classics.test.ts` rechnet jedes Profil nach. Wer in `beers.json` von Hand nachbessert, bekommt einen roten Test.

Abweichungen in N3, alle mit Zitat der Brauerei: 420 „low perceived bitterness“, Pseudo Sue „mild bitterness“,
Purple Haze „tartly sweet“, Dragon's Milk „sweet undertones of vanilla“, Milk Stout Nitro „super smooth & creamy“.

Ändern: Datensatz in `tools/classics/<land>.json` bearbeiten, dann `npm run classics:build`.

## Regionalkatalog CA/US (N4/N5)

| Quelle | Lizenz | Inhalt |
|---|---|---|
| Open Brewery DB | MIT | 8 224 US-Brauereien mit Koordinaten und Website; Kanada nur BC und Ontario |
| OpenStreetMap | ODbL | `craft=brewery`; Hauptquelle für Kanada, USA je Bundesstaat abfragen |
| Wikidata | CC0 | Brauereien in Q16 (CA) und Q30 (US); Biere mit ABV und Stil |
| Open Food Facts | ODbL | Produkte `en:canada` / `en:united-states` |
| openbeer | Public Domain | `us-united-states`, `ca-canada` (Stand ~2014, niedrigste Priorität) |
| GeoNames | CC BY | US-ZIP, kanadische FSA (nur die ersten 3 Zeichen) |
