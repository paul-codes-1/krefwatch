#!/bin/bash
# Fetch statewide KREF contribution exports, one CSV per election date.
# Endpoint discovered from the public search UI's Export button.
set -u
OUT_DIR="$(dirname "$0")/../data/raw"
DATES=(
  "11/3/2026" "5/19/2026" "12/16/2025"
  "11/5/2024" "5/21/2024" "3/19/2024"
  "11/7/2023" "5/16/2023" "2/21/2023"
  "11/8/2022" "5/17/2022" "2/22/2022"
  "11/2/2021"
  "11/3/2020" "6/23/2020" "5/19/2020" "2/25/2020" "1/14/2020"
  "11/5/2019" "5/21/2019" "3/5/2019"
  "11/6/2018" "5/22/2018" "2/27/2018" "2/20/2018"
  "11/8/2016" "5/17/2016" "3/8/2016"
)
for d in "${DATES[@]}"; do
  fname="$OUT_DIR/$(echo "$d" | awk -F/ '{printf "%04d-%02d-%02d", $3, $1, $2}').csv"
  if [ -s "$fname" ]; then echo "skip $d (exists)"; continue; fi
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1] + ' 00:00:00'))" "$d")
  echo "fetching $d -> $fname"
  curl -s --max-time 600 "https://secure.kentucky.gov/kref/publicsearch/ExportContributors?ElectionDate=${enc}&ContributionSearchType=All" -o "$fname"
  if [ $? -ne 0 ] || [ ! -s "$fname" ]; then echo "FAILED $d"; rm -f "$fname"; else echo "  $(wc -l < "$fname") lines"; fi
  sleep 3
done
echo "DONE"
