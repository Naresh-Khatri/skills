import type { AndroidContext, AndroidFlow } from "../../../scripts/record-android.ts";
import { OWNER_EMAIL } from "./prep.ts";

const APP = "dev.acme.billing";

async function ensureSignedIn(ctx: AndroidContext) {
  if (!(await ctx.exists(/^Continue$/, 4000))) return;
  await ctx.tap(/Email/);
  await ctx.type(OWNER_EMAIL);
  await ctx.tap(/^Continue$/, 1500);
  await ctx.type(process.env.DEMO_OTP ?? "000000");
  await ctx.tap(/^Verify$/, 3000);
}

async function mobileFlow(ctx: AndroidContext) {
  ctx.shell(`am start -n ${APP}/.MainActivity`);
  await ctx.pause(4000);
  await ensureSignedIn(ctx);
  await ctx.find(/^Invoices$/, 30_000);

  await ctx.record("mobile", async () => {
    await ctx.pause(1200);
    await ctx.tap(/Harbor & Pine Coffee/, 1800);
    await ctx.find(/^Sent ·/);
    await ctx.pause(1500);
    // delivery log sits below the fold
    await ctx.swipeUp(1000);
    await ctx.find(/Delivered to accounts@/);
    await ctx.pause(2000);
    await ctx.tap(/^View PDF$/, 2500);
    // pdf viewer keeps rendering -> uiautomator can't dump here
    await ctx.pause(4000);
  });
}

export const flows: AndroidFlow[] = [{ name: "mobile", clips: ["mobile"], run: mobileFlow }];
