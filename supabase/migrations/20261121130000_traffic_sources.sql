/*
  Where players came from (v13) — one row per India day, counted as people (one phone = one person).
    community      the WhatsApp community post            (?s=cm)
    shares         a player's share (WhatsApp, Facebook, Instagram, copied link, phone share)  (?s=wa/fb/ig/cp/sh)
    facebook       Facebook ads (?s=fbad) and other Facebook visits (fbx)
    instagram      Instagram ads (?s=igad) and other Instagram visits (igx)
    notifications  the daily reminder                      (?s=pn)
    other_links    any other ?s= tag
    direct         players that day who came without any of the above (typed the address, home-screen icon, bookmark…)
  If one person came two ways in a day, each way counts them once.
*/
create or replace function public.admin_sources(p_from date, p_to date)
returns table (day date, players bigint, community bigint, shares bigint, facebook bigint, facebook_ads bigint,
               instagram bigint, instagram_ads bigint, notifications bigint, other_links bigint, direct bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with ev as (
    select e.player_id, e.event, e.ref, (e.created_at at time zone 'Asia/Kolkata')::date as d
    from public.play_events e
    where e.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
      and e.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
      and e.event in ('opened', 'arrived')
  ),
  arr as (select distinct a.d, a.player_id, a.ref from ev a where a.event = 'arrived'),
  opened as (select distinct a.d, a.player_id from ev a where a.event = 'opened'),
  s as (
    select a.d,
      count(distinct a.player_id) filter (where a.ref = 'cm') as community,
      count(distinct a.player_id) filter (where a.ref in ('wa', 'fb', 'ig', 'cp', 'sh')) as shares,
      count(distinct a.player_id) filter (where a.ref in ('fbad', 'fbx')) as facebook,
      count(distinct a.player_id) filter (where a.ref = 'fbad') as facebook_ads,
      count(distinct a.player_id) filter (where a.ref in ('igad', 'igx')) as instagram,
      count(distinct a.player_id) filter (where a.ref = 'igad') as instagram_ads,
      count(distinct a.player_id) filter (where a.ref = 'pn') as notifications,
      count(distinct a.player_id) filter (where a.ref = 'other') as other_links
    from arr a group by a.d
  ),
  o as (
    select op.d, count(*) as players,
      count(*) filter (where not exists (select 1 from arr x where x.d = op.d and x.player_id = op.player_id)) as direct
    from opened op group by op.d
  ),
  days as (select generate_series(p_from, p_to, interval '1 day')::date as d)
  select x.d, coalesce(o.players, 0)::bigint, coalesce(s.community, 0)::bigint, coalesce(s.shares, 0)::bigint,
    coalesce(s.facebook, 0)::bigint, coalesce(s.facebook_ads, 0)::bigint, coalesce(s.instagram, 0)::bigint,
    coalesce(s.instagram_ads, 0)::bigint, coalesce(s.notifications, 0)::bigint, coalesce(s.other_links, 0)::bigint,
    coalesce(o.direct, 0)::bigint
  from days x left join s on s.d = x.d left join o on o.d = x.d
  order by x.d;
end $$;
grant execute on function public.admin_sources(date, date) to authenticated;

-- Helps the "came without a link" check above
create index if not exists play_events_arrived_idx on public.play_events (player_id, created_at) where event = 'arrived';
