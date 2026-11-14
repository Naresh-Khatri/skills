---
name: feature-video
description: Make a short narrated feature-release video (Remotion, ~20–60s) of a shipped feature from real UI recordings (Playwright web, Android emulator) plus kit scenes (title, statement, code/API, outro), with offline Kokoro TTS. Sets up an untracked `feature-video/` scaffold in the repo on first use. Use when the user asks for a feature video, release video, demo video, or changelog video.
---

# feature-video

Audience is a tech-savvy team that cares about **what changed**. No marketing fluff, no tour of unrelated UI.

## 0. Scaffold (every run)

```bash
~/.claude/skills/feature-video/scripts/init.sh            # creates if missing, else no-op + version check
~/.claude/skills/feature-video/scripts/init.sh --update   # skill kit newer than .kit-version -> refresh kit files
```

- Lives in `<repo>/feature-video/`, renders in `feature-video/out/`. init adds `/feature-video/` to
  `.git/info/exclude` (local, never a tracked `.gitignore`). Never commit or `git add` anything in it.
- Kit-owned (overwritten by `--update`): `src/kit`, `scripts`, `src/Root.tsx`, `src/index.ts`, configs, `README.md`.
  Project-owned: `src/project.ts`, `NOTES.md`, `src/features/*`, `public/`. Improve the kit in
  `~/.claude/skills/feature-video/template/` (bump `VERSION`), not in a project copy.
- **First run in a project** (fresh scaffold): fill `src/project.ts` from the repo (product name, logo → copy an
  svg/png into `public/brand/`, accent hex from the tailwind/theme tokens, locale + timezone the product uses).
  Then fill `NOTES.md` by reading the repo: how to start db/api/web/mobile, demo logins, seeded data. Ask the
  user only for what the repo can't tell you. NOTES.md is what makes later runs cheap; keep it current.
- Needs on the machine: pnpm, ffmpeg. Chrome/Chromium and adb are auto-located (`CHROMIUM_PATH`, `ADB`,
  `ANDROID_HOME` override). `psql` only if a prep step uses `sql()`. TTS models auto-download to
  `~/.local/share/feature-video/tts` (Kokoro ~390 MB once, CPU only). Works in any repo; the scaffold is its own pnpm root, so monorepo or not
  doesn't matter.

## Stack recipes

Detect the stack on first run (`next.config.*`, `app.json`/`app.config.*` with `expo`, `react-native` dep,
`pnpm-workspace.yaml`/`turbo.json`) and write what applies into `NOTES.md`.

**Next.js (web)**
- Record against `next dev`; first hit per route compiles → visit every route in the flow once before
  `record(...)`. The dev indicator/error toasts (`nextjs-portal`) are hidden automatically; add chat widgets,
  cookie banners etc. to `project.hide`.
- Auth: log in through the real form in the flow (outside `record`), or reuse a session by setting the cookie
  on the context. Middleware/`proxy.ts` redirects mean waiting on `waitForURL`, not the click.
- Data via server actions/tRPC/route handlers: prep with `sql()` (Postgres) or `run("pnpm db:seed")` /
  `run("npx prisma db execute …")`; prefer calling the app's own API with `fetch` when it does side effects
  (emails, queues) the video should show.
- Theme: `project.colorScheme` sets `prefers-color-scheme`; apps with a stored theme need it set in
  localStorage/cookie in the flow before recording.

**React Native / Expo (Android emulator)**
- Needs a booted emulator + Metro. Expo dev client: open
  `exp+<scheme>://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<port>` via `openUrl`, with
  `adb reverse tcp:<port> tcp:<port>` (+ API port). Expo Go: `openUrl("exp://10.0.2.2:<port>")`. Bare RN:
  `npx react-native run-android` once, then the app reloads from Metro.
- Point the app at the host API with the emulator alias `10.0.2.2` (env like `EXPO_PUBLIC_API_URL`).
- Dismiss LogBox/redbox warnings before recording; if they keep coming, record a release-like build or fix them.
- Helpers: `find/tap/exists` (regex on text or content-desc), `type`, `swipeUp`, `swipe`, `back`, `openUrl`,
  `geo(lat, lon)` for location features. Taps go through uiautomator, so give key buttons visible text or
  `accessibilityLabel`.
