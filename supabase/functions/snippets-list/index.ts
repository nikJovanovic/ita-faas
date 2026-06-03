import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET ?limit=&offset=&tag=&language= — list the caller's snippets
// (RLS also exposes public snippets from others).
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    const tag = url.searchParams.get("tag");
    const language = url.searchParams.get("language");

    let q = supabase
      .from("snippets")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (tag) q = q.contains("tags", [tag]);
    if (language) q = q.eq("language", language);

    const { data, error } = await q;
    if (error) return fail(error.message, 500);
    return json({ snippets: data, limit, offset });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
