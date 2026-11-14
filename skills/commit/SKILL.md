---
name: commit
description: Review a Git worktree, clean up leftovers from superseded work in the current session, and create one or more safe, focused Conventional Commits. Use when the user asks Codex to commit changes, split work into manageable commits, prepare commit history, or invokes /commit or $commit.
---

# Commit changes

Create intentional commits without sweeping unrelated user work into them.

## Default scope

Commit only changes made by Codex during the current conversation or work session unless the user explicitly asks to include other work. A general request such as "commit the changes" or `$commit` does not authorize committing pre-existing staged, unstaged, or untracked changes.

- Establish session ownership from the initial worktree state, files and hunks edited during the conversation, and the actions recorded in the session.
- Keep pre-existing user changes uncommitted even when they are related, complete, or naturally fit the same commit.
- When a file contains both session and pre-existing changes, stage only the session-owned hunks.
- If ownership cannot be determined confidently, do not guess. Commit the confidently attributable changes and report the ambiguity, or ask for direction when it prevents a coherent commit.
- Include pre-existing work only when the user clearly expands the scope, such as asking to commit everything or naming the additional files or changes.

## Inspect

1. Read applicable repository instructions such as `AGENTS.md`.
2. Inspect the current branch, `git status --short`, recent commit subjects, staged diff, unstaged diff, and untracked-file names.
3. Treat the existing index as evidence of user intent, not as evidence that its changes belong to the current session or are in scope for the commit.
4. Preserve all pre-existing changes. Do not discard, reset, stash, rewrite, or amend them unless the user explicitly asks.

## Clean up session leftovers

A session often iterates: the user asks for one approach, then replaces or rejects it. Before committing, remove what those iterations left behind so the commit contains only the final intent. Do this automatically; the user should not have to ask for cleanup.

Scope cleanup strictly to changes made during the current session. Never clean up pre-existing changes or work from other agents, even when it looks dead or redundant; mention such candidates in the handoff instead.

Review the session's history of requests against the final diff and look for:

- Superseded approaches: code, styles, config, or data written for an earlier direction the user later replaced or rejected.
- Orphans: helpers, imports, variables, CSS rules, keyframes, props, assets, or files that the final code no longer references.
- Stale values left by a rework, such as dimensions, copy, or comments describing the earlier behavior.
- Temporary scaffolding: debug logging, scratch files, test toggles, or capture/preview scripts added inside the repository.

Delete what is clearly dead. When intent is unclear, for example an asset that might still be wanted or an earlier variant the user never explicitly rejected, ask before removing it rather than guessing. Re-run the cheap relevant check after cleanup when one was already in use for the work, and list what was removed in the handoff.

## Audit before committing

Check for:

- Secret-bearing files or credentials. Distinguish documentation such as `.env.example` from real environment files.
- Generated/vendor directories, editor files, build output, large binaries, debug logging, `debugger`, merge markers, and accidental formatting churn.
- Untracked files omitted by `git diff`.
- Changes that implement different concerns and should be separate commits.
- Package manifests without their lockfiles, migrations without matching schema changes, or generated artifacts without their source changes.

Report any suspected secret, accidental file, unclear ownership, or materially ambiguous grouping before committing. Continue directly when the scope is clear and safe.

## Plan commits

Group changes by independently understandable intent. Prefer several manageable commits when changes span concerns such as schema, server integration, UI flows, tests, and documentation. Keep required dependencies together even when they touch different directories.

Order commits so each commit leaves the repository internally coherent where practical. Do not split a migration from the schema/configuration it represents merely to reduce file count.

## Verify

Verification is optional and secondary to a clean, accurately scoped commit. Run a quick, relevant check only when it is cheap, permitted by the user and repository instructions, or needed to catch a clear risk. Never start a development server, application process, or build unless explicitly authorized. If no checks run, state that plainly without delaying the commit.

## Write a useful commit message

Every commit must have a Conventional Commit subject and a substantive body. Do not create a subject-only commit. For a genuinely tiny change, the body may be one precise sentence. For normal feature, fix, security, data, or workflow changes, include enough detail for a reviewer to understand the decision without reopening the patch.

Start with two short, unlabelled paragraphs. The first gives the reason for the change. The second states the concrete behavior and key implementation choices. Add short paragraphs only when needed for important limits, compatibility, deliberate exclusions, or verification. Do not use headings such as "Why", "What", or "Verification", and do not use labelled bullets in the body.

Do not turn the body into a file inventory, repeat the subject, or use vague claims such as "improve reliability" without saying what mechanism changed. Mention verification only when it provides useful evidence; when no checks ran, say so in the handoff rather than padding the commit body.

Use this shape as a guide, adapting it to the work:

```text
type(scope): subject

Describe the failure, risk, or requested behavior.

Describe the concrete behavior and implementation choices. Record limits, fallbacks, compatibility, and deliberate exclusions when relevant.

Add a brief paragraph about a check only when it is useful evidence.
```

Preserve the message as real multiline text. When invoking Git through a shell
or another serialized tool, write the complete message to a temporary file
with its actual line breaks and use `git commit -F <message-file>`. Do not pass
JSON-escaped text, a string containing literal `\n` sequences, or rely on
shell expansion to turn escapes into newlines. After committing, inspect
`git log -1 --format=%B` and confirm the paragraphs are separated by real
line breaks and the message contains no literal `\n` sequences.

## Stage and commit

1. Stage only explicit paths or reviewed hunks. Never use `git add .`, `git add -A`, or another blanket staging command in a dirty worktree.
2. Re-read `git diff --cached --check`, `git diff --cached --stat`, and the staged patch before every commit.
3. Commit sequentially using the detailed message standard above. Use `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, or `style`. Infer a concise scope from the primary package or area. Write an imperative, lowercase subject with no period and keep it under 72 characters.

Do not add `Co-Authored-By` lines or AI branding. Do not amend an existing commit unless explicitly asked. When the user supplies an issue number, add `Closes #<number>` only to the final commit that actually completes the issue.

4. After each commit, inspect its summary and the remaining worktree. Stop and report if Git hooks modify files or the resulting commit differs from the reviewed index.

## Hand off

Report the created commit hashes and subjects, checks run, session leftovers removed, possible dead code outside session scope, and any intentionally uncommitted changes. Do not push unless the user explicitly requests it.
