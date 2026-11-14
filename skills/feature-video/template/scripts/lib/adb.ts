import { execFileSync, spawn } from "node:child_process";
import { adbPath } from "./tools.ts";

export const ADB = adbPath();

export const adb = (...args: string[]) => execFileSync(ADB, args, { encoding: "utf8", maxBuffer: 32 << 20 });
export const shell = (cmd: string) => adb("shell", cmd);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function device() {
  const line = adb("devices").split("\n").find((l) => /\tdevice$/.test(l));
  if (!line) throw new Error("no adb device; boot the emulator first");
  return line.split("\t")[0]!;
}

type Node = { text: string; desc: string; bounds: [number, number, number, number] };

export function dump(): Node[] {
  shell("uiautomator dump /sdcard/fv-ui.xml >/dev/null");
  const xml = shell("cat /sdcard/fv-ui.xml");
  const nodes: Node[] = [];
  for (const m of xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
    nodes.push({ text: decode(m[1]!), desc: decode(m[2]!), bounds: [+m[3]!, +m[4]!, +m[5]!, +m[6]!] });
  }
  return nodes;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function find(match: RegExp, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = dump().find((n) => match.test(n.text) || match.test(n.desc));
    if (hit) return hit;
    await sleep(400);
  }
  throw new Error(`ui text ${match} not found`);
}

export const exists = async (match: RegExp, timeout = 1500) => find(match, timeout).then(() => true, () => false);

export async function tap(match: RegExp, pause = 700) {
  const [x1, y1, x2, y2] = (await find(match)).bounds;
  shell(`input tap ${Math.round((x1 + x2) / 2)} ${Math.round((y1 + y2) / 2)}`);
  await sleep(pause);
}

export async function type(text: string) {
  shell(`input text '${text.replace(/'/g, "")}'`);
  await sleep(400);
}

export async function swipeUp(pause = 700) {
  const [w, h] = size();
  shell(`input swipe ${w / 2} ${h * 0.75} ${w / 2} ${h * 0.35} 350`);
  await sleep(pause);
}

export function size(): [number, number] {
  const m = shell("wm size").match(/(\d+)x(\d+)/);
  return m ? [+m[1]!, +m[2]!] : [1080, 2400];
}

// emulator console takes lon before lat
export const geo = (lat: number, lon: number) => adb("emu", "geo", "fix", String(lon), String(lat));

export async function screenrecord(remote = "/sdcard/fv-clip.mp4") {
  // demo mode -> clean status bar (fixed clock, full battery, no notifications)
  for (const cmd of [
    "settings put global sysui_demo_allowed 1",
    "am broadcast -a com.android.systemui.demo -e command enter",
    "am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1405",
    "am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false",
    "am broadcast -a com.android.systemui.demo -e command notifications -e visible false",
    "am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4",
  ]) shell(cmd);
  const proc = spawn(ADB, ["shell", "screenrecord", "--bit-rate", "16000000", remote], { stdio: "ignore" });
  await sleep(800);
  return {
    async stop(local: string) {
      shell("pkill -INT screenrecord");
      await new Promise((r) => proc.once("exit", r));
      await sleep(600);
      adb("pull", remote, local);
      shell(`rm -f ${remote}`);
      shell("am broadcast -a com.android.systemui.demo -e command exit");
    },
  };
}

// deep link / expo dev-client url / https link handled by the app
export async function openUrl(url: string, pause = 1500) {
  shell(`am start -a android.intent.action.VIEW -d '${url}'`);
  await sleep(pause);
}

export async function back(pause = 600) {
  shell("input keyevent KEYCODE_BACK");
  await sleep(pause);
}

export async function swipe(x1: number, y1: number, x2: number, y2: number, ms = 300, pause = 700) {
  shell(`input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
  await sleep(pause);
}
