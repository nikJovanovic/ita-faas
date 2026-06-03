import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Pin Turbopack's root to this app — the repo has a second lockfile at the
// root (backend tooling), which otherwise makes Next infer the wrong root.
const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root },
};

export default nextConfig;
