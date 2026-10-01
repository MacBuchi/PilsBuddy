# Regionale Biere – Datenprobe (R0)

Stand 2026-10-01. Die Rohdaten wurden über GitHub Actions abgerufen (`.github/workflows/catalog.yml`, Artefakt
`catalog-raw`). Die Skripte liegen in `tools/catalog/`. Die Probe-Region ist Bad Rappenau ± 50 km.

## Abdeckung

| Land | OSM-Brauereien (mit Namen) | Wikidata (aktiv) | OFF-Biere |
|---|---:|---:|---:|
| DE | 1 606 | 507 | 1 585 |
| AT | 190 | 53 | 109 |
| CH | 266 | 11 | 447 |

- **Brauereien DACH**, OSM und Wikidata zusammengeführt (Name normalisiert, < 300 m bzw. < 500 m): **2 427**.
- **Probe 50 km:**
  - 53 OSM-Brauereien (52 mit Namen) und 10 aus Wikidata, davon 5 in OSM wiedergefunden.
  - Zusammengeführt sind es **57**, ohne erkennbare Duplikate.
  - 40 davon haben eine Website, 33 einen Ort.
- **Biere (Open Food Facts):**
  - 1 901 eindeutige DACH-Biere mit Namen, darunter viel Handel und Importware.
  - Einer Brauerei zugeordnet: 26 %.
  - **Nur 7 % der Brauereien haben überhaupt ein OFF-Bier**; im Probe-Umkreis sind es 5 von 57.

**Fazit:** Brauereien sind gut abgedeckt, Biere einzeln nur bei den größeren Marken. Kleine Gasthaus- und
Hausbrauereien, also genau die regionalen, stehen fast nie mit Bierliste in offenen Daten.

## Extraktion: Quelle → Bier, Charakter, Flasche

| Ziel | Quelle | Regel |
|---|---|---|
| Brauerei, Lage, Website | OSM `craft=brewery` / `microbrewery=yes` / `industrial=brewery`; Wikidata Q131734 | Dedupe nach normalisiertem Namen und Abstand; Wikidata ergänzt Website, Ort (P131) und Gründungsjahr (P571) |
| Bier, ABV | OFF `product_name`, `alcohol_100g` | fehlt die ABV, nimmt die Schätzung die typische ABV des Stils |
| Stil | OFF-Produktname vor `categories_tags` | `normalizeStyle` (R2): 68 % erkannt; der Rest heißt ehrlich „BIER“ (neutrales Profil) |
| Geschmack (8 Achsen) | Stil, ABV, IBU (selten) | `tasteFromStyle`, in der UI als „Stil-Schätzung“; auf den kuratierten Bieren Ø 5 Punkte Abweichung je Achse |
| Bier → Brauerei | OFF `brands` / `brand_owner` / `manufacturing_places` | alle Namens-Tokens der Brauerei müssen im Markennamen stehen; der Herstellungsort als Ortshinweis gibt Bonus; mehrdeutige Kurznamen ohne Ort werden verworfen |
| Flaschenform | OFF `quantity`, `packaging_tags` | `parsePack`: 0,33 l führt zu den schlanken Formen, 0,5 l zu Euro/Longneck/NRW, dazu Dose und Bügel; 77 % bekannt |
| Etikett | Stil, Region (Ort der Brauerei), Gründungsjahr | `designFor`: Stilwort, Ort, „SEIT 1872“; Farben aus den PilsBuddy-Paletten, nie Markenlogos |
| Gesicht, Gesten | geschätzter Geschmack, ABV | wie bei kuratierten Bieren (`faceFor`, `gesturesFor`) |

**Speicherbedarf:**
- Eine Bierzeile braucht nur etwa **145 B** (Name, Stil, ABV, Gebinde, Brauerei-ID). Geschmack und Flasche entstehen
  deterministisch im Client, und eine Flasche je Bier zu speichern ist nicht nötig.
- Eine Brauerei braucht etwa 300 B. Alle DACH-Brauereien zusammen sind etwa 700 KB JSON (gzip ≈ 150 KB); man könnte sie also
  sogar komplett laden, die Rasterzellen-Abfrage bleibt aber wegen der Datensparsamkeit.

## Stolpersteine

- **OSM `brewery=*`** an Kneipen und Restaurants listet *ausgeschenkte* Biere (Heineken, Warsteiner), nicht selbst
  gebraute. Diese Listen zählen nicht für die Zuordnung, sonst wird ein Pub zur Heineken-Brauerei.
- **Mehrdeutige Kurznamen** („Union“, „Fischer“, „Adler“): Sie werden nur mit Ortshinweis zugeordnet, sonst ist die
  Konfidenz zu niedrig und das Bier geht nicht live (R1).
- **Wikidata-Brauereien ohne Ort:** P131 wird jetzt mitgeladen.
- **OFF-Länderkennzeichen** heißen „verkauft in“, nicht „gebraut in“. Importbiere bleiben einfach unzugeordnet.
- **ABV im Namen** („Winter Bier (5,6 %)“): Der Import liest sie in R1 aus, wenn `alcohol_100g` fehlt.

## Offene Entscheidung für R1 und R4: Brauereien ohne Bierliste (≈ 93 %)

1. **Brauerei-Profil aus regional typischen Stilen.** Ein Beispiel ist Bayern → Helles und Weißbier, Köln → Kölsch,
   Düsseldorf → Alt, Franken → Keller und Lager. Dazu kommen Namenshinweise wie „Weissbräu“ oder „Klosterbrauerei“.
   In der Liste steht dann „braut typischerweise …“, mit dem Hinweis „Stil-Schätzung“.
2. Nur Brauereien mit Bieren zeigen. Das ist ehrlich, aber in der Nähe bleibt die Liste fast leer.
3. R6 vorziehen: Nutzer tragen Biere nach.

Die Empfehlung ist 1 + 3, also Brauerei-Profil als Rückfall und Nutzer-Meldungen, die es nach und nach ersetzen.
Websites der Brauereien automatisch auszulesen ist keine Option: unstrukturiert und rechtlich unsicher.
