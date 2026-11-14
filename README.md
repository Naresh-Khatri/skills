# skills

My agent skills for Claude Code, Codex and other agents that read `SKILL.md`. The main one is **feature-video**.

```sh
npx skills add Naresh-Khatri/skills --skill feature-video
```

## feature-video

Ask your agent for a feature video and it makes a narrated 20–60 second MP4 of a feature you just shipped. It records the real UI, writes the script, generates the voice offline and renders the result with [Remotion](https://www.remotion.dev).

The videos are for a technical team that wants to know what changed. Each scene covers one idea in one or two sentences. Numbers beat adjectives, and unrelated UI stays out of frame.

### What it does

- **Records the real product.** Playwright drives web apps and adb drives an Android emulator. A smooth fake cursor does the clicking. Logins and form filling happen before recording starts, so only the feature's steps end up on camera.
- **Narrates offline.** It uses [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) through sherpa-onnx, running on CPU, with no API key. The model (~390 MB) downloads once. You can pick the voice and fix how words like brand names are spoken.
- **Stages demo data.** Re-runnable `prep.ts` steps (`sql`, `run`, `fetch`) seed realistic data and undo it between takes.
- **Fits the video to the feature.** The agent picks a tier before it starts:

  | Tier | For | Footage | Length |
  | --- | --- | --- | --- |
  | S | API field, setting, backend behaviour | none: title, statement, code and outro scenes | 15–25s |
  | M | one surface changes | 1–2 web clips | 25–40s |
  | L | flagship feature across apps | web + mobile + API | 45–60s |

- **Checks its own work.** It runs a typecheck, makes ffmpeg contact sheets of each clip and renders Remotion stills before the final render. If it hits a product bug while recording, it fixes the bug with a test and tells you.
- **Learns the project.** On first run it reads the repo and fills in `NOTES.md` (how to start each app, demo logins, seeded data) and `src/project.ts` (name, logo, accent colour, locale). Later videos read those files instead of exploring the repo again.

### Stacks

- **Next.js**: records against `next dev`, warms routes before recording, and hides dev overlays.
- **Expo / React Native**: records on an Android emulator using an Expo dev client, Expo Go or a bare RN app. iOS simulator recording isn't supported.
- **Anything with a URL**: Vite, Remix, Astro and others work with the web recorder. API-only features become tier S videos built from code scenes.

### How it lives in your repo

The first run creates `<repo>/feature-video/`. It's its own pnpm project, so monorepos are fine. The folder goes in `.git/info/exclude`, so it never appears in your git status.

```
src/project.ts         name, logo, accent, locale      yours
src/features/<id>/     script, film, recordings, prep  yours
src/kit/, scripts/     scenes, timing, recorders       kit (refreshed by init.sh --update)
out/<id>.mp4           renders
```

```sh
pnpm new <id> "Title"            # scaffold a video
pnpm voice <id>                  # generate narration
pnpm prep <id> <step>            # stage demo data
pnpm record:web <id>             # 1920x1200 Playwright recording (HEADED=1 to watch)
pnpm record:android <id>         # record on a booted emulator
pnpm render <id>                 # -> out/<id>.mp4
```

Scene length is the longest of the voice line, the clip and `minSeconds`. Clips speed up to 3x to fit the voice.

### Requirements

pnpm and ffmpeg. The skill finds Chrome/Chromium and adb on its own; override with `CHROMIUM_PATH`, `ADB` or `ANDROID_HOME`. `psql` is needed only if a prep step uses `sql()`. You start the dev servers and emulator yourself. The agent lists what needs to be running.

See [`examples/scheduled-deliveries`](skills/feature-video/examples/scheduled-deliveries) for a full tier L video covering web, Android and demo data.

## Other skills

| Skill | What it does |
| --- | --- |
| [commit](skills/commit) | Cleans up the worktree and makes focused Conventional Commits |
| [release](skills/release) | Drafts changelog entries since the last tag, bumps the version and tags |
| [concise-comments](skills/concise-comments) | Trims code comments in files changed this session |

```sh
npx skills add Naresh-Khatri/skills                  # choose from the list
```

Or copy any folder into `~/.claude/skills/` or `~/.codex/skills/`.
