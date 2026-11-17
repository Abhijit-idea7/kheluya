/*
  Daily reminder notifications (v12). No login: a subscription belongs to a phone's browser, like player_id.

  push_subscriptions  one row per phone that said "yes" (endpoint + browser keys). Visitors can only add or
                      switch off their own row through the two public_* functions; nobody can read the table.
  push_keys           the site's notification key pair, made once by the send function. Locked: only the
                      server function (service role) reads it; the public half is handed out by public_push_key().
  push_log            one row per sending (daily / test / now), for Admin → Notifications.

  Settings (site_settings): push_on, push_time ('07:00'), push_title, push_body ({name} = today's puzzle type).
  The daily timer (pg_cron) calls the send function every 15 minutes; the function itself sends only once a
  day, at or after push_time (India time), so calling it more often is harmless.
*/

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (length(endpoint) between 10 and 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  player_id uuid,
  active boolean not null default true,
  failures int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "admins read subscriptions" on public.push_subscriptions;
create policy "admins read subscriptions" on public.push_subscriptions for select to authenticated using (public.is_admin());

create table if not exists public.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_keys enable row level security; -- no policies: only the service role can read it

create table if not exists public.push_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Asia/Kolkata')::date),
  kind text not null check (kind in ('daily', 'test', 'now')),
  title text not null default '',
  body text not null default '',
  sent int not null default 0,
  failed int not null default 0,
  removed int not null default 0
);
-- At most one daily sending per India day, even if the timer fires twice at once
create unique index if not exists push_log_one_daily on public.push_log (day) where kind = 'daily';
alter table public.push_log enable row level security;
drop policy if exists "admins read push log" on public.push_log;
create policy "admins read push log" on public.push_log for select to authenticated using (public.is_admin());

-- Visitors: say yes / switch off. Re-subscribing the same phone just refreshes its row.
create or replace function public.public_push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_player uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_endpoint !~ '^https://' then raise exception 'bad endpoint'; end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, player_id)
  values (p_endpoint, p_p256dh, p_auth, p_player)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    player_id = coalesce(excluded.player_id, public.push_subscriptions.player_id),
    active = true, failures = 0, updated_at = now();
end $$;
grant execute on function public.public_push_subscribe(text, text, text, uuid) to anon, authenticated;

create or replace function public.public_push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  update public.push_subscriptions set active = false, updated_at = now() where endpoint = p_endpoint;
$$;
grant execute on function public.public_push_unsubscribe(text) to anon, authenticated;

-- The public half of the key pair (null until the send function has made the keys).
create or replace function public.public_push_key()
returns text language sql stable security definer set search_path = public as $$
  select public_key from public.push_keys where id = 1;
$$;
grant execute on function public.public_push_key() to anon, authenticated;

-- Default settings (only added if missing; Admin can change them)
insert into public.site_settings (key, value) values
  ('push_on', 'false'::jsonb),
  ('push_time', '"07:00"'::jsonb),
  ('push_title', '"आजचे कोडे आले आहे"'::jsonb),
  ('push_body', '"{name} — चला खेळूया!"'::jsonb)
on conflict (key) do nothing;

-- The daily timer needs pg_cron and pg_net. Turn them on if this database allows it (Admin shows the result).
do $$ begin
  begin create extension if not exists pg_net; exception when others then raise notice 'pg_net not available: %', sqlerrm; end;
  begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron not available: %', sqlerrm; end;
end $$;

-- Admin: start (or restart) the timer. The site passes its own address and public key, so nothing secret is stored.
create or replace function public.admin_push_schedule(p_url text, p_anon text)
returns text language plpgsql security definer set search_path = public as $$
declare cmd text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if not exists (select 1 from pg_extension where extname = 'pg_cron') or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return 'no-cron';
  end if;
  cmd := format(
    'select net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', %L, ''apikey'', %L), body := ''{"mode":"tick"}''::jsonb)',
    rtrim(p_url, '/') || '/functions/v1/push-send', 'Bearer ' || p_anon, p_anon);
  execute 'select cron.unschedule(jobid) from cron.job where jobname = ''ck-push-tick''';
  execute format('select cron.schedule(%L, %L, %L)', 'ck-push-tick', '*/15 * * * *', cmd);
  return 'ok';
exception when others then
  return 'error: ' || sqlerrm;
end $$;
grant execute on function public.admin_push_schedule(text, text) to authenticated;

-- Admin: everything the Notifications page shows.
create or replace function public.admin_push_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare timer boolean := false;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  begin
    execute 'select exists (select 1 from cron.job where jobname = ''ck-push-tick'')' into timer;
  exception when others then timer := false;
  end;
  return jsonb_build_object(
    'keys', exists (select 1 from public.push_keys),
    'timer', timer,
    'cron_available', exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net'),
    'active', (select count(*) from public.push_subscriptions where active),
    'stopped', (select count(*) from public.push_subscriptions where not active),
    'new_7d', (select count(*) from public.push_subscriptions where active and created_at > now() - interval '7 days'),
    'log', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select l.created_at, l.day, l.kind, l.title, l.body, l.sent, l.failed, l.removed,
          (select count(distinct e.player_id) from public.play_events e
            where e.event = 'arrived' and e.ref = 'pn' and (e.created_at at time zone 'Asia/Kolkata')::date = l.day) as taps
        from public.push_log l order by l.created_at desc limit 30
      ) x), '[]'::jsonb)
  );
end $$;
grant execute on function public.admin_push_summary() to authenticated;
