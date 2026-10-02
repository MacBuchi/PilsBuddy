#!/usr/bin/env bash
# Q1 – patch compatibility: replays the way production goes (pattern: PilzBuddy/TrailBuddy „Schema Dry Run“).
#
#   1. migrations already on the base branch are live – they must not change, new ones must sort after them
#   2. empty local stack, live-like default privileges (live hands anon/authenticated ALL on new tables)
#   3. the base branch's migrations, then data like live (catalogue fixture, catalogue overlay, accounts,
#      ratings, inboxes) – then ONLY this branch's new migrations on top, each in one transaction
#   4. tool/db/grants_check.sql (rights as intended?) and tool/db/schema_check.sh (do the app's queries still work?)
#
# Needs an EMPTY stack (started without migrations, see .github/workflows/ci.yml job `upgrade`) and:
#   BASE_REF       e.g. origin/main (PR) or the previous commit (push)
#   CATALOG_SQL    directory with the fixture import (npm run catalog:build -- --raw tools/catalog/fixtures …)
#   SUPABASE_URL / SUPABASE_KEY   local API + publishable key (for schema_check.sh)
#   DB_URL         default postgresql://postgres:postgres@127.0.0.1:54322/postgres
set -euo pipefail

BASE="${BASE_REF:?BASE_REF fehlt}"
DB="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
CATALOG="${CATALOG_SQL:?CATALOG_SQL fehlt}"
DIR=supabase/migrations
errors=0
err() { echo "::error::$1"; errors=1; }
sql() { psql "$DB" -q -v ON_ERROR_STOP=1 "$@"; }

git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null || { echo "::error::Basis $BASE unbekannt (fetch-depth: 0?)"; exit 1; }

# ---- 1. history -------------------------------------------------------------------------------------------
mapfile -t base_files < <(git ls-tree --name-only "$BASE" "$DIR/" | grep '\.sql$' | sort || true)
mapfile -t head_files < <(ls "$DIR"/*.sql | sort)
for f in "${base_files[@]}"; do
  if [ ! -f "$f" ]; then err "$f ist auf $BASE (also live), fehlt hier – ausgelieferte Migrationen nie löschen"
  elif ! git diff --quiet "$BASE" -- "$f"; then err "$f ist auf $BASE (also live) und wurde geändert – stattdessen eine neue Migration anlegen"; fi
done
mapfile -t new_files < <(comm -13 <(printf '%s\n' "${base_files[@]}") <(printf '%s\n' "${head_files[@]}") | grep . || true)
last_base=""
[ ${#base_files[@]} -gt 0 ] && last_base=$(basename "${base_files[-1]}" | cut -d_ -f1)
for f in "${new_files[@]}"; do
  v=$(basename "$f" | cut -d_ -f1)
  [[ "$v" > "$last_base" ]] || err "$f: Version $v liegt nicht nach der letzten ausgelieferten ($last_base) – db push würde sie überspringen"
done
dups=$(printf '%s\n' "${head_files[@]}" | xargs -n1 basename | cut -d_ -f1 | sort | uniq -d)
[ -z "$dups" ] || err "doppelte Migrationsversion(en): $dups"
[ "$errors" = 0 ] || exit 1
echo "Basis $BASE: ${#base_files[@]} Migrationen live, neu in diesem Stand: ${#new_files[@]}"
printf '  + %s\n' "${new_files[@]}"

# ---- 2. empty stack, live-like defaults ---------------------------------------------------------------------
tables=$(psql "$DB" -tAc "select count(*) from pg_tables where schemaname = 'public'")
[ "$tables" = 0 ] || { echo "::error::Der Stack ist nicht leer ($tables Tabellen in public) – ohne Migrationen starten"; exit 1; }
sql <<'SQL'
-- what the live project's default privileges did before Q1 (pg_default_acl, 2026-10-02)
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
SQL

# ---- 3. base, data, new migrations --------------------------------------------------------------------------
for f in "${base_files[@]}"; do
  echo "Basis:  $f"
  git show "$BASE:$f" | sql -1
done
echo "Bestand: Katalog-Fixture, Katalog-Overlay, Konten, Bewertungen, Feedback, Meldungen"
for f in "$CATALOG"/*.sql; do sql -f "$f"; done
sql -f e2e/catalog-seed.sql
sql -f tool/db/seed_existing.sql
for f in "${new_files[@]}"; do
  echo "Neu:    $f"
  sql -1 -f "$f"
done

# ---- 4. checks ----------------------------------------------------------------------------------------------
sql -f tool/db/grants_check.sql
psql "$DB" -q -c "notify pgrst, 'reload schema'"
sleep 3
bash tool/db/schema_check.sh
echo "upgrade_check: ok"
