# CodeStash — Serverless Snippet Vault (FaaS)

A serverless backend built on **Supabase** (Postgres + Edge Functions) for storing
code snippets / notes with file attachments, tags, search and daily digests.

This is the FaaS backend for **vaja8**. The frontend (vaja9) is a separate SPA that
talks to these functions over HTTPS.

## Architecture

The database only stores data and enforces **Row Level Security**. All business
logic lives in **Edge Functions** (Deno/TypeScript) that are either called over
HTTP or triggered by events.

### 5 main functionalities

| # | Functionality   | Functions |
|---|-----------------|-----------|
| 1 | **Auth & Profiles** | `on-user-created` (event), `profile-get`, `profile-update` |
| 2 | **Snippets CRUD**   | `snippets-create`, `snippets-get`, `snippets-list`, `snippets-update`, `snippets-delete` |
| 3 | **Tags & Search**   | `on-snippet-change` (event), `snippets-search`, `tags-list` |
| 4 | **Attachments**     | `attachments-create-url`, `on-attachment-uploaded` (event), `attachments-list`, `attachments-delete` |
| 5 | **Digest & Stats**  | `daily-digest` (event), `cleanup-orphans` (event), `stats-get` |

### 4+ event types (requirement: ≥4)

| Event type        | Trigger                                   | Function |
|-------------------|-------------------------------------------|----------|
| **User events**   | new row in `auth.users` (signup)          | `on-user-created` |
| **Data changes**  | INSERT/UPDATE/DELETE on `public.snippets` | `on-snippet-change` |
| **Storage/files** | upload into `attachments` bucket          | `on-attachment-uploaded` |
| **Time/scheduled**| `pg_cron` daily schedule                  | `daily-digest`, `cleanup-orphans` |

Authentication is handled by **Supabase Auth** (JWT). HTTP functions validate the
caller's token; event functions run with the service-role key.

## Project layout

```
supabase/
  config.toml
  migrations/         # database schema, RLS, cron + webhook wiring
  functions/          # Edge Functions (one folder each)
    _shared/          # cors + auth helpers shared by all functions
```

## Setup

```bash
supabase link --project-ref iemafnwkncyzlxoqyuzm   # already done
supabase db push                                   # apply migrations to the cloud DB
supabase functions deploy                          # deploy all Edge Functions
```

Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are
auto-injected into deployed functions. Copy `.env.example` → `.env` for local dev
and the frontend. **Never commit `.env`.**

## Testing

A Postman collection lives in `docs/` and exercises every function end-to-end.
