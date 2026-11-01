/*
  Daily stats for the admin trend charts (v5)
  admin_daily_stats(from, to, puzzle) returns one row per India-time day, plus one totals row
  where day is null (true unique players for the whole period, not a sum of days).
  Pass a puzzle id for a single puzzle, or null for the whole site. Admin only.
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
  solves as (
    select ev.d, ev.session_id, min(ev.value_ms) as ms
    from ev where ev.event = 'completed' and ev.value_ms between 15000 and 10800000
    group by ev.d, ev.session_id
  )
  select g.d,
    g.opens, g.players, g.started, g.completed,
    case when g.d is null
      then (select percentile_cont(0.5) within group (order by s.ms) from solves s)::numeric
      else (select percentile_cont(0.5) within group (order by s.ms) from solves s where s.d = g.d)::numeric
    end,
    g.play_ms, g.shares, g.wa, g.fb, g.ig, g.cp, g.nat, g.arr, g.sug
  from (
    select ev.d,
      count(*) filter (where ev.event = 'opened') as opens,
      count(distinct ev.player_id) filter (where ev.event = 'opened') as players,
      count(distinct ev.session_id) filter (where ev.event in ('started', 'completed')) as started,
      count(distinct ev.session_id) filter (where ev.event = 'completed') as completed,
      coalesce(sum(ev.value_ms) filter (where ev.event = 'left'), 0)::bigint as play_ms,
      count(*) filter (where ev.event = 'shared') as shares,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'whatsapp') as wa,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'facebook') as fb,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'instagram') as ig,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'copy') as cp,
      count(*) filter (where ev.event = 'shared' and ev.channel = 'native') as nat,
      count(distinct ev.player_id) filter (where ev.event = 'arrived') as arr,
      count(distinct ev.session_id) filter (where ev.event = 'suggested') as sug
    from ev
    group by grouping sets ((ev.d), ())
  ) g
  order by g.d nulls first;
end $$;
grant execute on function public.admin_daily_stats(date, date, uuid) to authenticated;
