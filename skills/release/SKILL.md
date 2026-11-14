---
name: release
description: Cut a semver release — read the commits since the last git tag, draft user-facing changelog entries into the project's changelog file, bump the version, commit, and tag. Takes an optional scope argument (highlights | features | full) deciding what earns an entry; by default the notes carry new features and only the enhancements a user would notice, and no bug fixes. Use whenever the user wants to cut/ship/tag a release, bump the version, write release notes or a changelog entry, or asks what's shipped since the last tag. Also use when setting up changelog infrastructure in a project for the first time.
---

# Release

Turn commits since the last tag into a release: a version, a handful of changelog entries a real user would understand, a commit, and a tag. Push stays manual — the user reviews before anything becomes public.

## Scope — what earns an entry

An optional argument decides what goes in the notes. It never changes the version bump: a release that's all fixes is still a patch release even when none of them appear.

| scope | entries |
| --- | --- |
| `highlights` *(default)* | new capabilities, plus the few enhancements a user would notice on their own. **No fixes.** |
| `features` | new capabilities only — no enhancements, no fixes. |
| `full` | everything user-visible, fixes included. |

The default is `highlights` because **release notes are news, not a repair log**. A user reads them to find out what they can do now that they couldn't before; a list of things that used to be broken mostly tells them the product was broken, about bugs they never knew they had.

At `highlights`:

- **No fix entries.** A fix earns a line only when it lifts a limit people were working around and would recognise as new ground — and then it's written as the capability, not the repair.
- **Enhancements are rationed**: roughly one or two, and only for something noticed unprompted — speed you can feel, a workflow that lost steps, a cap that went up. Polish, tuning and copy changes don't make it.
- **New capabilities carry the release.** Lead with them.
- **A breaking change is exempt** — it goes in at every scope, because the user has to act on it.

Anything else in the argument (`minor`, `v2.1.0`) is a bump or a version, not a scope. If an argument is unrecognisable, say how you read it and carry on with `highlights`.

If the scope empties the release, don't pad it with a fix dressed as a feature or a line that says nothing. Write one honest entry ("Fixes and refinements throughout"), tell the user what you left out, and offer `full`.

## 1. Gather

```bash
~/.claude/skills/release/scripts/release-info.sh [major|minor|patch]
```

Prints the last tag, the current version, a suggested bump (major if any `type!:` or `BREAKING CHANGE`, minor if any `feat`, else patch), the next version, today's date, branch, dirty files, changelog file candidates, every `package.json` version field, and the commit subjects in range. Pass an explicit bump to override the suggestion — useful when the conventional-commit types undersell what actually shipped.

Read the commit subjects yourself. The bump heuristic only reads prefixes; if a `fix:` quietly changed a default or a `refactor:` moved a route, that's a minor or major and you should say so.

## 2. Check the state before drafting

Stop and tell the user instead of proceeding when:

- **`commits: 0`** — nothing to release.
- **`head_tagged` is non-empty** — this commit is already released. Bumping again produces a tag with no content.
- **the next tag already exists** (`git rev-parse -q --verify "refs/tags/vX.Y.Z"`) — never move or delete an existing tag; someone may have pulled it.

Warn but continue when the branch isn't `main`/`master`, or when `dirty` shows unrelated modified files. Unrelated dirty files are safe here because step 5 commits by explicit path, but the user should know they're carrying uncommitted work.

## 3. Find (or create) the changelog file

Use `changelog_candidates` from the script. Prefer a `.ts`/`.json` module the app imports over a root `CHANGELOG.md`, since the point is rendering entries in the product. If several plausible files exist, ask which one. If the file already exists, **match its existing shape exactly** — read it before writing.

If there is none, this is first-time setup for the changelog — which is independent of whether the repo has tags. A repo that already shipped `v1.2.3` without a changelog still gets a normal release covering the commits since that tag; only a repo with *no tags at all* gets the baseline treatment in the last section.

Scaffold the module wherever the app's source actually lives — alongside the app entry point, inside the app's source root (e.g. `src/changelog.ts`, or `apps/<app>/src/changelog.ts` in a monorepo). Follow the repo's existing structure rather than creating a source directory that isn't there; if the layout gives no signal, ask where it should go rather than guessing.

