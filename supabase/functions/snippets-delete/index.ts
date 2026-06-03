import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

// DELETE/POST ?id=  (or { id }) — delete one of the caller's snippets.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    let id = new URL(req.url).searchParams.get("id") ?? undefined;
    if (!id) id = (await readJson<{ id?: string }>(req)).id;
    if (!id) return fail("id is required");

    const { data, error } = await supabase
      .from("snippets")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return fail(error.message, 400);
    if (!data) return fail("Not found or not yours", 404);
    return json({ deleted: data.id });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
