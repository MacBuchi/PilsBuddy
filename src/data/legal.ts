/**
 * Impressum & Datenschutz (Stufe B4). Plain data – the Legal screen renders it.
 * Keep it in sync with what the app really does: if a feature starts sending data anywhere,
 * add a section here in the same PR.
 */
import { LANG } from '../state/lang'

export interface Operator {
  name: string
  /** Street, postcode + city (ladungsfähige Anschrift, § 5 DDG). */
  address: string[]
  email: string
}

/** Anbieter nach § 5 DDG / Verantwortlicher nach Art. 4 Nr. 7 DSGVO. null = noch nicht eingetragen. */
export const OPERATOR: Operator | null = {
  name: 'Marcus Bucher',
  address: ['Schumannstr. 7', '74906 Bad Rappenau'],
  email: 'macbuchi.apps@gmail.com',
}

const LEGAL_UPDATED_DE = 'Oktober 2026'

export interface LegalSection {
  title: string
  paragraphs: string[]
}

const PRIVACY_DE: LegalSection[] = [
  {
    title: 'Kurz gesagt',
    paragraphs: [
      'PilsBuddy braucht kein Konto, keinen Namen und keine E-Mail-Adresse. Es gibt kein Tracking, keine Werbung, keine Analyse-Tools und keine Cookies. Schriften und Bilder liefern wir selbst aus – es werden keine Dritt-Dienste wie Google Fonts geladen.',
      'Deine Bewertungen bleiben auf deinem Gerät. Nur wenn du den Geräte-Sync einschaltest, werden sie zusätzlich über eine verschlüsselte Verbindung auf einem Server in Frankfurt gespeichert.',
    ],
  },
  {
    title: 'Auf deinem Gerät',
    paragraphs: [
      'Im Speicher deines Browsers (localStorage) liegen: deine Bier-Bewertungen mit Zeitpunkt, deine Altersbestätigung, Dark-Mode, ob KI-Texte an sind, deine Sprachwahl, deine Buddy-Nummer, gesehene Hinweise und – falls genutzt – dein Sync-Code und die Sitzung des Sync-Kontos. Ein Service Worker speichert die App selbst, damit sie offline läuft.',
      'Diese Daten verlassen dein Gerät nicht, solange der Sync aus ist – nur in einem Spielraum sehen die anderen am Tisch deine Buddy-Nummer. Du löschst sie mit „Profil zurücksetzen“ oder indem du die Website-Daten im Browser löschst.',
    ],
  },
  {
    title: 'Hosting (Cloudflare)',
    paragraphs: [
      'Die App wird über Cloudflare ausgeliefert (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Beim Aufruf verarbeitet Cloudflare technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, angefragte Datei und Browser-Kennung, um die Seite auszuliefern und Angriffe abzuwehren.',
      'Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren, schnellen Auslieferung (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert. Wir selbst werten diese Daten nicht aus.',
    ],
  },
  {
    title: 'Bierkatalog',
    paragraphs: [
      'Kurz nach dem Start fragt die App bei Supabase (Supabase, Inc., USA; Server in Frankfurt am Main, EU) nach neuen Bieren. Dabei wird nichts über dich oder deine Bewertungen gesendet – nur die technisch nötigen Verbindungsdaten wie IP-Adresse und Zeitpunkt fallen beim Server an.',
      'Rechtsgrundlage ist unser berechtigtes Interesse, den Katalog ohne App-Update aktuell zu halten (Art. 6 Abs. 1 lit. f DSGVO). Ohne Netz nimmt die App einfach den Katalog, den sie schon hat.',
    ],
  },
  {
    title: 'Biere aus deiner Nähe',
    paragraphs: [
      'Wenn du „Mein Standort“ antippst, fragt der Browser um Erlaubnis und gibt die Position nur an die App auf deinem Gerät. Sie wird nicht gesendet und nicht gespeichert. Die App fragt bei Supabase (Server in Frankfurt am Main) nur grobe Kartenfelder von etwa 55 × 36 km ab, in denen dein Umkreis liegt, und rechnet Entfernung und Reihenfolge selbst aus. Gibst du stattdessen eine Postleitzahl ein, wird diese Postleitzahl gesendet – von einer kanadischen Postleitzahl nur die ersten drei Zeichen (etwa „M5V“), den Rest kürzt die App vorher auf dem Gerät weg. Gibt es die Postleitzahl in mehreren Ländern, zeigt die App das Land deiner Browsersprache zuerst; diese Auswahl passiert auf dem Gerät. Suchst du in der Bierbibliothek nach einem Namen, Ort oder einer Postleitzahl oder zu Beginn nach deinen Lieblingsbieren, wird dieser Suchtext gesendet – ohne Standort, ohne deine Bewertungen. Öffnest du die Brauerei-Weltkarte, lädt die App die Liste aller Brauereien (Name, Position, Land) – ohne deinen Standort – und hält sie 30 Tage auf dem Gerät; tippst du eine Brauerei an, fragt sie nur das grobe Kartenfeld dieser Brauerei ab. Die Kartenumrisse (Natural Earth) bringt die App selbst mit, es gibt keinen Kartendienst, der sieht, wo du hinschaust. Dein Standort erscheint auf der Karte nur auf deinem Gerät.',
      'Die abgerufenen Brauereien, deine zuletzt eingegebene Postleitzahl, der Umkreis und die Regionalbiere, die du dir angesehen oder vorgemerkt hast, bleiben auf deinem Gerät, damit der Finder auch offline funktioniert (Brauerei-Daten werden nach 30 Tagen neu geladen). Schaltest du den Regional-Modus ein, merkt sich die App außerdem die Biere deines letzten Finder-Ergebnisses mit Entfernung, um sie ins Swipe-Deck zu mischen – ebenfalls nur auf dem Gerät. „Profil zurücksetzen“ löscht auch sie. Teilst du deine Bier-DNA als Bild, nennt es dein liebstes Bier aus der Region samt Brauerei; das Bild teilst nur du selbst. „Route“ öffnet Google Maps mit der Position der Brauerei – nicht mit deiner; dabei gelten die Datenschutzhinweise von Google.',
      'Rechtsgrundlage ist dein Wunsch, Biere in deiner Nähe zu finden (Art. 6 Abs. 1 lit. b DSGVO); die Standortfreigabe kannst du jederzeit in den Browser-Einstellungen zurücknehmen.',
    ],
  },
  {
    title: 'Geräte-Sync (nur wenn du ihn einschaltest)',
    paragraphs: [
      'Der Sync ist standardmäßig aus. Schaltest du ihn im Profil ein, legen wir bei Supabase (Supabase, Inc., USA; Server in Frankfurt am Main, EU) ein anonymes Konto an – mit einer zufälligen ID, ohne Name und ohne E-Mail.',
      'Gespeichert werden: deine Bewertungen mit Zeitpunkt, deine daraus berechnete Bier-DNA (Geschmacksprofil, Persona, Fortschritt), Buddy-Nummer, Dark-Mode und Onboarding-Status sowie ein Prüfwert (Hash) deines Sync-Codes und wann er zuletzt benutzt wurde. Den Code selbst speichern wir nicht. Supabase verarbeitet außerdem technische Verbindungsdaten wie die IP-Adresse in Server-Logs.',
      'Rechtsgrundlage ist deine Einwilligung durch das Einschalten (Art. 6 Abs. 1 lit. a DSGVO). Für einen möglichen Zugriff aus den USA gelten die EU-Standardvertragsklauseln. Die Daten bleiben gespeichert, bis du sie löschst.',
    ],
  },
  {
    title: 'Spielraum (nur wenn du einen öffnest oder beitrittst)',
    paragraphs: [
      'Öffnest du unter „Spiele“ einen Spielraum oder trittst einem bei (per Code, QR oder Einladungslink), verbindet sich die App über Supabase Realtime (Supabase, Inc., USA; Server in Frankfurt am Main, EU) mit den anderen Geräten im Raum – ohne Konto, ohne Anmeldung.',
      'Übertragen werden an alle im Raum: der Raum-Code, deine Buddy-Nummer als Anzeigename, eine zufällige ID, die nur für diesen Besuch gilt, und der Spielstand (wer bereit ist, gespielte Quartett-Karten, deine Schätzungen und Punkte, beim Tasting-Abend das ausgeschenkte Bier sowie deine Sterne und Geschmackseinschätzung dazu). Ob du ein Bier danach in deine Bewertungen übernimmst, entscheidest du selbst – das bleibt auf deinem Gerät. Der Server leitet das nur weiter und speichert es nicht; schließt der Gastgeber den Raum oder gehen alle, ist er weg. Supabase verarbeitet dabei technisch nötige Verbindungsdaten wie die IP-Adresse.',
      'Rechtsgrundlage ist dein Wunsch, gemeinsam zu spielen (Art. 6 Abs. 1 lit. b DSGVO). Für einen möglichen Zugriff aus den USA gelten die EU-Standardvertragsklauseln.',
    ],
  },
  {
    title: 'Feedback („Wünsch dir was!“)',
    paragraphs: [
      'Schickst du eine Idee oder einen Fehler ab, speichern wir bei Supabase (Server in Frankfurt am Main) deinen Text, die Art (Idee/Fehler), die App-Version und den groben Gerätetyp (z. B. „iOS · App“) – ohne Konto, ohne Namen, ohne deine Bewertungen. Supabase verarbeitet dabei technisch nötige Verbindungsdaten wie die IP-Adresse.',
      'Meldest du ein Problem mit einem Bier („Problem mit diesem Bier melden“), kommen dazu, um welches Bier es geht (Kennung und Name) und welches Problem du ausgewählt hast; deine Notiz ist der Text. Bestätigt sich das Problem, blenden wir das Bier im Katalog aus oder korrigieren es.',
      'Ein Bot veröffentlicht den Text anschließend als Eintrag (Issue) im öffentlichen GitHub-Projekt von PilsBuddy (GitHub, Inc., USA). Dort ist er für alle lesbar und bleibt stehen; schreib deshalb keine persönlichen Daten hinein. Die Kopie bei Supabase löschen wir 30 Tage nach der Veröffentlichung. Weil wir nicht wissen, von wem ein Text stammt, können wir einzelne Einsendungen nur über ihren Wortlaut finden.',
      'Rechtsgrundlage ist deine Einwilligung durch das Abschicken (Art. 6 Abs. 1 lit. a DSGVO).',
    ],
  },
  {
    title: 'Bier melden („Bier fehlt? Eintragen“)',
    paragraphs: [
      'Meldest du ein fehlendes Bier, speichern wir bei Supabase (Server in Frankfurt am Main) deine Angaben dazu – Brauerei (oder Name und PLZ/Ort einer neuen Brauerei), Link, Name, Stil, Alkoholgehalt und deine Notiz – sowie App-Version und groben Gerätetyp. Ohne Konto, ohne Namen, ohne deine Bewertungen; dein Standort wird nicht mitgeschickt. Supabase verarbeitet dabei technisch nötige Verbindungsdaten wie die IP-Adresse.',
      'Ein Bot veröffentlicht die Meldung als Eintrag (Issue) im öffentlichen GitHub-Projekt von PilsBuddy (GitHub, Inc., USA). Geben wir sie frei, steht das Bier mit diesen Angaben öffentlich im Bierkatalog (Quelle „Meldung aus der App“, Link als Beleg). Die Kopie der Meldung bei Supabase löschen wir 30 Tage nach der Veröffentlichung. Auf deinem Gerät merkt sich die App einen unfertigen Entwurf und wann du gemeldet hast (höchstens fünf Meldungen am Tag); „Profil zurücksetzen“ löscht beides.',
      'Rechtsgrundlage ist deine Einwilligung durch das Abschicken (Art. 6 Abs. 1 lit. a DSGVO).',
    ],
  },
  {
    title: 'Buddy-Link',
    paragraphs: [
      'Wenn du einen Buddy-Link teilst, stecken deine Buddy-Nummer und deine Bewertungen im Link selbst. Wir speichern ihn nicht; wer den Link hat, kann deinen Geschmack sehen. Teile ihn also nur mit Leuten, die das dürfen.',
    ],
  },
  {
    title: 'Pils-Match (nur wenn du sichtbar wirst)',
    paragraphs: [
      'Pils-Match ist standardmäßig aus. Wirst du unter „Matches › Menschen“ sichtbar, schaltet das den Geräte-Sync ein und speichert in deinem Sync-Konto zusätzlich den Namen, den du dafür wählst, und dass du sichtbar bist.',
      'Andere, die selbst sichtbar sind, bekommen dich dann vorgeschlagen, wenn euer Geschmack ähnlich ist, und sehen deinen Namen und deine Bewertungen (ohne Zeitpunkt und ohne „Kenn ich nicht“) – daraus berechnet ihre App Persona und Match. Wir zeigen keinen Ort, keine Fotos und keine Buddy-Nummer; es gibt keinen Chat.',
      'Stößt du mit jemandem an oder blockierst jemanden, speichern wir das in deinem Konto. Wer angestoßen hat, erfährt der andere erst, wenn er selbst zurück anstößt. Blockierte Personen und du seht euch gegenseitig nicht mehr.',
      '„Unsichtbar werden“ nimmt dich sofort aus allen Vorschlägen, ebenso das Ausschalten des Geräte-Syncs; dein Name bleibt für dich reserviert, bis du das Sync-Konto löschst. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).',
    ],
  },
  {
    title: 'KI-Texte (nur wenn du sie einschaltest)',
    paragraphs: [
      'KI-Texte sind standardmäßig aus; dann zeigt die App nur ihre eigenen, festen Texte und sendet dafür nichts. Schaltest du sie im Profil ein, fragt die App für den Persona-Roast und für „Warum passt es zu dir?“ bei unserem Server unter dieser Adresse nach, der die Frage an Cloudflare Workers AI weitergibt (Cloudflare, Inc., USA; zertifiziert unter dem EU-US Data Privacy Framework).',
      'Gesendet werden nur: der Name deiner Persona, deine acht Geschmackswerte (auf Fünfer gerundet), die Sprache und – beim Bier – sein Name, Stil, seine Geschmackswerte und dein Match in Prozent. Keine Bewertungsliste, keine Buddy-Nummer, kein Konto. Die Antwort speichern wir ohne Bezug zu dir bis zu sieben Tage, damit dieselbe Frage nicht noch einmal gerechnet wird. Deine IP-Adresse halten wir nur eine Minute im Arbeitsspeicher, um Anfragen pro Gerät zu begrenzen; gespeichert wird sie nicht.',
      'Die Texte schreibt eine KI – sie können danebenliegen. Deine Bier-DNA, Persona, Avatar und Matches berechnet die App weiterhin selbst, ohne KI. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO); Ausschalten genügt zum Widerruf.',
    ],
  },
  {
    title: 'Löschen',
    paragraphs: [
      '„Profil zurücksetzen“ löscht alles auf diesem Gerät und – falls du den Sync genutzt hast – sofort dein Sync-Konto mit allen Daten auf dem Server. Willst du nur die Cloud-Daten loswerden, nimm „Daten aus der Cloud löschen“ im Abschnitt „Auf allen Geräten“; auf dem Gerät bleibt dann alles.',
      'Mit dem Sync-Konto verschwinden auch dein Pils-Match-Name, deine Anstoßer und Blockierungen. Andere Geräte, die mit demselben Code verbunden waren, behalten ihre eigene Kopie auf dem Gerät und schalten den Sync beim nächsten Versuch selbst aus.',
    ],
  },
  {
    title: 'Quellen der Brauerei-Daten',
    paragraphs: [
      'Brauereien und ihre Biere aus deiner Region stammen aus offenen Datenbanken: © OpenStreetMap-Mitwirkende (ODbL), Open Brewery DB (MIT, Brauereien in den USA und Kanada), Open Food Facts (ODbL), Wikidata (CC0), beer.db/openbeer (gemeinfrei) und GeoNames (Postleitzahlen, CC BY 4.0). Einige Biere (Name, Alkoholgehalt) haben wir den Websites der Brauereien entnommen; die Quelle ist bei jedem Bier verlinkt. Dazu kommen Biere, die Nutzer gemeldet und wir geprüft haben. Unsere daraus abgeleitete Datenbank steht ebenfalls unter der ODbL. Der Geschmack dieser Biere ist eine Schätzung aus dem Bierstil, keine Verkostung.',
    ],
  },
  {
    title: 'Deine Rechte',
    paragraphs: [
      'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit zu widerrufen (Sync ausschalten und Cloud-Daten löschen). Deine Daten kannst du jederzeit unter „Profil exportieren“ als Datei mitnehmen.',
      'Weil wir nicht wissen, wer du bist, können wir Sync-Daten nur über deinen Sync-Code zuordnen – halte ihn bei Anfragen bereit. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.',
    ],
  },
]

