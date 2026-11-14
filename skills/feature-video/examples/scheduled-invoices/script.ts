import type { FilmScript } from "../../kit/types.ts";

export const script: FilmScript = {
  id: "scheduled-invoices",
  title: "Scheduled invoices",
  voice: "af_heart",
  scenes: [
    {
      id: "intro",
      narration: [{ text: "New in Acme Billing: scheduled invoices.", say: "New in Akmee Billing: scheduled invoices." }],
      minSeconds: 3,
    },
    {
      id: "what",
      narration: ["You can now write an invoice today and send it later, up to ninety days ahead."],
    },
    {
      id: "schedule",
      narration: [
        "In the invoice editor, choose Send later and pick a date.",
        "Totals and tax are locked when you schedule.",
      ],
      clip: { name: "app-schedule" },
    },
    {
      id: "send",
      narration: [
        "The invoice waits as Scheduled.",
        "An hour before send time, the customer's email is checked.",
        "Then it goes out at nine in the morning, in the customer's timezone.",
      ],
    },
    {
      id: "manage",
      narration: ["Until then, change the date or cancel it from the new Scheduled tab."],
      clip: { name: "app-manage" },
    },
    {
      id: "admin",
      narration: ["Support can filter scheduled invoices and see exactly when each one goes out."],
      clip: { name: "admin" },
    },
    {
      id: "mobile",
      narration: ["Once it's sent, the mobile app shows the invoice as Sent, with its delivery log."],
      clip: { name: "mobile", from: 6, to: 24 },
    },
    {
      id: "flag",
      narration: [
        "If the email bounces, the invoice is flagged for follow-up.",
        { text: "Invoices sent with Send now get the same check.", say: "Invoices sent with, Send now, get the same check." },
      ],
    },
    {
      id: "api",
      narration: [
        { text: "On the API, add sendAt when you create an invoice.", say: "On the A P I, add send at, when you create an invoice." },
        "It comes back as scheduled, with its send time.",
      ],
    },
    {
      id: "outro",
      narration: [
        "Scheduled invoices are live now.",
        { text: "Full reference at docs.acme.dev.", say: "Full reference at docs dot akmee dot dev." },
      ],
      minSeconds: 4,
    },
  ],
};
