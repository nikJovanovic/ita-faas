import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET ?snippetId= — list the caller's attachments, optionally for one snippet.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const snippetId = new URL(req.url).searchParams.get("snippetId");

    let q = supabase
      .from("attachments")
      .select("*")
      .order("created_at", { ascending: false });
    if (snippetId) q = q.eq("snippet_id", snippetId);

    const { data, error } = await q;
    if (error) return fail(error.message, 500);
    return json({ attachments: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
