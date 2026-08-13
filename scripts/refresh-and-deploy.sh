#!/bin/bash
# Weekly refresh: re-pull current-cycle KREF exports, rebuild the dataset,
# rebuild + prerender the site, and deploy to Amplify.
# Cron-safe: absolute paths, all output to stdout for the caller to log.
set -euo pipefail
# nvm-managed node isn't on cron's minimal PATH — resolve the newest installed version
export PATH="$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1):/opt/homebrew/bin:/usr/local/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== KREF Watch refresh $(date -u +%FT%TZ) ==="

# Re-download cycles still receiving filings (current + next year).
YEAR=$(date +%Y)
NEXT=$((YEAR + 1))
rm -f data/raw/${YEAR}-*.csv data/raw/${NEXT}-*.csv
./scripts/fetch-kref.sh

node scripts/build-data.mjs | tail -3
./deploy/deploy.sh   # builds + prerenders + ships

echo "=== refresh complete $(date -u +%FT%TZ) ==="
