#!/usr/bin/env bash
# Build the UI and publish it to S3 (+ optional CloudFront invalidation).
# Usage: S3_BUCKET=my-bucket [CLOUDFRONT_DISTRIBUTION_ID=E123] [AWS_PROFILE=x] ./deploy.sh
# VITE_API_URL / VITE_GOOGLE_CLIENT_ID must be set in the environment or .env.production.
set -euo pipefail
cd "$(dirname "$0")"
: "${S3_BUCKET:?Set S3_BUCKET to the target bucket name}"

npm ci
npm run build

# Hashed assets can be cached forever; index.html must always be revalidated.
aws s3 sync dist "s3://${S3_BUCKET}" --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" >/dev/null
  echo "Invalidated CloudFront /index.html"
fi
echo "Deployed to s3://${S3_BUCKET}"
