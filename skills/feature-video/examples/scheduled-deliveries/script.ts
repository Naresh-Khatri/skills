import type { FilmScript } from "../../kit/types.ts";

export const script: FilmScript = {
  id: "scheduled-deliveries",
  title: "Scheduled deliveries",
  voice: "af_heart",
  scenes: [
    {
      id: "intro",
      narration: [{ text: "New in LogisKit: scheduled deliveries.", say: "New in Lojis Kit: scheduled deliveries." }],
      minSeconds: 3,
    },
    {
      id: "what",
      narration: ["Stores can now book a pickup for later, from thirty minutes to two days ahead."],
    },
    {
      id: "book",
      narration: [
        "In the store dashboard, choose Schedule for later and pick a time.",
        "The price is locked and the credit is reserved at booking.",
      ],
      clip: { name: "store-book" },
    },
    {
      id: "release",
      narration: [
        "The job waits as Scheduled.",
        "Twenty minutes before pickup, the rider search starts.",
        "Stores can tune that from ten to thirty minutes.",
      ],
    },
    {
      id: "manage",
      narration: [
        "Until then, stores can change the time or cancel for a full refund, right from the new Scheduled tab.",
      ],
      clip: { name: "store-manage" },
    },
    {
      id: "admin",
      narration: ["Admins can filter scheduled jobs, and see when each rider search begins."],
      clip: { name: "admin" },
    },
    {
      id: "rider",
      narration: ["Riders see the pickup time up front, so they know exactly when to be at the store."],
      clip: { name: "rider", from: 8, to: 28 },
    },
    {
      id: "flag",
      narration: [
        "Jobs nobody has accepted by pickup time are flagged at risk for ops.",
        {
          text: "ASAP jobs get the same check after 15 minutes.",
          say: "A sap jobs get the same check after fifteen minutes.",
        },
      ],
    },
    {
      id: "api",
      narration: [
        {
          text: "On the merchant API, add scheduledPickupAt to the quote.",
          say: "On the merchant A P I, add scheduled pickup at, to the quote.",
        },
        {
          text: "The booking comes back as scheduled, with its release time.",
          say: "The booking comes back as scheduled, with its release time.",
        },
      ],
    },
    {
      id: "outro",
      narration: [
        "Scheduled deliveries are live now.",
        { text: "Full reference at docs.logiskit.app.", say: "Full reference at docs dot logiskit dot app." },
      ],
      minSeconds: 4,
    },
  ],
};
