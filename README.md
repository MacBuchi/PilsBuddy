# PilsBuddy

**Erst Biere daten. Dann Buddies finden.**

Eine spielerische, Tinder-artige Web-App für Bier: Du swipst durch bekannte Biere, PilsBuddy
berechnet daraus deine **Bier-DNA**, gibt dir eine **Bier-Persönlichkeit** und einen
**Bier-Avatar** und empfiehlt dir passende Biere. Später bringt Pils-Match Menschen mit
ähnlichem Geschmack zusammen.

Kein Account, kein Backend, kein LLM: alles läuft lokal im Browser und ist deterministisch.

## Loslegen

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # Typecheck + Produktions-Build nach dist/
npm test           # Vitest (Domain-Logik)
npm run lint       # oxlint
```

Dev-Hilfen: `?screen=dna` springt direkt zu einem Screen, `?demo=1` füllt Demo-Bewertungen
(nur im Dev-Build).

## Bedienung

| Geste / Taste | Bedeutung |
|---|---|
| → oder Herz | Mag ich |
| ← oder X | Nicht meins |
| ↑ oder Flamme | Will probieren |
| ↓ oder ? | Kenn ich nicht (zählt nie negativ) |
| K oder Auge | Kenne ich (neutral) |
| Tippen auf die Karte | Bier-Detail |

## Architektur

```
src/
  data/beers.json     42 Biere, 8 Geschmacksachsen 0–100 – ohne Codeänderung erweiterbar
  data/copy.ts        alle Texte & Sprüche (modular austauschbar)
  domain/             reine Logik, kein React, getestet
    dna.ts            Bewertungen → Geschmacksvektor + Neugier + Entschlüsselt-%
    persona.ts        Regelbaum → Archetyp
    matching.ts       Bier-Kompatibilität, Empfehlungen, Social-Match (vorbereitet)
    avatar.ts         DNA → AvatarSpec (Glasform, Gesicht, Accessoire, Stufe)
    achievements.ts   leichte Gamification
  state/              Reducer, Context, localStorage-Persistenz
  ui/                 Screens & Komponenten (CSS Modules, Design-Tokens in index.css)
docs/                 Design-Handoff aus Claude Design (Prototyp, Designsystem, Avatar)
```

**Gewichte der Bier-DNA:** Mag ich +1 · Will probieren +0,6 · Kenne ich +0,2 ·
Nicht meins −0,8 · Kenn ich nicht 0 (fließt nur in den Neugier-Faktor ein).

**Kompatibilität:** `104 − Ø|DNA − Bier| × 150`, geklemmt auf 48–99 %. Reproduzierbar.

## Deployment (Cloudflare)

Live: **https://pilsbuddy.mcbuchi.de**

Statischer Build als Workers Static Assets (`wrangler.jsonc`), kein Server-Code:

```sh
npm run build
npx wrangler deploy
```

## Roadmap

1. ✅ Lokales MVP (Swipe, DNA, Persönlichkeit, Avatar, Matching, Achievements, Persistenz)
2. Backend (Supabase, Free Tier) für Profile-Sync
3. Pils-Match: Menschen mit ähnlicher Bier-DNA (`buddyMatch()` ist vorbereitet)
4. Optionale KI-Schicht (`AIProvider`: Ollama / Cloud / aus) für Bier-Bios und Roasts
