import { adminClient } from "../_shared/client.ts";
import { fail, json } from "../_shared/http.ts";
import { verifyWebhookSecret } from "../_shared/webhook.ts";

// USER event — triggered when a row is inserted into auth.users (signup).
// Bootstraps the user's profile row.
Deno.serve(async (req) => {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;
  try {
    const payload = await req.json().catch(() => ({}));
    // DB webhook -> { record }, auth hook -> { user } / { record }
    const record = payload.record ?? payload.user ?? null;
    const id: string | undefined = record?.id;
    if (!id) return fail("no user id in payload", 400);

    const admin = adminClient();
    const { error } = await admin
      .from("profiles")
      .upsert({ id, display_name: record.email ?? null }, { onConflict: "id" });
    if (error) return fail(error.message, 500);
    return json({ ok: true, profileFor: id });
  } catch (e) {
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
