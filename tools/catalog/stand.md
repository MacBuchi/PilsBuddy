# Regionalkatalog – Stand 2026-10-12

<!-- catalog-run: 38210466495 -->
Probelauf [38210466495](https://github.com/MacBuchi/PilsBuddy/actions/runs/38210466495) (R7). Der Merge startet „Regional catalogue (import)“ mit genau diesen
Rohdaten; der Import wartet auf die Freigabe im Environment `production`. Rohdaten verfügbar bis 2026-10-25.

Website-Crawl: 12 von 12 Teilen (success).

```
Brauereien: 14086 (US 10611 · DE 1936 · CA 1046 · CH 268 · AT 225) · Quellen: osm 6169 · obdb 5001 · osm+obdb 2123 · wikidata 565 · osm+wikidata 166 · osm+wikidata+obdb 38 · wikidata+obdb 24
  mit Gründungsjahr 268 · mit Ort 11713 · mit Website 10474
Open-Brewery-DB-Zeilen: 7221 · Open-Food-Facts-Biere: 2534 · Wikidata-Biere: 8939 · openbeer-Biere: 1520 · Website-Biere: 26174 → Hauptbiere: 10535 bei 3017 Brauereien (21 %)
  Stile: IPA 1335 · Pale Ale 995 · Pils 887 · Lager 878 · Weißbier 717 · Märzen 605 · Stout 444 · Amber 422 · Helles 414 · Sour Ale 327 · Hazy IPA 309 · Blonde Ale 283 · Porter 253 · Light Lager 245 · Bock 245 · Alkoholfrei 186 · Dunkles 179 · Kölsch 173 · Doppelbock 168 · Double IPA 154 · Kellerbier 119 · Witbier 108 · Saison 100 · Radler 87 · Export 80 · Gose 72 · Brown Ale 69 · Schwarzbier 69 · Imperial Stout 61 · Zwickel 54 · Rauchbier 52 · Cream Ale 49 · Altbier 46 · Abbey Blonde 40 · Wheat Ale 36 · Dunkles Weißbier 33 · Landbier 31 · — 30 · Scotch Ale 24 · Bitter 23 · Milk Stout 22 · Tripel 18 · American Lager 18 · Berliner Weisse 16 · Barleywine 14 · Quadrupel 13 · Alkoholfreies Weißbier 13 · Dubbel 8 · Belgian Strong Ale 7 · Trappist 3 · California Common 1
  Quellen: 3 9456 · 2 477 · 1 397 · 4 205 (1 = OFF, 2 = Wikidata, 3 = Website, 4 = openbeer)
  je Land: DE 1722 bei 514 · AT 192 bei 53 · CH 266 bei 85 · CA 1084 bei 311 · US 7271 bei 2054
  mit ABV 4543 · mit Gebinde 351
  Qualität (V1): bestätigt 682 · gefunden 9631 · fraglich 222
Postleitzahlen: 89909 (US 41490 · DE 23300 · AT 19001 · CH 4463 · CA 1655)
SQL: 143 Dateien in /home/runner/work/PilsBuddy/PilsBuddy/tools/catalog/out
```

## Änderungen gegenüber live

| Land | Brauereien | neu | weg | geändert | Biere | neu | weg | geändert |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DE | 1949 → 1936 (−13) | 3 | 16 | 34 | 1733 → 1722 (−11) | 52 | 63 | 20 |
| AT | 225 → 225 (±0) | 1 | 1 | 6 | 189 → 192 (+3) | 8 | 5 | 2 |
| CH | 268 → 268 (±0) | 1 | 1 | 15 | 264 → 266 (+2) | 19 | 17 | 1 |
| CA | 1046 → 1046 (±0) | 12 | 12 | 10 | 1101 → 1084 (−17) | 72 | 89 | 19 |
| US | 10567 → 10611 (+44) | 96 | 52 | 96 | 7388 → 7271 (−117) | 461 | 578 | 129 |

### DE

- **Brauereien neu** (3): Brauerei Zoller-Hof (Sigmaringen) `wd-q42306250` · Brauereigasthof Marktmühle (Vogtei) `osm-w435182178` · Craftbeer Corner Coeln (Köln) `osm-n4465447033`
- **Brauereien weg** (16): Brauerei Hintereder (Cham) `osm-n8554115835` · Brauerei Mauerbrecher (Lonnerstadt) `osm-n9549349552` · Brauerei Zoller-Hof (Sigmaringen) `wd-q112572001` · Brauerei zum Klosterhof (Heidelberg) `osm-n2508986075` · Brauereigasthof Marktmühle (Vogtei) `osm-n14006934538` · BrewDog (Berlin) `osm-w110296054` · Gilden Brauerei `osm-w175594137` · Herz & Heimat Braustüberl `osm-n5200080321` · …
- **Brauereien geändert** (34): Airbräu `osm-n927112012` – Website · Albquell Bräuhaus (Trochtelfingen) `osm-n763277248` – Ort · Barfüßer `osm-n3771945487` – Website · Bob's 7. geilste Bar der Welt (Augsburg) `osm-n618842007` – Name, Website (vorher „Habo‘s Bierschänke“) · Brauerei Fässla `osm-n2920151622` – Website · Brauerei Hetzel (Bad Staffelstein) `osm-n10297009056` – Website · Brauerei zum Schiff `osm-n11821481165` – Ort · Brauereigasthof Schäffler (Missen-Wilhams) `osm-n357214856` – Website · …
- **Biere neu** (52): Alkoholfreie · Alkoholfrei · 0.5 % `r-we17eb042c2820e8a` · Alkoholfreie Getränke · Alkoholfrei `r-w2bfbf0ce93235d0d` · Baltik-Lager · Lager · 5.5 % `r-q140610633` · Bambergator · Doppelbock `r-wd99da158bb5c2b19` · Behördenverlagerungen · Lager `r-w112caeb625c2a09f` · Behördenverlagerungen · Lager `r-w42e3d11242276051` · Behördenverlagerungen · Lager `r-w65421623439af2dd` · Bergmanns-Zwickel · Zwickel `r-wc657315ac5675bf6` · …
- **Biere weg** (63): Bambergator · Doppelbock `r-oa354473d70462788` · Barley Wine · Barleywine `r-w56eec5571232ee41` · Berliner Landbier Helles · Landbier `r-w51cafef5f6000a21` · Bockbier · Bock `r-wb63704cde34c8468` · Böhmisches Pils · Pils `r-wbcdbeda173b5df77` · Camba Dunkel · Dunkles `r-wd277c8436c64b9af` · Camba IPA · IPA `r-wca2a98bad879290e` · Camba Märzen · Märzen `r-wccde65ce74aad154` · …
- **Biere geändert** (20): A mbräusianum Hell ungefiltert · Helles `r-w572c0e52fdc35aab` – Name (vorher „A mbräusianum “Hell “ ungefiltert“) · Bodensteiner Hell · Helles `r-w000756cfb246d321` – Name (vorher „Bodensteiner „Hell“) · Bodensteiner Hell · Helles `r-w04555f467183c422` – Name (vorher „Bodensteiner „Hell“) · Bodensteiner Pils · Pils `r-w3a91941162652b40` – Name (vorher „Bodensteiner „Pils“) · Bodensteiner Pils · Pils `r-wc5f7fe04be2533f7` – Name (vorher „Bodensteiner „Pils“) · Doppelbock Rittator · Doppelbock `r-w891623ea555051ee` – Name (vorher „Doppelbock "Rittator“) · Dunkles Weizen Steingadener · Dunkles Weißbier · 5.1 % `r-w750ca004e52ec211` – Name (vorher „Dunkles Weizen »Steingadener“) · GIE Wasseraktivator · Doppelbock `r-w1d8b598317b808f4` – Name (vorher „GIE® Wasseraktivator“) · …

### AT

- **Brauereien neu** (1): Gablerbräu `osm-n268056345`
- **Brauereien weg** (1): Stiegl Terminal `osm-n2279703847`
- **Brauereien geändert** (6): Brauerei Ried (Ried im Innkreis) `osm-w148441705` – Website · Grazerwirt (Graz) `osm-w130667386` – Ort · Hubertus Bräu Johann Kühtreiber OG (Hagenbrunn) `osm-n13639304301` – Ort, Website · Innsbrucker Bräu (Innsbruck) `osm-n12630687575` – Website · Rolbrettbräu (Bad Vigaun) `osm-w246779716` – Website · Sudhaus (Graz) `osm-w647866832` – Website
- **Biere neu** (8): AFFENKÖNIG – Imperial IPA · Double IPA `r-w7f51832684de9c7d` · ALKOHOLFREIE Box · Alkoholfrei `r-w43f089e3bb1e2d71` · Andys Yuzu Lavender Gose · Gose `r-w55f45baebe5f1b91` · Barrel Aged Barley Wine · Barleywine `r-w8ea49ea0e6fdc6ce` · IPA Box · IPA `r-wf30d3583d3e18b2c` · Kellerstüberl · Kellerbier `r-wee795ab617f2a147` · Larger Than Life – Imperial Stout · Imperial Stout `r-wc57f75f0e2b02bc5` · LeT it sNow bi Trans Pils · Pils `r-wd643552b3da63ba8`
- **Biere weg** (5): Leonia Bavarian Helles · Helles `r-we6f4a8aeab1fef0f` · Liesl Wiesn · Märzen `r-wd63f83b4b0f99a07` · Saphirbier (Helles Lagerbier) · Helles `r-w66798eb74366c0ea` · Weisser Bock · Bock `r-w9dbb723617a6a5a2` · Wimitz Summa Ale · Pale Ale `r-w313e78337e5daeb2`
- **Biere geändert** (2): Loncium Austrian Amber Lager · Amber · 5.5 % `r-oc03d800d3899d2b2` – Name (vorher „‹Loncium› Austrian Amber Lager“) · Loncium Helles · Helles · 4.9 % `r-o06d262a764037f5e` – Name (vorher „‹Loncium› Helles“)

### CH

- **Brauereien neu** (1): Urban Kombucha (Renens) `osm-n14267089849`
- **Brauereien weg** (1): St. Johann (Neu St. Johann) `osm-n7090721424`
- **Brauereien geändert** (15): Arosabräu `osm-w1494934138` – Ort · Bierlab (Zürich) `osm-n6236201160` – Name (vorher „BIERlab“) · Birra Bozz (Gordola) `osm-n3423199818` – Website · Brasserie la Marmotte (Biel/Bienne) `osm-n7056633715` – Website · Brauerei Falken (Schaffhausen) `osm-n570622891` – Ort, Website · Brauerei St. Johann (Neu St. Johann) `osm-n3499725481` – Name (vorher „Brauerei“) · Brauerei Stadtguet (Winterthur) `osm-n8364370644` – Website · Braufabrik Baden (Rieden AG) `osm-n9694492780` – Ort · …
- **Biere neu** (19): Amber Ale · Amber `r-wb8b4576b8029afea` · Brauer Tom Amber · Amber `r-wec533cf7c64988fe` · Brauer Tom Pale Ale · Pale Ale `r-wb896243299ea9207` · Brown Ale · Brown Ale `r-w609aa48d122f82f3` · Feldschlösschen Amber · Amber · 5.2 % `r-wbef6496a620cadcf` · Feldschlösschen IPA · IPA · 6 % `r-w312b1f5e9f9760b0` · Feldschlösschen Pale Ale · Pale Ale · 5 % `r-wf80f8ccd96d13100` · Feldschlösschen Pils · Pils · 5.1 % `r-w340372f8050b5322` · …
- **Biere weg** (17): #Gottfried #Craftbeer #Schweizerbier · Weißbier `r-wa50474d93b699fa4` · Ales · Pale Ale `r-wd6ae123bc961558b` · Alkoholfrei · Alkoholfrei `r-76129261` · Birra Moretti Limone Radler 3er EW · Radler `r-w056d422114f92891` · California Common · California Common `r-wf11d6713ad8f92f3` · Elfenau – Red Ale · Amber `r-w5e45f9b97aae6a38` · Erdinger Weissbier naturtrüb · Weißbier `r-wb0ff615b76b7869a` · Lager · Lager `r-w3259f0213da7c9b3` · …
- **Biere geändert** (1): Kleinbasler Vagabund Hoppy Lager · Lager · 4.8 % `r-wec0692f91f5723f7` – Name (vorher „Kleinbasler Vagabund «Hoppy Lager“)

### CA

- **Brauereien neu** (12): Brasserie artisanale Gallicus (Gatineau) `osm-w90064454` · Brasserie McAuslan (Montréal) `osm-n13909517034` · Brock Street Brewing Company (Whitby) `osm-w757725115` · Elevation 57 `osm-n6632377473` · Goose Island Brewhouse `osm-n5035889438` · Le Coureur des Bois - Microbrasserie (Bistro-bar) `osm-n14090818056` · Mellön Brasserie `osm-n10205212682` · Microbrasserie Tadoussac `osm-w714147265` · …
- **Brauereien weg** (12): 57 North Kitchen + Brewery (Fort McMurray) `osm-n7234389724` · Atlas Brewing (Airdrie) `osm-w116546354` · Brasserie McAuslan `osm-w881595875` · Brewster's `osm-w317467119` · Brock Street Brewing Company (Whitby) `obdb-649336ec-68f5-4c35-90cb-6d32af27abfa` · Field & Forge `osm-n14040371293` · Microbrasserie Tadoussac `osm-n7117831437` · Odd Company Brewing `osm-n14025234001` · …
- **Brauereien geändert** (10): Batch (Toronto) `osm-n281663297` – Name, Website (vorher „House of McGrath“) · Beaches Brewing Co. (Toronto) `osm-n12076151019` – Ort · Bomber Brewing (Vancouver) `osm-w292987416` – Website · Godspeed Brewery (Toronto) `osm-n5270939321` – Website · Granite Brewery `osm-n1387968217` – Ort · Old Dog Brewing Company (Bobcaygeon) `osm-w1424839733` – Website · Steadfast Brewing Co. (Toronto) `osm-n5364521556` – Website · Trestle Brewing Company (Parry Sound) `osm-w1085640959` – Website · …
- **Biere neu** (72): All Roads IPA · IPA · 8 % `r-w4719c5c56d41f4ec` · All Roads IPA · IPA · 8 % `r-wbbe9ed8384f12f4e` · Amber Ale · Amber `r-wa1d2aad11741e28b` · Arrow Pilsner · Pils `r-wfb5b361498cc3ede` · Bobcats Belgian Wit · Witbier · 4.5 % `r-w07bca77d4ca95e33` · Bohemian-Style Pilsner · Pils `r-w048396bf2b3ddd20` · Bonsai Hazy IPA w/ Toasted Rice · Hazy IPA `r-w3d480acf9d992200` · Bonsai Hazy IPA w/ Toasted Rice · Hazy IPA `r-wef8fe86dd24b5d43` · …
- **Biere weg** (89): #Teamlagerbitch · Lager `r-w0a42ebd110104c0e` · 10 Point Lager · Lager · 4 % `r-w7be47f356008f8c1` · Adam’S Pale Ale · Pale Ale · 4.8 % `r-w1a2a7a7dbedf2ffd` · Adam’S Pale Ale · Pale Ale · 4.8 % `r-w73979218f7daddfc` · Ales · Pale Ale `r-we566fa8ead199ba7` · Alt Logo Flat Cap · Altbier `r-w67785d261cb26297` · Amber Ale • · Amber · 5.2 % `r-w00afa204c22e5c40` · Amber Ale • · Amber · 5.2 % `r-w67545cedf419e141` · …
- **Biere geändert** (19): Abbey Lane English Mild · Abbey Blonde · 3.6 % `r-wf9aa100313ecaee0` – Alkohol · Billy Blonde · Blonde Ale · 5 % `r-w916cffc9da6843f7` – Alkohol · Cold IPA · IPA `r-wfc135f1e022a4d53` – Name (vorher „Cold" IPA“) · Festbier German Lager · Märzen · 6 % `r-w682087bdbbb006bc` – Name (vorher „\*NEW\* Festbier German Lager“) · Grande Noirceur · Stout `r-0643485956433` – Alkohol · Headbanger 28 Triple IPA · Double IPA `r-w317bafbd04ea6e0b` – Name (vorher „Headbanger” 28 Triple IPA“) · Headbanger 28 Triple IPA · Double IPA `r-w3546ca3d674d94f7` – Name (vorher „Headbanger” 28 Triple IPA“) · Lagerbier Hell · Helles · 5 % `r-w41511760c6ffd197` – Alkohol · …

### US

- **Brauereien neu** (96): Alfalfa Farm Cellars (Topsfield) `obdb-18aa2d95-0c48-421a-af53-9b3b6dd81bb2` · Angle Tree Brewery (North Attleborough) `obdb-d9dc1cf1-a85b-4aa9-8917-264634feec7c` · Antimony Brewing (Lenox) `obdb-ca9873b2-a4a1-46db-953d-ae8ab9e4c7e4` · Aquatic Brewing LLC (Falmouth) `obdb-61239a88-ebee-45d3-9794-12860e11259c` · Autodidact Beer (Morris Plains) `osm-n12177539859` · Backbeat Brewing Company (Beverly) `obdb-c2ca768e-16ab-4805-b3f6-2029d0459b94` · Bad Martha Farmer's Brewery - Falmouth (East Falmouth) `obdb-44f8ad30-40a3-481d-b8b7-883440570a1a` · Baleen Brewing (Ketchikan) `osm-n14271102123` · …
- **Brauereien weg** (52): (Closed - Siren Rock Brewery) (Rockwall) `osm-w1266598439` · Autodidact Beer (Morris Plains) `osm-w1553498966` · Batch New Southern Kitchen and Tap `osm-n9792394397` · Bay State Beer Company (Sturbridge) `obdb-eb869777-2904-4e42-bff5-c3251b88735a` · Berthoud Brewing Company (Berthoud) `obdb-9e7c32bd-ac46-4e84-bfec-20a3be839c8e` · Brass Brewing Company (Colorado Springs) `obdb-b1730024-0cb6-4c63-9f4e-8b3d97b85378` · Brewerks (Anchorage) `obdb-c7e86190-5eb9-4c24-863e-99d85ccd1595` · Budweiser `osm-n9797567913` · …
- **Brauereien geändert** (96): 25 O'Clock Brewing Company (Urbana) `osm-n11805321930` – Ort, Website · Adventure Club Brewing (Bayfield) `osm-n8829669821` – Website · Alvarado Street Brewery & Bistro (Carmel By The Sea) `osm-n9632270065` – Ort · Anheuser-Busch Brewery (Saint Louis) `osm-w482921469` – Ort, Website · Arcpoint Brewing Company (Belchertown) `osm-n12140543348` – Ort, Website · Austin Beer Garden Brewing (Austin) `osm-w382439878` – Website · Backslope Brewing (Columbia Falls) `osm-w554986832` – Website · Barrow Brewing Company (Salado) `osm-w643942376` – Website · …
- **Biere neu** (461): 077XX · IPA · 7.8 % `r-q141649245` · 1-New York Sour · Sour Ale `r-w36c303098f49ed6d` · 10 - Drive Axle Amber Ale · Amber `r-w3d5131af47b9458e` · 10 Paulaner Brauerei Paulaner Oktoberfest Bier · Märzen · 6 % `r-wef109f87e3dba8ce` · 12 Alaskan Brewing Co. Amber · Amber · 5.3 % `r-w84c2b22379d0bf78` · 12. Festbier · Märzen `r-wf4c05b54c7b81ea5` · 13.5 Oktoberfest · Märzen · 6 % `r-w3dae0040aaf5b21b` · 1811 Kolsch · Kölsch `r-w9dc0fc0f9b109169` · …
- **Biere weg** (578): @ Peculier Ales · Pale Ale `r-w484cb9e60a71f7c5` · \*\* The Ales \*\* · Pale Ale `r-w92b2c2786d17b117` · \*User Friendly Kolsch · Kölsch · 5 % `r-wec1c5c76863a4c28` · #LagerIsLife · Lager `r-w2cb37885b580124e` · 🎁 Bonuswaarde Calculator · Doppelbock `r-w7f20645fa8cf4c0f` · 🥉 Bronze – Hoppy Lager · Lager `r-w074741164653f637` · 🥉 Bronze – Hoppy Lager · Lager `r-w0843415c39f491cb` · 🥉 Bronze – Hoppy Lager · Lager `r-wc6707524eef9b2bc` · …
- **Biere geändert** (129): 12% Brewers Series Valley · Hazy IPA · 8 % `r-q140877699` – Name (vorher „12% Brewers Series “Valley”“) · 4# · Hazy IPA · 7.5 % `r-q140134497` – Name (vorher „#4#“) · 5.56 Dry Hopped Lager \*Currently Unavailable · Lager `r-wa6866e75d28b32bc` – Name (vorher „5.56 Dry Hopped Lager \*Currently Unavailable\*“) · Alafia Wheat · Weißbier · 5 % `r-web2fe12a937d5348` – Alkohol · Ames Lager · Lager · 4.5 % `r-wadd3a36ade16901f` – Name (vorher „Ames Lager™“) · Apa itu LANGIT99 · Pale Ale `r-we476f591d1e9fb70` – Name (vorher „Apa itu LANGIT99❔“) · Axel’s Alt Lager · Altbier `r-w70df61ee5c5912ef` – Name (vorher „#3 Axel’s Alt Lager“) · Bertha’s Bock · Bock · 6.5 % `r-w9e0c94ecde1ae266` – Name (vorher „Bertha’S Bock“) · …
