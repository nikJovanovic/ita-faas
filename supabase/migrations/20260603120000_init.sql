-- ============================================================
--  CodeStash — initial schema  (vaja8 / FaaS)
--  A snippet & note vault. The DB only stores data + enforces
--  RLS. All business logic lives in Edge Functions that are
--  triggered by events (auth, DB changes, storage, cron).
-- ============================================================

-- Extensions used later for event wiring (cron jobs + outbound
-- HTTP calls from the DB to Edge Functions).
create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- profiles : one row per auth user (bootstrapped by the
--            `on-user-created` Edge Function — USER event)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  snippet_count integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- snippets : the core entity
-- ------------------------------------------------------------
create table if not exists public.snippets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  language   text not null default 'plaintext',
  tags       text[] not null default '{}',
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists snippets_user_id_idx on public.snippets(user_id);
create index if not exists snippets_tags_idx    on public.snippets using gin(tags);
create index if not exists snippets_fts_idx      on public.snippets
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,'')));

-- ------------------------------------------------------------
-- tag_counts : per-user tag histogram, recomputed by the
--              `on-snippet-change` Edge Function (DATA-CHANGE event)
-- ------------------------------------------------------------
create table if not exists public.tag_counts (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag     text not null,
  count   integer not null default 0,
  primary key (user_id, tag)
);

-- ------------------------------------------------------------
-- attachments : metadata filled in by the
--               `on-attachment-uploaded` Edge Function (STORAGE event)
-- ------------------------------------------------------------
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  snippet_id   uuid references public.snippets(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name    text,
  mime_type    text,
  size_bytes   bigint,
  metadata     jsonb not null default '{}',
  processed    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists attachments_snippet_idx on public.attachments(snippet_id);

-- ------------------------------------------------------------
-- digests : daily per-user summary, written by the
--           `daily-digest` Edge Function (SCHEDULED event)
-- ------------------------------------------------------------
create table if not exists public.digests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  period     date not null,
  summary    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

-- ------------------------------------------------------------
-- keep snippets.updated_at fresh
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists snippets_set_updated_at on public.snippets;
create trigger snippets_set_updated_at
  before update on public.snippets
  for each row execute function public.set_updated_at();

-- ============================================================
--  Row Level Security — owner-only access.
--  Edge Functions use the service-role key and bypass RLS.
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.snippets    enable row level security;
alter table public.tag_counts  enable row level security;
alter table public.attachments enable row level security;
alter table public.digests     enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- snippets (owner full access; public ones are world-readable)
create policy "snippets_select_own_or_public" on public.snippets
  for select using (auth.uid() = user_id or is_public);
create policy "snippets_insert_own" on public.snippets
  for insert with check (auth.uid() = user_id);
create policy "snippets_update_own" on public.snippets
  for update using (auth.uid() = user_id);
create policy "snippets_delete_own" on public.snippets
  for delete using (auth.uid() = user_id);

-- tag_counts / attachments / digests : owner read-only
create policy "tag_counts_select_own" on public.tag_counts
  for select using (auth.uid() = user_id);
create policy "attachments_select_own" on public.attachments
  for select using (auth.uid() = user_id);
create policy "attachments_delete_own" on public.attachments
  for delete using (auth.uid() = user_id);
create policy "digests_select_own" on public.digests
  for select using (auth.uid() = user_id);

-- ============================================================
--  Storage bucket for attachments + owner-scoped policies.
--  Files live under  attachments/<user_id>/<file>
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "attachments_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "attachments_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
