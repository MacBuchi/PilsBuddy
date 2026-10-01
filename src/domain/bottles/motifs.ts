// Migrated from the 42 hand-designed bottle SVGs (2026-10-01); maintained by hand from here on.
// Label motifs on a 100 × 100 grid. Colours only from the slots, strokes only as multiples of s.

export interface MotifColors {
  bg: string
  i: string
  a: string
  a2: string
}

export type Motif = (c: MotifColors, s: number) => string

export const MOTIFS: Record<string, Motif> = {
  anchor: (c, s) =>
    `<circle cx="50" cy="14" r="8" fill="none" stroke="${c.a}" stroke-width="${w(s, 1.80)}"/><path d="M50 22V88M32 36H68M14 60Q18 88 50 88Q82 88 86 60" stroke="${c.a}" stroke-width="${w(s, 1.80)}" fill="none" stroke-linecap="round"/><path d="M6 64L14 54L22 64M78 64L86 54L94 64" stroke="${c.a}" stroke-width="${w(s, 1.80)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  arch: (c, s) =>
    `<path d="M28 90V46A22 22 0 0 1 72 46V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M50 24V90M28 58H72" stroke="${c.i}" stroke-width="${w(s, 0.80)}"/><path d="M16 90H84" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linecap="round"/>`,
  bolt: (c, s) =>
    `<polygon points="58,4 18,56 46,56 36,96 82,38 54,38 66,4" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/>`,
  bubbles: (c, s) =>
    `<circle cx="30" cy="64" r="18" fill="none" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/><circle cx="62" cy="40" r="14" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/><circle cx="70" cy="74" r="9" fill="none" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/><circle cx="40" cy="26" r="8" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/><circle cx="82" cy="20" r="6" fill="none" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/><circle cx="18" cy="30" r="5" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.20)}"/>`,
  castle: (c, s) =>
    `<path d="M12 90V34H20V26H28V34H36V50H64V34H72V26H80V34H88V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M42 90V72A8 8 0 0 1 58 72V90Z" fill="${c.bg}" stroke="${c.i}" stroke-width="${w(s, 0.80)}"/><rect x="21" y="44" width="8" height="12" fill="${c.bg}"/><rect x="71" y="44" width="8" height="12" fill="${c.bg}"/>`,
  confetti: (c) =>
    `<rect x="11" y="16" width="14" height="8" rx="1.5" fill="${c.a}" transform="rotate(20 18 20)"/><rect x="45" y="8" width="14" height="8" rx="1.5" fill="${c.i}" transform="rotate(-30 52 12)"/><rect x="73" y="26" width="14" height="8" rx="1.5" fill="${c.a}" transform="rotate(45 80 30)"/><rect x="23" y="46" width="14" height="8" rx="1.5" fill="${c.i}" transform="rotate(-15 30 50)"/><rect x="59" y="54" width="14" height="8" rx="1.5" fill="${c.a}" transform="rotate(30 66 58)"/><rect x="7" y="74" width="14" height="8" rx="1.5" fill="${c.a}" transform="rotate(60 14 78)"/><rect x="41" y="80" width="14" height="8" rx="1.5" fill="${c.i}" transform="rotate(-40 48 84)"/><rect x="77" y="76" width="14" height="8" rx="1.5" fill="${c.a}" transform="rotate(10 84 80)"/><circle cx="36" cy="30" r="4" fill="${c.i}"/><circle cx="72" cy="12" r="4" fill="${c.a}"/><circle cx="54" cy="36" r="3.5" fill="${c.a}"/>`,
  crown: (c, s) =>
    `<path d="M14 72L8 28L32 48L50 16L68 48L92 28L86 72Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><rect x="14" y="72" width="72" height="14" rx="3" fill="${c.i}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="8" cy="26" r="5" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><circle cx="50" cy="14" r="5" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><circle cx="92" cy="26" r="5" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/>`,
  devil: (c, s) =>
    `<path d="M28 42Q14 22 26 6Q32 26 42 34Z" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M72 42Q86 22 74 6Q68 26 58 34Z" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><circle cx="50" cy="60" r="30" fill="${c.a}" stroke="${c.a}" stroke-width="${w(s, 1.00)}"/><path d="M38 52L46 56M62 52L54 56" stroke="${c.bg}" stroke-width="${w(s, 1.20)}" stroke-linecap="round"/><path d="M36 68Q50 80 64 68" stroke="${c.bg}" stroke-width="${w(s, 1.20)}" fill="none" stroke-linecap="round"/>`,
  dom: (c, s) =>
    `<path d="M16 90V40L26 8L36 40V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M64 90V40L74 8L84 40V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M36 90V58L50 46L64 58V90Z" fill="${c.a2}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M26 54V66M74 54V66" stroke="${c.bg}" stroke-width="${w(s, 1.20)}" stroke-linecap="round"/>`,
  fachwerk: (c, s) =>
    `<path d="M12 50L50 14L88 50Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><rect x="20" y="50" width="60" height="40" fill="${c.a2}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M20 50L50 90L80 50M50 50V90M20 70H80" stroke="${c.i}" stroke-width="${w(s, 0.80)}" fill="none"/>`,
  gable: (c, s) =>
    `<path d="M16 90V44H24V34H32V24H40V14H60V24H68V34H76V44H84V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><rect x="44" y="26" width="12" height="14" fill="${c.bg}"/><rect x="28" y="52" width="12" height="14" fill="${c.bg}"/><rect x="60" y="52" width="12" height="14" fill="${c.bg}"/><path d="M42 90V76A8 8 0 0 1 58 76V90Z" fill="${c.bg}"/>`,
  gate: (c, s) =>
    `<path d="M14 90V30L28 14L42 30V42H58V30L72 14L86 30V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M36 90V64A14 14 0 0 1 64 64V90Z" fill="${c.bg}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M42 42H58" stroke="${c.a2}" stroke-width="${w(s, 1.60)}"/>`,
  goat: (c, s) =>
    `<path d="M40 68V88M52 68V88M66 68V88M76 66V86" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linecap="round"/><rect x="34" y="46" width="50" height="26" rx="13" fill="#FFF6E3" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M84 54L92 48" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linecap="round"/><circle cx="28" cy="42" r="13" fill="#FFF6E3" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M24 30Q16 14 30 10M32 30Q34 16 44 16" stroke="${c.a}" stroke-width="${w(s, 1.30)}" fill="none" stroke-linecap="round"/><path d="M22 54L20 64" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linecap="round"/><circle cx="24" cy="40" r="2.4" fill="#1D1811"/>`,
  grapefruit: (c, s) =>
    `<circle cx="50" cy="50" r="38" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="50" cy="50" r="28" fill="${c.a2}"/><path d="M50 22V78M22 50H78M30 30L70 70M70 30L30 70" stroke="${c.a}" stroke-width="${w(s, 0.90)}"/>`,
  harp: (c, s) =>
    `<path d="M26 90V16Q26 8 34 10Q72 20 84 70L86 82Z" fill="none" stroke="${c.a}" stroke-width="${w(s, 2.20)}" stroke-linejoin="round"/><path d="M36 17.5V86.8" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><path d="M46 21V85.6" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><path d="M56 24.5V84.4" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><path d="M66 50V83.2" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/><path d="M76 59V82" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/>`,
  heartanchor: (c, s) =>
    `<path d="M50 90C20 68 8 52 8 34C8 20 18 10 31 10C40 10 46 16 50 24C54 16 60 10 69 10C82 10 92 20 92 34C92 52 80 68 50 90Z" fill="${c.a}" stroke="#1D1811" stroke-width="${w(s, 1.00)}"/><circle cx="50" cy="28" r="5" fill="none" stroke="${c.bg}" stroke-width="${w(s, 1.20)}"/><path d="M50 33V72M40 42H60M32 58Q34 72 50 72Q66 72 68 58" stroke="${c.bg}" stroke-width="${w(s, 1.50)}" fill="none" stroke-linecap="round"/>`,
  hexmount: (c, s) =>
    `<polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M20 70L40 40L50 54L62 34L80 70Z" fill="${c.bg}" stroke="${c.i}" stroke-width="${w(s, 0.80)}" stroke-linejoin="round"/><circle cx="68" cy="24" r="6" fill="${c.a2}"/>`,
  horn: (c, s) =>
    `<path d="M16 76C16 44 38 24 66 24H76V14L92 32L76 50V40H66C50 40 34 54 34 76Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><polygon points="30.0,10.0 32.9,18.0 41.4,18.3 34.8,23.5 37.1,31.7 30.0,27.0 22.9,31.7 25.2,23.5 18.6,18.3 27.1,18.0" fill="${c.i}"/>`,
  key: (c, s) =>
    `<circle cx="30" cy="50" r="16" fill="none" stroke="${c.a}" stroke-width="${w(s, 2.20)}"/><path d="M47 50H90M78 50V66M88 50V62" stroke="${c.a}" stroke-width="${w(s, 2.20)}" stroke-linecap="round" stroke-linejoin="round"/>`,
  lake: (c, s) =>
    `<path d="M6 64L32 26L46 44L62 16L94 64Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M53 29L62 16L71 29L66 33L62 28L58 33Z" fill="${c.bg}"/><rect x="6" y="64" width="88" height="26" fill="${c.a2}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M14 76H40M50 82H84" stroke="${c.bg}" stroke-width="${w(s, 1.00)}" stroke-linecap="round"/>`,
  lozenge: (c, s) =>
    `<clipPath id="lz"><rect x="6" y="18" width="88" height="64" rx="4"/></clipPath><g clip-path="url(#lz)"><rect x="6" y="18" width="88" height="64" rx="4" fill="${c.a2}" stroke="${c.a}" stroke-width="${w(s, 1.00)}"/><path d="M6 18L17 26L6 34L-5 26Z" fill="${c.a}"/><path d="M28 18L39 26L28 34L17 26Z" fill="${c.a}"/><path d="M50 18L61 26L50 34L39 26Z" fill="${c.a}"/><path d="M72 18L83 26L72 34L61 26Z" fill="${c.a}"/><path d="M17 34L28 42L17 50L6 42Z" fill="${c.a}"/><path d="M39 34L50 42L39 50L28 42Z" fill="${c.a}"/><path d="M61 34L72 42L61 50L50 42Z" fill="${c.a}"/><path d="M83 34L94 42L83 50L72 42Z" fill="${c.a}"/><path d="M6 50L17 58L6 66L-5 58Z" fill="${c.a}"/><path d="M28 50L39 58L28 66L17 58Z" fill="${c.a}"/><path d="M50 50L61 58L50 66L39 58Z" fill="${c.a}"/><path d="M72 50L83 58L72 66L61 58Z" fill="${c.a}"/><path d="M17 66L28 74L17 82L6 74Z" fill="${c.a}"/><path d="M39 66L50 74L39 82L28 74Z" fill="${c.a}"/><path d="M61 66L72 74L61 82L50 74Z" fill="${c.a}"/><path d="M83 66L94 74L83 82L72 74Z" fill="${c.a}"/></g><rect x="6" y="18" width="88" height="64" rx="4" fill="none" stroke="${c.a}" stroke-width="${w(s, 1.00)}"/>`,
  monastery: (c, s) =>
    `<path d="M50 4C40 16 36 22 40 32H60C64 22 60 16 50 4Z" fill="${c.a2}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><rect x="40" y="32" width="20" height="58" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M8 90V60L24 46L40 58V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M60 90V54L76 44L92 54V90Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><rect x="46" y="44" width="8" height="12" rx="4" fill="${c.bg}"/>`,
  monk: (c, s) =>
    `<path d="M50 8C24 8 16 44 18 92H82C84 44 76 8 50 8Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="50" cy="50" r="19" fill="#F6D8B4" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="43" cy="47" r="2.8" fill="#1D1811"/><circle cx="57" cy="47" r="2.8" fill="#1D1811"/><path d="M42 56Q50 63 58 56" stroke="#1D1811" stroke-width="${w(s, 0.80)}" fill="none" stroke-linecap="round"/>`,
  rock: (c, s) =>
    `<path d="M10 68L34 28L48 46L62 20L90 68Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M6 80Q18 72 30 80T54 80T78 80T102 80M6 92Q18 84 30 92T54 92T78 92T102 92" stroke="${c.i}" stroke-width="${w(s, 1.00)}" fill="none"/>`,
  seal: (c, s) =>
    `<circle cx="50" cy="50" r="40" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="50" cy="50" r="31" fill="none" stroke="${c.bg}" stroke-width="${w(s, 0.70)}" stroke-dasharray="5.91 6.90"/><polygon points="50.0,32.0 54.7,44.5 68.1,45.1 57.6,53.5 61.2,66.4 50.0,59.0 38.8,66.4 42.4,53.5 31.9,45.1 45.3,44.5" fill="${c.bg}" stroke="${c.i}" stroke-width="${w(s, 0.70)}" stroke-linejoin="round"/>`,
  shield: (c, s) =>
    `<path d="M22 12H78V46C78 70 64 84 50 92C36 84 22 70 22 46Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M22 38H78" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><circle cx="50" cy="60" r="10" fill="${c.bg}" stroke="${c.i}" stroke-width="${w(s, 0.80)}"/>`,
  ship: (c, s) =>
    `<path d="M50 10V66" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M53 16L82 58H53Z" fill="${c.i}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M47 22L22 58H47Z" fill="${c.i}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M50 10L64 14L50 19Z" fill="${c.a2}"/><path d="M10 64H90L78 84H22Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M6 94Q18 88 30 94T54 94T78 94T102 94" stroke="${c.i}" stroke-width="${w(s, 1.00)}" fill="none"/>`,
  star: (c, s) =>
    `<polygon points="50.0,11.0 60.6,38.4 89.9,40.0 67.1,58.6 74.7,87.0 50.0,71.0 25.3,87.0 32.9,58.6 10.1,40.0 39.4,38.4" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/>`,
  stripes: (c) =>
    `<rect x="6" y="28" width="88" height="10" fill="${c.a}"/><rect x="6" y="46" width="88" height="10" fill="${c.a2}"/><rect x="6" y="64" width="88" height="10" fill="${c.a}"/>`,
  swoosh: (c, s) =>
    `<path d="M8 66Q46 22 92 26" stroke="${c.a}" stroke-width="${w(s, 3.00)}" fill="none" stroke-linecap="round"/><path d="M8 86Q50 44 92 48" stroke="${c.a2}" stroke-width="${w(s, 3.00)}" fill="none" stroke-linecap="round"/>`,
  tree: (c, s) =>
    `<path d="M36 8L58 42H48L64 70H8L24 42H14Z" fill="${c.a}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><rect x="31" y="70" width="10" height="18" fill="${c.i}"/><ellipse cx="74" cy="70" rx="13" ry="19" fill="${c.a2}" stroke="${c.i}" stroke-width="${w(s, 1.00)}"/><path d="M62 62H86M61 72H87M64 82H84" stroke="${c.i}" stroke-width="${w(s, 0.70)}"/>`,
  treemount: (c, s) =>
    `<path d="M4 88L38 30L54 52L70 26L96 88Z" fill="${c.i}" stroke="${c.i}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/><path d="M50 30L68 58H60L74 82H26L40 58H32Z" fill="${c.a}" stroke="${c.bg}" stroke-width="${w(s, 1.00)}" stroke-linejoin="round"/>`,
  waves: (c, s) =>
    `<path d="M4 32Q17 20 30 32T56 32T82 32T108 32" stroke="${c.a}" stroke-width="${w(s, 2.20)}" fill="none" stroke-linecap="round"/><path d="M4 54Q17 42 30 54T56 54T82 54T108 54" stroke="${c.a2}" stroke-width="${w(s, 2.20)}" fill="none" stroke-linecap="round"/><path d="M4 76Q17 64 30 76T56 76T82 76T108 76" stroke="${c.a}" stroke-width="${w(s, 2.20)}" fill="none" stroke-linecap="round"/>`,
}

function w(s: number, k: number): string {
  return (s * k).toFixed(2)
}
