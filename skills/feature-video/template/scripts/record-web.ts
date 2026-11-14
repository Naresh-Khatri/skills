// usage: node scripts/record-web.ts <feature-id> [clip-name...]
// runs flows from src/features/<id>/record-web.ts against locally running web apps
import { existsSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { project } from "../src/project.ts";
import { chromiumPath } from "./lib/tools.ts";
import { actor, type Actor } from "./lib/cursor.ts";
import { featureDir, publicDir, saveClip } from "./lib/feature.ts";
import { poster, startScreencast } from "./lib/screencast.ts";

export const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 4 / 3; // 1440x900 css -> 1920x1200 frames
const SIZE = { width: VIEWPORT.width * SCALE, height: VIEWPORT.height * SCALE };

export type WebContext = {
  // fresh logged-out context per app; flows log in before recording
  open: (key: string) => Promise<{ page: Page; act: Actor; context: BrowserContext }>;
  record: (name: string, page: Page, run: () => Promise<void>) => Promise<void>;
  env: (name: string, fallback: string) => string;
};
export type WebFlow = { name: string; clips: string[]; run: (ctx: WebContext) => Promise<void> };

const [id, ...only] = process.argv.slice(2);
if (!id) throw new Error("usage: node scripts/record-web.ts <feature-id> [clip...]");
const flowFile = join(featureDir(id), "record-web.ts");
if (!existsSync(flowFile)) throw new Error(`missing ${flowFile}`);
const { flows } = (await import(flowFile)) as { flows: WebFlow[] };

const browser: Browser = await chromium.launch({
  // system chrome avoids a playwright browser download; cdp screencast works on either
  executablePath: chromiumPath(),
  headless: process.env.HEADED !== "1",
});
const contexts = new Map<string, { page: Page; act: Actor; context: BrowserContext }>();

const ctx: WebContext = {
  async open(key) {
    const existing = contexts.get(key);
    if (existing) return existing;
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      colorScheme: project.colorScheme,
      locale: project.locale,
      timezoneId: project.timezone,
      reducedMotion: "no-preference",
    });
    await context.addInitScript(hideDevChrome, (project as { hide?: string[] }).hide ?? []);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const act = actor(page);
    await act.install();
    const entry = { page, act, context };
    contexts.set(key, entry);
    return entry;
  },
  async record(name, page, run) {
    if (only.length && !only.includes(name)) return;
    console.log(`● ${name}`);
    const out = join(publicDir(id), "clips", `${name}.mp4`);
    const rec = await startScreencast(page, SIZE);
    await page.waitForTimeout(400);
    try {
      await run();
    } catch (err) {
      const shot = join(publicDir(id), `failed-${name}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      console.error(`  ✗ ${name}: screenshot ${shot}`);
      throw err;
    }
    await page.waitForTimeout(900);
    const info = await rec.stop(out);
    const still = out.replace(/\.mp4$/, ".jpg");
    poster(out, still);
    saveClip(id, name, { file: `${id}/clips/${name}.mp4`, poster: `${id}/clips/${name}.jpg`, ...info });
    console.log(`  ✓ ${info.seconds}s ${info.width}x${info.height}`);
  },
  env: (name, fallback) => process.env[name] ?? fallback,
};

try {
  for (const flow of flows) {
    if (only.length && !flow.clips.some((clip) => only.includes(clip))) continue;
    console.log(`flow ${flow.name}`);
    await flow.run(ctx);
  }
} finally {
  await browser.close();
}

// framework dev overlays (next.js indicator/toasts, vite error overlay) never belong on camera
function hideDevChrome(extra: string[]) {
  const css = ["nextjs-portal", "vite-error-overlay", "#__next-build-watcher", ...extra].join(",") + "{display:none!important}";
  const add = () => {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  };
  if (document.documentElement) add();
  else document.addEventListener("DOMContentLoaded", add);
}
