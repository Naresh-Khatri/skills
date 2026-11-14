import { AbsoluteFill, useCurrentFrame } from "remotion";

import { defineFilm, type Visuals } from "../../kit/Film.tsx";
import { progress, rise } from "../../kit/motion.ts";
import { BrowserScene, Chip, CodeScene, Eyebrow, Heading, OutroScene, PhoneScene, StatementScene, TitleScene } from "../../kit/scenes.tsx";
import { color, font } from "../../kit/theme.ts";
import clips from "./clips.json" with { type: "json" };
import { script } from "./script.ts";
import voice from "./voice.json" with { type: "json" };

const visuals: Visuals = {
  intro: () => <TitleScene eyebrow="New feature" title="Scheduled deliveries" lead="Book now. Pick up later. Riders show up on time." />,
  what: () => (
    <StatementScene
      eyebrow="What's new"
      title="Pick a pickup time, not just ASAP"
      chips={[
        { text: "30 min → 48 h ahead" },
        { text: "Shown in IST, stored in UTC", tone: "muted" },
        { text: "Price locked at booking", tone: "ok" },
      ]}
    />
  ),
  book: (p) => <BrowserScene {...p} url="store.logiskit.app/jobs/new" label="Store dashboard" />,
  release: () => <ReleaseTimeline />,
  manage: (p) => <BrowserScene {...p} url="store.logiskit.app/scheduled" label="Store dashboard" />,
  admin: (p) => <BrowserScene {...p} url="admin.logiskit.app/dashboard/jobs" label="Admin" />,
  rider: (p) => (
    <PhoneScene
      {...p}
      eyebrow="Rider app"
      title="Riders know when to arrive"
      points={["Pickup time on every offer", "Shown again on the way to pickup", "Same flow as ASAP jobs"]}
    />
  ),
  flag: () => <UnassignedFlag />,
  api: () => (
    <CodeScene
      eyebrow="Merchant API"
      title="Two optional fields on the quote"
      blocks={[
        {
          label: "POST",
          title: "/v1/job-quotes",
          highlight: ["scheduledPickupAt", "riderSearchLeadMinutes"],
          code: `{
  "pickupAddress": "12 MG Road, Bengaluru",
  "pickupLatitude": 12.9716,
  "pickupLongitude": 77.5946,
  "dropAddress": "4th Block, Koramangala",
  "dropLatitude": 12.9352,
  "dropLongitude": 77.6245,
  "scheduledPickupAt": "2026-11-06T16:30:00+05:30",
  "riderSearchLeadMinutes": 20
}`,
        },
        {
          label: "201",
          title: "POST /v1/jobs",
          highlight: ['"scheduled"', "releaseAt", "scheduledPickupAt"],
          code: `{
  "id": "6f1c2a9e-4b7d-4e0a-9c3f-2d8e5b1a7c40",
  "externalOrderId": "ORD-10482",
  "status": "scheduled",
  "chargeMinor": 5400,
  "settlement": "reserved",
  "scheduledPickupAt": "2026-11-06T11:00:00.000Z",
  "releaseAt": "2026-11-06T10:40:00.000Z"
}`,
        },
      ]}
    />
  ),
  outro: () => <OutroScene title="Live now" lead="Store dashboard, admin, rider app and the merchant API." links={["store.logiskit.app/scheduled", "docs.logiskit.app"]} />,
};

export const film = defineFilm({ script, voice, clips, visuals });

const STEPS = [
  { at: 0, time: "2:05 PM", label: "Booked", status: "scheduled", tone: color.accent, note: "price + credit locked" },
  { at: 0.66, time: "4:10 PM", label: "Rider search starts", status: "queued", tone: color.warn, note: "pickup − 20 min (10–30)" },
  { at: 1, time: "4:30 PM", label: "Pickup", status: "pickup_completed", tone: color.ok, note: "rider at the store" },
];

function ReleaseTimeline() {
  const frame = useCurrentFrame();
  const sweep = progress(frame, 16, 110);
  const left = 200;
  const width = 1520;
  return (
    <AbsoluteFill style={{ padding: "150px 200px 0" }}>
      <Eyebrow>How it runs</Eyebrow>
      <Heading size={76}>Held as Scheduled, then released</Heading>
      <div style={{ position: "absolute", left, top: 560, width, height: 4, borderRadius: 4, background: color.line }}>
        <div style={{ width: `${sweep * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${color.accent}, ${color.warn} 66%, ${color.ok})` }} />
      </div>
      {STEPS.map((step, i) => {
        const on = sweep >= step.at - 0.001;
        const pop = progress(frame, 16 + step.at * 110, 14);
        return (
          <div key={step.label} style={{ position: "absolute", top: 520, left: left + step.at * width, transform: `translateX(${i === 0 ? 0 : i === STEPS.length - 1 ? -100 : -50}%)`, textAlign: i === 0 ? "left" : i === STEPS.length - 1 ? "right" : "center" }}>
            <div style={{ display: "flex", justifyContent: i === 0 ? "flex-start" : i === STEPS.length - 1 ? "flex-end" : "center" }}>
              <span style={{ width: 22, height: 22, marginTop: 30, borderRadius: 99, background: on ? step.tone : color.panel, border: `3px solid ${on ? step.tone : color.line}`, boxShadow: on ? `0 0 0 ${8 * pop}px color-mix(in srgb, ${step.tone} 20%, transparent)` : undefined }} />
            </div>
            <div style={{ marginTop: 26, opacity: 0.25 + pop * 0.75 }}>
              <div style={{ fontFamily: font.mono, fontSize: 26, color: color.muted }}>{step.time}</div>
              <div style={{ fontSize: 36, fontWeight: 650, marginTop: 6 }}>{step.label}</div>
              <div style={{ fontSize: 24, color: color.faint, marginTop: 6 }}>{step.note}</div>
              <div style={{ marginTop: 18 }}>
                <span style={{ fontFamily: font.mono, fontSize: 22, padding: "6px 14px", borderRadius: 8, color: step.tone, background: `color-mix(in srgb, ${step.tone} 12%, transparent)` }}>{step.status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function UnassignedFlag() {
  const frame = useCurrentFrame();
  const rows = [
    { kind: "Scheduled", rule: "no rider at pickup time", tone: color.accent },
    { kind: "ASAP", rule: "no rider 15 min after publish", tone: color.muted },
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 200px 60px" }}>
      <Eyebrow>Safety net</Eyebrow>
      <Heading size={80}>Unclaimed jobs get flagged</Heading>
      <div style={{ marginTop: 50, display: "grid", gap: 18, maxWidth: 1240 }}>
        {rows.map((row, i) => (
          <div key={row.kind} style={{ display: "flex", alignItems: "center", gap: 28, padding: "22px 30px", borderRadius: 16, background: color.panel, border: `1px solid ${color.line}`, ...rise(frame, 20 + i * 10, 18) }}>
            <span style={{ width: 170, fontSize: 30, fontWeight: 650, color: row.tone }}>{row.kind}</span>
            <span style={{ flex: 1, fontSize: 30, color: color.muted }}>{row.rule}</span>
            <Chip tone="warn" at={34 + i * 10}>
              at_risk
            </Chip>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 30, fontSize: 24, color: color.faint, ...rise(frame, 50, 10) }}>Flagged once, logged on the job timeline. No rider penalty.</p>
    </AbsoluteFill>
  );
}
