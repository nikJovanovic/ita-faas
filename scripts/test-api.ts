// Quick end-to-end test of the deployed Edge Functions.
//   Needs in .env:  SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TEST_EMAIL, TEST_PASSWORD
//   Run:  bun run scripts/test-api.ts
const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;
if (!URL || !ANON || !email || !password) {
  throw new Error("Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TEST_EMAIL, TEST_PASSWORD in .env");
}
const FN = `${URL}/functions/v1`;

async function signIn(): Promise<string> {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("sign-in failed: " + JSON.stringify(j));
  return j.access_token as string;
}

async function call(token: string, path: string, method = "GET", body?: unknown) {
  const r = await fetch(`${FN}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  console.log(`${method} ${path} -> ${r.status}`, JSON.stringify(data));
  return data;
}

const token = await signIn();
console.log("signed in ✓");

const created = await call(token, "snippets-create", "POST", {
  title: "Hello world", body: "console.log(1)", language: "ts", tags: ["demo", "ts"],
});
const id = created?.snippet?.id;

await call(token, "snippets-list");
if (id) await call(token, `snippets-get?id=${id}`);
if (id) await call(token, "snippets-update", "POST", { id, title: "Hello (edited)" });

// Tags & Search
await call(token, "snippets-search?q=hello");
await call(token, "tags-list"); // empty until on-snippet-change is wired (Phase 4)
await call(token, "stats-get");

// Attachments: create signed URL -> upload -> list
if (id) {
  const att = await call(token, "attachments-create-url", "POST", {
    snippetId: id, fileName: "note.txt",
  });
  const signedUrl = att?.upload?.signedUrl;
  if (signedUrl) {
    const up = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "hello attachment",
    });
    console.log("PUT (signed upload) ->", up.status);
  }
  await call(token, `attachments-list?snippetId=${id}`);
}

await call(token, "profile-get");

// cleanup (cascades to the attachment row; storage object is left behind)
if (id) await call(token, `snippets-delete?id=${id}`, "DELETE");