- iOS simulator isn't wired up (no recorder); Android footage is fine for a feature video.

**Anything else** (Vite/Remix/Astro, plain APIs): web recorder works on any URL; API-only features → Tier S
with `CodeScene` showing request/response.

## 1. Pick the tier (say which, before working)

| Tier | When | Recordings | Rough length |
|---|---|---|---|
| S | API field, setting, backend behaviour | none — Title/Statement/Code/Outro scenes | 15–25s |
| M | one surface changes | 1–2 web clips | 25–40s |
| L | flagship, multiple apps | web + mobile + API | 45–60s |

Cost scales with steps and context, not video length. Prefer the lowest tier that shows the feature.
Fresh session per video; read `NOTES.md` instead of rediscovering the repo.

## 2. Build

1. Read the feature: diff/plan/PR, then only the UI files the video will show.
2. `pnpm new <id> "Title"` → edit `src/features/<id>/script.ts`: 6–10 scenes, one idea each, 1–2 short
   sentences. Concrete numbers > adjectives. Use `{ text, say }` for words TTS mangles (brand names).
3. `pnpm voice <id>` (~10s per 30s of narration). Re-run after any narration edit.
   Voice = `script.voice`: Kokoro `af_heart` default (US female; also `af_bella`, `bf_emma`, `am_michael`,
   `am_puck`, full list `KOKORO_VOICES` in `src/kit/types.ts`). Piper ids (`en_US-lessac-medium`) still work
   but sound robotic; use only if asked. `TTS_SPEED` overrides 1.05.
4. Demo data: `prep.ts` steps (`pnpm prep <id> <step>`, helpers `sql`, `run`, plain `fetch`) that make on-camera data look real and are
   re-runnable (setup / release / undo). Use realistic names/addresses for the product's market.
5. Record: `record-web.ts` / `record-android.ts` flows (see `examples/scheduled-deliveries/`).
6. `Film.tsx`: map scene ids → `TitleScene`, `StatementScene`, `BrowserScene`, `PhoneScene`, `CodeScene`,
   `OutroScene` (`src/kit/scenes.tsx`), or a small custom scene (e.g. a timeline). Export
   `film = defineFilm({...})`; registration is automatic. API scenes may be made up but must match the real
   contract (field names, units, statuses).
7. `pnpm typecheck`, then check: ffmpeg contact sheet of each clip
   (`ffmpeg -i clip.mp4 -vf "fps=1/2,scale=200:-1,tile=12x1" -frames:v 1 /tmp/s.png`) and 3–4 `remotion still`s.
   Trim static heads/tails with `clip.from/to`.
8. `pnpm render <id>` → `feature-video/out/<id>.mp4`; `ffprobe` duration; one contact sheet of the final.
9. Append the runbook to `NOTES.md` › Videos.

## Recording rules

- Dev servers/emulator: follow the user's standing rules. If they keep servers hands-off, list exactly what
  must be running (from NOTES.md) and ask them to start it.
- Log in and fill boring fields **before** `record(...)`; only the feature's steps are on camera.
- Use `act.click/fill/point/scrollTo` (smooth fake cursor), never raw `page.click` inside a recording.
- Wait on visible text/buttons, not sleeps. Visit each route once before recording (dev compile spinners).
- On failure the recorder saves `public/<id>/failed-<clip>.png` — look at it before guessing.
- Android: uiautomator can't dump while maps/animations run ("could not get idle state") → fixed pauses there.
  Swipe sheets to reveal off-screen buttons. Demo-mode status bar is automatic.
- Product bugs found while recording are real findings: fix them in the product (with a test) and tell the user.

## Gotchas seen

- Dev DB behind on migrations → feature inserts fail. Check migration status first.
- `psql -At` prints `UPDATE n` without `-q` (prep `sql()` already passes `-q`).
- Native `datetime-local` `step` counts from `min` — unaligned `min` rejects round times.
- Leftover state from earlier takes (accepted jobs, busy users) shows on camera — add an undo prep step.

## Report

Output path + duration, tier, what's on screen, any rough spots left in, product fixes made, dev-data
changes, and what's still running.
