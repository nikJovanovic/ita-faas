import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET ?id= — fetch a single snippet (RLS: own or public).
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("id query param is required");

    const { data, error } = await supabase
      .from("snippets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    if (!data) return fail("Not found", 404);
    return json({ snippet: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
