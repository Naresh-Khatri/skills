import type { CSSProperties, ReactNode } from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { project } from "../project.ts";
import type { SceneProps } from "./Film.tsx";
import { ease, progress, rise } from "./motion.ts";
import { color, font } from "./theme.ts";

export function Eyebrow({ children, at = 0 }: { children: ReactNode; at?: number }) {
  const frame = useCurrentFrame();
  return (
    <p style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: color.accent, ...rise(frame, at, 12) }}>
      {children}
    </p>
  );
}

export function Heading({ children, at = 4, size = 84, style }: { children: string; at?: number; size?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const words = children.split(" ");
  return (
    <h1 style={{ margin: "18px 0 0", fontSize: size, lineHeight: 1.04, fontWeight: 650, letterSpacing: "-0.035em", ...style }}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...rise(frame, at + i * 2.5, 30, 20) }}>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}

export function Lead({ children, at = 16, style }: { children: ReactNode; at?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return <p style={{ margin: "26px 0 0", fontSize: 34, lineHeight: 1.4, color: color.muted, maxWidth: 1100, ...rise(frame, at, 16), ...style }}>{children}</p>;
}

export function Chip({ children, tone = "accent", at = 0, style }: { children: ReactNode; tone?: "accent" | "ok" | "warn" | "muted"; at?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const c = tone === "accent" ? color.accent : tone === "ok" ? color.ok : tone === "warn" ? color.warn : color.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        fontSize: 26,
        fontWeight: 600,
        color: c,
        background: `color-mix(in srgb, ${c} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
        ...rise(frame, at, 12),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function TitleScene({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading size={128}>{title}</Heading>
      {lead ? <Lead at={22}>{lead}</Lead> : null}
    </AbsoluteFill>
  );
}

export function StatementScene({ eyebrow, title, lead, chips = [] }: { eyebrow: string; title: string; lead?: string; chips?: { text: string; tone?: "accent" | "ok" | "warn" | "muted" }[] }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px 60px" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading size={88}>{title}</Heading>
      {lead ? <Lead>{lead}</Lead> : null}
      {chips.length ? (
        <div style={{ display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap" }}>
          {chips.map((chip, i) => (
            <Chip key={chip.text} tone={chip.tone} at={26 + i * 6}>
              {chip.text}
            </Chip>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export type Focus = { at: number; x: number; y: number; scale: number };

// keyframed zoom on the recording; x/y = 0..1 point kept centred
function focusStyle(t: number, focus: Focus[]): CSSProperties {
  if (!focus.length) return {};
  const times = focus.map((f) => f.at);
  const pick = (key: "x" | "y" | "scale") =>
    focus.length === 1 ? focus[0]![key] : interpolate(t, times, focus.map((f) => f[key]), { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = pick("scale");
  const x = pick("x");
  const y = pick("y");
  const tx = (0.5 - x) * 100 * scale;
  const ty = (0.5 - y) * 100 * scale;
  const clampX = ((scale - 1) / 2) * 100;
  return {
    transform: `translate(${Math.max(-clampX, Math.min(clampX, tx))}%, ${Math.max(-clampX, Math.min(clampX, ty))}%) scale(${scale})`,
  };
}

function ClipMedia({ clip, focus = [] }: { clip: NonNullable<SceneProps["clip"]>; focus?: Focus[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", inset: 0, ...focusStyle(frame / fps, focus) }}>
      {/* poster holds the last frame if the voice outlasts the clip */}
      <Img src={staticFile(clip.poster)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <Video src={staticFile(clip.file)} trimBefore={clip.trimBefore} playbackRate={clip.speed} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

export function BrowserScene({ clip, url, label, focus }: SceneProps & { url: string; label: string; focus?: Focus[] }) {
  const frame = useCurrentFrame();
  const width = 1400;
  const height = clip ? Math.round((width * clip.height) / clip.width) : 875;
  const enter = progress(frame, 0, 22);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 76 }}>
      <div
        style={{
          width,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${color.line}`,
          background: color.panel,
          boxShadow: "0 40px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)",
          transform: `translateY(${(1 - enter) * 40}px)`,
          opacity: enter,
        }}
      >
        <div style={{ height: 46, display: "flex", alignItems: "center", gap: 18, padding: "0 18px", borderBottom: `1px solid ${color.line}` }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c, opacity: 0.85 }} />
            ))}
          </div>
          <div style={{ flex: 1, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: color.muted, fontFamily: font.mono }}>{url}</div>
          <span style={{ fontSize: 16, fontWeight: 600, color: color.accent }}>{label}</span>
        </div>
        <div style={{ position: "relative", width, height, overflow: "hidden", background: "#fff" }}>{clip ? <ClipMedia clip={clip} focus={focus} /> : <Placeholder />}</div>
      </div>
    </AbsoluteFill>
  );
}

