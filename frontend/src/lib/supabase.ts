import { createClient } from "@supabase/supabase-js";

// Browser client — handles auth (session persisted in localStorage) and is the
// source of the JWT we forward to the Edge Functions.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
