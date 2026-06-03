import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET — the caller's tags ordered by frequency (from tag_counts, RLS-scoped).
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const { data, error } = await supabase
      .from("tag_counts")
      .select("tag, count")
      .order("count", { ascending: false });
    if (error) return fail(error.message, 500);
    return json({ tags: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
