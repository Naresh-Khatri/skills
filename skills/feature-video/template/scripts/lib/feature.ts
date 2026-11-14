import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ClipInfo, ClipManifest, FilmScript } from "../../src/kit/types.ts";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const repoRoot = join(root, "..");

export const featureDir = (id: string) => join(root, "src/features", id);
export const publicDir = (id: string) => join(root, "public", id);

export async function loadScript(id: string): Promise<FilmScript> {
  const mod = await import(join(featureDir(id), "script.ts"));
  return mod.script;
}

export function saveClip(id: string, name: string, info: ClipInfo) {
  const path = join(featureDir(id), "clips.json");
  const clips: ClipManifest = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  clips[name] = info;
  writeFileSync(path, JSON.stringify(clips, null, 2) + "\n");
}
