# Frontend plan — CodeStash (vaja9)

A polished SPA for the FaaS snippet vault. See `conventions.md` for the rules.

## Stack & design
- Next.js 16 (App Router) · React 19 · Tailwind 4 · shadcn (`base-vega` / `mist`) · Biome
- **Aesthetic**: monospace everywhere (`html { font-mono }`), orange/amber `--primary`,
  shadcn Sidebar app-shell, light/dark via `next-themes`. "Code vault / terminal" feel.
- Client-side SPA → calls the deployed Supabase Edge Functions with the user's JWT.

## Feature map (mirrors the 5 backend functionalities)
| Area | UI | Functions used |
|------|----|----------------|
| Auth & Profile | auth card (tabs), user menu | supabase-js auth, `profile-get/update` |
| Snippets CRUD | card grid + Sheet editor | `snippets-create/list/get/update/delete` |
| Tags & Search | search bar, sidebar tag filter | `snippets-search`, `tags-list` |
| Attachments | upload + list in the editor | `attachments-create-url/list/delete` |
| Stats | stat cards | `stats-get` |

## Layout
- **Auth screen**: centered `Card` + `Tabs` (sign in / sign up).
- **App shell**: `Sidebar` (logo · New · tag filter · stats · user menu + theme toggle)
  + top bar (search, theme toggle, New) + main area.
- **Snippet list**: responsive **card grid** (title, language icon + badge, tag chips,
  highlighted body preview, relative time, actions).
- **Editor**: **Sheet** (slide-over) — title, language Combobox, tags, body, public switch,
  attachments section.

## Icon system
Material Icon Theme SVGs resolved by `lib/file-icon.ts` (`iconForLanguage`,
`iconForFileName`) via `icon-map.json`, rendered by `custom-file-icon.tsx`. Any
language or uploaded file extension resolves; unknowns fall back to the file icon.

## Polish
- **Shiki** syntax highlighting for snippet bodies (cards + editor), themed to match
  light/dark — the VSCode-style color coding.
- **Copy-to-clipboard** per snippet (toast + check animation).
- **⌘K command palette** (shadcn `Command`): search / jump / new / toggle theme.
  Shortcuts: ⌘N new, ⌘K search, ⌘↵ save, Esc close (hint with `Kbd`).
- **tw-animate-css** entrance/transition animations.
- **Colored tag chips** (deterministic from `--chart-*` tokens) + **relative timestamps**
  with exact-date tooltips.
- **Skeleton** loading states + **Empty** states everywhere data loads.

## Build increments (status)
1. ✅ Auth end-to-end — providers (theme/tooltip/toasts), API layer (`lib/api.ts`),
   auth gate (`page.tsx`), `custom-auth-form`. Turbopack root fix.
2. ✅ App shell — `Sidebar` + top bar + theme toggle + user menu (`custom-dashboard`
   owns data; `custom-app-sidebar` is presentational).
3. ✅ Snippet grid + cards — list/search/tag-filter, Skeleton + Empty states, Material
   language icons, relative time. (Shiki preview deferred to polish.)
4. ✅ Language Combobox (Popover + Command, Material icons) — `custom-language-combobox`.
5. ✅ Sheet editor — create/edit, tags, public switch, delete (AlertDialog), toasts;
   New button + card click wired (`custom-snippet-sheet`).
6. ✅ Attachments — upload (create-url → PUT) + list + delete in the editor
   (`custom-snippet-attachments`, edit mode only; optimistic delete, file icons).
7. ✅ Polish pass — Shiki highlighting (cards via `custom-code-block`, editor via
   `custom-code-editor` with a transparent textarea overlay + line-number gutter),
   copy buttons, ⌘K command palette (`custom-command-palette`), colored tag chips
   (`custom-tag-badge` from `--chart-*`), card entrance/hover animations, ⌘K hint.

> Keep this file's statuses updated as increments land.
