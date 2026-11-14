import type { ReactNode } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { layoutFilm, VOICE_DELAY, type PlacedScene } from "./layout.ts";
import { progress } from "./motion.ts";
import { project } from "../project.ts";
import { alpha, color, font } from "./theme.ts";
import type { ClipManifest, FilmScript, VoiceManifest } from "./types.ts";

export type SceneProps = { frames: number; clip?: PlacedScene["clip"] };
export type FilmDef = { script: FilmScript; voice: VoiceManifest; clips: ClipManifest; component: () => ReactNode };

// each feature's Film.tsx exports `film = defineFilm(...)`; scripts/films.ts registers it
export function defineFilm(props: { script: FilmScript; voice: unknown; clips: unknown; visuals: Visuals }): FilmDef {
  const voice = props.voice as VoiceManifest;
  const clips = props.clips as ClipManifest;
  return { script: props.script, voice, clips, component: () => <FeatureFilm script={props.script} voice={voice} clips={clips} visuals={props.visuals} /> };
}

export type Visuals = Record<string, (props: SceneProps) => ReactNode>;

export function FeatureFilm({
  script,
  voice,
  clips,
  visuals,
}: {
  script: FilmScript;
  voice: VoiceManifest;
  clips: ClipManifest;
  visuals: Visuals;
}) {
  const { fps } = useVideoConfig();
  const { scenes } = layoutFilm(script, voice, clips, fps);
  return (
    <AbsoluteFill style={{ background: color.bg, color: color.text, fontFamily: font.sans }}>
      <Backdrop />
      {scenes.map((scene, index) => {
        const render = visuals[scene.id];
        const audio = voice[scene.id];
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames} premountFor={fps}>
            <Shell frames={scene.frames} first={index === 0} last={index === scenes.length - 1}>
              {render ? render({ frames: scene.frames, clip: scene.clip }) : <Missing id={scene.id} />}
            </Shell>
            {audio ? (
              <Sequence from={VOICE_DELAY} layout="none">
                <Audio src={staticFile(audio.file)} />
              </Sequence>
            ) : null}
            {audio ? <Captions captions={audio.captions} /> : null}
          </Sequence>
        );
      })}
      <Brand title={script.title} />
    </AbsoluteFill>
  );
}

function Shell({ frames, first, last, children }: { frames: number; first: boolean; last: boolean; children: ReactNode }) {
  const frame = useCurrentFrame();
  const enter = first ? 1 : progress(frame, 0, 12);
  const leave = last ? 0 : progress(frame, frames - 10, 10);
  return (
    <AbsoluteFill
      style={{
        opacity: enter * (1 - leave),
        transform: `scale(${1.015 - enter * 0.015 - leave * 0.01})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function Captions({ captions }: { captions: { text: string; start: number; end: number }[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - VOICE_DELAY) / fps;
  const current = captions.find((c) => t >= c.start - 0.05 && t < c.end + 0.25);
  if (!current) return null;
  const local = (t - current.start) * fps;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 34, pointerEvents: "none" }}>
      <div
        style={{
          maxWidth: 1380,
          padding: "12px 26px",
          borderRadius: 14,
          background: "rgba(10,10,11,0.82)",
          border: `1px solid ${color.line}`,
          fontSize: 31,
          lineHeight: 1.35,
          fontWeight: 500,
          textAlign: "center",
          opacity: Math.min(1, (local + 4) / 6),
        }}
      >
        {current.text}
      </div>
    </AbsoluteFill>
  );
}

function Backdrop() {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 78% -10%, ${alpha(color.accent, 0.1)}, transparent 60%),
          radial-gradient(900px 600px at 0% 110%, rgba(255,255,255,0.05), transparent 60%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
}

function Brand({ title }: { title: string }) {
  return (
    <div style={{ position: "absolute", top: 28, left: 40, display: "flex", alignItems: "center", gap: 12, fontSize: 19, color: color.muted }}>
      {project.logo ? <img src={staticFile(project.logo)} style={{ width: 26, height: 26 }} /> : null}
      <span style={{ color: color.text, fontWeight: 600 }}>{project.name}</span>
      <span style={{ color: color.faint }}>/</span>
      <span>{title}</span>
    </div>
  );
}

function Missing({ id }: { id: string }) {
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontSize: 40, color: color.danger }}>missing visual: {id}</AbsoluteFill>;
}
