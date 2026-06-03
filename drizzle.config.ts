import { defineConfig } from "drizzle-kit";

// `bun run …` auto-loads .env, so process.env.DATABASE_URL is populated.
// DATABASE_URL is used only by Drizzle Kit (migrations) and the local
// smoke test — deployed Edge Functions use Supabase's injected SUPABASE_DB_URL.
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only manage the public schema — never touch Supabase's auth/storage schemas.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
