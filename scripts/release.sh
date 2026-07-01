#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------
# release.sh — Publish to Devvit, auto-update website version tags
# Usage: ./scripts/release.sh [--version X.Y.Z] [--public]
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

echo "🚀 Publishing to Devvit..."
OUTPUT=$(npx devvit publish ${FLAGS[@]+"${FLAGS[@]}"} 2>&1 | tee /dev/stderr)

# Determine the version: use explicit if provided, otherwise extract from output
if [ -n "$EXPLICIT_VERSION" ]; then
  VERSION="$EXPLICIT_VERSION"
else
  VERSION=$(echo "$OUTPUT" | sed -n 's/.*Automatically bumped app version to: \([^[:space:]]\{1,\}\).*/\1/p')
fi

if [ -z "$VERSION" ]; then
  echo "⚠️  Could not detect version — website tags not updated."
  exit 0
fi

echo ""
echo "📝 Detected version: $VERSION — updating website version tags..."

# One app version drives everything the site exposes: the visible version
# badge (index.html) and every stylesheet cache-buster (all pages), so
# returning visitors always get fresh CSS after a release.
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" docs/index.html
rm -f docs/index.html.bak

for page in docs/*.html; do
  # Rewrite existing ".css?v=X.Y.Z" busters and add one to any bare ".css" link.
  sed -i.bak -E "s|(\.css)(\?v=[0-9]+\.[0-9]+\.[0-9]+)?\"|\1?v=${VERSION}\"|g" "$page"
  rm -f "${page}.bak"
done

echo "✅ Website version tags updated to v${VERSION}"

# Commit and push
git add docs/*.html
git commit -m "chore: bump website version to v${VERSION}"
env -u GITHUB_TOKEN git push

echo "🎉 Done! Website → v${VERSION}"
