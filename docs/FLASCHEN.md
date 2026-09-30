# Flaschen-Design-Brief

Generiert aus `src/data/beers.json` (`node tools/bottles/build-brief.mjs`). Stand: 2026-09-30.
42 Biere, 17 Sorten. Die Steckbriefe sind **Inspiration im PilsBuddy-Look** –
bitte keine 1:1-Kopien realer Etiketten oder Logos (Markenrecht); Farbwelt, Form und Stimmung dürfen
erkennbar sein.

## Export-Spezifikation (damit die Designs ohne Anpassung in die App passen)

- Datei: `public/bottles/<id>.png` (id = erste Spalte unten), transparenter Hintergrund
- Größe: **600 × 1200 px** (Hochformat 1:2), Flasche zentriert, Standfläche auf der Unterkante,
  ca. 40 px Luft oben; alle Flaschen mit **gleicher Bodenlinie**, damit der Stapel ruhig wirkt
- Stil: Bierdeckel-Look wie der Avatar – Tinten-Kante `#1D1811` 2,5–3 px, harte Schatten ohne
  Unschärfe, flache Flächen, keine Farbverläufe; Schaum `#FFF6E3`, Gold `#F2B53A`
- Die App legt die Flasche auf die **Bierfarbe** (Spalte „Farbe“) – das Etikett muss darauf lesbar sein.
  Bei dunklen Bieren (Guinness, Köstritzer, Schlenkerla, Doppelbock) ist der Hintergrund fast schwarz.
- Optional zusätzlich `<id>-mini.png` 120 × 240 px für Listen (sonst wird skaliert)
- In `beers.json` wird dann `"image": "/bottles/<id>.png"` eingetragen
- Vergleich mit den Illustrationen: `npm run dev`, dann `http://localhost:5173/?gallery=bottles`
  (zeigt jedes Bier auf seiner Bierfarbe – dein PNG, sobald eingetragen, sonst die Illustration)

## Sorten (Bier-Stile) und Formvorschlag

| Sorte | Anzahl | Formvorschlag |
| --- | --- | --- |
| Pils | 14 | Longneck 0,33 l / 0,5 l, schlank, hoher Hals |
| Helles | 3 | Euroflasche 0,5 l (NRW-/Euro-Form, kurzer Hals, bauchiger) |
| Rauchbier | 1 | Euroflasche 0,5 l, braun, altmodisches Etikett |
| Pale Ale | 1 | Dose 0,33 l oder Longneck, Craft-Look |
| Kellerbier | 2 | Bügelflasche 0,5 l |
| Weißbier | 3 | Weißbierflasche 0,5 l, bauchig mit langem Hals |
| Kölsch | 2 | Longneck 0,33 l, schlank (daneben: Stange 0,2 l als Glas) |
| Altbier | 2 | Euroflasche 0,5 l, braun |
| Schwarzbier | 1 | Longneck 0,5 l, schwarz-braunes Glas |
| Stout | 1 | Stubby/Pint-Flasche 0,44 l oder Dose, schwarz |
| Lager | 3 | Longneck 0,33 l, klar oder grün |
| Belgian Strong Ale | 1 | Belgische Flasche 0,33 l, bauchig, Korken-/Kronkorken-Look |
| Abbey Blonde | 1 | Belgische Flasche 0,33 l, bauchig |
| Doppelbock | 3 | Steinie/Euroflasche 0,5 l, braun, schwer wirkend |
| IPA | 2 | Dose 0,33 l, knallig |
| Export | 1 | Euroflasche 0,5 l, günstiger Look |
| Bock | 1 | Euroflasche 0,5 l, braun |

## Übersicht

