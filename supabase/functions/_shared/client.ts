import {
  createClient,
  type SupabaseClient,
  type User,
} from "jsr:@supabase/supabase-js@2";
import { json } from "./http.ts";

// These are auto-injected into every deployed Edge Function by Supabase
// (and by `supabase functions serve` locally). We read the new key names
// (publishable/secret) and fall back to the legacy names (anon/service_role).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Service-role client — bypasses RLS. Use ONLY in event-triggered functions
 * (webhooks / cron), never expose it to a caller.
 */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, noPersist);
}

/**
 * User-scoped client — forwards the caller's JWT so PostgREST enforces RLS
 * and auth.uid() resolves to the caller.
 */
export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY, {
    ...noPersist,
    global: { headers: { Authorization: authorization } },
  });
}

/**
 * Resolve the authenticated user, or throw a 401 Response. Returns the
 * RLS-scoped client alongside the user so handlers reuse one connection.
 */
export async function requireUser(
  req: Request,
): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw json({ error: "Unauthorized" }, 401);
  return { supabase, user: data.user };
}
