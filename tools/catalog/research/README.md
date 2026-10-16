# Recherche (V12)

Breweries the crawler and the open databases had no beer for, looked up by research agents. The catalogue build
(`build.ts` → `research.ts`) reads every `*.json` here; nothing else in this folder is read.

## Format

One array per file, one entry per brewery:

```json
{ "id": "osm-n123", "name": "Brauerei Beispiel", "status": "beers",
  "evidence": null, "note": "Sortiment-Seite listet 4 Hausbiere", "checked": "2026-10-16", "stage": "sonnet",
  "beers": [{ "name": "Beispiel Hell", "style": "Helles", "abv": 4.9, "url": "https://brauerei-beispiel.de/biere" }] }
```

- `beers`: the brewery's own beers (no guest beers), each with the page that names the beer and the brewery.
  On the brewery's own website → a website beer (source 3, same filters as crawled ones); on another site (https only)
  → source 6 „Recherche“ with that link. Quality is computed in the build like for every other beer. At most the
  first 3 beers of an entry are used (`MAX_RESEARCHED_BEERS`; list permanent beers first) – the file keeps every
  verified beer with all its values, so a higher limit needs no new research.
- `checked` (date) and `stage` (`sonnet` / `opus`, which research pass found it) record where an entry comes from.
- `closed` / `no-own-beer` (bar, restaurant, shop without own beer): hidden from the catalogue – only with `evidence`.
- `unclear`: changes nothing.
- Ids that are no longer in the sources are ignored.

## How it is made

1. Work list: published breweries without a published beer (live database), without Wikidata-only entries lacking a
   website (the build no longer publishes those).
2. Research agent (Sonnet) per batch of 8: website and its beer/Sortiment/Getränkekarte pages, then searches,
   Untappd/RateBeer, brewery guides, tourism pages, news. Every beer needs a fetched page naming beer and brewery;
   nothing from memory.
3. Fact-checker agent per batch: re-opens every cited URL, drops what it cannot confirm, downgrades unconvincing
   closures to `unclear`.
4. The verified batches are merged into one file per region (`dach.json`), sorted by id.

To re-research a brewery, replace its entry – one entry per id across all files (`research.test.ts` checks the files).
