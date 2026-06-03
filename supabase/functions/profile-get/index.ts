import { requireUser } from "../_shared/client.ts";
import { fail, json, preflight } from "../_shared/http.ts";

// GET — return the caller's own profile.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { supabase, user } = await requireUser(req);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    return json({ profile: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
