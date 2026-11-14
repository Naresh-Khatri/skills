#!/usr/bin/env bash
# usage: init.sh [--update] [repo-dir]
#   no scaffold -> copy template, exclude from git, install deps
#   --update    -> refresh kit-owned files only (never project.ts, NOTES.md, features, public, out)
set -euo pipefail

UPDATE=0
[[ "${1:-}" == "--update" ]] && { UPDATE=1; shift; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$SKILL/template"
REPO="$(git -C "${1:-.}" rev-parse --show-toplevel 2>/dev/null)" || REPO="$(cd "${1:-.}" && pwd)"
DEST="$REPO/feature-video"
KIT_VERSION="$(cat "$SKILL/VERSION")"

# kit-owned; safe to overwrite
MANAGED=(src/kit src/index.ts src/Root.tsx scripts package.json pnpm-workspace.yaml tsconfig.json remotion.config.ts README.md)

exclude_from_git() {
  git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || { echo "! not a git repo; nothing to exclude"; return; }
  # --git-path -> correct file inside worktrees too
  local file; file="$(git -C "$REPO" rev-parse --path-format=absolute --git-path info/exclude)"
  mkdir -p "$(dirname "$file")"; touch "$file"
  grep -qxF "/feature-video/" "$file" || printf '\n# local feature-release videos (feature-video skill)\n/feature-video/\n' >> "$file"
  if [[ -n "$(git -C "$REPO" ls-files feature-video | head -1)" ]]; then
    echo "! feature-video/ has tracked files; exclude won't hide them. untrack with: git rm -r --cached feature-video"
  fi
}

install_deps() {
  (cd "$DEST" && pnpm install --reporter=silent) || { echo "! pnpm install failed in $DEST"; exit 1; }
}

if [[ -d "$DEST" && $UPDATE -eq 0 ]]; then
  exclude_from_git
  echo "scaffold present: $DEST (kit $(cat "$DEST/.kit-version" 2>/dev/null || echo unknown), skill kit $KIT_VERSION)"
  exit 0
fi

if [[ ! -d "$DEST" ]]; then
  mkdir -p "$DEST"
  cp -r "$TEMPLATE"/. "$DEST"/
  mkdir -p "$DEST/src/features" "$DEST/public/brand" "$DEST/out"
  echo "created $DEST"
else
  for path in "${MANAGED[@]}"; do
    rm -rf "${DEST:?}/$path"
    cp -r "$TEMPLATE/$path" "$DEST/$path"
  done
  # project-owned files only seeded when missing
  [[ -f "$DEST/src/project.ts" ]] || cp "$TEMPLATE/src/project.ts" "$DEST/src/project.ts"
  [[ -f "$DEST/NOTES.md" ]] || cp "$TEMPLATE/NOTES.md" "$DEST/NOTES.md"
  echo "updated kit in $DEST"
fi

echo "$KIT_VERSION" > "$DEST/.kit-version"
exclude_from_git
install_deps
(cd "$DEST" && node scripts/films.ts >/dev/null)
echo "ready: kit $KIT_VERSION"
