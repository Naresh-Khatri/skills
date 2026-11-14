// usage: node scripts/voice.ts <feature-id>
// synthesises each scene's narration (sentence by sentence -> exact caption timing)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism, homedir } from "node:os";
import { join } from "node:path";

import { loadScript, featureDir, publicDir } from "./lib/feature.ts";
import { KOKORO_VOICES, type Line, type VoiceManifest } from "../src/kit/types.ts";

const require = createRequire(import.meta.url);
const sherpa = require("sherpa-onnx-node");

const MODELS = process.env.TTS_MODELS ?? join(homedir(), ".local/share/feature-video/tts");
const RELEASES = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models";
const KOKORO = "kokoro-multi-lang-v1_0";
const GAP = 0.32;
const SPEED = Number(process.env.TTS_SPEED ?? 1.05);
// past ~8 threads kokoro stops getting faster
const THREADS = Math.min(8, availableParallelism());

const id = process.argv[2];
if (!id) throw new Error("usage: node scripts/voice.ts <feature-id>");
const script = await loadScript(id);
const { model, sid } = engine(script.voice);
const tts = new sherpa.OfflineTts({ model: { ...model, numThreads: THREADS, provider: "cpu" }, maxNumSentences: 1 });

const outDir = join(publicDir(id), "voice");
mkdirSync(outDir, { recursive: true });
const manifest: VoiceManifest = {};

for (const scene of script.scenes) {
  const chunks: Float32Array[] = [];
  const captions: VoiceManifest[string]["captions"] = [];
  let cursor = 0;
  for (const line of scene.narration as Line[]) {
    const text = typeof line === "string" ? line : line.text;
    const say = typeof line === "string" ? line : line.say;
    const audio = tts.generate({ text: say, sid, speed: SPEED });
    const seconds = audio.samples.length / tts.sampleRate;
    captions.push({ text, start: round(cursor), end: round(cursor + seconds) });
    chunks.push(audio.samples, new Float32Array(Math.round(GAP * tts.sampleRate)));
    cursor += seconds + GAP;
  }
  const samples = concat(chunks.slice(0, -1));
  sherpa.writeWave(join(outDir, `${scene.id}.wav`), { samples, sampleRate: tts.sampleRate });
  manifest[scene.id] = { file: `${id}/voice/${scene.id}.wav`, seconds: round(samples.length / tts.sampleRate), captions };
  console.log(`${scene.id.padEnd(10)} ${manifest[scene.id]!.seconds.toFixed(2)}s`);
}

writeFileSync(join(featureDir(id), "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest).reduce((sum, scene) => sum + scene.seconds, 0);
console.log(`total voice ${total.toFixed(1)}s (${script.voice}, speed ${SPEED})`);

function engine(voice: string) {
  const kokoroSid = (KOKORO_VOICES as readonly string[]).indexOf(voice);
  if (kokoroSid >= 0) {
    const dir = ensureModel(KOKORO, KOKORO);
    const lexicon = voice.startsWith("b") ? "lexicon-gb-en.txt" : "lexicon-us-en.txt";
    return {
      sid: kokoroSid,
      model: {
        kokoro: {
          model: join(dir, "model.onnx"),
          voices: join(dir, "voices.bin"),
          tokens: join(dir, "tokens.txt"),
          dataDir: join(dir, "espeak-ng-data"),
          lexicon: join(dir, lexicon),
        },
      },
    };
  }
  const dir = existsSync(join(MODELS, voice, `${voice}.onnx`)) ? join(MODELS, voice) : ensureModel(`vits-piper-${voice}`, voice);
  return {
    sid: 0,
    model: { vits: { model: join(dir, `${voice}.onnx`), tokens: join(dir, "tokens.txt"), dataDir: join(dir, "espeak-ng-data") } },
  };
}

// sherpa-onnx release archive -> MODELS/<name>, once; temp dir so a dead download never looks installed
function ensureModel(archive: string, name: string) {
  const dir = join(MODELS, name);
  if (existsSync(join(dir, "tokens.txt"))) return dir;
  mkdirSync(MODELS, { recursive: true });
  console.log(`downloading ${archive}`);
  execFileSync(
    "bash",
    ["-c", 'set -euo pipefail; tmp=$(mktemp -d "$1/.dl.XXXX"); trap \'rm -rf "$tmp"\' EXIT; curl -fsSL "$2" | tar -xj -C "$tmp"; mv "$tmp/$3" "$4"', "_", MODELS, `${RELEASES}/${archive}.tar.bz2`, archive, dir],
    { stdio: "inherit" },
  );
  return dir;
}

function concat(parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
