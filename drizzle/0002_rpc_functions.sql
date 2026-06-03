-- Custom SQL migration file, put your code below! --
-- ============================================================
--  DB helper functions called by Edge Functions via RPC.
-- ============================================================

-- Full-text search over title+body. SECURITY INVOKER (default) so RLS
-- applies — callers only get their own + public snippets. Uses the
-- snippets_fts_idx expression index created in 0001.
create or replace function public.search_snippets(q text, lim int default 20, off int default 0)
returns setof public.snippets
language sql
stable
as $$
  select *
  from public.snippets
  where q is null or q = ''
     or to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
        @@ websearch_to_tsquery('simple', q)
  order by updated_at desc
  limit greatest(lim, 0) offset greatest(off, 0);
$$;

-- Recompute a user's tag histogram from their snippets. Called by the
-- on-snippet-change Edge Function with the service-role key (bypasses RLS).
create or replace function public.recompute_tag_counts(uid uuid)
returns void
language plpgsql
as $$
begin
  delete from public.tag_counts where user_id = uid;
  insert into public.tag_counts (user_id, tag, count)
  select uid, t.tag, count(*)
  from public.snippets s
  cross join lateral unnest(s.tags) as t(tag)
  where s.user_id = uid
  group by t.tag;
end;
$$;

-- Build/refresh today's per-user digest. Called by the daily-digest
-- Edge Function (cron) with the service-role key. Returns rows written.
create or replace function public.run_daily_digest()
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into public.digests (user_id, period, summary)
  select p.id, current_date,
         jsonb_build_object(
           'snippets',    (select count(*) from public.snippets s    where s.user_id  = p.id),
           'tags',        (select count(*) from public.tag_counts tc  where tc.user_id = p.id),
           'attachments', (select count(*) from public.attachments a  where a.user_id  = p.id)
         )
  from public.profiles p
  on conflict (user_id, period)
  do update set summary = excluded.summary, created_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Lock down the privileged helpers: only the service role may execute them.
revoke execute on function public.recompute_tag_counts(uuid) from public, anon, authenticated;
revoke execute on function public.run_daily_digest()        from public, anon, authenticated;
