// Verifies the 4 event types fire. Events run async via pg_net, so we poll
// the DB (DATABASE_URL) for side effects after acting through the API.
//   Needs in .env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WEBHOOK_SECRET,
//                  DATABASE_URL, TEST_EMAIL, TEST_PASSWORD
//   Run:  bun run scripts/test-events.ts
import postgres from "postgres";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.WEBHOOK_SECRET!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const FN = `${URL}/functions/v1`;
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  apikey: ANON,
  "Content-Type": "application/json",
});

async function poll<T>(label: string, fn: () => Promise<T | null>, ms = 25000): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const r = await fn();
    if (r) return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
  console.log(`  ✗ ${label}: TIMED OUT after ${ms / 1000}s`);
  return null;
}

// sign in test user -> { token, userId }
const si = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }),
}).then((r) => r.json());
const token: string = si.access_token;
const userId: string = si.user.id;
console.log(`signed in ✓ (user ${userId})`);

// 1) DATA-CHANGE: create snippet -> on-snippet-change recomputes tag_counts
console.log("\n[1] data-change (snippets -> tag_counts)");
const created = await fetch(`${FN}/snippets-create`, {
  method: "POST",
  headers: authHeaders(token),
  body: JSON.stringify({ title: "Event test", body: "x", tags: ["evt", "test"] }),
}).then((r) => r.json());
const snippetId = created.snippet.id;
const tags = await poll("tag_counts populated", async () => {
  const rows = await sql`select tag, count from public.tag_counts where user_id = ${userId} order by tag`;
  return rows.length ? rows : null;
});
if (tags) console.log("  ✓ tag_counts:", tags.map((t) => `${t.tag}:${t.count}`).join(", "));

// 2) STORAGE: upload a file -> on-attachment-uploaded marks processed
console.log("\n[2] storage (upload -> attachment processed)");
const att = await fetch(`${FN}/attachments-create-url`, {
  method: "POST",
  headers: authHeaders(token),
  body: JSON.stringify({ snippetId, fileName: "evt.txt" }),
}).then((r) => r.json());
await fetch(att.upload.signedUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body: "event upload",
});
const processed = await poll("attachment processed", async () => {
  const rows = await sql`select processed, size_bytes, mime_type from public.attachments where id = ${att.attachment.id}`;
  return rows[0]?.processed ? rows[0] : null;
});
if (processed) console.log(`  ✓ processed=true size=${processed.size_bytes} mime=${processed.mime_type}`);

// 3) USER: sign up a fresh user -> on-user-created bootstraps a profile
console.log("\n[3] user (admin create -> profile bootstrap)");
if (!SECRET_KEY || SECRET_KEY.startsWith("FILL")) {
  console.log("  ⊘ skipped: set SUPABASE_SECRET_KEY (sb_secret_...) in .env to test this");
} else {
  // admin create avoids sending a confirmation email (no rate limit)
  const email = `evt-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const su = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: "password123", email_confirm: true }),
  }).then((r) => r.json());
  const newId = su.id ?? su.user?.id;
  if (!newId) {
    console.log("  ✗ admin create returned no id:", JSON.stringify(su));
  } else {
    const profile = await poll("profile created", async () => {
      const rows = await sql`select id, display_name from public.profiles where id = ${newId}`;
      return rows.length ? rows[0] : null;
    });
    if (profile) console.log(`  ✓ profile for ${profile.display_name ?? newId}`);
  }
}

// 4) SCHEDULED: invoke daily-digest manually (cron runs the same call)
console.log("\n[4] scheduled (daily-digest -> digests)");
const dd = await fetch(`${FN}/daily-digest`, {
  method: "POST",
  headers: { apikey: ANON, "x-webhook-secret": SECRET, "Content-Type": "application/json" },
  body: "{}",
}).then((r) => r.json());
console.log("  daily-digest response:", JSON.stringify(dd));
const digest = await poll("digest row", async () => {
  const rows = await sql`select count(*)::int as n from public.digests where period = current_date`;
  return rows[0].n > 0 ? rows[0] : null;
}, 8000);
if (digest) console.log(`  ✓ digests written today: ${digest.n}`);

// recent pg_net responses (debug)
console.log("\n[pg_net] recent responses:");
const resp = await sql`select status_code, count(*) from net._http_response group by status_code order by 1`;
console.log(" ", resp.map((r) => `${r.status_code}:${r.count}`).join("  "));

// cleanup all test snippets for this user (cascades attachment rows)
void snippetId;
await sql`delete from public.snippets where user_id = ${userId} and title = 'Event test'`;
await sql.end();
console.log("\ndone.");
