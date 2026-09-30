// Generates docs/FLASCHEN.md – the bottle design brief – from src/data/beers.json.
// Run: node tools/bottles/build-brief.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const beers = JSON.parse(readFileSync(resolve(root, 'src/data/beers.json'), 'utf8'))

/** Suggested container per style – the designer may deviate, but this keeps silhouettes distinct. */
const FORM_BY_STYLE = {
  Pils: 'Longneck 0,33 l / 0,5 l, schlank, hoher Hals',
  Helles: 'Euroflasche 0,5 l (NRW-/Euro-Form, kurzer Hals, bauchiger)',
  Lager: 'Longneck 0,33 l, klar oder grün',
  Weißbier: 'Weißbierflasche 0,5 l, bauchig mit langem Hals',
  Kölsch: 'Longneck 0,33 l, schlank (daneben: Stange 0,2 l als Glas)',
  Altbier: 'Euroflasche 0,5 l, braun',
  Kellerbier: 'Bügelflasche 0,5 l',
  Rauchbier: 'Euroflasche 0,5 l, braun, altmodisches Etikett',
  Schwarzbier: 'Longneck 0,5 l, schwarz-braunes Glas',
  Stout: 'Stubby/Pint-Flasche 0,44 l oder Dose, schwarz',
  'Pale Ale': 'Dose 0,33 l oder Longneck, Craft-Look',
  IPA: 'Dose 0,33 l, knallig',
  Doppelbock: 'Steinie/Euroflasche 0,5 l, braun, schwer wirkend',
  Bock: 'Euroflasche 0,5 l, braun',
  'Belgian Strong Ale': 'Belgische Flasche 0,33 l, bauchig, Korken-/Kronkorken-Look',
  'Abbey Blonde': 'Belgische Flasche 0,33 l, bauchig',
  Export: 'Euroflasche 0,5 l, günstiger Look',
}

