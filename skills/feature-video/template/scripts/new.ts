// usage: node scripts/new.ts <feature-id> "<Title>"
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { writeFilms } from "./films.ts";
import { featureDir } from "./lib/feature.ts";

const [id, title = "New feature"] = process.argv.slice(2);
if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error('usage: node scripts/new.ts <kebab-id> "<Title>"');
const dir = featureDir(id);
if (existsSync(dir)) throw new Error(`${dir} exists`);
mkdirSync(dir, { recursive: true });

writeFileSync(
  join(dir, "script.ts"),
  `import type { FilmScript } from "../../kit/types.ts";

export const script: FilmScript = {
  id: "${id}",
  title: ${JSON.stringify(title)},
  voice: "af_heart",
  scenes: [
    { id: "intro", narration: ["New: ${title.toLowerCase()}."], minSeconds: 3 },
    { id: "outro", narration: ["Live now."], minSeconds: 3 },
  ],
};
`,
);
writeFileSync(
  join(dir, "Film.tsx"),
  `import { defineFilm, type Visuals } from "../../kit/Film.tsx";
import { OutroScene, TitleScene } from "../../kit/scenes.tsx";
import clips from "./clips.json" with { type: "json" };
import { script } from "./script.ts";
import voice from "./voice.json" with { type: "json" };

const visuals: Visuals = {
  intro: () => <TitleScene eyebrow="New feature" title={script.title} />,
  outro: () => <OutroScene title="Live now" links={[]} />,
};

export const film = defineFilm({ script, voice, clips, visuals });
`,
);
writeFileSync(join(dir, "voice.json"), "{}\n");
writeFileSync(join(dir, "clips.json"), "{}\n");
writeFilms();
console.log(`✓ src/features/${id}`);