| id | Bier | Sorte | Alk. | Herkunft | Farbe | Referenz-Deck |
| --- | --- | --- | --- | --- | --- | --- |
| `jever` | Jever Pilsener | Pils | 4,9 % | Friesland, Deutschland | `#E6C150` | ja |
| `augustiner` | Augustiner Lagerbier Hell | Helles | 5,2 % | München, Deutschland | `#F1C656` | ja |
| `becks` | Beck's Pils | Pils | 4,9 % | Bremen, Deutschland | `#E9C75B` | ja |
| `schlenkerla` | Aecht Schlenkerla Rauchbier | Rauchbier | 5,1 % | Bamberg, Deutschland | `#6B3316` | ja |
| `rothaus` | Rothaus Tannenzäpfle | Pils | 5,1 % | Schwarzwald, Deutschland | `#EDC24E` | ja |
| `krombacher` | Krombacher Pils | Pils | 4,8 % | Siegerland, Deutschland | `#EBC75C` | ja |
| `ratsherrn` | Ratsherrn Pale Ale | Pale Ale | 5,6 % | Hamburg, Deutschland | `#D98E2E` | ja |
| `tegernseer` | Tegernseer Hell | Helles | 4,8 % | Tegernsee, Deutschland | `#F3CD62` | ja |
| `astra` | Astra Urtyp | Pils | 4,9 % | Hamburg, Deutschland | `#EAC45A` | ja |
| `veltins` | Veltins Pilsener | Pils | 4,8 % | Sauerland, Deutschland | `#EBC862` | ja |
| `stoertebeker` | Störtebeker Keller-Bier 1402 | Kellerbier | 4,8 % | Stralsund, Deutschland | `#D8A13E` | ja |
| `bitburger` | Bitburger Premium Pils | Pils | 4,8 % | Eifel, Deutschland | `#EAC65A` | ja |
| `radeberger` | Radeberger Pilsner | Pils | 4,8 % | Sachsen, Deutschland | `#E6C255` | ja |
| `flensburger` | Flensburger Pilsener | Pils | 4,8 % | Flensburg, Deutschland | `#E3BC4A` | ja |
| `urquell` | Pilsner Urquell | Pils | 4,4 % | Pilsen, Tschechien | `#E0AE3C` | ja |
| `warsteiner` | Warsteiner Premium Pilsener | Pils | 4,8 % | Sauerland, Deutschland | `#EBC95E` |  |
| `paulaner-weisse` | Paulaner Hefe-Weißbier Naturtrüb | Weißbier | 5,5 % | München, Deutschland | `#E8B84A` |  |
| `erdinger` | Erdinger Weißbier | Weißbier | 5,3 % | Erding, Deutschland | `#EABD4F` |  |
| `weihenstephaner` | Weihenstephaner Hefe Weissbier | Weißbier | 5,4 % | Freising, Deutschland | `#E5B448` |  |
| `frueh` | Früh Kölsch | Kölsch | 4,8 % | Köln, Deutschland | `#F0CB5A` |  |
| `gaffel` | Gaffel Kölsch | Kölsch | 4,8 % | Köln, Deutschland | `#EEC855` |  |
| `uerige` | Uerige Alt | Altbier | 4,7 % | Düsseldorf, Deutschland | `#8B4A1E` |  |
| `diebels` | Diebels Alt | Altbier | 4,9 % | Niederrhein, Deutschland | `#9C5424` |  |
| `koestritzer` | Köstritzer Schwarzbier | Schwarzbier | 4,8 % | Thüringen, Deutschland | `#2B1A12` |  |
| `guinness` | Guinness Draught | Stout | 4,2 % | Dublin, Irland | `#1E120C` |  |
| `corona` | Corona Extra | Lager | 4,5 % | Mexiko-Stadt, Mexiko | `#F4D970` |  |
| `heineken` | Heineken Lager | Lager | 5,0 % | Amsterdam, Niederlande | `#EFC94C` |  |
| `stella` | Stella Artois | Lager | 5,0 % | Leuven, Belgien | `#EDC44F` |  |
| `duvel` | Duvel | Belgian Strong Ale | 8,5 % | Breendonk, Belgien | `#F1CE5C` |  |
| `leffe` | Leffe Blonde | Abbey Blonde | 6,6 % | Dinant, Belgien | `#E5A93A` |  |
| `salvator` | Paulaner Salvator | Doppelbock | 7,9 % | München, Deutschland | `#9E5A22` |  |
| `celebrator` | Ayinger Celebrator Doppelbock | Doppelbock | 6,7 % | Aying, Deutschland | `#4A2412` |  |
| `punk-ipa` | BrewDog Punk IPA | IPA | 5,4 % | Ellon, Schottland | `#E3A63A` |  |
| `drunken-sailor` | Crew Republic Drunken Sailor IPA | IPA | 6,4 % | München, Deutschland | `#DA9331` |  |
| `sternburg` | Sternburg Export | Export | 5,2 % | Leipzig, Deutschland | `#ECC757` |  |
| `oettinger` | Oettinger Pils | Pils | 4,7 % | Oettingen, Deutschland | `#EBC85C` |  |
| `hasseroeder` | Hasseröder Premium Pils | Pils | 4,9 % | Harz, Deutschland | `#E9C556` |  |
| `wernesgruener` | Wernesgrüner Pils Legende | Pils | 4,9 % | Vogtland, Deutschland | `#E8C34F` |  |
| `hofbraeu` | Hofbräu Original | Helles | 5,1 % | München, Deutschland | `#F1C858` |  |
| `andechser-doppelbock` | Andechser Doppelbock Dunkel | Doppelbock | 7,1 % | Andechs, Deutschland | `#5A2E14` |  |
| `moenchshof-keller` | Mönchshof Kellerbier | Kellerbier | 5,4 % | Kulmbach, Deutschland | `#D9A43C` |  |
| `einbecker-urbock` | Einbecker Ur-Bock Dunkel | Bock | 6,5 % | Einbeck, Deutschland | `#6E3A18` |  |

## Steckbriefe

### Jever Pilsener · `jever`

- **Sorte / Alkohol:** Pils · 4,9 % · Friesisches Brauhaus zu Jever, Friesland (Deutschland)
- **Bierfarbe in der App:** `#E6C150`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Norddeutsch-streng. Dunkles Glas, Etikett kühl in Blau/Schwarz/Gold mit friesischem Wappen-Gefühl. Wirkt aufrecht, nüchtern, ein bisschen unnahbar. Kein Schnörkel.
- **Tags:** herb · trocken · friesisch direkt
- **Bio in der App:** „Herb. Trocken. Kein Bier für Leute, die ihr Bier gerne um Verzeihung bitten.“
- **Beschreibung:** Friesisch-herbes Pils mit kräftiger Hopfenbittere und sehr trockenem Abgang.

### Augustiner Lagerbier Hell · `augustiner`

