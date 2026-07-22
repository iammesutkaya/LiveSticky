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

if [ -z "$EXPLICIT_VERSION" ]; then
  echo "❌ Error: You must provide an explicit version for release (e.g., --version 1.0.239)"
  echo "This ensures the webview dashboard and website tags all match the published version exactly."
  exit 1
fi

VERSION="$EXPLICIT_VERSION"

echo "📝 Updating webview and website version tags to v${VERSION}..."

# Update webview client source HTML
sed -i.bak -E "s|v[0-9]+\.[0-9]+\.[0-9]+|v${VERSION}|g" src/client/index.html
sed -i.bak -E "s|Version [0-9]+\.[0-9]+\.[0-9]+|Version ${VERSION}|g" src/client/index.html
rm -f src/client/index.html.bak

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

echo "✅ Rebuilding webview client with new version..."
npm run build

echo "🚀 Publishing to Devvit..."
# Devvit output will still print the version, but we already applied it
npx devvit@0.13.9 publish ${FLAGS[@]+"${FLAGS[@]}"} 2>&1 | tee /dev/stderr

# Commit and push. Stage the whole website folder and the client html:
git add docs src/client/index.html
git commit -m "chore: bump app and website version to v${VERSION}"
if ! env -u GITHUB_TOKEN git push 2>/dev/null; then
  echo "🔑 Retrying git push using GitHub CLI token..."
  env -u GITHUB_TOKEN git push "https://iammesutkaya:$(gh auth token 2>/dev/null)@github.com/iammesutkaya/LiveSticky.git" main
fi

echo "🎉 Done! Webview + Website + Devvit → v${VERSION}"
