import { adminClient } from "../_shared/client.ts";
import { fail, json } from "../_shared/http.ts";
import { verifyWebhookSecret } from "../_shared/webhook.ts";

// SCHEDULED event — invoked by pg_cron. Builds/refreshes today's per-user
// digest via the run_daily_digest DB function.
Deno.serve(async (req) => {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;
  try {
    const admin = adminClient();
    const { data, error } = await admin.rpc("run_daily_digest");
    if (error) return fail(error.message, 500);
    return json({ ok: true, digestsWritten: data });
  } catch (e) {
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
