import { corsHeaders } from "./cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

/** JSON response with CORS headers. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/** JSON error response. */
export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/** Answer CORS preflight; returns null for non-OPTIONS requests. */
export function preflight(req: Request): Response | null {
  return req.method === "OPTIONS"
    ? new Response("ok", { headers: corsHeaders })
    : null;
}

/** Parse a JSON body, returning {} when empty/invalid. */
export async function readJson<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
