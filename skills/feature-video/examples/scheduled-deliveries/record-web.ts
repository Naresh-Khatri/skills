import type { Page } from "playwright";

import type { Actor } from "../../../scripts/lib/cursor.ts";
import type { WebContext, WebFlow } from "../../../scripts/record-web.ts";

const DROP = {
  // must geocode inside the store's zone
  address: "PLR Convention Centre, Air Bypass Road, STV Nagar",
  city: "Tirupati",
  name: "Ananya Rao",
  phone: "9845012345",
};

// datetime-local value in IST, `days` ahead at hh:mm
function istLocal(days: number, hh: number, mm: number) {
  const ist = new Date(Date.now() + 5.5 * 3600_000 + days * 86400_000);
  const date = ist.toISOString().slice(0, 10);
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
  await page.goto(`${base}/scheduled`);
  await page.locator('a[href^="/jobs/"]:not([href="/jobs/new"])').first().click();
  await page.getByRole("button", { name: "Change time" }).waitFor();
}

async function storeFlow({ open, record, env }: WebContext) {
  const base = env("STORE_URL", "http://store.localhost:3003");
  const { page, act } = await open("store");
  await login(page, base, "store@logiskit.app", "store123");
  let booked = false;

  await page.goto(`${base}/jobs/new`);
  await page.getByText("Pickup time", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Show map|Hide map/ }).waitFor();
  // tedious fields stay off camera
  await page.locator("#drop-address").fill(DROP.address);
  await page.locator("#drop-city").fill(DROP.city);
  await page.locator("#drop-name").fill(DROP.name);
  await page.locator("#drop-phone").fill(DROP.phone);
  await page.locator("#externalOrderId").fill(`ORD-${String(Date.now()).slice(-5)}`);
  await page.getByText("Pickup time", { exact: true }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -90);
  await settle(page);

  await record("store-book", page, async () => {
    await bookScheduled(page, act);
    booked = true;
  });

  await record("store-manage", page, async () => {
    if (!booked) await openLatestScheduled(page, base);
    await act.click(page.getByRole("button", { name: "Change time" }), 600);
    await act.fill(page.locator("#reschedulePickupAt"), istLocal(1, 17, 0));
    await act.pause(500);
    await act.click(page.getByRole("button", { name: "Save time" }));
    await page.getByText("Pickup time updated").waitFor();
    await act.pause(1200);
    await act.click(page.getByRole("link", { name: "Scheduled", exact: true }));
    await page.waitForURL(/\/scheduled/);
    await settle(page);
    await act.point(page.locator('a[href^="/jobs/"]:not([href="/jobs/new"])').first());
    await act.pause(1800);
  });
}

async function bookScheduled(page: Page, act: Actor) {
  const later = page.getByText("Schedule for later", { exact: true });
  await act.click(later, 500);
  // first click can land mid re-render
  if (!(await page.locator("#scheduledPickupAt").isVisible())) await act.click(later, 500);
  await act.fill(page.locator("#scheduledPickupAt"), istLocal(1, 16, 30));
  await act.pause(500);
  await act.click(page.getByRole("button", { name: "Advanced" }), 500);
  await act.point(page.locator("#riderSearchLead"));
  await act.pause(700);
  await act.click(page.getByRole("button", { name: "Get delivery quote" }));
  const review = page.getByText(/^Pickup at /);
  await review.waitFor({ timeout: 30_000 });
  await act.scrollTo(review);
  await act.point(review);
  await act.pause(1300);
  await act.click(page.getByRole("button", { name: /^Confirm & book/ }));
  await page.waitForURL(/\/jobs\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Change time" }).waitFor();
  await settle(page);
  await act.point(page.getByRole("button", { name: "Change time" }));
  await act.pause(1500);
}

async function adminFlow({ open, record, env }: WebContext) {
  const base = env("ADMIN_URL", "http://admin.localhost:3001");
  const { page, act } = await open("admin");
  await login(page, base, "admin@logiskit.app", "admin123");
  await page.goto(`${base}/dashboard/jobs`);
  await page.getByRole("group", { name: "Filter jobs" }).waitFor();
  await settle(page);

  await record("admin", page, async () => {
    await act.click(page.getByRole("button", { name: "Scheduled", exact: true }), 900);
    await act.point(page.getByText(/^Pickup /).first());
    await act.pause(900);
    await act.click(page.locator('a[href^="/dashboard/jobs/"]:not([href="/dashboard/jobs/new"])').first());
    const release = page.getByText("Rider search from");
    await release.waitFor();
    await settle(page);
    await act.scrollTo(release);
    await act.point(release);
    await act.pause(1800);
  });
}

export const flows: WebFlow[] = [
  { name: "store", clips: ["store-book", "store-manage"], run: storeFlow },
  { name: "admin", clips: ["admin"], run: adminFlow },
];