```ts
export type Release = {
  version: string;
  date: string; // YYYY-MM-DD
  entries: string[];
};

// newest first
export const releases: Release[] = [];

export const APP_VERSION = releases[0]?.version ?? "0.0.0";
```

Newest-first ordering is what makes `releases[0]` the current version, so the app never needs a second source of truth for "what version am I running". Mention to the user that rendering it — a changelog page and a what's-new dialog keyed on a stored last-seen version — is separate app work you can do next; the skill's job ends at the tag.

## 4. Draft the entries, then confirm

Entries are read by users of the product, not by people reading git history. Commit subjects are the raw material, not the output.

Sort what shipped into what a user gained, what they'd notice getting better, and what merely got repaired — then keep only what the scope admits, and draft from what's left. Judge by the effect you found in the diff, never by the commit type: a `fix:` is often an unlabelled feature, and a `feat:` is sometimes plumbing.

- Write what changed **for the person using the app**, not what changed in the codebase.
- Collapse several commits into one entry when they add up to a single shipped thing. Ten commits usually means three or four entries.
- Drop anything with no user-visible effect: refactors, formatting, dependency bumps, tooling, docs, CI. Keep a `perf` commit only if it's noticeable in use.
- Sentence case, no trailing period, no scopes, hashes, issue numbers, or `feat:` prefixes.
- Aim for 2–5 entries at `highlights`, 3–8 at `full`. If a release genuinely has more, group them under a short title per group rather than listing twenty flat lines.
- Only claim what the commit and its diff actually show. When a commit announces something significant but doesn't say what changed (a bare `BREAKING CHANGE:` footer, a vague subject), read the diff; if that's still not enough, ask the user rather than inventing plausible specifics. A wrong changelog entry is worse than a vague one — users act on these.

**Examples:**

Input: `feat(board): drag-and-drop for tasks and columns` + `fix(board): drop tasks where the cursor lands` + `perf(board): optimistically update task move`
Output: `Drag tasks and columns to reorder them — moves apply instantly`

Input: `feat(tasks): per-project ticket numbering + #-mentions` + `feat(tasks): mention hover cards + ticket badge fix`
Output: `Tasks now have per-project ticket numbers you can reference with #`

Input: `refactor(auth): make social login and SMTP optional` + `chore(deps): bump drizzle-kit`
Output: *(dropped — no user-visible change)*

Input: `fix(board): stop long titles overflowing the card`
Output: *(dropped at `highlights` — a repair, not news; kept at `full` as "Long task titles no longer overflow their card")*

Then show the user the version, the date, the scope you used, the drafted entries, and a one-line-each list of what the scope dropped (enough to pull one back in), and wait for approval before writing anything. This is the review gate they're relying on; the alternative is a bad entry living in a tag forever. Skip the gate only if they already said to just do it.

## 5. Apply

After approval, in order:

1. **Prepend** the new release to the changelog file (newest first). Don't reformat existing entries. If the newest entry is *already* the version being released — someone drafted the notes ahead of the tag — refresh that entry in place (fix the date, fold in anything missed) rather than adding a duplicate.
2. **Bump `version`** in the `package.json` files the script listed, skipping ones that don't track the app's version (an unrelated internal package sitting at `0.0.0`, for example). If the repo doesn't use package.json versions at all, skip this entirely — the changelog module is the source of truth.
3. **Commit only those paths**, so unrelated working-tree changes stay out of the release commit. A pathspec commit ignores untracked files, so `git add` a newly scaffolded changelog file first or it silently won't be in the release:
   ```bash
   git add <changelog-file>   # only if it's new
   git commit -m "chore(release): vX.Y.Z" -- <changelog-file> <package.json paths...>
   ```
4. **Tag**, with the entries as the message so `gh release create --notes-from-tag` works later:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z" -m "- entry one
   - entry two"
   ```
5. **Stop.** Don't push. Report what happened and hand the user the command:
   ```
   git push && git push origin vX.Y.Z
   ```

## First release in a repo

With no tags, the script reports `n/a (first release)` and proposes the version already in `package.json` rather than bumping. Don't try to reconstruct history from every commit ever made — that produces a bloated, useless first entry. Write one short entry describing what the product does today (or a handful covering its main capabilities), tag it as the baseline, and let subsequent releases be the real changelog.
