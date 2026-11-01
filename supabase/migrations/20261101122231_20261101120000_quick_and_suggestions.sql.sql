/*
  Quick puzzles + "next puzzle" suggestions (v4)
  - puzzle_types.is_quick: marks short, easy-going types shown as "झटपट कोडे" and suggested to
    players who find the daily puzzle hard. The seven quick-win types are marked here.
  - play_events gets a 'suggested' event: a player opened this puzzle by tapping a suggestion card
    (ref = where: 'nx' after finishing, 'lv' after leaving early, 'fy' Home row, 'qk' Home quick card).
  - admin_puzzle_stats gains a 'suggested' column (sessions opened from a suggestion).
*/
alter table public.puzzle_types add column if not exists is_quick boolean not null default false;
update public.puzzle_types set is_quick = true
where slug in ('jodya-lava', 'patte-jodi', 'kram-lava', 'pharak-olkha', 'rangoli', 'rangoli-purna-kara', 'he-kay-bara', 'saap-shidi');

alter table public.play_events drop constraint if exists play_events_event_check;
alter table public.play_events add constraint play_events_event_check
  check (event in ('opened','started','completed','shared','arrived','left','suggested'));

drop function if exists public.admin_puzzle_stats(date, date);
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
    select ev.puzzle_id, ev.session_id, min(ev.value_ms) as ms
    from ev where ev.event = 'completed' and ev.value_ms between 15000 and 10800000
    group by ev.puzzle_id, ev.session_id
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
    count(distinct ev.session_id) filter (where ev.event in ('started', 'completed')),
    count(distinct ev.session_id) filter (where ev.event = 'completed'),
    max(ss.med),
    max(ss.av),
    coalesce(sum(ev.value_ms) filter (where ev.event = 'left'), 0)::bigint,
    count(*) filter (where ev.event = 'shared'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'whatsapp'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'facebook'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'instagram'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'copy'),
    count(*) filter (where ev.event = 'shared' and ev.channel = 'native'),
    count(distinct ev.player_id) filter (where ev.event = 'arrived'),
    count(distinct ev.session_id) filter (where ev.event = 'suggested')
  from public.puzzles p
  join public.puzzle_types t on t.id = p.type_id
  left join ev on ev.puzzle_id = p.id
  left join solve_stats ss on ss.puzzle_id = p.id
  group by p.id, t.name_mr
  order by (p.status = 'live' and p.live_date is not null) desc, p.live_date desc nulls last, p.number desc;
end $$;
grant execute on function public.admin_puzzle_stats(date, date) to authenticated;
