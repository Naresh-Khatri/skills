# feature-video

Short narrated feature-release videos (Remotion) from real UI recordings plus kit
scenes. Managed by the `feature-video` skill and excluded from git
(`.git/info/exclude`). Project setup (servers, logins, demo data): `NOTES.md`.

```
src/project.ts           name, logo, accent, locale/timezone          (project-owned)
src/features/<id>/       script.ts, Film.tsx, record-*.ts, prep.ts    (project-owned)
src/kit/ scripts/        scenes, timing, recorders                    (kit; `init.sh --update` overwrites)
public/<id>/             generated voice + clips
out/<id>.mp4             renders
```

```bash
pnpm new <id> "Title"              # scaffold a feature
pnpm voice <id>                    # kokoro (or piper) tts -> voice.json; TTS_SPEED overrides 1.05
pnpm prep <id> <step>              # stage demo data (optional)
pnpm record:web <id> [clip…]       # playwright + system chromium, 1920x1200 (HEADED=1 to watch)
pnpm record:android <id> [clip…]   # booted emulator + adb
pnpm typecheck
npx remotion still src/index.ts <id> /tmp/f.png --frame=N   # add --browser-executable=<chrome> if remotion wants to download one
pnpm render <id>                   # -> out/<id>.mp4
```

Scene length = max(voice, clip at playback speed, `minSeconds`). Clips speed up to
3x to fit the voice; trim dead time with `clip.from/to` (seconds).
