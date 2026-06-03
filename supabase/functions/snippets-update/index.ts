import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

interface UpdateBody {
  id?: string;
  title?: string;
  body?: string;
  language?: string;
  tags?: string[];
  isPublic?: boolean;
}

// POST { id, ...fields } — update one of the caller's snippets.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);
    const b = await readJson<UpdateBody>(req);
    if (!b.id) return fail("id is required");

    const patch: Record<string, unknown> = {};
    if (b.title !== undefined) patch.title = b.title;
    if (b.body !== undefined) patch.body = b.body;
    if (b.language !== undefined) patch.language = b.language;
    if (b.tags !== undefined) patch.tags = b.tags;
    if (b.isPublic !== undefined) patch.is_public = b.isPublic;
    if (Object.keys(patch).length === 0) {
      return fail("No updatable fields provided");
    }

    const { data, error } = await supabase
      .from("snippets")
      .update(patch)
      .eq("id", b.id)
      .select()
      .maybeSingle();
    if (error) return fail(error.message, 400);
    if (!data) return fail("Not found or not yours", 404);
    return json({ snippet: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
