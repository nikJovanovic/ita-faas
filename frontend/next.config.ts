import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const frontendDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(frontendDir);

// Single source of truth: load the repo-root .env so the frontend reuses the
// same Supabase values as the backend tooling — no separate frontend env file.
// forceReload (4th arg) is required: Next already memoized env from the frontend
// dir before this config runs, so without it the root .env is never read.
const { combinedEnv } = loadEnvConfig(
  repoRoot,
  process.env.NODE_ENV !== "production",
  undefined,
  true,
);

const rootEnv = combinedEnv ?? process.env;

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack's root to this app (the repo root has a second lockfile).
  turbopack: { root: frontendDir },
  // Expose the root-level values to the browser under NEXT_PUBLIC_ names.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: rootEnv.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      rootEnv.SUPABASE_PUBLISHABLE_KEY ?? "",
  },
};

export default nextConfig;