/** Hand-written character notes: form, colours, mood. Inspired-by, never a 1:1 copy of the real label. */
const CHARACTER = {
  jever: 'Norddeutsch-streng. Dunkles Glas, Etikett kühl in Blau/Schwarz/Gold mit friesischem Wappen-Gefühl. Wirkt aufrecht, nüchtern, ein bisschen unnahbar. Kein Schnörkel.',
  augustiner: 'Münchner Understatement: braune Euroflasche, cremefarbenes Etikett mit Grün und Gold, altmodische Schrift, Klosteranmutung. Soll aussehen, als bräuchte es keine Werbung.',
  becks: 'Die grüne Flasche schlechthin. Silber-grünes Etikett, Schlüssel-Motiv als Anspielung, glatt und international. Der Kumpel, der überall dabei ist.',
  schlenkerla: 'Alt, dunkel, rauchig: braune Flasche, Etikett in Ocker/Braun mit gotischer Schrift, Bamberger Fachwerk-Stimmung, leichter Rauch-Schleier als Detail.',
  rothaus: 'Kleine 0,33-l-Flasche mit Kult-Charakter: Etikett in Grün/Gold mit Schwarzwald-Tanne und Zäpfle, sympathisch-traditionell, leicht kitschig im besten Sinn.',
  krombacher: 'Sauber, breit, massentauglich: grüne oder braune Flasche, Etikett in Grün/Gold mit Quell-/Fels-Motiv, glänzend. Wochenende, Grill, für alle.',
  ratsherrn: 'Hamburger Craft mit Selbstbewusstsein: Longneck oder Dose, kräftiges Rot/Weiß, moderne Typo, Grapefruit-Akzent. Urban, laut, freundlich.',
  tegernseer: 'Weich und bayerisch-nostalgisch: braune Euroflasche, blau-weißes Etikett mit See- und Berg-Anmutung, herzogliches Wappen-Gefühl. Sonntagmorgen.',
  astra: 'Kiez-Ikone: Herz-mit-Anker als Motiv (eigene Interpretation), Rot/Weiß/Schwarz, rau, plakativ, St.-Pauli-Attitüde. Kein Smalltalk.',
  veltins: 'Frisch und klar: grüne Longneck, Etikett in Blau/Silber/Rot, sportlich, geradlinig, sauerländisch-unaufgeregt.',
  stoertebeker: 'Ostsee-Pirat: dunkle 0,5-l-Flasche, kupfer-braunes Etikett, Segelschiff/Piratensilhouette, naturtrübes Bernstein im Glas. Handwerklich, rau.',
  bitburger: 'Trägt Anzug: Longneck, Etikett in Blau/Silber/Gold, sehr ordentlich, konservativ-edel. Feinherb und korrekt.',
  radeberger: 'Sächsischer Stolz: schlanke Longneck, Etikett in Dunkelgrün/Gold mit Schloss-/Historien-Anmutung, elegant, etwas förmlich.',
  flensburger: 'Bügelverschluss ist Pflicht (macht Plopp). Braune 0,33-l-Bügelflasche, Etikett in Blau/Weiß mit maritimem Nordsee-Motiv. Wortkarg, ernst.',
  urquell: 'Das Original: grüne Flasche, Etikett in Rot/Gold/Grün mit Stadttor-/Siegel-Motiv, historisch, würdevoll. Weiß, was es ist.',
  warsteiner: 'Königlich ohne Allüren: Longneck, Etikett in Gold/Grün mit Kronen-Motiv (eigene Interpretation), dazu die Tulpe als Glas. Glatt und mild.',
  'paulaner-weisse': 'Bauchige Weißbierflasche, naturtrübes Bernstein, Etikett in Blau/Weiß/Gold mit Mönchs-Anmutung, Biergarten-Stimmung. Banane ohne Banane.',
  erdinger: 'Weißbierflasche, blau-weiß-goldenes Etikett, sehr sauber und bekannt, leicht spritzig wirkend. Der Weizen-Einstieg für alle.',
  weihenstephaner: 'Älteste Brauerei der Welt: Weißbierflasche, Etikett in Gold/Weiß/Blau mit Wappen und „seit 1040“-Ehrwürdigkeit. Vollmundig, prämiert, stolz.',
  frueh: 'Kölsch: schlanke Flasche, Etikett in Rot/Weiß/Gold mit Dom-Andeutung, dazu die Stange 0,2 l. Leicht, fröhlich, kommt oft.',
  gaffel: 'Kölsch, etwas hopfiger: Etikett in Blau/Rot/Weiß, Karnevalsnähe erlaubt (Konfetti-Detail), frisch und rheinisch.',
  uerige: 'Düsseldorfer Altbier: kupferfarbener Inhalt, braune Flasche, Etikett in Dunkelrot/Gold mit Altstadt-Anmutung, urig, herb. Das „lecker Dröppke“.',
  diebels: 'Mildes Alt vom Niederrhein: braune Flasche, Etikett in Rot/Gold/Schwarz, rund, freundlich, versöhnlich.',
  koestritzer: 'Schwarzbier: fast schwarze Flasche, Etikett in Schwarz/Gold/Rot mit Thüringer Wappen-Gefühl, elegant, überraschend leicht. Doppelagent.',
  guinness: 'Pint-Charakter: schwarze Flasche/Dose, cremeweiße Schaumkrone als Signatur, Etikett in Schwarz/Creme/Gold mit Harfen-Andeutung. Cremig, ruhig, Pub.',
  corona: 'Klare Flasche mit hellgelbem Inhalt, weiß-blau-goldenes Etikett, Kronen-Andeutung, Limettenspalte im Hals als Detail. Strand, Sonne.',
  heineken: 'Grüne Flasche, roter Stern als Akzent (eigene Interpretation), Weiß/Grün/Silber, weltweit gleich, glatt.',
  stella: 'Kelchglas-Anmutung: schlanke Flasche, Etikett in Weiß/Rot/Gold mit Horn-/Stern-Andeutung, belgisch-edel, ein bisschen Sektempfang.',
  duvel: 'Der Teufel: bauchige belgische Flasche, Etikett in Rot/Creme/Gold, dazu das große Tulpenglas mit riesiger Schaumkrone. Sieht harmlos aus, ist es nicht.',
  leffe: 'Abteibier: bauchige Flasche, Etikett in Blau/Gold/Creme mit Klosterfenster-Andeutung, warm, süßlich, Dessert-Stimmung.',
  salvator: 'Ur-Doppelbock: schwere braune Flasche, Etikett in Rot/Gold mit Mönchs-Motiv, Starkbierzeit, flüssiges Brot. Dunkles Bernstein im Glas.',
  celebrator: 'Doppelbock mit Ziege: dunkle Flasche, Etikett in Rot/Schwarz/Gold, die kleine Plastik-Ziege am Flaschenhals ist das Muss-Detail.',
  'punk-ipa': 'Craft-Rebell: blaue Dose (eigene Interpretation), grelle Typo, Punk-Attitüde, tropisch-hopfige Farbwelt (Orange/Blau).',
  'drunken-sailor': 'Bayerisches Craft: Dose, Matrosen-/Anker-Motiv, Blau/Orange/Weiß, laut, ironisch. Mango und Bittere.',
  sternburg: 'Späti-Legende: Euroflasche, rot-weißes Etikett mit Stern, günstig, stolz, Leipzig. Absichtlich schlicht.',
  oettinger: 'Discounter ohne Scham: braune Flasche, Etikett in Blau/Weiß/Gold, ganz schlicht, Studentenbier.',
  hasseroeder: 'Sechseckige Flasche ist das Detail. Grün/Gold/Rot, Harz-Anmutung, kernig.',
  wernesgruener: 'Pils-Legende aus dem Vogtland: grüne Flasche, Etikett in Grün/Gold/Weiß mit Tannen-/Berg-Andeutung, traditionell, hopfenbetont.',
  hofbraeu: 'Maßkrug-Gefühl: braune Flasche, Etikett in Blau/Weiß mit HB-Anmutung (eigene Interpretation), Touristen-Ikone, freundlich.',
  'andechser-doppelbock': 'Klosterbier vom Heiligen Berg: dunkle Flasche, Etikett in Braun/Gold/Rot mit Kloster-Silhouette, ehrwürdig, warm, Karamell.',
  'moenchshof-keller': 'Bügelflasche, ungefiltert, bernsteinfarbener Inhalt, Etikett in Braun/Creme mit Mönch-Motiv, fränkisch, urig.',
  'einbecker-urbock': 'Bock-Erfinder: braune Flasche, Etikett in Dunkelrot/Gold mit historischer Typo, Niedersachsen, stolz auf 1378.',
}

