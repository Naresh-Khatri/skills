// usage: node scripts/record-android.ts <feature-id> [clip-name...]
// drives the running emulator via adb; flows live in src/features/<id>/record-android.ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import * as droid from "./lib/adb.ts";
import { featureDir, publicDir, saveClip } from "./lib/feature.ts";
import { poster, probeSeconds } from "./lib/screencast.ts";

export type AndroidContext = typeof droid & {
  record: (name: string, run: () => Promise<void>) => Promise<void>;
  pause: (ms: number) => Promise<void>;
};
export type AndroidFlow = { name: string; clips: string[]; run: (ctx: AndroidContext) => Promise<void> };

const [id, ...only] = process.argv.slice(2);
if (!id) throw new Error("usage: node scripts/record-android.ts <feature-id> [clip...]");
const flowFile = join(featureDir(id), "record-android.ts");
if (!existsSync(flowFile)) throw new Error(`missing ${flowFile}`);
const { flows } = (await import(flowFile)) as { flows: AndroidFlow[] };

console.log(`device ${droid.device()}`);

const ctx: AndroidContext = {
  ...droid,
  pause: (ms) => new Promise((r) => setTimeout(r, ms)),
  async record(name, run) {
    if (only.length && !only.includes(name)) return;
    console.log(`● ${name}`);
    const dir = join(publicDir(id), "clips");
    mkdirSync(dir, { recursive: true });
    const raw = join(dir, `${name}.raw.mp4`);
    const out = join(dir, `${name}.mp4`);
    const rec = await droid.screenrecord();
    await run();
    await ctx.pause(900);
    await rec.stop(raw);
    // screenrecord = variable fps -> normalise for remotion seeking
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", "-an", out]);
    rmSync(raw);
    const [width, height] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", out], { encoding: "utf8" })
      .trim()
      .split(",")
      .map(Number);
    const still = out.replace(/\.mp4$/, ".jpg");
    poster(out, still);
    const info = { file: `${id}/clips/${name}.mp4`, poster: `${id}/clips/${name}.jpg`, seconds: probeSeconds(out), width: width!, height: height! };
    saveClip(id, name, info);
    console.log(`  ✓ ${info.seconds}s ${width}x${height}`);
  },
};

for (const flow of flows) {
  if (only.length && !flow.clips.some((clip) => only.includes(clip))) continue;
  console.log(`flow ${flow.name}`);
  await flow.run(ctx);
}
