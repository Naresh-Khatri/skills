// pure data: read by node scripts (voice/record) and by remotion
export type Line = string | { text: string; say: string };

export type ClipRef = {
  name: string;
  // seconds within the recording
  from?: number;
  to?: number;
  // floor; raised automatically when the clip outlasts the voice
  speed?: number;
};

export type SceneScript = {
  id: string;
  narration: Line[];
  clip?: ClipRef;
  minSeconds?: number;
};

// index = kokoro v1.0 speaker id; a* = US, b* = UK
export const KOKORO_VOICES = [
  "af_alloy", "af_aoede", "af_bella", "af_heart", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river",
  "af_sarah", "af_sky", "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx",
  "am_puck", "am_santa", "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", "bm_george",
  "bm_lewis",
] as const;
export type KokoroVoice = (typeof KOKORO_VOICES)[number];
// piper voice ids, e.g. en_US-lessac-medium
export type PiperVoice = `${string}_${string}-${"x_low" | "low" | "medium" | "high"}`;

export type FilmScript = {
  id: string;
  title: string;
  voice: KokoroVoice | PiperVoice;
  scenes: SceneScript[];
};

export type VoiceScene = {
  file: string;
  seconds: number;
  captions: { text: string; start: number; end: number }[];
};
export type VoiceManifest = Record<string, VoiceScene>;

export type ClipInfo = { file: string; seconds: number; width: number; height: number; poster: string };
export type ClipManifest = Record<string, ClipInfo>;
