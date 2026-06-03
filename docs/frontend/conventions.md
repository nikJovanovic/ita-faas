# Frontend conventions (vaja9)

Rules to follow when working on `frontend/`. These are firm.

## Components
- **shadcn/ui only** for UI. Before building anything, check
  <https://ui.shadcn.com/docs/components> and **reuse** an existing component or
  recipe. Do **not** hand-roll something shadcn already provides.
- **Never edit base shadcn components** in `src/components/ui/*` directly.
  - Custom wrappers around a base component (when the base won't do) **and** any
    from-scratch components shadcn lacks go in
    `src/app/components/custom/custom-{name}.tsx`.

## Icons
- Language / file icons use the **Material Icon Theme** SVGs (the VSCode
  extension), not the default VSCode icons.
- `material-icon-theme` is a **devDependency**, used only by
  `scripts/sync-icons.mjs` (runs before `dev`/`build`). It writes
  `src/lib/icon-map.json` (committed) and copies SVGs to `public/icons/`
  (gitignored). Resolver: `src/lib/file-icon.ts`; component:
  `custom-file-icon.tsx`. Unknown languages/extensions fall back to the
  default `file` icon.

## Quality bar
- **After every iteration run `bun run check`** (`tsc --noEmit && biome check`)
  and keep it clean before handing a slice back. `bun run format`
  (`biome check --write`) formats **and sorts imports**. Editor does both on
  save. Vendored shadcn (`components/ui/**`, `hooks/**`) is excluded from the
  Biome linter (still formatted) — never edit those.
- **Loading + empty states are required**, not optional: use shadcn `Skeleton`
  for loading and `Empty` for empty lists/results everywhere data is fetched.
- Toasts (`sonner`) on every mutation (create / update / delete / errors).

## Stack notes
- **Next.js 16** has breaking changes vs. older knowledge — read
  `node_modules/next/dist/docs/` (per `frontend/AGENTS.md`) before writing Next
  code; don't guess from memory.
- Client-side SPA: auth via `supabase-js` in the browser; data via `fetch` to
  the deployed **Edge Functions** (see `src/lib/api.ts`) with the user's JWT.
- Browser env vars must be prefixed `NEXT_PUBLIC_` (URL + publishable key only;
  never the secret key).
