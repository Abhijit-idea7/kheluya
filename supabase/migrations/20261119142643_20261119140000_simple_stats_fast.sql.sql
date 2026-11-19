/*
  Faster simple stats (v11b). Same six numbers, same results — computed in one pass instead of
  re-reading the events for every day, which could run past the database's time limit.
  - The date range now uses the created_at index (plain time bounds instead of a converted date).
  - "First visit ever" is looked up only for the players seen in the range, through a small index.
*/
create index if not exists play_events_opened_player_idx on public.play_events (player_id, created_at) where event = 'opened';

create or replace function public.admin_simple_stats(p_from date, p_to date, p_cutoff time default null)
returns table (day date, players bigint, new_players bigint, returning_players bigint, solvers bigint, shares bigint, via_links bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with ev as (
    select e.player_id, e.event, (e.created_at at time zone 'Asia/Kolkata') as ts
    from public.play_events e
    where e.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
      and e.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
      and e.event in ('opened', 'completed', 'shared', 'arrived')
  ),
  ev2 as (
    select ev.player_id, ev.event, ev.ts::date as d from ev
    where p_cutoff is null or ev.ts::time <= p_cutoff
  ),
  opened as (select distinct a.d, a.player_id from ev2 a where a.event = 'opened'),
  firsts as (
    select f.player_id, (min(f.created_at) at time zone 'Asia/Kolkata')::date as first_day
    from public.play_events f
    where f.event = 'opened' and f.player_id in (select distinct o.player_id from opened o)
    group by f.player_id
  ),
  o as (
    select op.d, count(*) as players,
      count(*) filter (where fi.first_day = op.d) as new_p,
      count(*) filter (where fi.first_day < op.d) as ret
    from opened op join firsts fi on fi.player_id = op.player_id
    group by op.d
  ),
  other as (
    select a.d,
      count(distinct a.player_id) filter (where a.event = 'completed') as solvers,
      count(*) filter (where a.event = 'shared') as shares,
      count(distinct a.player_id) filter (where a.event = 'arrived') as via
    from ev2 a group by a.d
  ),
  days as (select generate_series(p_from, p_to, interval '1 day')::date as d)
  select x.d, coalesce(o.players, 0)::bigint, coalesce(o.new_p, 0)::bigint, coalesce(o.ret, 0)::bigint,
    coalesce(t.solvers, 0)::bigint, coalesce(t.shares, 0)::bigint, coalesce(t.via, 0)::bigint
  from days x left join o on o.d = x.d left join other t on t.d = x.d
  order by x.d;
end $$;
grant execute on function public.admin_simple_stats(date, date, time) to authenticated;

-- Returning players (detailed stats): same results, one pass — each player's next visit day comes from a
-- window function instead of a lookup per row.
create or replace function public.admin_retention(p_from date, p_to date)
returns table (day date, active bigint, new_players bigint, returning_players bigint, back_next_day bigint, back_within_7 bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with act as (
    select distinct e.player_id, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e where e.event = 'opened'
  ),
  seq as (
    select a.player_id, a.d,
      min(a.d) over (partition by a.player_id) as first_day,
      lead(a.d) over (partition by a.player_id order by a.d) as next_day
    from act a
  )
  select s.d,
    count(*),
    count(*) filter (where s.first_day = s.d),
    count(*) filter (where s.first_day < s.d),
    count(*) filter (where s.next_day = s.d + 1),
    count(*) filter (where s.next_day between s.d + 1 and s.d + 7)
  from seq s
  where s.d between p_from and p_to
  group by s.d
  order by s.d;
end $$;
grant execute on function public.admin_retention(date, date) to authenticated;
