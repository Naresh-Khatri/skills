import type { AndroidContext, AndroidFlow } from "../../../scripts/record-android.ts";
import { RIDER_PHONE } from "./prep.ts";

const APP = "com.logiskit.rider";

async function ensureSignedIn(ctx: AndroidContext) {
  if (!(await ctx.exists(/98765 43210|Continue/, 4000))) return;
  await ctx.tap(/98765 43210/);
  await ctx.type(RIDER_PHONE.slice(3));
  await ctx.tap(/^Continue$/, 1500);
  await ctx.type(process.env.RIDER_OTP ?? "1234");
  await ctx.tap(/^Verify$/, 3000);
}

async function riderFlow(ctx: AndroidContext) {
  // rider must be inside the zone + near the store for offers to show
  ctx.geo(Number(process.env.PICKUP_LAT ?? 12.9716), Number(process.env.PICKUP_LON ?? 77.5946));
  ctx.shell(`am start -n ${APP}/.MainActivity`);
  await ctx.pause(4000);
  await ensureSignedIn(ctx);
  if (await ctx.exists(/^GO ONLINE$/i, 3000)) await ctx.tap(/^GO ONLINE$/i, 3000);
  await ctx.find(/jobs? nearby|No jobs nearby|Checking jobs/, 30_000);
  await ctx.find(/[1-9]\d* jobs? nearby/, 60_000);

  await ctx.record("rider", async () => {
    await ctx.pause(1200);
    await ctx.tap(/jobs? nearby/, 1800);
    await ctx.find(/Scheduled · pickup at/);
    await ctx.pause(1500);
    // buttons sit below the fold
    await ctx.swipeUp(1000);
    await ctx.tap(/^Review job$/, 2200);
    await ctx.find(/Scheduled · pickup at/);
    await ctx.pause(1500);
    await ctx.tap(/^Accept job/, 3500);
    // live map never idles -> uiautomator can't dump here
    await ctx.pause(5000);
  });
}

export const flows: AndroidFlow[] = [{ name: "rider", clips: ["rider"], run: riderFlow }];
