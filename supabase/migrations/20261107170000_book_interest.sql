/*
  Book interest + shop visits (v10)
  - subscribers: two optional extras from the book form — copies wanted, and a note ("which puzzles should the book have?").
  - site_events: page-level counting that is not about one puzzle (insert-only for visitors, like play_events).
      shop_view        the shop page was opened
      book_form_start  someone started filling the book form
  - admin_shop_stats(from, to): one row per India day — visitors (people), views, started, interested (numbers left), copies.
*/
alter table public.subscribers add column if not exists copies smallint check (copies is null or copies between 1 and 50);
alter table public.subscribers add column if not exists note text not null default '' check (length(note) <= 500);

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  session_id uuid not null,
  event text not null check (event in ('shop_view', 'book_form_start')),
  created_at timestamptz not null default now()
);
create index if not exists site_events_created_idx on public.site_events (created_at);
alter table public.site_events enable row level security;
drop policy if exists "anyone counts site visits" on public.site_events;
create policy "anyone counts site visits" on public.site_events for insert to anon, authenticated with check (true);
drop policy if exists "admins read site events" on public.site_events;
create policy "admins read site events" on public.site_events for select to authenticated using (public.is_admin());
grant insert on public.site_events to anon, authenticated;

create or replace function public.admin_shop_stats(p_from date, p_to date)
returns table (day date, visitors bigint, views bigint, started bigint, interested bigint, copies bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with days as (select generate_series(p_from, p_to, interval '1 day')::date as d),
  ev as (
    select (e.created_at at time zone 'Asia/Kolkata')::date as d, e.player_id, e.event
    from public.site_events e
    where (e.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  ),
  subs as (
    select (s.created_at at time zone 'Asia/Kolkata')::date as d, s.phone, s.copies
    from public.subscribers s
    where s.source_page = '/dukan' and (s.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  )
  select x.d,
    (select count(distinct ev.player_id) from ev where ev.d = x.d and ev.event = 'shop_view'),
    (select count(*) from ev where ev.d = x.d and ev.event = 'shop_view'),
    (select count(distinct ev.player_id) from ev where ev.d = x.d and ev.event = 'book_form_start'),
    (select count(distinct subs.phone) from subs where subs.d = x.d),
    (select coalesce(sum(subs.copies), 0) from subs where subs.d = x.d)::bigint
  from days x
  order by x.d;
end $$;
grant execute on function public.admin_shop_stats(date, date) to authenticated;
