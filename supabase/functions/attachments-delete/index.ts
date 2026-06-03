import { adminClient, requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

// DELETE/POST ?id= (or { id }) — remove the storage object and its row.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    let id = new URL(req.url).searchParams.get("id") ?? undefined;
    if (!id) id = (await readJson<{ id?: string }>(req)).id;
    if (!id) return fail("id is required");

    // RLS-scoped lookup ensures the caller owns it.
    const { data: att, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    if (!att) return fail("Not found or not yours", 404);

    const admin = adminClient();
    await admin.storage.from("attachments").remove([att.storage_path]);

    const { error: delErr } = await supabase.from("attachments").delete().eq("id", id);
    if (delErr) return fail(delErr.message, 400);
    return json({ deleted: id });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
