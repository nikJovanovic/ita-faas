import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET — aggregate stats for the caller (counts respect RLS).
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase } = await requireUser(req);

    const snippets = await supabase
      .from("snippets")
      .select("*", { count: "exact", head: true });
    const attachments = await supabase
      .from("attachments")
      .select("*", { count: "exact", head: true });
    const topTags = await supabase
      .from("tag_counts")
      .select("tag, count")
      .order("count", { ascending: false })
      .limit(10);

    const err = snippets.error ?? attachments.error ?? topTags.error;
    if (err) return fail(err.message, 500);

    return json({
      stats: {
        snippets: snippets.count ?? 0,
        attachments: attachments.count ?? 0,
        topTags: topTags.data ?? [],
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
