import { adminClient } from "../_shared/client.ts";
import { fail, json } from "../_shared/http.ts";
import { verifyWebhookSecret } from "../_shared/webhook.ts";

// STORAGE event — triggered when an object is inserted into storage.objects.
// Fills the attachment row's size/mime and marks it processed.
Deno.serve(async (req) => {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;
  try {
    const payload = await req.json().catch(() => ({}));
    const rec = payload.record ?? null;
    if (!rec?.name) return fail("no object name in payload", 400);
    if (rec.bucket_id !== "attachments") {
      return json({ ok: true, skipped: rec.bucket_id });
    }

    const admin = adminClient();
    const { data, error } = await admin
      .from("attachments")
      .update({
        size_bytes: rec.metadata?.size ?? null,
        mime_type: rec.metadata?.mimetype ?? null,
        processed: true,
      })
      .eq("storage_path", rec.name)
      .select()
      .maybeSingle();
    if (error) return fail(error.message, 500);
    return json({ ok: true, attachment: data });
  } catch (e) {
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