- **Sorte / Alkohol:** Helles · 5,2 % · Augustiner-Bräu, München (Deutschland)
- **Bierfarbe in der App:** `#F1C656`
- **Form:** Euroflasche 0,5 l (NRW-/Euro-Form, kurzer Hals, bauchiger)
- **Charakter:** Münchner Understatement: braune Euroflasche, cremefarbenes Etikett mit Grün und Gold, altmodische Schrift, Klosteranmutung. Soll aussehen, als bräuchte es keine Werbung.
- **Tags:** süffig · malzig · Kultstatus
- **Bio in der App:** „Braucht kein Marketing. Hat eine Warteschlange.“
- **Beschreibung:** Münchner Helles mit weicher Malznote und milder Hopfung – der Klassiker aus der Bügelflasche.

### Beck's Pils · `becks`

- **Sorte / Alkohol:** Pils · 4,9 % · Brauerei Beck & Co., Bremen (Deutschland)
- **Bierfarbe in der App:** `#E9C75B`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Die grüne Flasche schlechthin. Silber-grünes Etikett, Schlüssel-Motiv als Anspielung, glatt und international. Der Kumpel, der überall dabei ist.
- **Tags:** mild-herb · massentauglich · grüne Flasche
- **Bio in der App:** „Der Kumpel, der auf jeder Party schon da ist. Irgendwie immer.“
- **Beschreibung:** Bremer Pils, mild-herb und weltweit exportiert.

### Aecht Schlenkerla Rauchbier · `schlenkerla`

- **Sorte / Alkohol:** Rauchbier · 5,1 % · Brauerei Heller-Trum, Bamberg (Deutschland)
- **Bierfarbe in der App:** `#6B3316`
- **Form:** Euroflasche 0,5 l, braun, altmodisches Etikett
- **Charakter:** Alt, dunkel, rauchig: braune Flasche, Etikett in Ocker/Braun mit gotischer Schrift, Bamberger Fachwerk-Stimmung, leichter Rauch-Schleier als Detail.
- **Tags:** rauchig · malzig · polarisiert
- **Bio in der App:** „Schmeckt wie ein Lagerfeuer, das eine Meinung hat.“
- **Beschreibung:** Bamberger Rauchbier aus über Buchenholz gedarrtem Malz. Polarisiert seit 1405.

### Rothaus Tannenzäpfle · `rothaus`

- **Sorte / Alkohol:** Pils · 5,1 % · Badische Staatsbrauerei Rothaus, Schwarzwald (Deutschland)
- **Bierfarbe in der App:** `#EDC24E`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Kleine 0,33-l-Flasche mit Kult-Charakter: Etikett in Grün/Gold mit Schwarzwald-Tanne und Zäpfle, sympathisch-traditionell, leicht kitschig im besten Sinn.
- **Tags:** ausgewogen · süffig · Schwarzwald
- **Bio in der App:** „Kleine Flasche, große Fangemeinde. Ausverkauft, wenn man es am meisten braucht.“
- **Beschreibung:** Schwarzwälder Pils aus der 0,33-l-Flasche mit dem Tannenzapfen. Ausgewogen zwischen Hopfen und Malz.

### Krombacher Pils · `krombacher`

- **Sorte / Alkohol:** Pils · 4,8 % · Krombacher Brauerei, Siegerland (Deutschland)
- **Bierfarbe in der App:** `#EBC75C`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Sauber, breit, massentauglich: grüne oder braune Flasche, Etikett in Grün/Gold mit Quell-/Fels-Motiv, glänzend. Wochenende, Grill, für alle.
- **Tags:** mild · süffig · Crowd-Pleaser
- **Bio in der App:** „Schmeckt nach Wochenende mit Grillgeruch. Für alle. Wirklich alle.“
- **Beschreibung:** Mildes Pils mit Felsquellwasser, eines der meistverkauften Biere Deutschlands.

### Ratsherrn Pale Ale · `ratsherrn`

- **Sorte / Alkohol:** Pale Ale · 5,6 % · Ratsherrn Brauerei, Hamburg (Deutschland)
- **Bierfarbe in der App:** `#D98E2E`
- **Form:** Dose 0,33 l oder Longneck, Craft-Look
- **Charakter:** Hamburger Craft mit Selbstbewusstsein: Longneck oder Dose, kräftiges Rot/Weiß, moderne Typo, Grapefruit-Akzent. Urban, laut, freundlich.
- **Tags:** fruchtig · hopfig · Craft
- **Bio in der App:** „Riecht nach Grapefruit und Selbstbewusstsein.“
- **Beschreibung:** Hamburger Pale Ale mit Citrus- und Grapefruitaromen aus amerikanischen Hopfensorten.

### Tegernseer Hell · `tegernseer`

- **Sorte / Alkohol:** Helles · 4,8 % · Herzoglich Bayerisches Brauhaus Tegernsee, Tegernsee (Deutschland)
- **Bierfarbe in der App:** `#F3CD62`
- **Form:** Euroflasche 0,5 l (NRW-/Euro-Form, kurzer Hals, bauchiger)
- **Charakter:** Weich und bayerisch-nostalgisch: braune Euroflasche, blau-weißes Etikett mit See- und Berg-Anmutung, herzogliches Wappen-Gefühl. Sonntagmorgen.
- **Tags:** weich · malzig · bayerisch
- **Bio in der App:** „Weich wie ein Sonntagmorgen am See. Ohne Wecker.“
- **Beschreibung:** Oberbayerisches Helles, weich und rund, eines der süffigsten Biere des Landes.

