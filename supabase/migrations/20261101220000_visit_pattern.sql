/*
  Repeat-visit pattern for one puzzle (v7) — admin only.
  Rows:
    visits_1 / visits_2 / visits_3plus  = players by how many times they opened the puzzle
    gap_short / gap_hour / gap_later    = repeat opens by time since that player's previous open
                                          (under 2 min = reload or back-and-forth; 2–60 min; over 1 hour = came back later)
*/
create or replace function public.admin_visit_pattern(p_puzzle uuid, p_from date, p_to date)
returns table (bucket text, n bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with o as (
    select e.player_id, e.created_at,
           lag(e.created_at) over (partition by e.player_id order by e.created_at) as prev
    from public.play_events e
    where e.puzzle_id = p_puzzle and e.event = 'opened'
      and (e.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  ),
  per as (select o.player_id, count(*) as c from o group by o.player_id)
  select 'visits_1'::text, count(*) filter (where per.c = 1) from per
  union all select 'visits_2', count(*) filter (where per.c = 2) from per
  union all select 'visits_3plus', count(*) filter (where per.c >= 3) from per
  union all select 'gap_short', count(*) filter (where o.prev is not null and o.created_at - o.prev < interval '2 minutes') from o
  union all select 'gap_hour', count(*) filter (where o.created_at - o.prev >= interval '2 minutes' and o.created_at - o.prev < interval '1 hour') from o
  union all select 'gap_later', count(*) filter (where o.created_at - o.prev >= interval '1 hour') from o;
end $$;
grant execute on function public.admin_visit_pattern(uuid, date, date) to authenticated;
