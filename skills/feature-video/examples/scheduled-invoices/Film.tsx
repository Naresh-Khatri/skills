import { AbsoluteFill, useCurrentFrame } from "remotion";

import { defineFilm, type Visuals } from "../../kit/Film.tsx";
import { progress, rise } from "../../kit/motion.ts";
import { BrowserScene, Chip, CodeScene, Eyebrow, Heading, OutroScene, PhoneScene, StatementScene, TitleScene } from "../../kit/scenes.tsx";
import { color, font } from "../../kit/theme.ts";
import clips from "./clips.json" with { type: "json" };
import { script } from "./script.ts";
import voice from "./voice.json" with { type: "json" };

const visuals: Visuals = {
  intro: () => <TitleScene eyebrow="New feature" title="Scheduled invoices" lead="Write it now. Send it when it's due." />,
  what: () => (
    <StatementScene
      eyebrow="What's new"
      title="Pick a send date, not just Send now"
      chips={[
        { text: "Up to 90 days ahead" },
        { text: "Sent in the customer's timezone", tone: "muted" },
        { text: "Totals locked at scheduling", tone: "ok" },
      ]}
    />
  ),
  schedule: (p) => <BrowserScene {...p} url="app.acme.dev/invoices/new" label="Invoice editor" />,
  send: () => <SendTimeline />,
  manage: (p) => <BrowserScene {...p} url="app.acme.dev/invoices/scheduled" label="Invoices" />,
  admin: (p) => <BrowserScene {...p} url="admin.acme.dev/invoices" label="Support admin" />,
  mobile: (p) => (
    <PhoneScene
      {...p}
      eyebrow="Mobile app"
      title="See when it went out"
      points={["Sent status on every invoice", "Delivery log per email", "PDF exactly as sent"]}
    />
  ),
  flag: () => <BounceFlag />,
  api: () => (
    <CodeScene
      eyebrow="API"
      title="One optional field on create"
      blocks={[
        {
          label: "POST",
          title: "/v1/invoices",
          highlight: ["sendAt"],
          code: `{
  "customerId": "cus_8Hq2LmZr",
  "currency": "usd",
  "items": [
    { "description": "Brand refresh, phase 2", "amount": 480000 }
  ],
  "sendAt": "2026-12-01T09:00:00-05:00"
}`,
        },
        {
          label: "201",
          title: "POST /v1/invoices",
          highlight: ['"scheduled"', "sendAt", "totalMinor"],
          code: `{
  "id": "inv_3kT9wPq1",
  "number": "NW-0142",
  "status": "scheduled",
  "totalMinor": 480000,
  "sendAt": "2026-12-01T14:00:00.000Z",
  "checkAt": "2026-12-01T13:00:00.000Z"
}`,
        },
      ]}
    />
  ),
  outro: () => <OutroScene title="Live now" lead="Web app, support admin, mobile app and the API." links={["app.acme.dev/invoices/scheduled", "docs.acme.dev"]} />,
};

export const film = defineFilm({ script, voice, clips, visuals });

const STEPS = [
  { at: 0, time: "Nov 24", label: "Scheduled", status: "scheduled", tone: color.accent, note: "totals + tax locked" },
  { at: 0.66, time: "Dec 1, 8:00 AM", label: "Email check", status: "checking", tone: color.warn, note: "send time − 1 h" },
  { at: 1, time: "Dec 1, 9:00 AM", label: "Sent", status: "sent", tone: color.ok, note: "customer's timezone" },
];

function SendTimeline() {
  const frame = useCurrentFrame();
  const sweep = progress(frame, 16, 110);
  const left = 200;
  const width = 1520;
  return (
    <AbsoluteFill style={{ padding: "150px 200px 0" }}>
      <Eyebrow>How it runs</Eyebrow>
      <Heading size={76}>Held as Scheduled, then sent</Heading>
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

function BounceFlag() {
  const frame = useCurrentFrame();
  const rows = [
    { kind: "Scheduled", rule: "email bounces at send time", tone: color.accent },
    { kind: "Send now", rule: "email bounces within 15 min", tone: color.muted },
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 200px 60px" }}>
      <Eyebrow>Safety net</Eyebrow>
      <Heading size={80}>Bounced invoices get flagged</Heading>
      <div style={{ marginTop: 50, display: "grid", gap: 18, maxWidth: 1240 }}>
        {rows.map((row, i) => (
          <div key={row.kind} style={{ display: "flex", alignItems: "center", gap: 28, padding: "22px 30px", borderRadius: 16, background: color.panel, border: `1px solid ${color.line}`, ...rise(frame, 20 + i * 10, 18) }}>
            <span style={{ width: 170, fontSize: 30, fontWeight: 650, color: row.tone }}>{row.kind}</span>
            <span style={{ flex: 1, fontSize: 30, color: color.muted }}>{row.rule}</span>
            <Chip tone="warn" at={34 + i * 10}>
              needs_follow_up
            </Chip>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 30, fontSize: 24, color: color.faint, ...rise(frame, 50, 10) }}>Flagged once, logged on the invoice timeline.</p>
    </AbsoluteFill>
  );
}
