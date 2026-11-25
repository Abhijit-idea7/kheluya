-- Cart recovery and "ask before buying" (25 Nov 2026)
-- 1. shop_leads: someone typed their name + mobile at checkout but did not place the order,
--    or asked us to contact them about a product ("आम्हाला संपर्क करायला सांगा").
-- 2. Admin "Follow up" list: those people, plus orders whose payment was never finished,
--    with ready WhatsApp messages. Done / contacted marks keep the list short.

create table if not exists public.shop_leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  name text not null default '' check (length(name) <= 120),
  city text not null default '' check (length(city) <= 80),
  pincode text not null default '' check (length(pincode) <= 7),
  items jsonb not null default '[]'::jsonb,           -- [{id, slug, name, qty, price_paise}]
  total_paise int not null default 0,
  source text not null default 'checkout' check (source in ('checkout', 'ask')),
  question text not null default '' check (length(question) <= 500),
  player_id uuid,
  status text not null default 'open' check (status in ('open', 'contacted', 'done')),
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_leads_open_idx on public.shop_leads (status, updated_at desc);
create index if not exists shop_leads_phone_idx on public.shop_leads (phone);
alter table public.shop_leads enable row level security;   -- no policies: only the functions below touch it

alter table public.shop_orders add column if not exists followup_status text;   -- null | contacted | done
alter table public.shop_orders add column if not exists followup_at timestamptz;

-- Visitor: save (or refresh) an unfinished checkout / a "please contact me" request.
create or replace function public.shop_save_lead(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.shop_clean_phone(p ->> 'phone');
  v_source text := coalesce(nullif(p ->> 'source', ''), 'checkout');
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_id uuid;
  it jsonb; pr public.shop_products; v_qty int;
begin
  if v_phone !~ '^[6-9][0-9]{9}$' then return jsonb_build_object('ok', false); end if;
  if v_source not in ('checkout', 'ask') then v_source := 'checkout'; end if;
  if jsonb_typeof(p -> 'items') = 'array' then
    for it in select * from jsonb_array_elements(p -> 'items') limit 20 loop
      select * into pr from public.shop_products where id = nullif(it ->> 'id', '')::uuid and is_active;
      if found then
        v_qty := greatest(1, least(100, coalesce((it ->> 'qty')::int, 1)));
        v_items := v_items || jsonb_build_object('id', pr.id, 'slug', pr.slug, 'name', pr.name_mr, 'qty', v_qty, 'price_paise', pr.price_paise);
        v_total := v_total + pr.price_paise * v_qty;
      end if;
    end loop;
  end if;

  select id into v_id from public.shop_leads
  where phone = v_phone and status <> 'done' and updated_at > now() - interval '30 days'
  order by updated_at desc limit 1;

  if v_id is null then
    insert into public.shop_leads (phone, name, city, pincode, items, total_paise, source, question, player_id)
    values (v_phone, left(btrim(coalesce(p ->> 'name', '')), 120), left(btrim(coalesce(p ->> 'city', '')), 80),
            left(regexp_replace(coalesce(p ->> 'pincode', ''), '[^0-9]', '', 'g'), 7), v_items, v_total, v_source,
            left(btrim(coalesce(p ->> 'question', '')), 500), nullif(p ->> 'player_id', '')::uuid);
  else
    update public.shop_leads set
      name = coalesce(nullif(left(btrim(coalesce(p ->> 'name', '')), 120), ''), name),
      city = coalesce(nullif(left(btrim(coalesce(p ->> 'city', '')), 80), ''), city),
      pincode = coalesce(nullif(left(regexp_replace(coalesce(p ->> 'pincode', ''), '[^0-9]', '', 'g'), 7), ''), pincode),
      items = case when jsonb_array_length(v_items) > 0 then v_items else items end,
      total_paise = case when jsonb_array_length(v_items) > 0 then v_total else total_paise end,
      -- asking for contact always wins over a plain checkout, and puts it back on the list
      source = case when v_source = 'ask' then 'ask' else source end,
      question = case when v_source = 'ask' then left(btrim(coalesce(p ->> 'question', '')), 500) else question end,
      status = case when v_source = 'ask' then 'open' else status end,
      updated_at = now()
    where id = v_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.shop_save_lead(jsonb) to anon, authenticated;

-- Admin: the follow-up list.
create or replace function public.admin_shop_followups(p_show text default 'open')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(x order by x.at desc) from (
    -- people who filled checkout / asked us to contact them, and have not ordered since
    select 'lead' as kind, l.id::text as ref, l.name, l.phone, l.city, l.items, l.total_paise,
           l.source as stage, l.question, l.status, l.contacted_at, l.updated_at as at, null::text as access_key
    from public.shop_leads l
    where l.updated_at > now() - interval '30 days'
      and l.status <> 'done'
      and not exists (select 1 from public.shop_orders o where o.ship_phone = l.phone
                        and o.created_at > l.updated_at - interval '2 minutes'
                        and (o.payment_status in ('paid', 'cod_pending', 'cod_collected', 'verifying') or o.status not in ('pending_payment', 'cancelled')))
    union all
    -- orders where the payment was never finished (still waiting, or expired) in the last 7 days
    select 'order', o.order_no, o.ship_name, o.ship_phone, o.ship_city,
           coalesce((select jsonb_agg(jsonb_build_object('name', i.name_mr, 'qty', i.qty)) from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb),
           o.total_paise,
           case when o.status = 'cancelled' then 'expired' else 'unpaid' end,
           '', coalesce(o.followup_status, 'open'), o.followup_at, o.created_at, o.access_key
    from public.shop_orders o
    where o.payment_status = 'unpaid' and o.payment_method <> 'cod'
      and (o.status = 'pending_payment' or (o.status = 'cancelled' and o.cancel_reason = 'expired'))
      and o.created_at > now() - interval '7 days'
      and coalesce(o.followup_status, 'open') <> 'done'
      and not exists (select 1 from public.shop_orders o2 where o2.ship_phone = o.ship_phone and o2.created_at > o.created_at
                        and (o2.payment_status in ('paid', 'cod_pending', 'cod_collected', 'verifying')))
  ) x), '[]'::jsonb);
end $$;
grant execute on function public.admin_shop_followups(text) to authenticated;

-- Admin: mark a follow-up as contacted or done.
create or replace function public.admin_shop_followup_mark(p_kind text, p_ref text, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('open', 'contacted', 'done') then raise exception 'bad status'; end if;
  if p_kind = 'lead' then
    update public.shop_leads set status = p_status,
      contacted_at = case when p_status = 'contacted' then now() else contacted_at end
    where id = p_ref::uuid;
  elsif p_kind = 'order' then
    update public.shop_orders set followup_status = p_status, followup_at = now() where order_no = upper(btrim(p_ref));
  else
    raise exception 'bad kind';
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.admin_shop_followup_mark(text, text, text) to authenticated;
