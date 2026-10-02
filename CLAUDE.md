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
- Copy lives in `src/data/copy.ts` (German) and `src/data/copy.en.ts` (English, same keys – the `Copy` type enforces
  it, `copy.test.ts` checks placeholders). A new text needs both. The language is fixed per session
  (`src/state/lang.ts`: stored choice, else browser language; switching reloads), so modules may read `COPY` at load.
  English beer texts: `src/data/beers.en.json` (one entry per curated beer, test-enforced); style names stay German.
  Unit tests run in German; e2e contexts pin `locale: 'de-DE'` (Playwright defaults to en-US).
  Beers live in `src/data/beers.json` (8 axes, 0–100, `reference: true` marks the onboarding deck). Adding beers needs no code change. Rows in the DB table `beers` add/replace
  beers at runtime (`src/data/catalog.ts`, cached, applied on the next start) – so never assume a beer id from
  ratings, sync or a buddy link exists in `BEER_BY_ID`.
- Bottles are generated (`src/domain/bottles/`, skill `pilsbuddy-flaschendesign`): no SVG file per beer. A beer
  without `bottle` in beers.json gets one derived from style/colour/taste (`designFor`); DB designs only via
  `sanitizeDesign`. Shape outlines are pinned by tests – change them only on purpose.
- Styling: CSS Modules + tokens from `src/index.css`. Keyframes are global (Vite uses the
  lightningcss transformer with `cssModules.animation: false` – keep that).
- Semantic action colours (like/nope/try/know/unknown) are identical in light and dark mode.
- Screens are absolute-positioned inside `AppShell`; use `var(--safe-top)` / `var(--safe-bottom)`.
- Persistence is `src/state/storage.ts` only (versioned localStorage) – plus the language choice in
  `src/state/lang.ts`, which the text bank needs before anything else loads. Navigation is not persisted.
- Backend: Supabase project `PilsBuddy` (ref `rwqpljpnotnyovvuxjgl`). Schema changes only as new files in
  `supabase/migrations/` + pgTAP tests in `supabase/tests/` (`supabase db start && supabase test db`); after
  merge apply with `supabase db push`. RLS on every table; `supabase db advisors --linked` must stay clean
  (except the two intended 0012 „anonymous access“ WARNs, see `supabase/README.md`).
  Migrations already on `main` are live – never edit them, add a new one. A new table needs explicit grants
  (the API roles get nothing by default) plus an entry in `tool/db/grants_check.sql` and a guarded block in
  `tool/db/seed_existing.sql`; CI job „DB upgrade path“ (`tool/db/upgrade_check.sh`) replays main → data → new
  migrations and runs the app's queries (`tool/db/schema_check.sh`).
  The app must keep working fully offline/without the backend (localStorage stays the source of truth).
  Sync code lives in `src/sync/` (pure merge in `merge.ts` with tests; supabase-js only via lazy `cloud.ts`).
  Edge functions in `supabase/functions/`; the two-device flow `e2e/sync.mjs` runs in CI against a local stack.
- No analytics. No new cloud projects or paid services without asking. Anything that sends data off the device
  must be described in the privacy text `src/data/legal.ts` in the same PR.
- Regional beers (Stufe R): taste only via `tasteFromStyle` (shown as „Stil-Schätzung“), never hand-invented;
  the user's location never leaves the device – query only coarse grid cells (or the typed postcode).
- Work follows `docs/ROADMAP.md`: keep its order (A0 → A1 → A2 → A9 → …). One package = one branch + PR that
  also ticks its roadmap checkbox (with the PR number) – no separate roadmap PR.
- The gate runs in CI, not locally. Locally: write code, run the affected `vitest` files and `npm run typecheck`
  (UI work: `npm run dev`). Then push, open the PR and `gh pr merge --auto --squash --delete-branch` (never
  `--admin`). Visual review: the `screenshots` artifact of the „E2E flow“ job (`gh run download <run> -n screenshots`).
  Never rename CI jobs – branch protection requires the exact names.
- After the merge, CI on `main` deploys, smoke-tests production (waits until `/version.json` reports the commit)
  and creates the GitHub Release `v<date>.<run>` (notes from the PRs, `dist.zip`). A package is live when its
  release exists. Anything failing after the merge opens an issue labelled `release-failed` – fix that before the
  next package (fix forward, or `gh workflow run rollback.yml [-f tag=…]`, which redeploys an earlier release).
  Nightly `prod-smoke.yml` does the same against production.
