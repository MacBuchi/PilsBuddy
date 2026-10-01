# PilsBuddy – notes for coding agents

Tinder-style beer-swipe web app. German UI, English code. Vite + React 19 + TypeScript, no router,
no state library, no CSS framework. Design source of truth: `docs/pilsbuddy-mobile-app-design/project/`
(Claude Design handoff – read the Designsystem before changing visuals).

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm test` (vitest) / `npm run lint` (oxlint)
- Dev-only URL params: `?screen=<name>` jumps to a screen, `&demo=1` seeds demo ratings.

## Rules that matter

- `src/domain/` must stay framework-free and deterministic. No LLM, no randomness in DNA,
  matching, persona or avatar. Every change there needs a test. Mini games (`src/domain/games/`) shuffle only
  through the seeded PRNG there – same seed, same game; the UI passes the seed in.
- `UNKNOWN` never influences the taste vector; `DISLIKE` is negative; `WANT_TO_TRY` is interest,
  not preference. Don't "fix" that.
- Copy lives in `src/data/copy.ts`; beers in `src/data/beers.json` (8 axes, 0–100, `reference: true`
  marks the onboarding deck). Adding beers needs no code change. Rows in the DB table `beers` add/replace
  beers at runtime (`src/data/catalog.ts`, cached, applied on the next start) – so never assume a beer id from
  ratings, sync or a buddy link exists in `BEER_BY_ID`.
- Styling: CSS Modules + tokens from `src/index.css`. Keyframes are global (Vite uses the
  lightningcss transformer with `cssModules.animation: false` – keep that).
- Semantic action colours (like/nope/try/know/unknown) are identical in light and dark mode.
- Screens are absolute-positioned inside `AppShell`; use `var(--safe-top)` / `var(--safe-bottom)`.
- Persistence is `src/state/storage.ts` only (versioned localStorage). Navigation is not persisted.
- Backend: Supabase project `PilsBuddy` (ref `rwqpljpnotnyovvuxjgl`). Schema changes only as new files in
  `supabase/migrations/` + pgTAP tests in `supabase/tests/` (`supabase db start && supabase test db`); after
  merge apply with `supabase db push`. RLS on every table; `supabase db advisors --linked` must stay clean.
  The app must keep working fully offline/without the backend (localStorage stays the source of truth).
  Sync code lives in `src/sync/` (pure merge in `merge.ts` with tests; supabase-js only via lazy `cloud.ts`).
  Edge functions in `supabase/functions/`; the two-device flow `e2e/sync.mjs` runs in CI against a local stack.
- No analytics. No new cloud projects or paid services without asking. Anything that sends data off the device
  must be described in the privacy text `src/data/legal.ts` in the same PR.
- Work follows `docs/ROADMAP.md`: keep its order (A0 → A1 → A2 → A9 → …), tick the checkbox of a
  package when it is live, and run the gate (build, test, lint, `e2e/flow.mjs`, screenshots,
  `npm run deploy`) before ticking.
- One package = one branch + PR. Merge it yourself once the gate is green, deploy from `main`,
  then smoke-test https://pilsbuddy.mcbuchi.de (E2E against production) before moving on –
  locally or with `gh workflow run prod-smoke.yml` (runs the same flow from GitHub Actions).
