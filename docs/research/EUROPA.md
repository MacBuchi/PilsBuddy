# Handgepflegte Biere (DE/EU) – Quellen (V7)

Stand: 2026-10-14. Die 60 kuratierten Biere, die nicht aus der Nordamerika-Recherche (`tools/classics/us.json`,
`ca.json`) stammen, haben jetzt je eine Quelle in `tools/classics/eu.json`: Link, Prüfdatum, den dort gelesenen
Alkoholwert und den Stil. Die Geschmacksprofile bleiben handgepflegt; `eu.json` belegt nur die Fakten.
`tools/classics/provenance.test.ts` hält beers.json und die Quellen deckungsgleich, `classics-verify.yml` prüft die
Links (Hinweis, kein Gate).

## Ergebnis

- 60 von 60 werden noch gebraut, alle Stile passen.
- 54 Alkoholwerte stimmten, 3 waren falsch und sind korrigiert, 3 alkoholfreie haben nur eine Obergrenze.

## Korrekturen

| Bier | vorher | jetzt | Quelle |
|---|---|---|---|
| BRLO Pale Ale | 5,5 % | 5,0 % | brlo.de, „ALC 5 % vol“ |
| Peroni Nastro Azzurro | 5,1 % | 5,0 % | birraperoni.it (das rote „Peroni“ hat 4,7 %) |
| Berliner Kindl Weisse | 2,5 % | 3,0 % | berliner-kindl.de, „Das Original“ |

## Schwächere Quellen

Die Brauerei-Seite nennt keinen Alkohol (oder blockt Bots); belegt ist der Wert dann über:

- **Beck's** – PerfectDraft (AB-InBev-Fassshop); **Hasseröder** – tapintoyourbeer.com (AB-InBev-Nährwertseite)
- **Warsteiner** – Carlsberg Group (Lizenznehmer, „Premium Verum“); **Corona** – corona.com (Kanada)
- **Stella Artois** – AGES (österreichische Behörde, Produkt von AB InBev Austria); in Belgien 5,2 %
- **Franziskaner** – Open Food Facts; **Mönchshof Kellerbier** – Beverfood (keine Produktseite der Kulmbacher)
- **Sierra Nevada Pale Ale** – offizielle Seite, nur über die Suchmaschinen-Kopie lesbar (Cloudflare)
- **Jever Fun, Erdinger Alkoholfrei, Clausthaler** – nur „< 0,5 % vol“; unsere 0,4/0,5 bleiben (`abv: null`, `abvMax: 0.5`)
