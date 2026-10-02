#!/usr/bin/env bash
# Opens an issue labelled release-failed for a failed deploy / smoke / release run – or comments on the open
# one, so a broken production shows up once, not once per run. Needs GH_TOKEN with issues: write.
# Usage: tool/release_alert.sh "<title>"
set -euo pipefail
title=$1
run="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
body="**$title**

- Run: $run
- Commit: \`${GITHUB_SHA:0:7}\` ($GITHUB_REF_NAME)
- Workflow: $GITHUB_WORKFLOW

Live prüfen, dann Fix-forward oder \`gh workflow run rollback.yml\` (letztes gutes Release)."
open=$(gh issue list --repo "$GITHUB_REPOSITORY" --label release-failed --state open --json number --jq '.[0].number // empty')
if [ -n "$open" ]; then
  gh issue comment "$open" --repo "$GITHUB_REPOSITORY" --body "$body"
else
  gh issue create --repo "$GITHUB_REPOSITORY" --label release-failed --title "$title" --body "$body"
fi
