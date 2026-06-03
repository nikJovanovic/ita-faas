// Connectivity smoke test for the Supabase Postgres pooler.
// Verifies DATABASE_URL works before running migrations.
//   Run:  bun run index.ts
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set (.env)");

// prepare:false is required for the transaction-mode pooler (port 6543).
const sql = postgres(connectionString, { prepare: false });

const rows = await sql<{ now: string }[]>`select now()`;
console.log("✅ Connected to Supabase Postgres —", rows[0]?.now);

await sql.end();
