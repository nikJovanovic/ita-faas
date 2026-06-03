import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

interface CreateBody {
  title?: string;
  body?: string;
  language?: string;
  tags?: string[];
  isPublic?: boolean;
}

// POST { title, body?, language?, tags?, isPublic? } — create a snippet.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("Method not allowed", 405);
  try {
    const { supabase, user } = await requireUser(req);
    const b = await readJson<CreateBody>(req);
    if (!b.title || !b.title.trim()) return fail("title is required");

    const { data, error } = await supabase
      .from("snippets")
      .insert({
        user_id: user.id,
        title: b.title.trim(),
        body: b.body ?? "",
        language: b.language ?? "plaintext",
        tags: b.tags ?? [],
        is_public: b.isPublic ?? false,
      })
      .select()
      .single();
    if (error) return fail(error.message, 400);
    return json({ snippet: data }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
