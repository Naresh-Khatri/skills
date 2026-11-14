import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

import { project } from "../project.ts";
import { alpha } from "./theme-color.ts";

export { alpha };

const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const font = { sans: inter.fontFamily, mono: mono.fontFamily };

export const color = {
  bg: "#0a0a0b",
  panel: "#141416",
  line: "rgba(255,255,255,0.09)",
  text: "#f5f5f5",
  muted: "rgba(245,245,245,0.62)",
  faint: "rgba(245,245,245,0.38)",
  accent: project.accent,
  accentSoft: alpha(project.accent, 0.12),
  ok: "#4ade80",
  warn: "#fbbf24",
  danger: "#f87171",
};
