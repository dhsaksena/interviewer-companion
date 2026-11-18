#!/usr/bin/env bash
# Local CI/CD: check changes, verify (type-check + tests), package, deploy to Lambda.
#
# Usage: scripts/deploy.sh [--yes] [--force]
#   --yes    skip the confirmation prompt
#   --force  deploy even if no server changes were detected
#
# Env overrides: FUNCTION_NAME, AWS_REGION, AWS_PROFILE
set -euo pipefail

FUNCTION_NAME="${FUNCTION_NAME:-interviewer-companion-api}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
: "${AWS_REGION:?Set AWS_REGION or run aws configure}"
export AWS_REGION

ASSUME_YES=false
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --force) FORCE=true ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."            # Interviewer-companion-server/
SERVER_DIR="$(basename "$PWD")"
STATE_FILE=".last-deployed-sha"    # gitignored; records the last deployed commit
HEAD_SHA="$(git rev-parse HEAD)"

step() { printf '\n==> %s\n' "$1"; }

# 1. Detect changes -----------------------------------------------------------
step "Checking for changes"
if [[ -n "$(git status --porcelain -- .)" ]]; then
  echo "Uncommitted changes in $SERVER_DIR:"
  git status --short -- .
  echo "Commit or stash them first so the deployed code matches a commit." >&2
  exit 1
fi

LAST_SHA="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [[ -n "$LAST_SHA" ]] && git cat-file -e "$LAST_SHA^{commit}" 2>/dev/null; then
  CHANGED="$(git diff --name-only "$LAST_SHA" HEAD -- .)"
  if [[ -z "$CHANGED" && "$FORCE" != true ]]; then
    echo "No server changes since last deploy ($LAST_SHA). Use --force to redeploy."
    exit 0
  fi
  echo "Changed since ${LAST_SHA:0:7}:"; echo "$CHANGED" | sed 's/^/  /'
else
  echo "No previous deploy recorded; treating everything as changed."
fi

# 2. Verify ---------------------------------------------------------------------
step "Installing dependencies"
# `npm ci` wipes node_modules and reinstalls everything, which is very slow on
# /mnt/c. Skip it when package-lock.json is unchanged since the last install.
LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
LOCK_STAMP="node_modules/.lock-hash"
if [[ -d node_modules && "$(cat "$LOCK_STAMP" 2>/dev/null || true)" == "$LOCK_HASH" ]]; then
  echo "Dependencies up to date (package-lock.json unchanged); skipping install."
else
  npm ci --prefer-offline --no-audit --no-fund
  echo "$LOCK_HASH" > "$LOCK_STAMP"
fi

step "Type check"
npm run type-check

step "Lint"
npm run lint

step "Tests"
NODE_ENV=test \
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-test-client-id}" \
SESSION_SECRET="${SESSION_SECRET:-test-session-secret-for-ci-only}" \
AI_PROVIDER="${AI_PROVIDER:-claude}" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-test-api-key}" \
  npm test

# 3. Package --------------------------------------------------------------------
step "Packaging Lambda"
rm -rf dist-lambda lambda.zip
npm run package:lambda

# 4. Confirm + deploy -----------------------------------------------------------
step "AWS identity"
aws sts get-caller-identity

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Deploy ${HEAD_SHA:0:7} to Lambda '$FUNCTION_NAME' in $AWS_REGION? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

step "Deploying"
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://lambda.zip \
  --query '{State:State,LastUpdateStatus:LastUpdateStatus,CodeSha256:CodeSha256}'

step "Waiting for update to finish"
aws lambda wait function-updated --function-name "$FUNCTION_NAME"

step "Verifying"
STATUS="$(aws lambda get-function-configuration --function-name "$FUNCTION_NAME" \
  --query 'LastUpdateStatus' --output text)"
if [[ "$STATUS" != "Successful" ]]; then
  echo "Deployment finished with status: $STATUS" >&2
  exit 1
fi

echo "$HEAD_SHA" > "$STATE_FILE"
echo "Deployed ${HEAD_SHA:0:7} to $FUNCTION_NAME."