### Astra Urtyp · `astra`

- **Sorte / Alkohol:** Pils · 4,9 % · Holsten-Brauerei, Hamburg (Deutschland)
- **Bierfarbe in der App:** `#EAC45A`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Kiez-Ikone: Herz-mit-Anker als Motiv (eigene Interpretation), Rot/Weiß/Schwarz, rau, plakativ, St.-Pauli-Attitüde. Kein Smalltalk.
- **Tags:** kiezig · mild · ehrlich
- **Bio in der App:** „Hafenkante, Herz, Anker. Kein Bier für Smalltalk.“
- **Beschreibung:** Das Kiezbier von St. Pauli. Mild-herbes Pils mit Herz-und-Anker-Logo.

### Veltins Pilsener · `veltins`

- **Sorte / Alkohol:** Pils · 4,8 % · Brauerei C. & A. Veltins, Sauerland (Deutschland)
- **Bierfarbe in der App:** `#EBC862`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Frisch und klar: grüne Longneck, Etikett in Blau/Silber/Rot, sportlich, geradlinig, sauerländisch-unaufgeregt.
- **Tags:** frisch · süffig · klar
- **Bio in der App:** „Frisch, klar, sauerländisch unkompliziert. Wie ein fester Handschlag.“
- **Beschreibung:** Frisches, klares Sauerland-Pils mit feiner Hopfennote.

### Störtebeker Keller-Bier 1402 · `stoertebeker`

- **Sorte / Alkohol:** Kellerbier · 4,8 % · Störtebeker Braumanufaktur, Stralsund (Deutschland)
- **Bierfarbe in der App:** `#D8A13E`
- **Form:** Bügelflasche 0,5 l
- **Charakter:** Ostsee-Pirat: dunkle 0,5-l-Flasche, kupfer-braunes Etikett, Segelschiff/Piratensilhouette, naturtrübes Bernstein im Glas. Handwerklich, rau.
- **Tags:** naturtrüb · malzig · Ostsee
- **Bio in der App:** „Naturtrüb. Hat nichts zu verbergen – außer Hefe.“
- **Beschreibung:** Naturtrübes Kellerbier von der Ostsee mit weicher Hefe- und Malznote.

### Bitburger Premium Pils · `bitburger`

- **Sorte / Alkohol:** Pils · 4,8 % · Bitburger Braugruppe, Eifel (Deutschland)
- **Bierfarbe in der App:** `#EAC65A`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Trägt Anzug: Longneck, Etikett in Blau/Silber/Gold, sehr ordentlich, konservativ-edel. Feinherb und korrekt.
- **Tags:** feinherb · klassisch · Eifel
- **Bio in der App:** „Trägt Anzug. Auch am Wochenende.“
- **Beschreibung:** Feinherbes Eifel-Pils mit ausgeprägter Hopfennote. „Bitte ein Bit.“

### Radeberger Pilsner · `radeberger`

- **Sorte / Alkohol:** Pils · 4,8 % · Radeberger Exportbierbrauerei, Sachsen (Deutschland)
- **Bierfarbe in der App:** `#E6C255`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Sächsischer Stolz: schlanke Longneck, Etikett in Dunkelgrün/Gold mit Schloss-/Historien-Anmutung, elegant, etwas förmlich.
- **Tags:** feinherb · sächsisch · Tradition
- **Bio in der App:** „Feinherb und ein bisschen stolz auf die eigene Geschichte. Zu Recht.“
- **Beschreibung:** Sächsisches Pilsner nach böhmischer Art, feinherb mit edler Hopfenbittere.

### Flensburger Pilsener · `flensburger`

- **Sorte / Alkohol:** Pils · 4,8 % · Flensburger Brauerei, Flensburg (Deutschland)
- **Bierfarbe in der App:** `#E3BC4A`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Bügelverschluss ist Pflicht (macht Plopp). Braune 0,33-l-Bügelflasche, Etikett in Blau/Weiß mit maritimem Nordsee-Motiv. Wortkarg, ernst.
- **Tags:** herb · trocken · Bügelverschluss
- **Bio in der App:** „Macht Plopp. Redet nicht viel. Meint es aber ernst.“
- **Beschreibung:** Norddeutsches Pils mit kräftiger Hopfenbittere und dem berühmten Plopp des Bügelverschlusses.

### Pilsner Urquell · `urquell`

- **Sorte / Alkohol:** Pils · 4,4 % · Plzeňský Prazdroj, Pilsen (Tschechien)
- **Bierfarbe in der App:** `#E0AE3C`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Das Original: grüne Flasche, Etikett in Rot/Gold/Grün mit Stadttor-/Siegel-Motiv, historisch, würdevoll. Weiß, was es ist.
- **Tags:** vollmundig · hopfig · Urgestein
- **Bio in der App:** „Das Original. Und es weiß das auch.“
- **Beschreibung:** Das erste Pilsner der Welt, seit 1842 mit Saazer Hopfen gebraut. Vollmundig und würzig.

### Warsteiner Premium Pilsener · `warsteiner`

