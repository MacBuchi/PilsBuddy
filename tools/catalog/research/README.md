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
- Links: the address that serves the page after redirects, https whenever the site offers it. A link to another host
  than the brewery's website on file (OSM often has an old or redirecting domain) counts only over https – otherwise
  the beer is lost; the build lists such entries („Recherche ohne verwertbares Bier“, V15).
- `checked` (date) and `stage` (`sonnet` / `opus`, which research pass found it) record where an entry comes from.
- `closed` / `no-own-beer` (bar, restaurant, shop without own beer): hidden from the catalogue – only with `evidence`.
- `duplicate` (V15): another catalogue entry is the same brewery and has its beers – hidden like `closed`, only with
  `evidence` (a page that shows both are one), `note` names the other id.
- `not-a-brewery` (V17): no brewery at all (a listed building, a company seat, a wrong Wikidata match) – hidden like
  `closed`, only with `evidence` (e.g. the Wikidata item that shows what it is).
- `wrong` (V17, optional, any status): beers an open database wrongly gives this brewery, each with an https page of
  the brewery that makes it – `[{ "name": "<catalogue name>", "url": "https://…" }]`. The build drops them after
  picking the main beers („Recherche: falsch zugeordnete Biere entfernt“).
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

Second pass (V16, Opus, batches of 15 sorted by region): each batch gets catalogue entries within 300 m / same website
domain as duplicate candidates, plus a name lookup in the live catalogue for pubs far from their brewery. Rich sources:
BeerTasting brewery pages (`beertasting.com/en/brewery/<slug>/beers`, public sitemap; robots.txt only blocks
`/reviews`), Untappd brewery/beer pages found via search or its public sitemap (never its search API or keys),
regional guides (bierland-franken.de, bamberg.info). Rules learned: a brand still sold under the brewery's name but
brewed elsewhere keeps its beers (note „Lohngebraut bei …“); a temporary pause is not `closed`; `closed` needs a page
naming this brewery; respect robots.txt and sites whose terms forbid bots (onetz.de, merkur.de, zefix.ch); no
nominatim / OSM API. After the full pass, a BeerTasting/Untappd-only sweep over the remaining `unclear` entries found
beers for another ~60 breweries.

Third pass (V17) over the ~170 still without beer: the same batches, aimed at new evidence for hiding (closure,
no own beer, duplicate, `not-a-brewery`) and at sources the earlier passes did not use; the http-only losses got https
pages where they exist. What is still `unclear` after it stays so – no further pass is planned.

To re-research a brewery, replace its entry – one entry per id across all files (`research.test.ts` checks the files).
