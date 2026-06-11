#!/bin/bash
# Deploy KREF Watch to AWS Amplify (manual zip deployment, no git hookup).
# Usage: ./deploy/deploy.sh
set -euo pipefail

APP_ID="${AMPLIFY_APP_ID:-d21vwc9tx0yz7a}"
BRANCH="${AMPLIFY_BRANCH:-main}"
REGION="${AWS_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building"
cd "$ROOT"
npm run build

echo "==> Zipping dist/"
ZIP="$ROOT/deploy/dist.zip"
rm -f "$ZIP"
(cd "$ROOT/dist" && zip -q -r -X "$ZIP" .)
du -sh "$ZIP"

echo "==> Creating Amplify deployment"
DEPLOYMENT=$(aws amplify create-deployment --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --output json)
JOB_ID=$(echo "$DEPLOYMENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['jobId'])")
UPLOAD_URL=$(echo "$DEPLOYMENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['zipUploadUrl'])")

echo "==> Uploading zip (job $JOB_ID)"
curl -fsS -X PUT -H "Content-Type: application/zip" --upload-file "$ZIP" "$UPLOAD_URL" > /dev/null

echo "==> Starting deployment"
aws amplify start-deployment --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" --query 'jobSummary.status' --output text

echo "==> Waiting for job to finish"
for i in $(seq 1 60); do
  STATUS=$(aws amplify get-job --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" --query 'job.summary.status' --output text)
  echo "   $STATUS"
  case "$STATUS" in
    SUCCEED) echo "==> Deployed: https://${BRANCH}.${APP_ID}.amplifyapp.com"; exit 0 ;;
    FAILED|CANCELLED) echo "==> Deployment $STATUS"; exit 1 ;;
  esac
  sleep 10
done
echo "==> Timed out waiting for deployment"; exit 1