/** English translation (I1). The German text above is the binding one – keep both in step. */
const PRIVACY_EN: LegalSection[] = [
  {
    title: 'In short',
    paragraphs: [
      'PilsBuddy needs no account, no name and no email address. There is no tracking, no advertising, no analytics and no cookies. We serve fonts and images ourselves – no third-party services such as Google Fonts are loaded.',
      'Your ratings stay on your device. Only if you turn on device sync are they also stored, over an encrypted connection, on a server in Frankfurt.',
    ],
  },
  {
    title: 'On your device',
    paragraphs: [
      "Your browser's storage (localStorage) holds: your beer ratings with timestamps, your age confirmation, dark mode, whether AI texts are on, your language choice, your buddy number, hints you have seen and – if used – your sync code and the sync account's session. A service worker stores the app itself so it works offline.",
      'This data does not leave your device as long as sync is off – only in a game room do the others at the table see your buddy number. You delete it with “Reset profile” or by clearing the site data in your browser.',
    ],
  },
  {
    title: 'Hosting (Cloudflare)',
    paragraphs: [
      'The app is delivered via Cloudflare (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). When you open it, Cloudflare processes technically necessary connection data such as IP address, time, requested file and browser identifier in order to deliver the site and fend off attacks.',
      'The legal basis is our legitimate interest in secure, fast delivery (Art. 6(1)(f) GDPR). Cloudflare is certified under the EU-US Data Privacy Framework. We do not analyse this data ourselves.',
    ],
  },
  {
    title: 'Beer catalogue',
    paragraphs: [
      'Shortly after starting, the app asks Supabase (Supabase, Inc., USA; servers in Frankfurt am Main, EU) for new beers. Nothing about you or your ratings is sent – the server only sees the technically necessary connection data such as IP address and time.',
      'The legal basis is our legitimate interest in keeping the catalogue up to date without an app update (Art. 6(1)(f) GDPR). Without a connection, the app simply uses the catalogue it already has.',
    ],
  },
  {
    title: 'Beers near you',
    paragraphs: [
      'When you tap “My location”, the browser asks for permission and passes the position only to the app on your device. It is neither sent nor stored. The app only asks Supabase (servers in Frankfurt am Main) for coarse map cells of about 55 × 36 km that contain your area and works out distance and order itself. If you enter a postcode instead, that postcode is sent – for a Canadian postcode only the first three characters (such as “M5V”); the app cuts off the rest on your device first. If the postcode exists in several countries, the app shows the country of your browser language first; that choice happens on the device. When you search the beer library for a name, place or postcode, or look for your favourite beers at the start, that search text is sent – without your location or your ratings. When you open the brewery world map, the app loads the list of all breweries (name, position, country) – without your location – and keeps it on the device for 30 days; when you tap a brewery, it only asks for that brewery’s coarse map cell. The app ships the map outlines (Natural Earth) itself, so no map service sees where you look. Your location appears on the map only on your device.',
      'The breweries fetched, the postcode you entered last, the radius and the local beers you have looked at or saved stay on your device so the finder also works offline (brewery data is reloaded after 30 days). If you turn on local mode, the app also remembers the beers of your last finder result with their distance in order to mix them into the swipe deck – again only on the device. “Reset profile” deletes them too. If you share your beer DNA as an image, it names your favourite local beer and its brewery; only you share that image. “Directions” opens Google Maps with the brewery’s position – not yours; Google’s privacy policy applies there.',
      'The legal basis is your wish to find beers near you (Art. 6(1)(b) GDPR); you can withdraw location access at any time in your browser settings.',
    ],
  },
  {
    title: 'Device sync (only if you turn it on)',
    paragraphs: [
      'Sync is off by default. If you turn it on in your profile, we create an anonymous account at Supabase (Supabase, Inc., USA; servers in Frankfurt am Main, EU) – with a random ID, no name and no email.',
      'Stored are: your ratings with timestamps, the beer DNA calculated from them (taste profile, persona, progress), buddy number, dark mode and onboarding status, as well as a check value (hash) of your sync code and when it was last used. We do not store the code itself. Supabase also processes technical connection data such as the IP address in server logs.',
      'The legal basis is your consent by turning it on (Art. 6(1)(a) GDPR). The EU standard contractual clauses apply to any access from the USA. The data stays stored until you delete it.',
    ],
  },
  {
    title: 'Game room (only if you open or join one)',
    paragraphs: [
      'If you open a game room under “Games” or join one (by code, QR or invite link), the app connects through Supabase Realtime (Supabase, Inc., USA; servers in Frankfurt am Main, EU) to the other devices in the room – without an account, without signing in.',
      'Sent to everyone in the room: the room code, your buddy number as display name, a random ID that only applies to this visit, and the game state (who is ready, Top Trumps cards played, your guesses and points, and at a tasting night the beer poured plus your stars and taste verdict on it). Whether you then save a beer to your ratings is up to you – that stays on your device. The server only passes this on and does not store it; once the host closes the room or everyone leaves, it is gone. Supabase processes technically necessary connection data such as the IP address.',
      'The legal basis is your wish to play together (Art. 6(1)(b) GDPR). The EU standard contractual clauses apply to any access from the USA.',
    ],
  },
  {
    title: 'Feedback (“Make a wish!”)',
    paragraphs: [
      'If you send an idea or a bug, we store at Supabase (servers in Frankfurt am Main) your text, its type (idea/bug), the app version and the rough device type (e.g. “iOS · App”) – without an account, without a name, without your ratings. Supabase processes technically necessary connection data such as the IP address.',
      'If you report a problem with a beer (“Report a problem with this beer”), we also store which beer it is (id and name) and the problem you picked; your note is the text. If the problem is confirmed, we hide the beer in the catalogue or fix it.',
      'A bot then publishes the text as an issue in the public PilsBuddy GitHub project (GitHub, Inc., USA). There it can be read by anyone and stays up; so please don’t include any personal data. We delete the copy at Supabase 30 days after publication. Because we don’t know who wrote a text, we can only find individual submissions by their wording.',
      'The legal basis is your consent by sending (Art. 6(1)(a) GDPR).',
    ],
  },
  {
    title: 'Reporting a beer (“Beer missing? Add it”)',
    paragraphs: [
      'If you report a missing beer, we store at Supabase (servers in Frankfurt am Main) the details you give – brewery (or the name and postcode/town of a new brewery), link, name, style, alcohol content and your note – as well as app version and rough device type. Without an account, without a name, without your ratings; your location is not sent. Supabase processes technically necessary connection data such as the IP address.',
      'A bot publishes the report as an issue in the public PilsBuddy GitHub project (GitHub, Inc., USA). If we approve it, the beer appears publicly in the beer catalogue with these details (source “Reported in the app”, link as evidence). We delete the copy of the report at Supabase 30 days after publication. On your device, the app remembers an unfinished draft and when you reported (at most five reports a day); “Reset profile” deletes both.',
      'The legal basis is your consent by sending (Art. 6(1)(a) GDPR).',
    ],
  },
  {
    title: 'Buddy link',
    paragraphs: [
      'When you share a buddy link, your buddy number and your ratings are contained in the link itself. We do not store it; anyone with the link can see your taste. So only share it with people who may see it.',
    ],
  },
  {
    title: 'Pils match (only if you become visible)',
    paragraphs: [
      'Pils match is off by default. If you become visible under “Matches › People”, that turns on device sync and additionally stores the name you choose for it and that you are visible in your sync account.',
      'Others who are visible themselves then get you suggested when your taste is similar, and see your name and your ratings (without timestamps and without “Don’t know it”) – their app calculates persona and match from them. We show no location, no photos and no buddy number; there is no chat.',
      'If you toast someone or block someone, we store that in your account. The other person only learns that you toasted once they toast back. Blocked people and you no longer see each other.',
      '“Become invisible” removes you from all suggestions at once, and so does turning off device sync; your name stays reserved for you until you delete the sync account. The legal basis is your consent (Art. 6(1)(a) GDPR).',
    ],
  },
  {
    title: 'AI texts (only if you turn them on)',
    paragraphs: [
      'AI texts are off by default; the app then shows only its own fixed texts and sends nothing for them. If you turn them on in your profile, the app asks our server at this address for the persona roast and for “Why does it suit you?”, and the server passes the question on to Cloudflare Workers AI (Cloudflare, Inc., USA; certified under the EU-US Data Privacy Framework).',
      'Only this is sent: the name of your persona, your eight taste values (rounded to fives), the language and – for a beer – its name, style, taste values and your match in percent. No list of ratings, no buddy number, no account. We keep the answer for up to seven days without any link to you, so the same question is not computed again. We hold your IP address in memory for one minute only, to limit requests per device; it is not stored.',
      'The texts are written by an AI – they may be off. Your beer DNA, persona, avatar and matches are still computed by the app itself, without AI. The legal basis is your consent (Art. 6(1)(a) GDPR); turning them off withdraws it.',
    ],
  },
  {
    title: 'Deleting',
    paragraphs: [
      '“Reset profile” deletes everything on this device and – if you have used sync – immediately deletes your sync account with all data on the server. If you only want to get rid of the cloud data, use “Delete data from the cloud” in the “On all your devices” section; everything then stays on the device.',
      'Your Pils match name, toasts and blocks go with the sync account. Other devices that were connected with the same code keep their own copy on the device and turn sync off themselves at their next attempt.',
    ],
  },
  {
    title: 'Sources of the brewery data',
    paragraphs: [
      'Breweries and their beers from your region come from open databases: © OpenStreetMap contributors (ODbL), Open Brewery DB (MIT, breweries in the USA and Canada), Open Food Facts (ODbL), Wikidata (CC0), beer.db/openbeer (public domain) and GeoNames (postcodes, CC BY 4.0). We took some beers (name, alcohol content) from the breweries’ websites; the source is linked for every beer. In addition there are beers reported by users and checked by us. Our database derived from these is also under the ODbL. The taste of these beers is an estimate from the beer style, not a tasting.',
    ],
  },
  {
    title: 'Your rights',
    paragraphs: [
      'You have the right of access, rectification, erasure, restriction of processing, data portability and objection, as well as the right to withdraw consent at any time (turn off sync and delete cloud data). You can take your data with you as a file at any time via “Export profile”.',
      'Because we don’t know who you are, we can only match sync data via your sync code – please have it ready for requests. You can also lodge a complaint with a data protection supervisory authority.',
    ],
  },
]

export const PRIVACY: LegalSection[] = LANG === 'en' ? PRIVACY_EN : PRIVACY_DE
export const LEGAL_UPDATED = LANG === 'en' ? 'October 2026' : LEGAL_UPDATED_DE
/** Shown above the English text: only the German version is legally binding. */
export const LEGAL_NOTE: string | null =
  LANG === 'en' ? 'This is a translation for your convenience. Only the German version (switch the language in your profile) is legally binding.' : null
