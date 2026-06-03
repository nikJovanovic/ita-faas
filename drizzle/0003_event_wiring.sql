-- Custom SQL migration file, put your code below! --
-- ============================================================
--  Phase 4 — event wiring. Connects the 4 event sources to their
--  Edge Functions via pg_net (HTTP) and pg_cron (schedule).
--
--  Config (project URL, publishable key, webhook secret) is read
--  from Supabase Vault at runtime — populate it once with
--  `bun run scripts/setup-events.ts` (values come from .env), so no
--  environment-specific values live in this committed migration.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- POST a JSON payload to an Edge Function. SECURITY DEFINER so it can
-- read Vault + use pg_net regardless of which role fired the trigger.
create or replace function public.call_edge_function(fn text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  pub_key  text;
  secret   text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into pub_key  from vault.decrypted_secrets where name = 'publishable_key';
  select decrypted_secret into secret   from vault.decrypted_secrets where name = 'webhook_secret';
  if base_url is null then
    raise warning 'call_edge_function: vault secret project_url missing — run scripts/setup-events.ts';
    return;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', coalesce(pub_key, ''),
      'Authorization', 'Bearer ' || coalesce(pub_key, ''),
      'x-webhook-secret', coalesce(secret, '')
    ),
    body := payload
  );
end;
$$;

-- ---- DATA-CHANGE event: public.snippets I/U/D -------------------
create or replace function public.on_snippets_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.call_edge_function('on-snippet-change', jsonb_build_object(
    'type', tg_op,
    'record', to_jsonb(new),
    'old_record', to_jsonb(old)
  ));
  return null;
end;
$$;

drop trigger if exists snippets_changed on public.snippets;
create trigger snippets_changed
  after insert or update or delete on public.snippets
  for each row execute function public.on_snippets_changed();

-- ---- USER event: auth.users INSERT ------------------------------
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.call_edge_function('on-user-created', jsonb_build_object(
    'type', 'INSERT',
    'record', to_jsonb(new)
  ));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ---- STORAGE event: storage.objects INSERT (attachments) --------
create or replace function public.on_storage_object_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bucket_id = 'attachments' then
    perform public.call_edge_function('on-attachment-uploaded', jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(new)
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists on_storage_object_created on storage.objects;
create trigger on_storage_object_created
  after insert on storage.objects
  for each row execute function public.on_storage_object_created();

-- ---- SCHEDULED event: pg_cron daily digest at 06:00 UTC ---------
select cron.unschedule(jobid) from cron.job where jobname = 'daily-digest';
select cron.schedule(
  'daily-digest',
  '0 6 * * *',
  $cron$ select public.call_edge_function('daily-digest', '{}'::jsonb) $cron$
);
