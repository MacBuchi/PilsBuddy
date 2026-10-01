/**
 * Impressum & Datenschutz (Stufe B4). Plain data – the Legal screen renders it.
 * Keep it in sync with what the app really does: if a feature starts sending data anywhere,
 * add a section here in the same PR.
 */

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

export const LEGAL_UPDATED = 'Oktober 2026'

export interface LegalSection {
  title: string
  paragraphs: string[]
}

export const PRIVACY: LegalSection[] = [
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
      'Im Speicher deines Browsers (localStorage) liegen: deine Bier-Bewertungen mit Zeitpunkt, deine Altersbestätigung, Dark-Mode, deine Buddy-Nummer, gesehene Hinweise und – falls genutzt – dein Sync-Code und die Sitzung des Sync-Kontos. Ein Service Worker speichert die App selbst, damit sie offline läuft.',
      'Diese Daten verlassen dein Gerät nicht, solange der Sync aus ist. Du löschst sie mit „Profil zurücksetzen“ oder indem du die Website-Daten im Browser löschst.',
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
      'Wenn du „Mein Standort“ antippst, fragt der Browser um Erlaubnis und gibt die Position nur an die App auf deinem Gerät. Sie wird nicht gesendet und nicht gespeichert. Die App fragt bei Supabase (Server in Frankfurt am Main) nur grobe Kartenfelder von etwa 55 × 36 km ab, in denen dein Umkreis liegt, und rechnet Entfernung und Reihenfolge selbst aus. Gibst du stattdessen eine Postleitzahl ein, wird diese Postleitzahl gesendet.',
      'Die abgerufenen Brauereien, deine zuletzt eingegebene Postleitzahl, der Umkreis und die Regionalbiere, die du dir angesehen oder vorgemerkt hast, bleiben auf deinem Gerät, damit der Finder auch offline funktioniert (Brauerei-Daten werden nach 30 Tagen neu geladen). „Profil zurücksetzen“ löscht auch sie. „Route“ öffnet Google Maps mit der Position der Brauerei – nicht mit deiner; dabei gelten die Datenschutzhinweise von Google.',
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
    title: 'Buddy-Link',
    paragraphs: [
      'Wenn du einen Buddy-Link teilst, stecken deine Buddy-Nummer und deine Bewertungen im Link selbst. Wir speichern ihn nicht; wer den Link hat, kann deinen Geschmack sehen. Teile ihn also nur mit Leuten, die das dürfen.',
    ],
  },
  {
    title: 'Löschen',
    paragraphs: [
      '„Profil zurücksetzen“ löscht alles auf diesem Gerät und – falls du den Sync genutzt hast – sofort dein Sync-Konto mit allen Daten auf dem Server. Willst du nur die Cloud-Daten loswerden, nimm „Daten aus der Cloud löschen“ im Abschnitt „Auf allen Geräten“; auf dem Gerät bleibt dann alles.',
      'Andere Geräte, die mit demselben Code verbunden waren, behalten ihre eigene Kopie auf dem Gerät und schalten den Sync beim nächsten Versuch selbst aus.',
    ],
  },
  {
    title: 'Quellen der Brauerei-Daten',
    paragraphs: [
      'Brauereien und ihre Biere aus deiner Region stammen aus offenen Datenbanken: © OpenStreetMap-Mitwirkende (ODbL), Open Food Facts (ODbL), Wikidata (CC0), beer.db/openbeer (gemeinfrei) und GeoNames (Postleitzahlen, CC BY 4.0). Einige Biere (Name, Alkoholgehalt) haben wir den Websites der Brauereien entnommen; die Quelle ist bei jedem Bier verlinkt. Unsere daraus abgeleitete Datenbank steht ebenfalls unter der ODbL. Der Geschmack dieser Biere ist eine Schätzung aus dem Bierstil, keine Verkostung.',
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
