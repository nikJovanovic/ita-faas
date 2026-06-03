import { adminClient } from "../_shared/client.ts";
import { fail, json } from "../_shared/http.ts";
import { verifyWebhookSecret } from "../_shared/webhook.ts";

// DATA-CHANGE event — triggered on INSERT/UPDATE/DELETE of public.snippets.
// Recomputes the affected user's tag histogram and snippet count.
Deno.serve(async (req) => {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;
  try {
    const payload = await req.json().catch(() => ({}));
    const uid: string | undefined =
      payload.record?.user_id ?? payload.old_record?.user_id;
    if (!uid) return fail("no user_id in payload", 400);

    const admin = adminClient();

    const { error: rpcErr } = await admin.rpc("recompute_tag_counts", { uid });
    if (rpcErr) return fail(rpcErr.message, 500);

    const { count } = await admin
      .from("snippets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid);
    await admin.from("profiles").update({ snippet_count: count ?? 0 }).eq("id", uid);

    return json({ ok: true, recomputedFor: uid, snippetCount: count ?? 0 });
  } catch (e) {
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
