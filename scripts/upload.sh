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
