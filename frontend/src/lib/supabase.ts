import { createClient } from "@supabase/supabase-js";

// Browser client — handles auth (session persisted in localStorage) and is the
// source of the JWT we forward to the Edge Functions.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const publishableKey = process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
