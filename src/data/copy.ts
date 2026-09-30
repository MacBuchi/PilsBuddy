/**
 * Text bank. Everything the user reads lives here so tone and wording can be
 * swapped without touching components. Tone: charmant, selbstironisch, nie gemein.
 */
import type { ArchetypeId, Rating } from '../domain/types'

export const COPY = {
  app: {
    name: 'PilsBuddy',
    tagline: 'Erst Biere daten. Dann Buddies finden.',
  },
  welcome: {
    cta: "Los geht's",
    promise: 'Kein Formular. Kein Sommelier-Gelaber. Versprochen.',
  },
  howto: {
    step: 'Schritt 1 von 1 · ehrlich',
    title: 'Wir müssen kurz herausfinden, was dein Biergeschmack so treibt.',
    sub: 'Wir zeigen dir ein paar Biere. Du sagst, wie ihr zueinander steht. Mehr nicht.',
    age: 'Ich bin mindestens 18 Jahre alt.',
    ageSub: 'Und Wasser zwischendurch ist auch ein Match.',
    ageMissing: "Kurz das Häkchen – dann geht's los.",
    cta: 'Erstes Date starten',
    gestures: [
      { rating: 'LIKE', label: 'Mag ich', sub: 'Liebe auf den ersten Schluck.' },
      { rating: 'DISLIKE', label: 'Nicht meins', sub: 'Es liegt nicht an dir. Doch.' },
      { rating: 'WANT_TO_TRY', label: 'Will probieren', sub: 'Erstes Date vereinbart.' },
      { rating: 'UNKNOWN', label: 'Kenn ich nicht', sub: 'Zählt nicht gegen euch.' },
      { rating: 'KNOW', label: 'Kenn ich', sub: 'Per Button. Man kennt sich, mehr nicht.' },
    ] as const,
  },
  rating: {
    LIKE: { label: 'Mag ich', short: 'Mag ich', stamp: 'MAG ICH' },
    DISLIKE: { label: 'Nicht meins', short: 'Nö', stamp: 'NÖ.' },
    WANT_TO_TRY: { label: 'Will probieren', short: 'Probieren', stamp: 'PROBIEREN!' },
    KNOW: { label: 'Kenne ich', short: 'Kenn ich', stamp: 'KENN ICH' },
    UNKNOWN: { label: 'Kenne ich nicht', short: 'Kenn ich nicht', stamp: 'KENN ICH NICHT' },
  } satisfies Record<Rating, { label: string; short: string; stamp: string }>,
  quips: {
    LIKE: [
      'Notiert. PilsBuddy lernt dich kennen.',
      'Ein Herz für {name}. Süß.',
      'Ihr würdet euch gut verstehen.',
      'Das könnte was Ernstes werden.',
    ],
    DISLIKE: ['Mutig.', 'Hohe Ansprüche. Respekt.', '{name} wird darüber hinwegkommen.', 'Es liegt nicht an dir. Doch.'],
    WANT_TO_TRY: ['Auf die Probierliste. Das wird ein Date.', 'Neugier +1.', '{name} freut sich schon.'],
    KNOW: ['Man kennt sich. Vom Sehen.', 'Ok. Nicht mehr, nicht weniger.', 'Kennt man. Notiert.'],
    UNKNOWN: [
      'Dieses Bier kennt dich noch nicht. Vielleicht ist das eure Chance.',
      'Kein Problem. Zählt nicht gegen euch.',
      'Ehrlich währt am längsten.',
    ],
  } satisfies Record<Rating, string[]>,
  milestones: {
    decoded: 'BIER-DNA ENTSCHLÜSSELT. Wir kennen dich jetzt.',
    half: '{pct} % – wir kennen dich langsam.',
    fiveNopes: 'Du hast 5 Biere abgelehnt. Hohe Ansprüche.',
  },
  coach: {
    caption: 'Karte ziehen – oder Buttons unten',
    captionKeys: 'Tasten: ← → ↑ ↓ · K = Kenn ich',
    help: 'Wie war das nochmal?',
    sheetTitle: 'So swipst du',
    sheetSub: 'Tippen auf die Karte zeigt Details. Kenn ich nicht zählt nie gegen euch.',
    close: 'Verstanden',
    chips: {
      LIKE: 'Mag ich',
      DISLIKE: 'Nö',
      WANT_TO_TRY: 'Probieren',
      UNKNOWN: 'Kenn ich nicht',
    },
  },
  undo: {
    label: 'Zurückholen',
    done: 'Zurückgeholt. Wir sagen nichts.',
  },
  swipe: {
    left: '{n} übrig',
    analyzeCta: 'Genug gedatet? DNA auswerten',
    emptyTitle: 'Der Stapel ist leer.',
    emptySub: 'Du hast alle Biere gedatet. Die Brauereien kommen kaum hinterher.',
    emptyToDna: 'Zur Bier-DNA',
    emptyAnalyze: 'DNA auswerten',
    restart: 'Von vorn',
  },
  progress: {
    full: 'Bier-DNA entschlüsselt',
    almost: 'Fast durchschaut',
    half: '{pct} % – wir kennen dich langsam',
    some: 'Erste Eindrücke gesammelt',
    none: 'Wir kennen uns kaum',
  },
  loading: {
    label: 'Bier-DNA wird sequenziert',
    lines: [
      'Wir analysieren deinen Durst …',
      'Der Schaum setzt sich …',
      'Sequenziere Hopfen-Gene …',
      'Vergleiche mit sehr vielen Kronkorken …',
    ],
  },
  dna: {
    label: 'Deine Bier-DNA',
    title: '{pct} % entschlüsselt',
    longFull: 'Wir kennen dich jetzt. Vielleicht besser als dein Späti.',
    longAlmost: 'Ein paar Biere noch, dann haben wir dich komplett durchschaut.',
    longStart: 'Ein guter Anfang. Jedes weitere Bier schärft das Bild.',
    curiosity: 'Neugier-Faktor',
    curiosityHigh: 'hoch',
    curiosityMid: 'solide',
    curiosityLow: 'gemütlich',
    notable: 'Auffällig',
    axisQuips: [
      'Bitterkeit schreckt dich nicht. Eher im Gegenteil.',
      'Du riechst an Bier. Wir haben es gesehen.',
      'Brot, aber flüssig: Du verstehst das.',
      'Leicht, frisch, unkompliziert. Du willst Bier, keinen Vortrag.',
      'Langweilige Biere erkennst du schon am Etikett.',
    ],
    nopeQuip: 'Du hast {n} Biere abgelehnt. Hohe Ansprüche.',
    unknownQuip: '{n} Biere kennst du noch nicht. Das ist keine Lücke, das ist Potenzial.',
    cta: 'Wer bin ich eigentlich?',
  },
  avatar: {
    youAre: 'Du bist …',
    evoRaw: 'Dein Buddy ist noch im Rohzustand. Mehr Swipes = mehr Persönlichkeit (und Accessoires).',
    evoFull: 'Voll entfaltet. Dein Buddy verändert sich weiter, je mehr du swipest.',
    cta: 'Mein Bier-Match zeigen',
    shared: "Link kopiert. Zeig's deinen Buddies.",
    shareFailed: 'Teilen hat nicht geklappt. Erzähl es einfach weiter.',
  },
  match: {
    label: 'Dein nächstes Match',
    you: 'Du + {name}',
    compat: 'Bier-Kompatibilität',
    fallbackReason: 'Wir haben da so ein Gefühl. Vertrau uns einfach.',
    reason: 'Du hast eine verdächtig hohe Affinität zu {adj} Bier.',
    cta: 'Entdecken',
    continue: 'Weiterswipen',
  },
  detail: {
    match: '{pct} % Match',
    style: 'Stil',
    abv: 'Alkohol',
    origin: 'Herkunft',
    compare: 'Ihr im Vergleich',
    you: 'Du',
    relation: 'Wie steht ihr zueinander?',
    relNone: 'Dieses Bier kennt dich noch nicht. Vielleicht ist das eure Chance.',
    relNope: 'Du hast dieses Bier abgelehnt. Mutig.',
    relLike: 'Ihr seid offiziell ein Paar. Glückwunsch.',
    relTry: 'Steht auf deiner Probierliste. Nicht versetzen.',
    relKnow: 'Ihr kennt euch. Mehr ist (noch) nicht passiert.',
    relUnknown: 'Kein Urteil. Nur Ehrlichkeit.',
  },
  matches: {
    title: 'Matches',
    tabBeers: 'Biere',
    tabPeople: 'Menschen',
    beta: 'BETA',
    freshFor: 'Frisch empfohlen für {who}',
    newForYou: 'neu für dich',
    none: 'Du hast alles gedatet, was wir haben. Wir brauen Nachschub.',
    soonTitle: 'Pils-Match kommt bald.',
    soonText:
      'Sobald genug Buddies ihre DNA entschlüsselt haben, zeigen wir dir Menschen mit ähnlichem Geschmack. Nur Geschmack – keine Fotos, keine Bewertung.',
    previewLabel: "Vorschau · So wird's aussehen",
    previewYou: 'Du + Alex',
    previewSub: 'Bier-DNA-Match · Alex ist „Der Herbe“',
    previewBoth: 'Ihr mögt beide',
    previewDisagree: 'Ihr seid euch uneinig bei',
    previewNote: 'Alex kennt <b>23 Biere</b>, die du noch nie probiert hast. Gefährlich.',
    previewCta: 'Biergeschmack vergleichen',
    previewToast: 'Kommt mit Pils-Match. Wir sagen Bescheid.',
  },
  profile: {
    buddyNo: 'Buddy #{n}',
    stats: { total: 'gedatet', likes: 'Herzen', nopes: 'Körbe', tries: 'Probier-liste' },
    achievements: 'Achievements',
    relations: 'Deine Bier-Beziehungen',
    noRelations: 'Noch keine Beziehungen. Du bist Single. Bier-technisch.',
    dark: 'Kneipen-Modus',
    darkSub: 'Dark Mode. Für nach 22 Uhr.',
    reset: 'Profil zurücksetzen – alles vergessen, wie nach dem Schützenfest.',
    resetConfirm: 'Wirklich alles vergessen? Deine Bier-DNA, Matches, alles.',
  },
  tabs: { swipe: 'Swipen', dna: 'Bier-DNA', matches: 'Matches', profile: 'Profil' },
  personas: {
    logo: {
      name: 'Noch ein Rätsel',
      short: 'dich',
      desc: 'Swipe noch ein paar Biere. Wir sind kurz davor, dich zu durchschauen.',
      traits: ['geheimnisvoll', 'unentschlossen'],
    },
    herb: {
      name: 'Der Herbe',
      short: 'den Herben',
      desc: 'Du magst es klar, trocken und ohne Umschweife. Süße Kompromisse? Nicht mit dir. Freunde nennen dich „ehrlich“. Manche auch „anstrengend“.',
      traits: ['trocken', 'geradeaus', 'Norddeutsch im Herzen'],
    },
    feierabend: {
      name: 'Der Feierabend-Pilsner',
      short: 'Feierabend-Pilsner',
      desc: 'Bier ist für dich kein Hobby, sondern ein Gefühl: Laptop zu, Kronkorken ab. Du brauchst kein Drama im Glas.',
      traits: ['entspannt', 'verlässlich', '17:30 Uhr'],
    },
    abenteurer: {
      name: 'Der Hopfen-Abenteurer',
      short: 'Hopfen-Abenteurer',
      desc: 'Grapefruit? Harz? Kiefernnadeln? Du sagst ja. Du hast vermutlich schon mal „Mundgefühl“ gesagt. Unironisch.',
      traits: ['hopfig', 'furchtlos', 'riecht am Glas'],
    },
    geniesser: {
      name: 'Der unkomplizierte Genießer',
      short: 'Genießer',
      desc: 'Kalt, lecker, fertig. Du verstehst nicht, warum andere so ein Theater machen – und hast damit ziemlich oft recht.',
      traits: ['süffig', 'pragmatisch', 'kein Theater'],
    },
    philosoph: {
      name: 'Der Biergarten-Philosoph',
      short: 'Philosophen',
      desc: 'Malzig, vollmundig, gern mit Brezn. Unter Kastanien erklärst du die Welt. Und irgendwie stimmt es sogar.',
      traits: ['malzig', 'tiefgründig', 'Brezn-affin'],
    },
    probierer: {
      name: 'Der neugierige Probierer',
      short: 'Probierer',
      desc: 'Du kennst vieles noch nicht – und findest das großartig. Deine Probierliste ist länger als deine Einkaufsliste.',
      traits: ['neugierig', 'offen', 'Probierliste lang'],
    },
    kasten: {
      name: 'Der Kasten-Kenner',
      short: 'Kasten-Kenner',
      desc: 'Du erkennst ein Bier am Plopp. Du kennst sie alle. Persönlich. Meistens vom Grillabend.',
      traits: ['erfahren', 'bodenständig', 'kennt jeden'],
    },
  } satisfies Record<ArchetypeId, { name: string; short: string; desc: string; traits: string[] }>,
  /** Adjectives per taste axis, used in match reasons ("Affinität zu herbem, hopfigem Bier"). */
  axisAdjectives: {
    bitterness: 'herbem',
    hopIntensity: 'hopfigem',
    maltiness: 'malzigem',
    sweetness: 'süßem',
    dryness: 'trockenem',
    body: 'vollmundigem',
    drinkability: 'süffigem',
    character: 'charakterstarkem',
  },
  error: {
    label: 'Fehler 0,0 %',
    title: 'Die Leitung ist trocken.',
    text: 'Wir erreichen den Zapfhahn gerade nicht. Prüf deine Verbindung – oder trink kurz ein Wasser. Schadet nie.',
    cta: 'Nochmal zapfen',
  },
} as const

/** Tiny template helper: fill("{n} übrig", { n: 3 }) → "3 übrig" */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

/** Deterministic pick from a list – same seed, same line. Keeps quips reproducible per beer. */
export function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.abs(seed) % list.length]
}
