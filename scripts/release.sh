#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------
# release.sh — Publish to Devvit, auto-update version badge
# Usage: ./scripts/release.sh [--public]
# -------------------------------------------------------

FLAGS="${1:-}"

echo "🚀 Publishing to Devvit..."
OUTPUT=$(npx devvit publish $FLAGS 2>&1 | tee /dev/stderr)

# Extract the bumped version from Devvit's output
VERSION=$(echo "$OUTPUT" | sed -n 's/.*Automatically bumped app version to: \([^[:space:]]\{1,\}\).*/\1/p')

if [ -z "$VERSION" ]; then
  echo "⚠️  Could not detect bumped version — index.html not updated."
  exit 0
fi

echo ""
echo "📝 Detected version: $VERSION — updating docs/index.html..."

# Replace the version badge in index.html (handles any vX.X.XX pattern)
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" docs/index.html
rm -f docs/index.html.bak

echo "✅ docs/index.html updated to v${VERSION}"

# Commit and push
git add docs/index.html
git commit -m "chore: bump website version badge to v${VERSION}"
git push

echo "🎉 Done! Website badge → v${VERSION}"
