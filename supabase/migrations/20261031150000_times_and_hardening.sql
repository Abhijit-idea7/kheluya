/*
  1. Typical solving time per puzzle, for "बहुतेकांची वेळ".
     Only completions between 15 seconds and 3 hours count (filters reloads of finished puzzles
     and phones left open). The median is only returned once at least 10 people have solved it.
  2. Hardening flagged by the database linter: fixed search_path on helper functions, and the
     first-admin claim is callable by signed-in users only.
*/

create or replace function public.public_time_stats(p_puzzle uuid default null)
returns table (puzzle_id uuid, solvers bigint, median_ms numeric)
language sql stable security definer set search_path = public as $$
  with t as (
    select e.puzzle_id, e.session_id, min(e.value_ms) as ms
    from public.play_events e
    join public.puzzles p on p.id = e.puzzle_id
    where e.event = 'completed'
      and e.value_ms between 15000 and 10800000
      and p.status = 'live' and p.live_date <= public.ist_today()
      and (p_puzzle is null or e.puzzle_id = p_puzzle)
    group by e.puzzle_id, e.session_id
  )
  select t.puzzle_id,
         count(*) as solvers,
         case when count(*) >= 10 then round(percentile_cont(0.5) within group (order by t.ms)::numeric) end as median_ms
  from t
  group by t.puzzle_id
$$;
grant execute on function public.public_time_stats(uuid) to anon, authenticated;

-- Hardening
alter function public.ist_today() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;
