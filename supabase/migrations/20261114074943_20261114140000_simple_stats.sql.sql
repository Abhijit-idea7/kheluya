/*
  Simple daily stats (v11) — six numbers per India day, all counted as PEOPLE (one phone = one person), never page loads.
    players            people who opened a puzzle
    new_players        ... whose first visit ever was that day
    returning_players  ... who had played on an earlier day
    solvers            people who finished at least one puzzle
    shares             taps on a share button
    via_links          people who arrived through a shared or community link
  p_cutoff (India clock time, optional): count only up to that time of day — used to compare
  "today so far" with "yesterday by the same time".
*/
create or replace function public.admin_simple_stats(p_from date, p_to date, p_cutoff time default null)
returns table (day date, players bigint, new_players bigint, returning_players bigint, solvers bigint, shares bigint, via_links bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with ev as (
    select e.player_id, e.event, (e.created_at at time zone 'Asia/Kolkata') as ts
    from public.play_events e
    where (e.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  ),
  ev2 as (
    select ev.player_id, ev.event, ev.ts::date as d from ev
    where p_cutoff is null or ev.ts::time <= p_cutoff
  ),
  firsts as (
    select f.player_id, min((f.created_at at time zone 'Asia/Kolkata')::date) as first_day
    from public.play_events f where f.event = 'opened' group by f.player_id
  ),
  days as (select generate_series(p_from, p_to, interval '1 day')::date as d)
  select x.d,
    (select count(distinct a.player_id) from ev2 a where a.d = x.d and a.event = 'opened'),
    (select count(distinct a.player_id) from ev2 a join firsts fi on fi.player_id = a.player_id
      where a.d = x.d and a.event = 'opened' and fi.first_day = x.d),
    (select count(distinct a.player_id) from ev2 a join firsts fi on fi.player_id = a.player_id
      where a.d = x.d and a.event = 'opened' and fi.first_day < x.d),
    (select count(distinct a.player_id) from ev2 a where a.d = x.d and a.event = 'completed'),
    (select count(*) from ev2 a where a.d = x.d and a.event = 'shared'),
    (select count(distinct a.player_id) from ev2 a where a.d = x.d and a.event = 'arrived')
  from days x
  order by x.d;
end $$;
grant execute on function public.admin_simple_stats(date, date, time) to authenticated;
