#!/usr/bin/env bash
set -euo pipefail

# Ensure working directory is always the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# -------------------------------------------------------
# release.sh - Publish to Devvit, auto-update website version tags
# Usage: ./scripts/release.sh [--version X.Y.Z] [--public]
# -------------------------------------------------------

FLAGS=()
EXPLICIT_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      EXPLICIT_VERSION="$2"
      shift 2
      ;;
    *)
      FLAGS+=("$1")
      shift
      ;;
  esac
done

if [ -z "$EXPLICIT_VERSION" ]; then
  CURRENT_VERSION=$(grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' src/client/index.html | head -n 1 | sed 's/^v//' || echo "")
  if [ -n "$CURRENT_VERSION" ]; then
    MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
    MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
    PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
    NEW_PATCH=$((PATCH + 1))
    VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
    echo "💡 No --version specified. Auto-bumping patch version: v${CURRENT_VERSION} -> v${VERSION}"
  else
    echo "❌ Error: Could not auto-detect current version from src/client/index.html, and no --version was provided."
    exit 1
  fi
else
  VERSION="$EXPLICIT_VERSION"
fi

HAS_VERSION_FLAG=false
HAS_PUBLIC_FLAG=false
for flag in "${FLAGS[@]+"${FLAGS[@]}"}"; do
  if [[ "$flag" == "--version" ]]; then HAS_VERSION_FLAG=true; fi
  if [[ "$flag" == "--public" ]]; then HAS_PUBLIC_FLAG=true; fi
done

if [ "$HAS_VERSION_FLAG" = false ]; then
  FLAGS+=("--version" "$VERSION")
fi
if [ "$HAS_PUBLIC_FLAG" = false ]; then
  FLAGS+=("--public")
fi

echo "📝 Updating webview and website version tags to v${VERSION}..."

# Update webview client source HTML
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" src/client/index.html
sed -i.bak -E "s|Version [0-9]+\.[0-9]+\.[0-9]+|Version ${VERSION}|g" src/client/index.html
rm -f src/client/index.html.bak

# Update package.json version
sed -i.bak -E "s|\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"|\"version\": \"${VERSION}\"|g" package.json
rm -f package.json.bak

# Update README.md version badge
sed -i.bak -E "s|badgen\.net/badge/version/v[0-9]+\.[0-9]+\.[0-9]+|badgen.net/badge/version/v${VERSION}|g" README.md
rm -f README.md.bak

# One app version drives everything the site exposes: the visible version
# badge (index.html) and every stylesheet cache-buster (all pages), so
# returning visitors always get fresh CSS after a release.
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" docs/index.html
rm -f docs/index.html.bak

for page in docs/*.html docs/demo/*.html; do
  # Rewrite existing ".css?v=X.Y.Z" busters and add one to any bare ".css" link.
  sed -i.bak -E "s|(\.css)(\?v=[0-9]+\.[0-9]+\.[0-9]+)?\"|\1?v=${VERSION}\"|g" "$page"
  rm -f "${page}.bak"
done

# Stamp today's date into every <lastmod> in the sitemap so search engines see
# the site as freshly updated on each release.
if [ -f docs/sitemap.xml ]; then
  TODAY=$(date +%F)
  sed -i.bak -E "s|<lastmod>[0-9]{4}-[0-9]{2}-[0-9]{2}</lastmod>|<lastmod>${TODAY}</lastmod>|g" docs/sitemap.xml
  rm -f docs/sitemap.xml.bak
  echo "🗺️  Stamped sitemap lastmod → ${TODAY}"
fi

echo "✅ Rebuilding webview client with new version..."
npm run build

echo "🚀 Publishing to Devvit..."

# Devvit always reads README.md from the project root (no config field for it),
# and the app listing already shows the icon and app name above the readme. So
# publish a stripped copy without the <!-- github-only --> block, then restore.
# The trap guarantees the full readme comes back even if publish fails.
README_BACKUP="$(mktemp)"
cp README.md "$README_BACKUP"
restore_readme() { cp "$README_BACKUP" README.md; rm -f "$README_BACKUP"; }
trap restore_readme EXIT

awk '/<!-- github-only:start -->/{skip=1} !skip; /<!-- github-only:end -->/{skip=0}' \
  "$README_BACKUP" > README.md
echo "✂️  Stripped github-only block for the Devvit listing"

# Devvit output will still print the version, but we already applied it
npx devvit publish "${FLAGS[@]}" 2>&1 | tee /dev/stderr

restore_readme
trap - EXIT

# Commit and push. Stage all repository changes (source + docs):
git add -A
git commit -m "release: v${VERSION}"
if ! env -u GITHUB_TOKEN git push 2>/dev/null; then
  echo "🔑 Retrying git push using GitHub CLI token..."
  env -u GITHUB_TOKEN git push "https://iammesutkaya:$(gh auth token 2>/dev/null)@github.com/iammesutkaya/LiveSticky.git" main
fi

echo "🎉 Done! Webview + Website + Devvit → v${VERSION}"
