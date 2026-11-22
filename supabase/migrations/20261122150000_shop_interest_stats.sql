-- Stats → Shop "interested" now also counts the "मला कळवा" button on product pages
-- (saved with source_page '/dukan/<web-name>'), not only the old book form at '/dukan'.
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
    where s.source_page like '/dukan%' and (s.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
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
