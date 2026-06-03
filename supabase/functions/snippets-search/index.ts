import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET ?q=&limit=&offset= — full-text search over the caller's snippets
// (RLS via the search_snippets SECURITY INVOKER function).
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const lim = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const off = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const { data, error } = await supabase.rpc("search_snippets", { q, lim, off });
    if (error) return fail(error.message, 500);
    return json({ query: q, snippets: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
