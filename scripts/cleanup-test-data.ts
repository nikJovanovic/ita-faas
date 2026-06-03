// Purge test artifacts left by the test scripts:
//   - auth users matching evt-*@example.com (cascades their profile/snippets)
//   - orphaned objects in the `attachments` bucket (no matching attachments row)
// Leaves your real TEST_EMAIL user untouched.
//   Needs in .env: SUPABASE_URL, SUPABASE_SECRET_KEY, DATABASE_URL
//   Run:  bun run scripts/cleanup-test-data.ts
import postgres from "postgres";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!KEY || KEY.startsWith("FILL")) throw new Error("Set SUPABASE_SECRET_KEY in .env");

const adminHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

// 1) test auth users (FK cascade removes their profile/snippets/attachments)
const users = await sql`select id, email from auth.users where email like 'evt-%@example.com'`;
for (const u of users) {
  const r = await fetch(`${URL}/auth/v1/admin/users/${u.id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  console.log(`auth user ${u.email}: ${r.ok ? "deleted" : "ERR " + r.status}`);
}
console.log(`processed ${users.length} test auth user(s)`);

// 2) orphaned storage objects (object with no matching attachments row)
const objs = await sql`select name from storage.objects where bucket_id = 'attachments'`;
const known = new Set(
  (await sql`select storage_path from public.attachments`).map((r) => r.storage_path),
);
const orphans = objs.map((o) => o.name as string).filter((n) => !known.has(n));
if (orphans.length) {
  const r = await fetch(`${URL}/storage/v1/object/attachments`, {
    method: "DELETE",
    headers: adminHeaders,
    body: JSON.stringify({ prefixes: orphans }),
  });
  console.log(`storage orphans: ${r.ok ? `removed ${orphans.length}` : "ERR " + r.status + " " + (await r.text())}`);
} else {
  console.log("storage orphans: none");
}

await sql.end();
console.log("✓ cleanup done");
