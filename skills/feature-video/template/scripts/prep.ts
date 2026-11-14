// usage: node scripts/prep.ts <feature-id> <step>
// runs a named step from src/features/<id>/prep.ts
// sql() -> postgres via psql (DATABASE_URL from env or repo .env); run() -> any shell cmd from repo root (seed scripts, prisma, curl)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { featureDir, repoRoot } from "./lib/feature.ts";

export type PrepContext = {
  // psql -At; rows split on newline, columns on "|"
  sql: (query: string) => string[][];
  run: (cmd: string) => string;
  repoRoot: string;
  log: (...args: unknown[]) => void;
};
export type PrepSteps = Record<string, (ctx: PrepContext) => Promise<void> | void>;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const name of [".env.local", ".env.development.local", ".env.development", ".env"]) {
    const file = join(repoRoot, name);
    const m = existsSync(file) && readFileSync(file, "utf8").match(/^DATABASE_URL=["']?([^"'\n]+)/m);
    if (m) return m[1]!;
  }
  throw new Error("DATABASE_URL not set and not in repo .env files");
}

const [id, step] = process.argv.slice(2);
if (!id || !step) throw new Error("usage: node scripts/prep.ts <feature-id> <step>");
const file = join(featureDir(id), "prep.ts");
if (!existsSync(file)) throw new Error(`missing ${file}`);
const { steps } = (await import(file)) as { steps: PrepSteps };
const run = steps[step];
if (!run) throw new Error(`unknown step "${step}"; have: ${Object.keys(steps).join(", ")}`);

let url: string | undefined;
await run({
  repoRoot,
  run: (cmd) => execFileSync("sh", ["-c", cmd], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }),
  sql: (query) =>
    execFileSync("psql", [(url ??= databaseUrl()), "-q", "-v", "ON_ERROR_STOP=1", "-At", "-c", query], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((row) => row.split("|")),
  log: (...args) => console.log(...args),
});
