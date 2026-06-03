import { json } from "./http.ts";

/**
 * Guards event-triggered functions (DB webhooks / cron). The trigger is
 * configured to send `x-webhook-secret`; we compare it to the WEBHOOK_SECRET
 * function secret. If WEBHOOK_SECRET isn't set (local/dev), the check is
 * skipped. Returns a 403 Response when the secret mismatches, else null.
 */
export function verifyWebhookSecret(req: Request): Response | null {
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (!expected) return null;
  if (req.headers.get("x-webhook-secret") !== expected) {
    return json({ error: "Forbidden" }, 403);
  }
  return null;
}
