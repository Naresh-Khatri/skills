// order: setup -> record:web -> due -> record:android; reset between takes
import type { PrepContext, PrepSteps } from "../../../scripts/prep.ts";

export const OWNER_EMAIL = "owner@acme.dev";
const ORG_NAME = "Northwind Studio";
const CUSTOMER = { name: "Harbor & Pine Coffee", email: "accounts@harborpine.example" };

const one = (rows: string[][], what: string) => {
  if (!rows[0]) throw new Error(`${what} not found`);
  return rows[0];
};

function orgId({ sql }: PrepContext) {
  return one(sql(`select id from organizations where name = '${ORG_NAME}' limit 1`), `org ${ORG_NAME} (run the seed first)`)[0]!;
}

export const steps: PrepSteps = {
  setup(ctx) {
    const org = orgId(ctx);
    const user = one(ctx.sql(`select id from users where email = '${OWNER_EMAIL}'`), OWNER_EMAIL)[0]!;
    // demo login -> owner, so every button in the flow is enabled
    ctx.sql(`insert into memberships (org_id, user_id, role)
      select '${org}', '${user}', 'owner'
      where not exists (select 1 from memberships where org_id = '${org}' and user_id = '${user}')`);
    // seed data has "test customer" text that would show on camera
    ctx.sql(`update customers set name = '${CUSTOMER.name}', email = '${CUSTOMER.email}', timezone = 'America/New_York', updated_at = now()
      where org_id = '${org}' and name ilike 'test%'`);
    const draft = ctx.sql(`select count(*) from invoices where org_id = '${org}' and status = 'draft'`)[0]![0];
    if (draft === "0") ctx.log("! no draft invoice; create one in the app or the schedule clip has nothing to open");
    ctx.log(`org ${org} ready, customer ${CUSTOMER.name}`);
  },

  async due(ctx) {
    const org = orgId(ctx);
    const [invoice] = one(
      ctx.sql(`select id from invoices where org_id = '${org}' and status = 'scheduled' order by created_at desc limit 1`),
      "scheduled invoice (run record:web first)",
    );
    // let the app's own worker send it -> real email event + push, nothing faked
    ctx.sql(`update invoices set send_at = now() - interval '1 second' where id = '${invoice}'`);
    ctx.log(`waiting for the worker to send ${invoice}…`);
    const end = Date.now() + 90_000;
    while (Date.now() < end) {
      const status = ctx.sql(`select status from invoices where id = '${invoice}'`)[0]![0];
      if (status === "sent") {
        ctx.log("sent. record with:\n  pnpm record:android scheduled-invoices");
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("invoice not sent in 90s; is the worker running?");
  },

  // earlier takes leave scheduled/sent invoices on camera
  reset(ctx) {
    const rows = ctx.sql(`update invoices set status = 'draft', send_at = null, sent_at = null, updated_at = now()
      where org_id = '${orgId(ctx)}' and status in ('scheduled', 'sent') and created_at > now() - interval '1 day' returning id`);
    for (const [invoice] of rows) ctx.sql(`delete from invoice_events where invoice_id = '${invoice}'`);
    ctx.log(`reset ${rows.length} invoice(s) to draft`);
  },
};
