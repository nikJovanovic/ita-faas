# CodeStash — Serverless Snippet Vault (FaaS)

A serverless backend on **Supabase** for storing code snippets / notes with file
attachments, tags, full-text search, per-user stats and daily digests.

This is the FaaS backend for **vaja8**. The frontend (vaja9) is a separate SPA that
talks to these functions over HTTPS.

## Stack

- **Supabase Edge Functions** (Deno / TypeScript) — the FaaS layer (17 functions)
- **Supabase Postgres** — data + Row Level Security
- **Drizzle ORM / Kit** — owns the DB schema and migrations
- **Supabase Auth** (JWT) — authentication
- **pg_net + pg_cron + Vault** — event wiring (webhooks + scheduled jobs)

## Architecture

The database only stores data and enforces **Row Level Security**. All business
logic lives in **Edge Functions** that are either called over HTTP or triggered by
events. Drizzle manages the schema; the functions talk to the DB with `supabase-js`.

### 5 main functionalities (17 functions)

| # | Functionality | Functions |
|---|---------------|-----------|
| 1 | **Auth & Profiles** | `on-user-created` (event), `profile-get`, `profile-update` |
| 2 | **Snippets CRUD**   | `snippets-create`, `snippets-get`, `snippets-list`, `snippets-update`, `snippets-delete` |
| 3 | **Tags & Search**   | `on-snippet-change` (event), `snippets-search` (full-text), `tags-list` |
| 4 | **Attachments**     | `attachments-create-url`, `on-attachment-uploaded` (event), `attachments-list`, `attachments-delete` |
| 5 | **Digest & Stats**  | `daily-digest` (event/cron), `stats-get` |

### 4 event types (requirement: ≥4)

| Event type | Source | → Function |
|------------|--------|------------|
| **User** | trigger on `auth.users` INSERT | `on-user-created` (bootstraps a profile) |
| **Data change** | trigger on `public.snippets` INSERT/UPDATE/DELETE | `on-snippet-change` (recomputes tag counts + snippet count) |
| **Storage** | trigger on `storage.objects` INSERT | `on-attachment-uploaded` (fills size/mime, marks processed) |
| **Scheduled** | `pg_cron` daily at 06:00 UTC | `daily-digest` (writes per-user digest) |

Triggers POST to the functions via `pg_net`; the function URL, publishable key and a
shared `WEBHOOK_SECRET` are read from **Supabase Vault** at runtime (see
`drizzle/0003_event_wiring.sql`).

### Authentication & security

- **HTTP functions** use a `supabase-js` client bound to the caller's JWT, so
  PostgREST enforces RLS and `auth.uid()` resolves to the caller.
- **Event functions** use the service-role key (bypass RLS) and verify a
  `x-webhook-secret` header (`verify_jwt = false` in `config.toml`).
- Every table has RLS with owner-only policies; the `attachments` storage bucket is
  private with per-user folder policies.

## Project layout

```
drizzle/
  schema.ts            # Drizzle table definitions (source of truth)
  0000_*.sql           # generated: tables + indexes
  0001_supabase_setup  # FKs to auth.users, RLS, storage bucket, FTS index, trigger
  0002_rpc_functions   # search_snippets, recompute_tag_counts, run_daily_digest
  0003_event_wiring    # pg_net/pg_cron, triggers, cron job
drizzle.config.ts
supabase/
  config.toml          # event functions set verify_jwt = false
  functions/
    _shared/           # cors, http, supabase clients, webhook-secret guard
    <function>/index.ts
scripts/
  test-curl.sh         # exercises every function (curl, reads .env)
  test-api.ts          # HTTP CRUD smoke test
  test-events.ts       # verifies all 4 events fire
  setup-events.ts      # loads Vault config from .env
  cleanup-test-data.ts # purges test users + orphaned storage objects
```

## Setup

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli), Bun and Deno.
Copy `.env.example` → `.env` and fill in the values (**never commit `.env`**).

```bash
supabase link --project-ref iemafnwkncyzlxoqyuzm

# 1. database — Drizzle owns the schema
bun run db:migrate

# 2. deploy the Edge Functions (server-side bundling, no Docker)
supabase functions deploy --use-api

# 3. event wiring — populate Vault + set the function secret (same value)
bun run scripts/setup-events.ts
supabase secrets set WEBHOOK_SECRET=<your-webhook-secret>
```

Supabase auto-injects `SUPABASE_URL` and the keys into deployed functions, so the
runtime needs no manual secret setup beyond `WEBHOOK_SECRET`.

## Testing

```bash
./scripts/test-curl.sh        # all functions + auth/secret negative tests (curl)
bun run scripts/test-api.ts   # HTTP CRUD only
bun run scripts/test-events.ts # verifies the 4 event types fire
```

`test-curl.sh` is the primary end-to-end check — it reads secrets from `.env`, signs
in a test user, calls every function, and asserts that unauthenticated / unsigned
requests are rejected (401 / 403).
