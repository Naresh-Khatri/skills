import type { ClipManifest, FilmScript, VoiceManifest } from "./types.ts";

export const VOICE_DELAY = 10;
const TAIL = 14;
const MAX_SPEED = 3;

export type PlacedScene = {
  id: string;
  from: number;
  frames: number;
  clip?: { file: string; poster: string; trimBefore: number; speed: number; width: number; height: number };
};

export function layoutFilm(script: FilmScript, voice: VoiceManifest, clips: ClipManifest, fps: number) {
  let cursor = 0;
  const scenes: PlacedScene[] = script.scenes.map((scene) => {
    const voiceFrames = Math.ceil((voice[scene.id]?.seconds ?? 0) * fps) + VOICE_DELAY + TAIL;
    let frames = Math.max(voiceFrames, Math.ceil((scene.minSeconds ?? 0) * fps));
    let clip: PlacedScene["clip"];
    const info = scene.clip && clips[scene.clip.name];
    if (scene.clip && info) {
      const from = scene.clip.from ?? 0;
      const length = (scene.clip.to ?? info.seconds) - from;
      const fit = length / (frames / fps);
      const speed = Math.min(MAX_SPEED, Math.max(scene.clip.speed ?? 1, fit));
      frames = Math.max(frames, Math.ceil((length / speed) * fps));
      clip = { file: info.file, poster: info.poster, trimBefore: Math.round(from * fps), speed, width: info.width, height: info.height };
    }
    const placed = { id: scene.id, from: cursor, frames, clip };
    cursor += frames;
    return placed;
  });
  return { scenes, frames: Math.max(cursor, 1) };
}
