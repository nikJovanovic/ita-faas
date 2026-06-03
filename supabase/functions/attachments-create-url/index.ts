import { adminClient, requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

// POST { snippetId, fileName } — verify ownership, create a signed upload URL
// scoped to the caller's folder, and insert a pending attachment row. The
// on-attachment-uploaded event fills size/mime and marks it processed.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("Method not allowed", 405);
  try {
    const { supabase, user } = await requireUser(req);
    const b = await readJson<{ snippetId?: string; fileName?: string }>(req);
    if (!b.snippetId) return fail("snippetId is required");
    if (!b.fileName) return fail("fileName is required");

    // Ownership check via the RLS-scoped client.
    const { data: snip, error: snipErr } = await supabase
      .from("snippets")
      .select("id")
      .eq("id", b.snippetId)
      .maybeSingle();
    if (snipErr) return fail(snipErr.message, 500);
    if (!snip) return fail("Snippet not found or not yours", 404);

    const safeName = b.fileName.replace(/[^\w.\-]/g, "_");
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const admin = adminClient();
    const { data: signed, error: signErr } = await admin.storage
      .from("attachments")
      .createSignedUploadUrl(path);
    if (signErr) return fail(signErr.message, 500);

    const { data: row, error: insErr } = await admin
      .from("attachments")
      .insert({
        snippet_id: b.snippetId,
        user_id: user.id,
        storage_path: path,
        file_name: safeName,
      })
      .select()
      .single();
    if (insErr) return fail(insErr.message, 400);

    return json({ attachment: row, upload: signed }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