const abv = (n) => n.toFixed(1).replace('.', ',') + ' %'
const styles = [...new Set(beers.map((b) => b.style))]

let md = `# Flaschen-Design-Brief

Generiert aus \`src/data/beers.json\` (\`node tools/bottles/build-brief.mjs\`). Stand: ${new Date().toISOString().slice(0, 10)}.
${beers.length} Biere, ${styles.length} Sorten. Die Steckbriefe sind **Inspiration im PilsBuddy-Look** –
bitte keine 1:1-Kopien realer Etiketten oder Logos (Markenrecht); Farbwelt, Form und Stimmung dürfen
erkennbar sein.

## Export-Spezifikation (damit die Designs ohne Anpassung in die App passen)

- Datei: \`public/bottles/<id>.png\` (id = erste Spalte unten), transparenter Hintergrund
- Größe: **600 × 1200 px** (Hochformat 1:2), Flasche zentriert, Standfläche auf der Unterkante,
  ca. 40 px Luft oben; alle Flaschen mit **gleicher Bodenlinie**, damit der Stapel ruhig wirkt
- Stil: Bierdeckel-Look wie der Avatar – Tinten-Kante \`#1D1811\` 2,5–3 px, harte Schatten ohne
  Unschärfe, flache Flächen, keine Farbverläufe; Schaum \`#FFF6E3\`, Gold \`#F2B53A\`
- Die App legt die Flasche auf die **Bierfarbe** (Spalte „Farbe“) – das Etikett muss darauf lesbar sein.
  Bei dunklen Bieren (Guinness, Köstritzer, Schlenkerla, Doppelbock) ist der Hintergrund fast schwarz.
- Optional zusätzlich \`<id>-mini.png\` 120 × 240 px für Listen (sonst wird skaliert)
- In \`beers.json\` wird dann \`"image": "/bottles/<id>.png"\` eingetragen

## Sorten (Bier-Stile) und Formvorschlag

| Sorte | Anzahl | Formvorschlag |
| --- | --- | --- |
${styles.map((s) => `| ${s} | ${beers.filter((b) => b.style === s).length} | ${FORM_BY_STYLE[s] ?? '–'} |`).join('\n')}

## Übersicht

| id | Bier | Sorte | Alk. | Herkunft | Farbe | Referenz-Deck |
| --- | --- | --- | --- | --- | --- | --- |
${beers.map((b) => `| \`${b.id}\` | ${b.fullName} | ${b.style} | ${abv(b.abv)} | ${b.region}, ${b.country} | \`${b.color}\` | ${b.reference ? 'ja' : ''} |`).join('\n')}

## Steckbriefe

`

for (const b of beers) {
  md += `### ${b.fullName} · \`${b.id}\`

- **Sorte / Alkohol:** ${b.style} · ${abv(b.abv)} · ${b.brewery}, ${b.region} (${b.country})
- **Bierfarbe in der App:** \`${b.color}\`
- **Form:** ${FORM_BY_STYLE[b.style] ?? '–'}
- **Charakter:** ${CHARACTER[b.id] ?? '–'}
- **Tags:** ${b.tags.join(' · ')}
- **Bio in der App:** „${b.humorousBio}“
- **Beschreibung:** ${b.description}

`
}

writeFileSync(resolve(root, 'docs/FLASCHEN.md'), md)
const missing = beers.filter((b) => !CHARACTER[b.id]).map((b) => b.id)
console.log(`docs/FLASCHEN.md geschrieben: ${beers.length} Biere, ${styles.length} Sorten${missing.length ? ' – OHNE Charakter: ' + missing.join(', ') : ''}`)
