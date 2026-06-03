-- Custom SQL migration file, put your code below! --
-- ============================================================
--  Supabase-specific setup that Drizzle's schema can't model:
--  FKs to auth.users, RLS + policies, the attachments storage
--  bucket + policies, the updated_at trigger, and the FTS index.
--  (pg_net / pg_cron + the event triggers come in a later migration,
--   once the Edge Functions are deployed.)
-- ============================================================

-- ---- Foreign keys to Supabase's auth.users ----------------------
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
alter table public.snippets
  add constraint snippets_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.tag_counts
  add constraint tag_counts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.attachments
  add constraint attachments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.digests
  add constraint digests_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ---- Full-text search index on snippets -------------------------
create index if not exists snippets_fts_idx on public.snippets
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));

-- ---- updated_at maintenance -------------------------------------
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

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "snippets_select_own_or_public" on public.snippets
  for select using (auth.uid() = user_id or is_public);
create policy "snippets_insert_own" on public.snippets
  for insert with check (auth.uid() = user_id);
create policy "snippets_update_own" on public.snippets
  for update using (auth.uid() = user_id);
create policy "snippets_delete_own" on public.snippets
  for delete using (auth.uid() = user_id);

create policy "tag_counts_select_own" on public.tag_counts
  for select using (auth.uid() = user_id);
create policy "attachments_select_own" on public.attachments
  for select using (auth.uid() = user_id);
create policy "digests_select_own" on public.digests
  for select using (auth.uid() = user_id);

-- ============================================================
--  Storage bucket for attachments + owner-scoped policies.
--  Files live under  attachments/<user_id>/<filename>
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
