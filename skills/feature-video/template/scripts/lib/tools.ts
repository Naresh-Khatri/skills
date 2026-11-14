// locate host tools across linux/mac; env vars win
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const first = (paths: (string | undefined)[]) => paths.find((p): p is string => !!p && existsSync(p));

const onPath = (bin: string) => {
  try {
    return execFileSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
};

// undefined -> playwright/remotion fall back to their own downloaded browser
export function chromiumPath() {
  return first([
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ]);
}

export function adbPath() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  return (
    first([
      process.env.ADB,
      sdk && join(sdk, "platform-tools/adb"),
      join(homedir(), "Android/Sdk/platform-tools/adb"),
      join(homedir(), "Library/Android/sdk/platform-tools/adb"),
      join(homedir(), "android-sdk/platform-tools/adb"),
    ]) ??
    onPath("adb") ??
    "adb"
  );
}
