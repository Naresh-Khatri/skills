import type { Page } from "playwright";

import type { Actor } from "../../../scripts/lib/cursor.ts";
import type { WebContext, WebFlow } from "../../../scripts/record-web.ts";
import { OWNER_EMAIL } from "./prep.ts";

// datetime-local wants wall time; `days` ahead at hh:mm
function localInput(days: number, hh: number, mm: number) {
  const date = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
  return `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function login(page: Page, base: string, email: string, password: string) {
  await page.goto(`${base}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

async function openLatestScheduled(page: Page, base: string) {
  await page.goto(`${base}/invoices/scheduled`);
  await page.locator('a[href^="/invoices/"]:not([href$="/new"])').first().click();
  await page.getByRole("button", { name: "Change date" }).waitFor();
}

async function appFlow({ open, record, env }: WebContext) {
  const base = env("APP_URL", "http://localhost:3000");
  const { page, act } = await open("app");
  await login(page, base, OWNER_EMAIL, env("DEMO_PASSWORD", "demo1234"));
  let scheduled = false;

  await page.goto(`${base}/invoices/new`);
  await page.getByText("Line items", { exact: true }).waitFor();
  // boring fields stay off camera
  await page.locator("#customer").fill("Harbor & Pine Coffee");
  await page.getByRole("option", { name: "Harbor & Pine Coffee" }).click();
  await page.locator("#item-0-description").fill("Brand refresh, phase 2");
  await page.locator("#item-0-amount").fill("4800");
  await page.getByText("Delivery", { exact: true }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -90);
  await settle(page);

  await record("app-schedule", page, async () => {
    await scheduleInvoice(page, act);
    scheduled = true;
  });

  await record("app-manage", page, async () => {
    if (!scheduled) await openLatestScheduled(page, base);
    await act.click(page.getByRole("button", { name: "Change date" }), 600);
    await act.fill(page.locator("#reschedule-send-at"), localInput(14, 9, 0));
    await act.pause(500);
    await act.click(page.getByRole("button", { name: "Save" }));
    await page.getByText("Send date updated").waitFor();
    await act.pause(1200);
    await act.click(page.getByRole("link", { name: "Scheduled", exact: true }));
    await page.waitForURL(/\/invoices\/scheduled/);
    await settle(page);
    await act.point(page.locator('a[href^="/invoices/"]:not([href$="/new"])').first());
    await act.pause(1800);
  });
}

async function scheduleInvoice(page: Page, act: Actor) {
  const later = page.getByText("Send later", { exact: true });
  await act.click(later, 500);
  // first click can land mid re-render
  if (!(await page.locator("#send-at").isVisible())) await act.click(later, 500);
  await act.fill(page.locator("#send-at"), localInput(7, 9, 0));
  await act.pause(500);
  const summary = page.getByText(/^Sends on /);
  await summary.waitFor();
  await act.scrollTo(summary);
  await act.point(summary);
  await act.pause(1300);
  await act.click(page.getByRole("button", { name: "Schedule invoice" }));
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Change date" }).waitFor();
  await settle(page);
  await act.point(page.getByRole("button", { name: "Change date" }));
  await act.pause(1500);
}

async function adminFlow({ open, record, env }: WebContext) {
  const base = env("ADMIN_URL", "http://localhost:3001");
  const { page, act } = await open("admin");
  await login(page, base, "support@acme.dev", env("DEMO_PASSWORD", "demo1234"));
  await page.goto(`${base}/invoices`);
  await page.getByRole("group", { name: "Filter invoices" }).waitFor();
  await settle(page);

  await record("admin", page, async () => {
    await act.click(page.getByRole("button", { name: "Scheduled", exact: true }), 900);
    await act.point(page.getByText(/^Sends /).first());
    await act.pause(900);
    await act.click(page.locator('a[href^="/invoices/"]').first());
    const sendAt = page.getByText("Goes out at");
    await sendAt.waitFor();
    await settle(page);
    await act.scrollTo(sendAt);
    await act.point(sendAt);
    await act.pause(1800);
  });
}

export const flows: WebFlow[] = [
  { name: "app", clips: ["app-schedule", "app-manage"], run: appFlow },
  { name: "admin", clips: ["admin"], run: adminFlow },
];
