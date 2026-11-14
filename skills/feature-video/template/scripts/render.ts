// usage: node scripts/render.ts <feature-id>  ->  out/<id>.mp4
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { writeFilms } from "./films.ts";
import { root } from "./lib/feature.ts";
import { chromiumPath } from "./lib/tools.ts";

const [id] = process.argv.slice(2);
if (!id) throw new Error("usage: node scripts/render.ts <feature-id>");
writeFilms();
const outDir = join(root, "out");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${id}.mp4`);

execFileSync(
  "npx",
  [
    "remotion", "render", "src/index.ts", id, out,
    "--codec=h264", "--crf=18", "--log=error",
    ...(chromiumPath() ? [`--browser-executable=${chromiumPath()}`] : []),
  ],
  { cwd: root, stdio: "inherit" },
);
console.log(`✓ ${out}`);
