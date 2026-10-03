#!/usr/bin/env bash
# Q1: the PostgREST requests the app makes, against a Supabase API with the publishable key – the bug class
# „app expects schema the database does not have“ (pattern: TrailBuddy/PilzBuddy tool/schema_check.sh).
#
# The query strings come from the app's source (catalog.ts, regional.ts), so this check cannot drift from it.
# Postgres resolves columns BEFORE privileges: for tables anon may not read, 42501 (permission denied) proves
# table and columns exist, while 42703 (column), PGRST200 (embed) or PGRST205 (table) mean the schema is wrong.
#
#   SUPABASE_URL=… SUPABASE_KEY=… bash tool/db/schema_check.sh
# Inserts (feedback, beer report) only run against a local stack – never against the live project.
set -euo pipefail

URL="${SUPABASE_URL:?SUPABASE_URL fehlt}"
KEY="${SUPABASE_KEY:?SUPABASE_KEY fehlt}"
fail=0

src() { # the first match of a pattern in a source file, or abort – a renamed constant must not silently skip a check
  local out
  out=$(grep -o "$1" "$2" | head -1 || true)
  [ -n "$out" ] || { echo "::error::schema_check: Muster '$1' nicht in $2 gefunden – Check anpassen"; exit 1; }
  printf '%s' "$out"
}

# GET whose answer must be a JSON list (anon may read) or – with allow_denied – a 42501
check_get() {
  local name="$1" path="$2" mode="${3:-}" out code
  out=$(curl -sS --max-time 20 -w '\n%{http_code}' "$URL$path" -H "apikey: $KEY" || printf '\n000')
  code=${out##*$'\n'}; out=${out%$'\n'*}
  if [ "$code" = 200 ] && [ "${out:0:1}" = "[" ]; then
    echo "ok   $name"
  elif [ "$mode" = allow_denied ] && grep -q '"42501"' <<<"$out"; then
    echo "ok   $name (gesperrt, Spalten vorhanden)"
  else
    echo "FAIL $name → HTTP $code ${out:0:300}"; fail=1
  fi
}

# GET that anon must NOT be able to make (write-only inboxes)
check_denied() {
  local name="$1" path="$2" out code
  out=$(curl -sS --max-time 20 -w '\n%{http_code}' "$URL$path" -H "apikey: $KEY" || printf '\n000')
  code=${out##*$'\n'}; out=${out%$'\n'*}
  if grep -q '"42501"' <<<"$out"; then echo "ok   $name (gesperrt)"; else echo "FAIL $name → HTTP $code ${out:0:300} (anon darf lesen?)"; fail=1; fi
}

check_insert() {
  local name="$1" table="$2" body="$3" out code
  case "$URL" in http://127.0.0.1*|http://localhost*) ;; *) echo "skip $name (nur lokal)"; return;; esac
  out=$(curl -sS --max-time 20 -w '\n%{http_code}' "$URL/rest/v1/$table" -H "apikey: $KEY" \
    -H 'Content-Type: application/json' -H 'Prefer: return=minimal' -d "$body" || printf '\n000')
  code=${out##*$'\n'}; out=${out%$'\n'*}
  if [ "$code" = 201 ]; then echo "ok   $name"; else echo "FAIL $name → HTTP $code ${out:0:300}"; fail=1; fi
}

catalog=$(src 'rest/v1/beers?[^`]*' src/data/catalog.ts)
regional_select=$(src "const SELECT = '[^']*'" src/data/regional.ts | cut -d"'" -f2)
beer_cols=$(src "const BEER_COLS = '[^']*'" src/data/regional.ts | cut -d"'" -f2)
brewery_cols=$(src "const BREWERY_COLS = '[^']*'" src/data/regional.ts | cut -d"'" -f2)
places=$(src 'rest/v1/places?[^`]*' src/data/regional.ts | sed 's/\${code}/74906/')
run=$(date +%s)

check_get "Bierkatalog (catalog.ts)" "/$catalog"
check_get "Regional-Finder: Brauereien + Biere einer Zelle (regional.ts)" \
  "/rest/v1/breweries?select=$regional_select&published=eq.true&or=(and(lat.gte.49,lat.lt.49.5,lon.gte.9,lon.lt.9.5))&order=id.asc&limit=1000"
check_get "Regional-Finder: PLZ (regional.ts)" "/$places"
map_cols=$(src "const MAP_COLS = '[^']*'" src/data/regional.ts | cut -d"'" -f2)
check_get "Weltkarte: alle Brauereien seitenweise (regional.ts)" \
  "/rest/v1/breweries?select=$map_cols&published=eq.true&order=id.asc&limit=1000&offset=1000"
check_get "Bibliothek: Regionalbiere nach Name (regional.ts)" \
  "/rest/v1/regional_beers?select=$beer_cols,breweries!inner($brewery_cols)&published=eq.true&name=ilike.*pils*&order=name.asc&limit=40"
check_get "Bibliothek: Brauereien nach Name/Ort (regional.ts)" \
  "/rest/v1/breweries?select=$regional_select&published=eq.true&or=(name.ilike.*brau*,city.ilike.*brau*)&order=name.asc&limit=20"
check_get "Sync: ratings-Spalten (cloud.ts)" "/rest/v1/ratings?select=user_id,beer_id,rating,previous,at,deleted&limit=1" allow_denied
check_get "Sync: profiles-Spalten (cloud.ts)" "/rest/v1/profiles?select=id,buddy_no,archetype,taste,decoded,dark,onboarded,visible&limit=1" allow_denied
check_denied "Feedback nicht lesbar" "/rest/v1/feedback?select=id&limit=1"
check_denied "Bier-Meldungen nicht lesbar" "/rest/v1/beer_submissions?select=id&limit=1"
check_insert "Feedback senden (feedback.ts)" feedback \
  "{\"type\":\"bug\",\"message\":\"schema_check $run\",\"app_version\":\"ci\",\"platform\":\"Linux · Browser\"}"
check_insert "Bier melden (beerSubmission.ts)" beer_submissions \
  "{\"brewery_name\":\"Schema-Check-Bräu\",\"brewery_place\":\"74906\",\"beer_name\":\"Check $run\",\"style\":\"Pils\",\"abv\":4.9,\"app_version\":\"ci\",\"platform\":\"Linux · Browser\"}"

if [ "$fail" != 0 ]; then echo "::error::schema_check: Die App passt nicht zum Schema (siehe FAIL)"; exit 1; fi
echo "schema_check: ok"