export function PhoneScene({ clip, eyebrow, title, points, focus }: SceneProps & { eyebrow: string; title: string; points: string[]; focus?: Focus[] }) {
  const frame = useCurrentFrame();
  const height = 860;
  const width = clip ? Math.round((height * clip.width) / clip.height) : 387;
  const enter = progress(frame, 0, 24);
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 120, paddingBottom: 40 }}>
      <div
        style={{
          width: width + 24,
          height: height + 24,
          padding: 12,
          borderRadius: 54,
          background: "#1b1b1e",
          border: `1px solid ${color.line}`,
          boxShadow: "0 50px 120px -30px rgba(0,0,0,0.85)",
          transform: `translateY(${(1 - enter) * 50}px) rotate(${(1 - enter) * -3}deg)`,
          opacity: enter,
        }}
      >
        <div style={{ position: "relative", width, height, borderRadius: 42, overflow: "hidden", background: "#fff" }}>{clip ? <ClipMedia clip={clip} focus={focus} /> : <Placeholder />}</div>
      </div>
      <div style={{ width: 720 }}>
        <Eyebrow at={6}>{eyebrow}</Eyebrow>
        <Heading at={10} size={72}>
          {title}
        </Heading>
        <div style={{ marginTop: 40, display: "grid", gap: 22 }}>
          {points.map((point, i) => (
            <div key={point} style={{ display: "flex", gap: 18, alignItems: "baseline", fontSize: 32, color: color.muted, ...rise(frame, 26 + i * 8, 14) }}>
              <span style={{ color: color.accent }}>→</span>
              {point}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export type CodeBlock = { label: string; title: string; code: string; highlight?: string[] };

export function CodeScene({ eyebrow, title, blocks }: { eyebrow: string; title: string; blocks: CodeBlock[] }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: "96px 120px 120px" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading size={60} at={3}>
        {title}
      </Heading>
      <div style={{ display: "flex", gap: 32, marginTop: 40, alignItems: "flex-start" }}>
        {blocks.map((block, b) => {
          const start = 16 + b * 34;
          const lines = block.code.split("\n");
          return (
            <div key={block.label} style={{ flex: 1, borderRadius: 16, border: `1px solid ${color.line}`, background: color.panel, overflow: "hidden", ...rise(frame, start - 6, 24) }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 22px", borderBottom: `1px solid ${color.line}`, fontSize: 19 }}>
                <span style={{ fontWeight: 700, color: color.accent, fontFamily: font.mono }}>{block.label}</span>
                <span style={{ color: color.muted, fontFamily: font.mono }}>{block.title}</span>
              </div>
              <pre style={{ margin: 0, padding: "20px 24px", fontFamily: font.mono, fontSize: 22, lineHeight: 1.55 }}>
                {lines.map((line, i) => {
                  const hot = block.highlight?.some((h) => line.includes(h));
                  return (
                    <div
                      key={i}
                      style={{
                        opacity: progress(frame, start + i * 1.6, 8),
                        background: hot ? color.accentSoft : undefined,
                        boxShadow: hot ? `inset 3px 0 0 ${color.accent}` : undefined,
                        margin: "0 -24px",
                        padding: "0 24px",
                      }}
                    >
                      <JsonLine line={line} />
                    </div>
                  );
                })}
              </pre>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function JsonLine({ line }: { line: string }) {
  const parts = line.split(/("(?:[^"\\]|\\.)*"\s*:?|\b\d+\b|\btrue\b|\bfalse\b|\bnull\b)/g);
  return (
    <>
      {parts.map((part, i) => {
        let c: string = color.text;
        if (/^"/.test(part)) c = part.trimEnd().endsWith(":") ? "#9cc3ff" : "#a5e3b4";
        else if (/^(\d+|true|false|null)$/.test(part)) c = "#f5c27a";
        else if (/^(POST|GET|PATCH|DELETE)\b/.test(part)) c = color.accent;
        return (
          <span key={i} style={{ color: c }}>
            {part}
          </span>
        );
      })}
      {line === "" ? " " : null}
    </>
  );
}

export function OutroScene({ title, lead, links }: { title: string; lead?: string; links: string[] }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", paddingBottom: 60 }}>
      {project.logo ? <Img src={staticFile(project.logo)} style={{ width: 92, height: 92, objectFit: "contain", marginBottom: 20 }} /> : null}
      <Heading size={96}>{title}</Heading>
      {lead ? <Lead style={{ textAlign: "center" }}>{lead}</Lead> : null}
      <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
        {links.map((link, i) => (
          <Chip key={link} tone="muted" at={24 + i * 5} style={{ fontFamily: font.mono, fontWeight: 500 }}>
            {link}
          </Chip>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Placeholder() {
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "#202024", color: color.faint, fontSize: 28 }}>recording pending</AbsoluteFill>;
}
