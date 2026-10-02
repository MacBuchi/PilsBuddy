#!/usr/bin/env bash
# Advisors of the linked (live) project: fails on every finding (level ≥ WARN) except the two intended
# 0012 „Anonymous Access Policies“ on profiles/ratings (supabase/README.md). Needs a linked project.
set -euo pipefail
allowed='["auth_allow_anonymous_sign_ins_public_profiles","auth_allow_anonymous_sign_ins_public_ratings"]'
json=$(supabase db advisors --linked --type all --level warn --output-format json 2>/dev/null)
extra=$(jq -r --argjson ok "$allowed" '.results[] | select(.cacheKey as $k | $ok | index($k) | not) | "\(.level) \(.title): \(.remediation)"' <<<"$json")
echo "Advisors: $(jq '.results | length' <<<"$json") Hinweise (davon 2 gewollt)"
if [ -n "$extra" ]; then
  echo "::error::Neue Advisor-Hinweise im Live-Projekt"
  echo "$extra"
  exit 1
fi
