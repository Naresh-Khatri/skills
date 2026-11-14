// cdp screencast -> timestamped jpegs -> constant-fps mp4 (playwright's recordVideo is ~1mbps vp8)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { CDPSession, Page } from "playwright";

export type Recording = { stop: (out: string) => Promise<{ seconds: number; width: number; height: number }> };

export async function startScreencast(page: Page, size: { width: number; height: number }): Promise<Recording> {
  const dir = mkdtempSync(join(tmpdir(), "screencast-"));
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const frames: { file: string; t: number }[] = [];
  cdp.on("Page.screencastFrame", (event) => {
    const file = join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    writeFileSync(file, Buffer.from(event.data, "base64"));
    frames.push({ file, t: event.metadata.timestamp ?? Date.now() / 1000 });
    void cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });

  return {
    async stop(out) {
      const end = Date.now() / 1000;
      await cdp.send("Page.stopScreencast").catch(() => {});
      await cdp.detach().catch(() => {});
      if (!frames.length) throw new Error("screencast captured no frames");
      // static pages emit no frames -> each frame lasts until the next one
      const lines: string[] = [];
      frames.forEach((frame, i) => {
        const next = frames[i + 1]?.t ?? end;
        lines.push(`file '${frame.file}'`, `duration ${Math.max(next - frame.t, 1 / 60).toFixed(4)}`);
      });
      lines.push(`file '${frames.at(-1)!.file}'`);
      const list = join(dir, "list.txt");
      writeFileSync(list, lines.join("\n"));
      mkdirSync(dirname(out), { recursive: true });
      execFileSync("ffmpeg", [
        "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
        "-vf", `fps=30,scale=${size.width}:${size.height}:flags=lanczos,format=yuv420p`,
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", out,
      ]);
      rmSync(dir, { recursive: true, force: true });
      return { seconds: probeSeconds(out), ...size };
    },
  };
}

export function probeSeconds(file: string) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Number(Number(out.trim()).toFixed(2));
}

export function poster(video: string, out: string) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-sseof", "-0.1", "-i", video, "-frames:v", "1", "-q:v", "2", out]);
}
