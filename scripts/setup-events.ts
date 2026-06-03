// Populate Supabase Vault with the config the DB triggers read at runtime.
// Run once after applying migration 0003 (and whenever a value changes).
//   Needs in .env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WEBHOOK_SECRET, DATABASE_URL
//   Run:  bun run scripts/setup-events.ts
import postgres from "postgres";

const entries: Record<string, string | undefined> = {
  project_url: process.env.SUPABASE_URL,
  publishable_key: process.env.SUPABASE_PUBLISHABLE_KEY,
  webhook_secret: process.env.WEBHOOK_SECRET,
};

for (const [name, value] of Object.entries(entries)) {
  if (!value) throw new Error(`Missing .env value for vault secret "${name}"`);
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
for (const [name, value] of Object.entries(entries)) {
  const existing = await sql`select id from vault.secrets where name = ${name}`;
  if (existing.length) {
    await sql`select vault.update_secret(${existing[0].id}, ${value!})`;
    console.log(`updated vault secret: ${name}`);
  } else {
    await sql`select vault.create_secret(${value!}, ${name})`;
    console.log(`created vault secret: ${name}`);
  }
}
await sql.end();
console.log("✓ vault populated");