- **Sorte / Alkohol:** Pils · 4,8 % · Warsteiner Brauerei, Sauerland (Deutschland)
- **Bierfarbe in der App:** `#EBC95E`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Königlich ohne Allüren: Longneck, Etikett in Gold/Grün mit Kronen-Motiv (eigene Interpretation), dazu die Tulpe als Glas. Glatt und mild.
- **Tags:** mild · klar · Tulpe
- **Bio in der App:** „Hat eine Krone im Logo und trotzdem keine Allüren.“
- **Beschreibung:** Mildes Sauerland-Pils in der Tulpe. Eine Königin unter den Bieren, sagt die Werbung.

### Paulaner Hefe-Weißbier Naturtrüb · `paulaner-weisse`

- **Sorte / Alkohol:** Weißbier · 5,5 % · Paulaner Brauerei, München (Deutschland)
- **Bierfarbe in der App:** `#E8B84A`
- **Form:** Weißbierflasche 0,5 l, bauchig mit langem Hals
- **Charakter:** Bauchige Weißbierflasche, naturtrübes Bernstein, Etikett in Blau/Weiß/Gold mit Mönchs-Anmutung, Biergarten-Stimmung. Banane ohne Banane.
- **Tags:** fruchtig · hefig · Biergarten
- **Bio in der App:** „Schmeckt nach Banane, ohne je eine gesehen zu haben.“
- **Beschreibung:** Naturtrübes Hefeweizen mit Banane, Nelke und cremiger Schaumkrone.

### Erdinger Weißbier · `erdinger`

- **Sorte / Alkohol:** Weißbier · 5,3 % · Erdinger Weißbräu, Erding (Deutschland)
- **Bierfarbe in der App:** `#EABD4F`
- **Form:** Weißbierflasche 0,5 l, bauchig mit langem Hals
- **Charakter:** Weißbierflasche, blau-weiß-goldenes Etikett, sehr sauber und bekannt, leicht spritzig wirkend. Der Weizen-Einstieg für alle.
- **Tags:** mild · spritzig · Weizen-Einstieg
- **Bio in der App:** „Das Weißbier, das auch deine Tante kennt. Aus dem Fernsehen.“
- **Beschreibung:** Die größte Weißbierbrauerei der Welt. Mild, spritzig, mit feiner Hefenote.

### Weihenstephaner Hefe Weissbier · `weihenstephaner`

- **Sorte / Alkohol:** Weißbier · 5,4 % · Bayerische Staatsbrauerei Weihenstephan, Freising (Deutschland)
- **Bierfarbe in der App:** `#E5B448`
- **Form:** Weißbierflasche 0,5 l, bauchig mit langem Hals
- **Charakter:** Älteste Brauerei der Welt: Weißbierflasche, Etikett in Gold/Weiß/Blau mit Wappen und „seit 1040“-Ehrwürdigkeit. Vollmundig, prämiert, stolz.
- **Tags:** vollmundig · prämiert · Klosterbier
- **Bio in der App:** „Seit 1040 im Geschäft. Hat mehr Erfahrung als du und ich zusammen.“
- **Beschreibung:** Aus der ältesten Brauerei der Welt. Vollmundiges Hefeweizen mit Banane und Nelke, vielfach prämiert.

### Früh Kölsch · `frueh`

- **Sorte / Alkohol:** Kölsch · 4,8 % · Cölner Hofbräu Früh, Köln (Deutschland)
- **Bierfarbe in der App:** `#F0CB5A`
- **Form:** Longneck 0,33 l, schlank (daneben: Stange 0,2 l als Glas)
- **Charakter:** Kölsch: schlanke Flasche, Etikett in Rot/Weiß/Gold mit Dom-Andeutung, dazu die Stange 0,2 l. Leicht, fröhlich, kommt oft.
- **Tags:** leicht · Stange · Köln
- **Bio in der App:** „Kommt in 0,2 l. Kommt aber oft.“
- **Beschreibung:** Obergäriges Kölsch aus der Stange. Leicht, frisch, kommt ungefragt nach.

### Gaffel Kölsch · `gaffel`

- **Sorte / Alkohol:** Kölsch · 4,8 % · Privatbrauerei Gaffel, Köln (Deutschland)
- **Bierfarbe in der App:** `#EEC855`
- **Form:** Longneck 0,33 l, schlank (daneben: Stange 0,2 l als Glas)
- **Charakter:** Kölsch, etwas hopfiger: Etikett in Blau/Rot/Weiß, Karnevalsnähe erlaubt (Konfetti-Detail), frisch und rheinisch.
- **Tags:** frisch · hopfenbetont · Karneval
- **Bio in der App:** „Das Kölsch für Leute, die beim Karneval noch wissen, was sie trinken.“
- **Beschreibung:** Etwas hopfenbetonteres Kölsch mit trockenem Abgang.

### Uerige Alt · `uerige`

- **Sorte / Alkohol:** Altbier · 4,7 % · Uerige Obergärige Hausbrauerei, Düsseldorf (Deutschland)
- **Bierfarbe in der App:** `#8B4A1E`
- **Form:** Euroflasche 0,5 l, braun
- **Charakter:** Düsseldorfer Altbier: kupferfarbener Inhalt, braune Flasche, Etikett in Dunkelrot/Gold mit Altstadt-Anmutung, urig, herb. Das „lecker Dröppke“.
- **Tags:** herb · kupferfarben · Altstadt
- **Bio in der App:** „Das dat lecker Dröppke. Sagt Düsseldorf. Köln widerspricht.“
- **Beschreibung:** Das herbste Altbier Düsseldorfs. Kupferfarben, kräftig gehopft, malzbetont.

