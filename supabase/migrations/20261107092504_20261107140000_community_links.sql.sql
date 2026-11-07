/*
  WhatsApp community links (v9). Links posted in the community end in ?s=cm (e.g. kheluya.in/12?s=cm).
  - "Came via shares" no longer includes community taps (they are counted separately).
  - admin_community(from, to): one row per day
      players        people who opened a puzzle from a community link that day
      new_players    ... for whom it was their first visit ever
      back_next_day  ... who played again the next day
*/
create or replace function public.admin_daily_stats(p_from date, p_to date, p_puzzle uuid default null)
returns table (
  day date, opens bigint, players bigint, started bigint, completed bigint,
  median_solve_ms numeric, play_ms bigint, shares bigint,
  share_whatsapp bigint, share_facebook bigint, share_instagram bigint, share_copy bigint, share_native bigint,
  arrivals bigint, suggested bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with ev as (
    select e.*, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e
    where (e.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
      and (p_puzzle is null or e.puzzle_id = p_puzzle)
  ),
  firsts as (
    -- each player's first finish of each puzzle, dated on the day it happened
    select distinct on (ev.puzzle_id, ev.player_id) ev.d, ev.value_ms as ms
    from ev where ev.event = 'completed' and ev.value_ms between 15000 and 10800000
    order by ev.puzzle_id, ev.player_id, ev.created_at
  )
  select g.d,
    g.opens, g.players, g.started, g.completed,
    case when g.d is null
      then (select percentile_cont(0.5) within group (order by f.ms) from firsts f)::numeric
      else (select percentile_cont(0.5) within group (order by f.ms) from firsts f where f.d = g.d)::numeric
    end,
    g.play_ms, g.shares, g.wa, g.fb, g.ig, g.cp, g.nat, g.arr, g.sug
  from (
    select ev.d,
      count(*) filter (where ev.event = 'opened') as opens,
      count(distinct ev.player_id) filter (where ev.event = 'opened') as players,
      count(distinct ev.player_id::text || ev.puzzle_id::text) filter (where ev.event in ('started', 'completed')) as started,
      count(distinct ev.player_id::text || ev.puzzle_id::text) filter (where ev.event = 'completed') as completed,
      coalesce(sum(ev.value_ms) filter (where ev.event = 'left'), 0)::bigint as play_ms,
      count(*) filter (where ev.event = 'shared') as shares,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'whatsapp') as wa,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'facebook') as fb,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'instagram') as ig,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'copy') as cp,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'native') as nat,
      count(distinct ev.player_id) filter (where ev.event = 'arrived' and ev.ref is distinct from 'cm') as arr,
      count(distinct ev.session_id) filter (where ev.event = 'suggested') as sug
    from ev
    group by grouping sets ((ev.d), ())
  ) g
  order by g.d nulls first;
end $$;
grant execute on function public.admin_daily_stats(date, date, uuid) to authenticated;

create or replace function public.admin_puzzle_stats(p_from date default null, p_to date default null)
returns table (
  puzzle_id uuid, number int, name_mr text, type_name text, live_date date,
  opens bigint, players bigint, started bigint, completed bigint,
  median_solve_ms numeric, avg_solve_ms numeric, total_play_ms bigint,
  shares bigint, share_whatsapp bigint, share_facebook bigint, share_instagram bigint,
  share_copy bigint, share_native bigint, arrivals bigint, suggested bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with ev as (
    select e.* from public.play_events e
    where (p_from is null or (e.created_at at time zone 'Asia/Kolkata')::date >= p_from)
      and (p_to is null or (e.created_at at time zone 'Asia/Kolkata')::date <= p_to)
  ),
  solves as (
    select ev.puzzle_id, ev.player_id, (array_agg(ev.value_ms order by ev.created_at))[1] as ms
    from ev where ev.event = 'completed' and ev.value_ms between 15000 and 10800000
    group by ev.puzzle_id, ev.player_id
  ),
  solve_stats as (
    select s.puzzle_id,
           percentile_cont(0.5) within group (order by s.ms)::numeric as med,
           avg(s.ms)::numeric as av
    from solves s group by s.puzzle_id
  )
  select p.id, p.number, p.name_mr, t.name_mr, p.live_date,
    count(*) filter (where ev.event = 'opened'),
    count(distinct ev.player_id) filter (where ev.event = 'opened'),
    count(distinct ev.player_id) filter (where ev.event in ('started', 'completed')),
    count(distinct ev.player_id) filter (where ev.event = 'completed'),
    max(ss.med),
    max(ss.av),
    coalesce(sum(ev.value_ms) filter (where ev.event = 'left'), 0)::bigint,
    count(*) filter (where ev.event = 'shared'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'whatsapp'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'facebook') as fb,
    count(*) filter (where ev.event = 'shared' and ev.channel = 'instagram'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'copy'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'native'),
    count(distinct ev.player_id) filter (where ev.event = 'arrived' and ev.ref is distinct from 'cm'),
    count(distinct ev.session_id) filter (where ev.event = 'suggested')
  from public.puzzles p
  join public.puzzle_types t on t.id = p.type_id
  left join ev on ev.puzzle_id = p.id
  left join solve_stats ss on ss.puzzle_id = p.id
  group by p.id, t.name_mr
  order by (p.status = 'live' and p.live_date is not null) desc, p.live_date desc nulls last, p.number desc;
end $$;
grant execute on function public.admin_puzzle_stats(date, date) to authenticated;

create or replace function public.admin_community(p_from date, p_to date)
returns table (day date, players bigint, new_players bigint, back_next_day bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with act as (
    select distinct e.player_id, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e where e.event = 'opened'
  ),
  firsts as (select a.player_id, min(a.d) as f from act a group by a.player_id),
  cm as (
    select distinct e.player_id, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e
    where e.event = 'arrived' and e.ref = 'cm'
      and (e.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  )
  select c.d,
    count(*),
    count(*) filter (where fi.f = c.d),
    count(*) filter (where exists (select 1 from act b where b.player_id = c.player_id and b.d = c.d + 1))
  from cm c left join firsts fi on fi.player_id = c.player_id
  group by c.d
  order by c.d;
end $$;
grant execute on function public.admin_community(date, date) to authenticated;
