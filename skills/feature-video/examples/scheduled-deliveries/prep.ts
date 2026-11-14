// order: setup -> record:web -> release -> record:android
import type { PrepContext, PrepSteps } from "../../../scripts/prep.ts";

const STORE_EMAIL = "store@logiskit.app";
const STORE_NAME = "Gada Electronics";
// approved, vehicle on file, tirupati zone
export const RIDER_PHONE = "+919876543222";

const one = (rows: string[][], what: string) => {
  if (!rows[0]) throw new Error(`${what} not found`);
  return rows[0];
};

function storeId({ sql }: PrepContext) {
  return one(sql(`select id from stores where name = '${STORE_NAME}' limit 1`), `store ${STORE_NAME}`)[0]!;
}

function riderId({ sql }: PrepContext) {
  return one(sql(`select id from agent_user where phone_number = '${RIDER_PHONE}'`), `rider ${RIDER_PHONE} (sign in once in the app)`)[0]!;
}

export const steps: PrepSteps = {
  setup(ctx) {
    const store = storeId(ctx);
    // demo login (known password) -> owner of the store with real zone data
    const user = one(ctx.sql(`select id from store_user where email = '${STORE_EMAIL}'`), STORE_EMAIL)[0]!;
    ctx.sql(`insert into store_users (store_id, user_id, role, must_change_password)
      select '${store}', '${user}', 'owner', false
      where not exists (select 1 from store_users where store_id = '${store}' and user_id = '${user}')`);
    // booking reserves charge against balance
    ctx.sql(`insert into merchant_accounts (store_id, balance_minor) values ('${store}', 500000)
      on conflict (store_id) do update set balance_minor = greatest(merchant_accounts.balance_minor, merchant_accounts.reserved_minor + 500000)`);
    // dev data has placeholder text that would show on camera
    ctx.sql(`update pickup_locations set label = 'Main store', address = 'Tilak Road, near RTC Bus Stand',
      pincode = '517501', contact_name = 'Gada Electronics', phone = '9876543211', updated_at = now()
      where store_id = '${store}' and label in ('main store', 'Main store')`);
    const rider = riderId(ctx);
    ctx.sql(`update agent_profiles set status = 'available', suspended_at = null, suspended_until = null, updated_at = now() where user_id = '${rider}'`);
    const busy = ctx.sql(`select count(*) from jobs where agent_id = '${rider}' and status in ('picked_by_agent','booking_in_progress','booked','pickup_completed')`)[0]![0];
    if (busy !== "0") ctx.log(`! rider has ${busy} active job(s); finish/cancel them or offers stay hidden`);
    ctx.log(`store ${store} topped up, rider ${rider} available`);
  },

  async release(ctx) {
    const store = storeId(ctx);
    const [job, zone, lat, lon] = one(
      ctx.sql(`select id, zone_id, pickup_latitude, pickup_longitude from jobs
        where store_id = '${store}' and status = 'scheduled' order by created_at desc limit 1`),
      "scheduled job (run record:web first)",
    );
    if (!zone) throw new Error(`job ${job} has no zone`);
    const rider = riderId(ctx);
    ctx.sql(`update zone_agents set selected_at = null where user_id = '${rider}' and zone_id <> '${zone}'`);
    ctx.sql(`insert into zone_agents (zone_id, user_id, selected_at) values ('${zone}', '${rider}', now())
      on conflict (zone_id, user_id) do update set selected_at = now()`);
    ctx.sql(`update agent_profiles set status = 'available', last_latitude = ${lat}, last_longitude = ${lon},
      last_location_accuracy = 10, last_location_at = now(), updated_at = now() where user_id = '${rider}'`);
    // let the api watchdog do the real release (job event + rider push)
    ctx.sql(`update jobs set release_at = now() - interval '1 second' where id = '${job}'`);
    ctx.log(`waiting for watchdog to release ${job}…`);
    const end = Date.now() + 90_000;
    while (Date.now() < end) {
      const status = ctx.sql(`select status from jobs where id = '${job}'`)[0]![0];
      if (status === "queued") {
        ctx.log(`released. record with:\n  PICKUP_LAT=${lat} PICKUP_LON=${lon} pnpm record:android scheduled-deliveries`);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("job not released in 90s; is the api (watchdog) running?");
  },

  // undo the rider's accept so the rider clip can be re-recorded
  unaccept(ctx) {
    const rider = riderId(ctx);
    const rows = ctx.sql(`update jobs set status = 'queued', agent_id = null, accepted_at = null, pickup_due_at = null,
      delay_state = null, delay_state_at = null, updated_at = now()
      where store_id = '${storeId(ctx)}' and agent_id = '${rider}' and status = 'picked_by_agent' returning id`);
    for (const [job] of rows) ctx.sql(`delete from job_offers where job_id = '${job}'`);
    ctx.sql(`update agent_profiles set status = 'available', updated_at = now() where user_id = '${rider}'`);
    ctx.log(`requeued ${rows.length} job(s)`);
  },
};