### Diebels Alt · `diebels`

- **Sorte / Alkohol:** Altbier · 4,9 % · Brauerei Diebels, Niederrhein (Deutschland)
- **Bierfarbe in der App:** `#9C5424`
- **Form:** Euroflasche 0,5 l, braun
- **Charakter:** Mildes Alt vom Niederrhein: braune Flasche, Etikett in Rot/Gold/Schwarz, rund, freundlich, versöhnlich.
- **Tags:** mild · malzig · Niederrhein
- **Bio in der App:** „Das Alt, das sich mit allen versteht. Sogar mit Kölsch-Trinkern.“
- **Beschreibung:** Milder Altbier-Klassiker vom Niederrhein mit rundem Malzkörper.

### Köstritzer Schwarzbier · `koestritzer`

- **Sorte / Alkohol:** Schwarzbier · 4,8 % · Köstritzer Schwarzbierbrauerei, Thüringen (Deutschland)
- **Bierfarbe in der App:** `#2B1A12`
- **Form:** Longneck 0,5 l, schwarz-braunes Glas
- **Charakter:** Schwarzbier: fast schwarze Flasche, Etikett in Schwarz/Gold/Rot mit Thüringer Wappen-Gefühl, elegant, überraschend leicht. Doppelagent.
- **Tags:** röstig · dunkel · leichter als gedacht
- **Bio in der App:** „Sieht aus wie Guinness, trinkt sich wie Pils. Ein Doppelagent.“
- **Beschreibung:** Thüringer Schwarzbier mit Röstmalz, Kaffee- und Schokoladennoten – dabei überraschend leicht.

### Guinness Draught · `guinness`

- **Sorte / Alkohol:** Stout · 4,2 % · St. James's Gate Brewery, Dublin (Irland)
- **Bierfarbe in der App:** `#1E120C`
- **Form:** Stubby/Pint-Flasche 0,44 l oder Dose, schwarz
- **Charakter:** Pint-Charakter: schwarze Flasche/Dose, cremeweiße Schaumkrone als Signatur, Etikett in Schwarz/Creme/Gold mit Harfen-Andeutung. Cremig, ruhig, Pub.
- **Tags:** röstig · cremig · Pub
- **Bio in der App:** „Braucht 119,5 Sekunden zum Zapfen. Und du sollst warten. Frechheit.“
- **Beschreibung:** Irisches Dry Stout mit Röstaromen, cremiger Stickstoff-Schaumkrone und trockenem Abgang.

### Corona Extra · `corona`

- **Sorte / Alkohol:** Lager · 4,5 % · Grupo Modelo, Mexiko-Stadt (Mexiko)
- **Bierfarbe in der App:** `#F4D970`
- **Form:** Longneck 0,33 l, klar oder grün
- **Charakter:** Klare Flasche mit hellgelbem Inhalt, weiß-blau-goldenes Etikett, Kronen-Andeutung, Limettenspalte im Hals als Detail. Strand, Sonne.
- **Tags:** leicht · Limette · Strand
- **Bio in der App:** „Ohne Limette nur ein Bier. Mit Limette immer noch nur ein Bier.“
- **Beschreibung:** Leichtes mexikanisches Lager, traditionell mit Limettenspalte im Flaschenhals.

### Heineken Lager · `heineken`

- **Sorte / Alkohol:** Lager · 5,0 % · Heineken, Amsterdam (Niederlande)
- **Bierfarbe in der App:** `#EFC94C`
- **Form:** Longneck 0,33 l, klar oder grün
- **Charakter:** Grüne Flasche, roter Stern als Akzent (eigene Interpretation), Weiß/Grün/Silber, weltweit gleich, glatt.
- **Tags:** international · mild · grüne Flasche
- **Bio in der App:** „Ist überall. Schmeckt überall gleich. Das ist der Plan.“
- **Beschreibung:** Niederländisches Lager mit leicht süßlicher Note. Weltweit in derselben grünen Flasche.

### Stella Artois · `stella`

- **Sorte / Alkohol:** Lager · 5,0 % · Brouwerij Artois, Leuven (Belgien)
- **Bierfarbe in der App:** `#EDC44F`
- **Form:** Longneck 0,33 l, klar oder grün
- **Charakter:** Kelchglas-Anmutung: schlanke Flasche, Etikett in Weiß/Rot/Gold mit Horn-/Stern-Andeutung, belgisch-edel, ein bisschen Sektempfang.
- **Tags:** Kelchglas · mild · Belgien
- **Bio in der App:** „Kommt im Kelch. Fühlt sich wie ein Sektempfang an, ist aber Lager.“
- **Beschreibung:** Belgisches Premium-Lager mit leichter Malzsüße, im Kelchglas serviert.

### Duvel · `duvel`

