---
name: concise-comments
description: Trim and tighten code comments — delete redundant/obvious/commented-out ones, condense verbose ones, keep only comments that carry information the code can't. Acts ONLY on files changed in the current session by default (the files edited this conversation / the working-tree diff). Use when asked to clean up, concise, trim, tidy, or reduce comments. Pass a path/glob or "all"/"staged" to widen the scope.
---

# Concise Comments

Prune comments down to the ones that earn their place. Edit **only comments** — never change code, logic, formatting of code, or behavior.

## Scope (default: current session only)

By default, act **only on files touched in the current session** — do not sweep the whole repo. Resolve scope in this order:

1. **Files edited this conversation.** If you edited/created files earlier in this session, that is the scope. This is the primary meaning of "current session."
2. **Fallback — working-tree diff.** If you can't enumerate session edits (e.g. fresh session, context was summarized), use the working tree:
   ```bash
   git diff --name-only HEAD          # tracked, modified
   git ls-files --others --exclude-standard   # new, untracked
   ```
   Restrict to source files you'd reasonably comment (skip lockfiles, generated output, `*.md`, binaries).
3. **Only consider changed regions when possible.** For a file with a large pre-existing body, prefer trimming comments inside the hunks that changed this session (`git diff HEAD -- <file>`) rather than rewriting comments across untouched code — unless the user widened scope.

**Argument overrides the default scope:**
- a path or glob (`src/components/machine-coding`, `**/*.ts`) → act on those files
- `staged` → act on `git diff --cached --name-only`
- `all` → the whole tracked tree (warn first; this can be a large diff)

If the resolved scope is empty, say so and stop — don't go hunting for comments to cut.

## What to remove

- **Redundant restatements** — the comment just narrates the next line. `// increment i` above `i++`; `// loop over users` above `for (const u of users)`.
- **Commented-out code** — dead code in comments. Delete it; git has the history.
- **Obvious type/signature echoes** — `/** @param id the id */`, `// returns a string`.
- **Noise & scaffolding** — `// TODO` with no actionable content, `// ---- section ----` banners that add nothing, leftover `// console.log`, AI-ish narration ("Now we map over the array to...").
- **Stale comments** that no longer match the code (verify against the code before deleting — if it documents real intent that drifted, flag it instead of silently dropping).

## What to keep (and tighten, not delete)

- **The "why"** — rationale, trade-offs, the reason a non-obvious approach was chosen.
- **Gotchas & warnings** — ordering constraints, footguns, "must run before X", browser/race caveats, security notes.
- **Non-obvious intent** — why this branch exists, what an empty `catch` is intentionally swallowing.
- **Public API / exported-symbol docs** that callers rely on.
- **Legal/license headers**, and lint/ts directives (`eslint-disable`, `@ts-expect-error`) — never touch these.
- **Algorithm/format explanations** that aren't recoverable from reading the code.

For kept comments: condense wordy multi-line blocks into the tightest phrasing that preserves the information. Drop filler, keep substance.

## Style — terse "caveman" voice

Write every kept/condensed comment in the tightest form that still carries the info:

- **Fragments, not sentences.** Drop articles and obvious subjects. `// dead cookie -> refetch`, not `// If the cookie is dead we refetch it`.
- **Lowercase, loose punctuation.** Grammar need not be 100% correct. No trailing period on a one-liner.
- **Shorthand over prose.** Use `->`, `=`, `vs`, `!=`. e.g. `// 302 = dead cookie; don't follow into login HTML`.
- **One line where it fits.** Prefer a trailing `// ...` on the line it explains over a block above it.
- **Only the non-obvious why or a gotcha.** If a comment would restate the code, delete it (see "What to remove") — don't just shorten it. Skip obvious comments entirely.

Target voice — this is what output should look like:
```ts
// no app-id header -> cookieless call redirects to login
// plays = closest public reach; null for photos
// carousel hides cover on first child
// not a shortcode
// 302 = dead cookie; don't follow into login HTML
```

- Prefer fewer, denser comments over many thin ones. When in doubt whether a comment carries irrecoverable info, **keep it** (tightened) — deletion is the riskier direction.
- Don't reflow or reformat code, don't reorder anything, don't add new comments beyond preserving existing information.

## Output

After editing, give a short summary: which files were touched and a rough count of comments removed vs. condensed. If you left any borderline/stale comment in place because it needed a human judgment call, note it.
