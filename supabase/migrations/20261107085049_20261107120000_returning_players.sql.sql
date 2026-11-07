/*
  Returning players (v8) — admin only. A "player" = one phone/browser (player_id); a day = India time.
  admin_retention(from, to): one row per day
    active          players who opened a puzzle that day
    new_players     ... whose first visit ever was that day
    returning_players ... who had visited on an earlier day
    back_next_day   ... who came back the very next day
    back_within_7   ... who came back within the next 7 days
  admin_retention_summary(from, to): the period at a glance
    players, new_players, came_back (played on 2+ different days in the period), regulars (4+ days), avg_days
*/
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
  firsts as (select a.player_id, min(a.d) as f from act a group by a.player_id)
  select a.d,
    count(*),
    count(*) filter (where fi.f = a.d),
    count(*) filter (where fi.f < a.d),
    count(*) filter (where exists (select 1 from act b where b.player_id = a.player_id and b.d = a.d + 1)),
    count(*) filter (where exists (select 1 from act b where b.player_id = a.player_id and b.d between a.d + 1 and a.d + 7))
  from act a join firsts fi on fi.player_id = a.player_id
  where a.d between p_from and p_to
  group by a.d
  order by a.d;
end $$;
grant execute on function public.admin_retention(date, date) to authenticated;

create or replace function public.admin_retention_summary(p_from date, p_to date)
returns table (players bigint, new_players bigint, came_back bigint, regulars bigint, avg_days numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with act as (
    select distinct e.player_id, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e where e.event = 'opened'
  ),
  firsts as (select a.player_id, min(a.d) as f from act a group by a.player_id),
  per as (
    select a.player_id, count(*) as days
    from act a where a.d between p_from and p_to group by a.player_id
  )
  select count(*),
    count(*) filter (where fi.f between p_from and p_to),
    count(*) filter (where p.days >= 2),
    count(*) filter (where p.days >= 4),
    round(coalesce(avg(p.days), 0)::numeric, 2)
  from per p join firsts fi on fi.player_id = p.player_id;
end $$;
grant execute on function public.admin_retention_summary(date, date) to authenticated;