- **Sorte / Alkohol:** Belgian Strong Ale · 8,5 % · Duvel Moortgat, Breendonk (Belgien)
- **Bierfarbe in der App:** `#F1CE5C`
- **Form:** Belgische Flasche 0,33 l, bauchig, Korken-/Kronkorken-Look
- **Charakter:** Der Teufel: bauchige belgische Flasche, Etikett in Rot/Creme/Gold, dazu das große Tulpenglas mit riesiger Schaumkrone. Sieht harmlos aus, ist es nicht.
- **Tags:** stark · spritzig · Teufelszeug
- **Bio in der App:** „Heißt „Teufel“. Und das steht da nicht aus Spaß.“
- **Beschreibung:** Belgisches Strong Golden Ale. Sieht aus wie Pils, hat aber 8,5 % und eine riesige Schaumkrone.

### Leffe Blonde · `leffe`

- **Sorte / Alkohol:** Abbey Blonde · 6,6 % · Abbaye de Leffe / AB InBev, Dinant (Belgien)
- **Bierfarbe in der App:** `#E5A93A`
- **Form:** Belgische Flasche 0,33 l, bauchig
- **Charakter:** Abteibier: bauchige Flasche, Etikett in Blau/Gold/Creme mit Klosterfenster-Andeutung, warm, süßlich, Dessert-Stimmung.
- **Tags:** süß · Abteibier · Vanille
- **Bio in der App:** „Schmeckt wie ein Dessert, das sich als Bier verkleidet hat.“
- **Beschreibung:** Belgisches Abteibier, süßlich, malzig, mit Gewürznelke und Vanille.

### Paulaner Salvator · `salvator`

- **Sorte / Alkohol:** Doppelbock · 7,9 % · Paulaner Brauerei, München (Deutschland)
- **Bierfarbe in der App:** `#9E5A22`
- **Form:** Steinie/Euroflasche 0,5 l, braun, schwer wirkend
- **Charakter:** Ur-Doppelbock: schwere braune Flasche, Etikett in Rot/Gold mit Mönchs-Motiv, Starkbierzeit, flüssiges Brot. Dunkles Bernstein im Glas.
- **Tags:** malzig · stark · Starkbierzeit
- **Bio in der App:** „Flüssiges Brot. Von Mönchen erfunden, die beim Fasten geschummelt haben.“
- **Beschreibung:** Der Ur-Doppelbock. Malzig, süß, stark – seit dem 17. Jahrhundert Fastenbier der Mönche.

### Ayinger Celebrator Doppelbock · `celebrator`

- **Sorte / Alkohol:** Doppelbock · 6,7 % · Brauerei Aying, Aying (Deutschland)
- **Bierfarbe in der App:** `#4A2412`
- **Form:** Steinie/Euroflasche 0,5 l, braun, schwer wirkend
- **Charakter:** Doppelbock mit Ziege: dunkle Flasche, Etikett in Rot/Schwarz/Gold, die kleine Plastik-Ziege am Flaschenhals ist das Muss-Detail.
- **Tags:** dunkel · Schokolade · Ziege inklusive
- **Bio in der App:** „Hat eine kleine Ziege an der Flasche. Braucht keine weiteren Argumente.“
- **Beschreibung:** Dunkler Doppelbock mit Schokolade, Dörrobst und Röstmalz. Mit Plastik-Ziege am Flaschenhals.

### BrewDog Punk IPA · `punk-ipa`

- **Sorte / Alkohol:** IPA · 5,4 % · BrewDog, Ellon (Schottland)
- **Bierfarbe in der App:** `#E3A63A`
- **Form:** Dose 0,33 l, knallig
- **Charakter:** Craft-Rebell: blaue Dose (eigene Interpretation), grelle Typo, Punk-Attitüde, tropisch-hopfige Farbwelt (Orange/Blau).
- **Tags:** hopfig · tropisch · Craft-Klassiker
- **Bio in der App:** „Hat 2007 Krawall gemacht und ist jetzt im Supermarkt. Wie wir alle.“
- **Beschreibung:** Das IPA, das den Craft-Beer-Boom nach Europa gebracht hat. Tropische Früchte, Harz, Bittere.

### Crew Republic Drunken Sailor IPA · `drunken-sailor`

- **Sorte / Alkohol:** IPA · 6,4 % · Crew Republic, München (Deutschland)
- **Bierfarbe in der App:** `#DA9331`
- **Form:** Dose 0,33 l, knallig
- **Charakter:** Bayerisches Craft: Dose, Matrosen-/Anker-Motiv, Blau/Orange/Weiß, laut, ironisch. Mango und Bittere.
- **Tags:** hopfig · Mango · Craft aus Bayern
- **Bio in der App:** „Bayerisches Craft Beer. Ja, das gibt's. Und es ist laut.“
- **Beschreibung:** Münchner IPA mit Mango, Grapefruit und ordentlich Bittere. Craft aus Bayern, ohne Reinheitsgebot-Debatte.

### Sternburg Export · `sternburg`

- **Sorte / Alkohol:** Export · 5,2 % · Sternburg Brauerei, Leipzig (Deutschland)
- **Bierfarbe in der App:** `#ECC757`
- **Form:** Euroflasche 0,5 l, günstiger Look
- **Charakter:** Späti-Legende: Euroflasche, rot-weißes Etikett mit Stern, günstig, stolz, Leipzig. Absichtlich schlicht.
- **Tags:** günstig · Späti · Leipzig
- **Bio in der App:** „Kostet weniger als der Pfand drumherum. Und ist trotzdem stolz.“
- **Beschreibung:** Leipziger Export mit leichter Malzsüße. Das Späti-Bier schlechthin.

### Oettinger Pils · `oettinger`

