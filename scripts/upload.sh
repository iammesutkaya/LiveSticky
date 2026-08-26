#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------
# upload.sh - Upload to Devvit, auto-update website version tags
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

# Same gate as release.sh: dev uploads ship to a real subreddit, so they get the
# same type-check and test run before anything leaves the machine.
echo "🔍 Type-checking and running tests..."
npx tsc --noEmit
npm test

# Temporarily disable local git exclusions (.git/info/exclude) so Devvit CLI uploads dist/
EXCLUDE_FILE=".git/info/exclude"
HAS_EXCLUDE=false
if [ -f "$EXCLUDE_FILE" ]; then
  mv "$EXCLUDE_FILE" "${EXCLUDE_FILE}.bak"
  HAS_EXCLUDE=true
fi

# Run upload, ensuring we restore the exclude file even if upload fails
set +e
OUTPUT=$(npx devvit upload ${FLAGS[@]+"${FLAGS[@]}"} 2>&1 | tee /dev/stderr)
UPLOAD_EXIT_CODE=$?
set -e

if [ "$HAS_EXCLUDE" = true ]; then
  mv "${EXCLUDE_FILE}.bak" "$EXCLUDE_FILE"
fi

if [ $UPLOAD_EXIT_CODE -ne 0 ]; then
  echo "❌ Upload failed!"
  exit $UPLOAD_EXIT_CODE
fi

echo "🚀 Upgrading installation on r/live_sticky_dev..."
npx devvit install live_sticky_dev || true


# Determine the version: use explicit if provided, otherwise extract from output
if [ -n "$EXPLICIT_VERSION" ]; then
  VERSION="$EXPLICIT_VERSION"
else
  VERSION=$(echo "$OUTPUT" | sed -n 's/.*Automatically bumped app version to: \([^[:space:]]\{1,\}\).*/\1/p')
fi

if [ -z "$VERSION" ]; then
  echo "⚠️  Could not detect version: website tags not updated."
  exit 0
fi

echo ""
echo "📝 Detected version: $VERSION: updating website version tags..."

# Update package.json version
sed -i.bak -E "s|\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"|\"version\": \"${VERSION}\"|g" package.json
rm -f package.json.bak

# Update webview client source HTML version
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" src/client/index.html
rm -f src/client/index.html.bak

# Update README.md version badge
sed -i.bak -E "s|badgen\.net/badge/version/v[0-9]+\.[0-9]+\.[0-9]+|badgen.net/badge/version/v${VERSION}|g" README.md
rm -f README.md.bak

# One app version drives everything the site exposes: the visible version
# badge (index.html) and every stylesheet cache-buster (all pages), so
# returning visitors always get fresh CSS after a release.
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" docs/index.html
rm -f docs/index.html.bak

for page in docs/*.html; do
  # Rewrite existing ".css?v=X.Y.Z" and ".js?v=X.Y.Z" busters and add to bare links.
  sed -i.bak -E "s@(\.css|\.js)(\?v=[0-9]+\.[0-9]+\.[0-9]+)?\"@\1?v=${VERSION}\"@g" "$page"
  rm -f "${page}.bak"
done

echo "✅ Website version tags updated to v${VERSION}"

# Commit and push. Stage the whole website folder, not just the HTML pages:
# the pages depend on style.css/landing.css/main.js, and leaving those
# unstaged deploys new HTML against stale assets.
git add docs
git commit -m "chore: bump website version to v${VERSION} (dev upload)"
env -u GITHUB_TOKEN git push

echo "🎉 Done! Website → v${VERSION}"
