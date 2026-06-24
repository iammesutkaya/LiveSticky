#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------
# upload.sh — Upload to Devvit, auto-update version badge
# Usage: ./scripts/upload.sh [--version X.Y.Z]
# -------------------------------------------------------

FLAGS=()
EXPLICIT_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      EXPLICIT_VERSION="$2"
      FLAGS+=("--version" "$2")
      shift 2
      ;;
    *)
      FLAGS+=("$1")
      shift
      ;;
  esac
done

echo "🚀 Uploading dev version to Devvit..."
OUTPUT=$(npx devvit upload "${FLAGS[@]}" 2>&1 | tee /dev/stderr)

# Determine the version: use explicit if provided, otherwise extract from output
if [ -n "$EXPLICIT_VERSION" ]; then
  VERSION="$EXPLICIT_VERSION"
else
  VERSION=$(echo "$OUTPUT" | sed -n 's/.*Automatically bumped app version to: \([^[:space:]]\{1,\}\).*/\1/p')
fi

if [ -z "$VERSION" ]; then
  echo "⚠️  Could not detect version — index.html not updated."
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
git commit -m "chore: bump website version badge to v${VERSION} (dev upload)"
env -u GITHUB_TOKEN git push

echo "🎉 Done! Website badge → v${VERSION}"