- **Sorte / Alkohol:** Pils · 4,7 % · Oettinger Brauerei, Oettingen (Deutschland)
- **Bierfarbe in der App:** `#EBC85C`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Discounter ohne Scham: braune Flasche, Etikett in Blau/Weiß/Gold, ganz schlicht, Studentenbier.
- **Tags:** günstig · mild · Studentenbier
- **Bio in der App:** „Macht keine Werbung. Muss es auch nicht. Kennt eh jeder vom Studium.“
- **Beschreibung:** Bayerisches Discounter-Pils, mild und unkompliziert. Ohne Werbung, dafür billig.

### Hasseröder Premium Pils · `hasseroeder`

- **Sorte / Alkohol:** Pils · 4,9 % · Hasseröder Brauerei, Harz (Deutschland)
- **Bierfarbe in der App:** `#E9C556`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Sechseckige Flasche ist das Detail. Grün/Gold/Rot, Harz-Anmutung, kernig.
- **Tags:** kernig · Harz · Sechskant
- **Bio in der App:** „Sechseckige Flasche. Weil rund kann jeder.“
- **Beschreibung:** Harzer Pils mit sechseckiger Flasche und kerniger Hopfennote.

### Wernesgrüner Pils Legende · `wernesgruener`

- **Sorte / Alkohol:** Pils · 4,9 % · Wernesgrüner Brauerei, Vogtland (Deutschland)
- **Bierfarbe in der App:** `#E8C34F`
- **Form:** Longneck 0,33 l / 0,5 l, schlank, hoher Hals
- **Charakter:** Pils-Legende aus dem Vogtland: grüne Flasche, Etikett in Grün/Gold/Weiß mit Tannen-/Berg-Andeutung, traditionell, hopfenbetont.
- **Tags:** hopfenbetont · Vogtland · Legende
- **Bio in der App:** „Nennt sich selbst Legende. Und wer will da schon widersprechen.“
- **Beschreibung:** Vogtländisches Pils mit ausgeprägter, aber weicher Hopfenbittere.

### Hofbräu Original · `hofbraeu`

- **Sorte / Alkohol:** Helles · 5,1 % · Staatliches Hofbräuhaus München, München (Deutschland)
- **Bierfarbe in der App:** `#F1C858`
- **Form:** Euroflasche 0,5 l (NRW-/Euro-Form, kurzer Hals, bauchiger)
- **Charakter:** Maßkrug-Gefühl: braune Flasche, Etikett in Blau/Weiß mit HB-Anmutung (eigene Interpretation), Touristen-Ikone, freundlich.
- **Tags:** Maßkrug · Touristen · München
- **Bio in der App:** „Wird pro Tag von mehr Touristen fotografiert als der Eiffelturm. Gefühlt.“
- **Beschreibung:** Das Helle aus dem Hofbräuhaus – etwas hopfiger als andere Münchner Helle.

### Andechser Doppelbock Dunkel · `andechser-doppelbock`

- **Sorte / Alkohol:** Doppelbock · 7,1 % · Klosterbrauerei Andechs, Andechs (Deutschland)
- **Bierfarbe in der App:** `#5A2E14`
- **Form:** Steinie/Euroflasche 0,5 l, braun, schwer wirkend
- **Charakter:** Klosterbier vom Heiligen Berg: dunkle Flasche, Etikett in Braun/Gold/Rot mit Kloster-Silhouette, ehrwürdig, warm, Karamell.
- **Tags:** Kloster · malzig · Karamell
- **Bio in der App:** „Wird von Mönchen gebraut. Man merkt, die haben Zeit.“
- **Beschreibung:** Dunkler Klosterdoppelbock vom Heiligen Berg. Malzig, warm, mit Karamell und Pflaume.

### Mönchshof Kellerbier · `moenchshof-keller`

- **Sorte / Alkohol:** Kellerbier · 5,4 % · Kulmbacher Brauerei, Kulmbach (Deutschland)
- **Bierfarbe in der App:** `#D9A43C`
- **Form:** Bügelflasche 0,5 l
- **Charakter:** Bügelflasche, ungefiltert, bernsteinfarbener Inhalt, Etikett in Braun/Creme mit Mönch-Motiv, fränkisch, urig.
- **Tags:** ungefiltert · fränkisch · bernstein
- **Bio in der App:** „Ungefiltert und stolz drauf. Wie ein guter Freund nach dem dritten Bier.“
- **Beschreibung:** Fränkisches Kellerbier, ungefiltert, bernsteinfarben, mit kräftigem Malzkörper.

### Einbecker Ur-Bock Dunkel · `einbecker-urbock`

- **Sorte / Alkohol:** Bock · 6,5 % · Einbecker Brauhaus, Einbeck (Deutschland)
- **Bierfarbe in der App:** `#6E3A18`
- **Form:** Euroflasche 0,5 l, braun
- **Charakter:** Bock-Erfinder: braune Flasche, Etikett in Dunkelrot/Gold mit historischer Typo, Niedersachsen, stolz auf 1378.
- **Tags:** Bock-Erfinder · malzig · Niedersachsen
- **Bio in der App:** „Hat das Bockbier erfunden. Erwähnt das gelegentlich.“
- **Beschreibung:** Aus der Stadt, die dem Bockbier den Namen gab. Dunkel, malzig, mit feiner Hopfenbittere.

