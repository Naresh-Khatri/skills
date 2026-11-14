#!/usr/bin/env bash
# Gathers everything needed to draft a release: last tag, commits since it,
# suggested semver bump, changelog file location, repo state.
# Usage: release-info.sh [major|minor|patch]   (arg overrides the suggested bump)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

force_bump="${1:-}"

last_tag=$(git tag --list 'v[0-9]*' --sort=-v:refname | head -1)

if [ -n "$last_tag" ]; then
  range="${last_tag}..HEAD"
  current="${last_tag#v}"
else
  range=""
  # no tags yet -> seed from root package.json if it has a version
  current=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9][^"]*\)".*/\1/p' package.json 2>/dev/null | head -1)
  current="${current:-0.0.0}"
fi

log() { git log --no-merges ${range:+"$range"} "$@"; }

# buffer the log: grep -q would SIGPIPE git and pipefail would read that as "no match"
subjects=$(log --pretty='%s')
full=$(log --pretty='%s%n%b')
count=$(printf '%s' "$subjects" | grep -c '' || true)

# breaking = `type!:` prefix or BREAKING CHANGE anywhere in the message
if printf '%s' "$full" | grep -qE '^[a-z]+(\([^)]*\))?!:|BREAKING[ -]CHANGE'; then
  bump=major
elif printf '%s' "$subjects" | grep -qE '^feat(\([^)]*\))?!?:'; then
  bump=minor
else
  bump=patch
fi
[ -n "$force_bump" ] && bump="$force_bump"

IFS=. read -r ma mi pa <<<"$(echo "$current" | sed 's/[-+].*//')"
ma=${ma:-0}; mi=${mi:-0}; pa=${pa:-0}
case "$bump" in
  major) next="$((ma + 1)).0.0" ;;
  minor) next="${ma}.$((mi + 1)).0" ;;
  *)     next="${ma}.${mi}.$((pa + 1))" ;;
esac

# no tags yet -> baseline release ships the version already in package.json
if [ -z "$last_tag" ] && [ -z "$force_bump" ]; then
  bump="n/a (first release)"
  next="$current"
fi

echo "last_tag:      ${last_tag:-<none>}"
echo "current:       $current"
echo "suggest_bump:  $bump"
echo "next_version:  $next"
echo "next_tag:      v$next"
echo "date:          $(date +%Y-%m-%d)"
echo "branch:        $(git rev-parse --abbrev-ref HEAD)"
echo "commits:       $count"
echo "head_tagged:   $(git tag --points-at HEAD | tr '\n' ' ' | sed 's/ $//' || true)"
echo "dirty:"
git status --porcelain | sed 's/^/  /'
echo "changelog_candidates:"
git ls-files | grep -iE '(^|/)changelog\.(ts|tsx|js|json|md)$' | sed 's/^/  /' || true
echo "version_fields:"
git ls-files '*package.json' | grep -v node_modules | while read -r f; do
  v=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$f" | head -1)
  [ -n "$v" ] && echo "  $f = $v"
done
echo "commits_since:"
log --pretty='  %h %s'
