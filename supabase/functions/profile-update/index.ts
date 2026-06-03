import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight, readJson } from "../_shared/http.ts";

// POST { username?, displayName? } — update the caller's own profile.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase, user } = await requireUser(req);
    const body = await readJson<{ username?: string; displayName?: string }>(req);

    const patch: Record<string, unknown> = {};
    if (body.username !== undefined) patch.username = body.username;
    if (body.displayName !== undefined) patch.display_name = body.displayName;
    if (Object.keys(patch).length === 0) {
      return fail("No updatable fields provided");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select()
      .maybeSingle();
    if (error) return fail(error.message, 400);
    if (!data) return fail("Profile not found", 404);
    return json({ profile: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
