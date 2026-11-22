/*
  चला खेळूया shop (v14): products, categories, customers, orders, GST invoices, stock, payments.
  Money is stored in paise (₹1 = 100). Prices are GST-inclusive. Delivery is free (shipping_paise kept for later).

  Customers do not log in. At checkout they give name, WhatsApp number and address; an order is then opened with
  its order number plus either the private link key or the phone number. Nobody can read these tables directly:
  visitors go through the shop_* functions, admins through the admin_shop_* functions.

  Payment: Razorpay (online) or cash on delivery. The Razorpay secret lives in a locked table read only by the
  shop-pay server function, which also confirms payments (shop_mark_paid is server-only).
*/

-- ---------------- masters ----------------
create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name_mr text not null check (length(name_mr) between 1 and 80),
  name_en text not null default '' check (length(name_en) <= 80),
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  category_id uuid references public.shop_categories(id) on delete set null,
  name_mr text not null check (length(name_mr) between 1 and 120),
  name_en text not null default '' check (length(name_en) <= 120),
  short_mr text not null default '' check (length(short_mr) <= 240),
  short_en text not null default '' check (length(short_en) <= 240),
  description_mr text not null default '' check (length(description_mr) <= 4000),
  description_en text not null default '' check (length(description_en) <= 4000),
  price_paise int not null check (price_paise between 100 and 10000000),     -- selling price incl. GST
  mrp_paise int check (mrp_paise is null or mrp_paise >= 100),               -- shown struck out if higher
  hsn text not null default '' check (length(hsn) <= 12),
  gst_rate numeric(4,2) not null default 0 check (gst_rate in (0, 5, 12, 18, 28)),
  weight_g int check (weight_g is null or weight_g > 0),
  stock int check (stock is null or stock >= -1000),                          -- null = not tracked
  max_per_order int not null default 10 check (max_per_order between 1 and 100),
  images text[] not null default '{}',                                        -- storage paths in the puzzles bucket
  specs jsonb not null default '[]'::jsonb,                                   -- [{label_mr, value_mr}, …]
  is_active boolean not null default false,
  coming_soon boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_products_active_idx on public.shop_products (is_active, sort_order);

-- ---------------- customers & orders ----------------
create table if not exists public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^[6-9][0-9]{9}$'),
  name text not null check (length(name) between 1 and 120),
  email text not null default '' check (length(email) <= 160),
  last_address jsonb not null default '{}'::jsonb,
  player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.shop_order_seq start 1001;

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('CK' || nextval('public.shop_order_seq')),
  access_key text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  customer_id uuid not null references public.shop_customers(id),
  status text not null check (status in ('pending_payment', 'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('razorpay', 'cod')),
  payment_status text not null check (payment_status in ('unpaid', 'paid', 'cod_pending', 'cod_collected', 'refund_due', 'refunded')),
  -- money (paise)
  subtotal_paise int not null,
  shipping_paise int not null default 0,
  total_paise int not null,
  taxable_paise int not null,
  cgst_paise int not null default 0,
  sgst_paise int not null default 0,
  igst_paise int not null default 0,
  -- delivery address (a copy, as it was when ordered)
  ship_name text not null,
  ship_phone text not null,
  ship_line1 text not null,
  ship_line2 text not null default '',
  ship_landmark text not null default '',
  ship_city text not null,
  ship_state text not null,
  ship_pincode text not null check (ship_pincode ~ '^[1-9][0-9]{5}$'),
  customer_note text not null default '' check (length(customer_note) <= 500),
  -- payment
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  -- delivery
  courier text not null default '',
  tracking_no text not null default '',
  tracking_url text not null default '',
  shipped_at timestamptz,
  delivered_at timestamptz,
  -- GST invoice (numbered when the order is shipped)
  invoice_no text unique,
  invoice_date date,
  seller_snapshot jsonb not null default '{}'::jsonb,
  cancel_reason text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_orders_status_idx on public.shop_orders (status, created_at desc);
create index if not exists shop_orders_customer_idx on public.shop_orders (customer_id);

create table if not exists public.shop_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  name_mr text not null,
  name_en text not null default '',
  hsn text not null default '',
  gst_rate numeric(4,2) not null,
  qty int not null check (qty between 1 and 100),
  unit_price_paise int not null,
  line_total_paise int not null,
  taxable_paise int not null,
  tax_paise int not null
);
create index if not exists shop_order_items_order_idx on public.shop_order_items (order_id);

create table if not exists public.shop_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  status text not null,
  note text not null default '',
  by_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shop_order_events_order_idx on public.shop_order_events (order_id, created_at);

create table if not exists public.shop_invoice_counter (fy text primary key, last_no int not null default 0);

-- Razorpay secrets: locked (no policies). Written by admins through a function, read only by the server function.
create table if not exists public.shop_secrets (
  id int primary key default 1 check (id = 1),
  razorpay_key_secret text not null default '',
  razorpay_webhook_secret text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.shop_categories enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_customers enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_order_events enable row level security;
alter table public.shop_invoice_counter enable row level security;
alter table public.shop_secrets enable row level security;

-- Visitors may read active categories and products directly too (the site uses the functions below).
drop policy if exists "anyone reads active categories" on public.shop_categories;
create policy "anyone reads active categories" on public.shop_categories for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "anyone reads active products" on public.shop_products;
create policy "anyone reads active products" on public.shop_products for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "admins manage categories" on public.shop_categories;
create policy "admins manage categories" on public.shop_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage products" on public.shop_products;
create policy "admins manage products" on public.shop_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read customers" on public.shop_customers;
create policy "admins read customers" on public.shop_customers for select to authenticated using (public.is_admin());
drop policy if exists "admins read orders" on public.shop_orders;
create policy "admins read orders" on public.shop_orders for select to authenticated using (public.is_admin());
drop policy if exists "admins read order items" on public.shop_order_items;
create policy "admins read order items" on public.shop_order_items for select to authenticated using (public.is_admin());
drop policy if exists "admins read order events" on public.shop_order_events;
create policy "admins read order events" on public.shop_order_events for select to authenticated using (public.is_admin());

-- ---------------- settings (added only if missing) ----------------
insert into public.site_settings (key, value) values
  ('cod_max_rupees', '2000'::jsonb),
  ('seller_name', '""'::jsonb),
  ('seller_gstin', '""'::jsonb),
  ('seller_address', '""'::jsonb),
  ('seller_state', '""'::jsonb),
  ('seller_phone', '""'::jsonb),
  ('seller_email', '""'::jsonb),
  ('invoice_prefix', '"CK"'::jsonb),
  ('razorpay_key_id', '""'::jsonb)
on conflict (key) do nothing;

-- ---------------- helpers ----------------
create or replace function public.shop_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.site_settings where key = p_key;
$$;
revoke execute on function public.shop_setting(text) from public, anon, authenticated;

create or replace function public.shop_clean_phone(p text)
returns text language sql immutable as $$
  select right(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), 10);
$$;

-- Put back the stock of an order's items
create or replace function public.shop_restock(p_order uuid)
returns void language sql security definer set search_path = public as $$
  update public.shop_products p set stock = p.stock + i.qty, updated_at = now()
  from public.shop_order_items i
  where i.order_id = p_order and i.product_id = p.id and p.stock is not null;
$$;
revoke execute on function public.shop_restock(uuid) from public, anon, authenticated;

-- Online orders not paid within 45 minutes are cancelled and their stock released.
create or replace function public.shop_expire_unpaid()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.shop_orders
           where status = 'pending_payment' and created_at < now() - interval '45 minutes' for update skip locked loop
    perform public.shop_restock(r.id);
    update public.shop_orders set status = 'cancelled', cancel_reason = 'expired', updated_at = now() where id = r.id;
    insert into public.shop_order_events (order_id, status, note) values (r.id, 'cancelled', 'पेमेंट पूर्ण झाले नाही');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.shop_expire_unpaid() from public, anon, authenticated;

-- ---------------- visitors ----------------
create or replace function public.shop_catalog()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'name_mr', c.name_mr, 'name_en', c.name_en) order by c.sort_order, c.name_mr)
                            from public.shop_categories c where c.is_active), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'category_id', p.category_id, 'name_mr', p.name_mr, 'name_en', p.name_en,
        'short_mr', p.short_mr, 'short_en', p.short_en, 'description_mr', p.description_mr, 'description_en', p.description_en,
        'price_paise', p.price_paise, 'mrp_paise', p.mrp_paise, 'images', p.images, 'specs', p.specs,
        'max_per_order', p.max_per_order, 'coming_soon', p.coming_soon,
        'in_stock', (p.stock is null or p.stock > 0), 'few_left', (p.stock is not null and p.stock between 1 and 5)
      ) order by p.sort_order, p.created_at desc) from public.shop_products p where p.is_active), '[]'::jsonb)
  );
$$;
grant execute on function public.shop_catalog() to anon, authenticated;

/*
  Place an order. p = {
    items: [{product_id, qty}], payment: 'razorpay' | 'cod', note,
    customer: {name, phone, email}, address: {line1, line2, landmark, city, state, pincode}, player_id
  }
  Prices, GST and stock come from the database, never from the phone.
*/
create or replace function public.shop_place_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.shop_clean_phone(p #>> '{customer,phone}');
  v_name text := btrim(coalesce(p #>> '{customer,name}', ''));
  v_email text := btrim(coalesce(p #>> '{customer,email}', ''));
  v_pay text := coalesce(p ->> 'payment', '');
  v_state text := btrim(coalesce(p #>> '{address,state}', ''));
  v_pin text := regexp_replace(coalesce(p #>> '{address,pincode}', ''), '[^0-9]', '', 'g');
  v_line1 text := btrim(coalesce(p #>> '{address,line1}', ''));
  v_city text := btrim(coalesce(p #>> '{address,city}', ''));
  v_seller_state text := btrim(coalesce(public.shop_setting('seller_state') #>> '{}', ''));
  v_intra boolean;
  v_customer uuid;
  v_order public.shop_orders;
  it jsonb;
  pr public.shop_products;
  v_qty int;
  v_line int; v_taxable int; v_tax int;
  v_sub int := 0; v_tax_total int := 0; v_taxable_total int := 0; v_cgst int := 0; v_sgst int := 0;
  v_cod_max int;
  v_count int := 0;
begin
  perform public.shop_expire_unpaid();
  if coalesce(public.shop_setting('shop_selling') = 'true'::jsonb, false) is not true then raise exception 'SHOP_CLOSED'; end if;
  if length(v_name) < 2 then raise exception 'BAD_NAME'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'BAD_PHONE'; end if;
  if length(v_line1) < 3 or length(v_city) < 2 or length(v_state) < 2 then raise exception 'BAD_ADDRESS'; end if;
  if v_pin !~ '^[1-9][0-9]{5}$' then raise exception 'BAD_PINCODE'; end if;
  if v_pay not in ('razorpay', 'cod') then raise exception 'BAD_PAYMENT'; end if;
  if v_pay = 'cod' and coalesce(public.shop_setting('cash_on_delivery') = 'true'::jsonb, false) is not true then raise exception 'COD_OFF'; end if;
  if v_pay = 'razorpay' and coalesce(public.shop_setting('razorpay_key_id') #>> '{}', '') = '' then raise exception 'ONLINE_OFF'; end if;
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then raise exception 'EMPTY_CART'; end if;
  if jsonb_array_length(p -> 'items') > 20 then raise exception 'TOO_MANY_ITEMS'; end if;
  v_intra := v_seller_state <> '' and lower(v_seller_state) = lower(v_state);

  -- customer: one per phone number, details refreshed with each order
  insert into public.shop_customers (phone, name, email, last_address, player_id)
  values (v_phone, v_name, v_email, p -> 'address', nullif(p ->> 'player_id', '')::uuid)
  on conflict (phone) do update set name = excluded.name, email = coalesce(nullif(excluded.email, ''), public.shop_customers.email),
    last_address = excluded.last_address, player_id = coalesce(excluded.player_id, public.shop_customers.player_id), updated_at = now()
  returning id into v_customer;

  insert into public.shop_orders (customer_id, status, payment_method, payment_status, subtotal_paise, total_paise, taxable_paise,
    ship_name, ship_phone, ship_line1, ship_line2, ship_landmark, ship_city, ship_state, ship_pincode, customer_note)
  values (v_customer, case when v_pay = 'cod' then 'placed' else 'pending_payment' end, v_pay,
    case when v_pay = 'cod' then 'cod_pending' else 'unpaid' end, 0, 0, 0,
    v_name, v_phone, v_line1, btrim(coalesce(p #>> '{address,line2}', '')), btrim(coalesce(p #>> '{address,landmark}', '')),
    v_city, v_state, v_pin, left(btrim(coalesce(p ->> 'note', '')), 500))
  returning * into v_order;

  for it in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := coalesce((it ->> 'qty')::int, 0);
    select * into pr from public.shop_products where id = (it ->> 'product_id')::uuid and is_active and not coming_soon;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_qty < 1 or v_qty > pr.max_per_order then raise exception 'BAD_QTY:%', pr.name_mr; end if;
    if pr.stock is not null then
      update public.shop_products set stock = stock - v_qty, updated_at = now() where id = pr.id and stock >= v_qty;
      if not found then raise exception 'OUT_OF_STOCK:%', pr.name_mr; end if;
    end if;
    v_line := pr.price_paise * v_qty;
    v_taxable := round(v_line * 100.0 / (100 + pr.gst_rate));
    v_tax := v_line - v_taxable;
    insert into public.shop_order_items (order_id, product_id, name_mr, name_en, hsn, gst_rate, qty, unit_price_paise, line_total_paise, taxable_paise, tax_paise)
    values (v_order.id, pr.id, pr.name_mr, pr.name_en, pr.hsn, pr.gst_rate, v_qty, pr.price_paise, v_line, v_taxable, v_tax);
    v_sub := v_sub + v_line; v_taxable_total := v_taxable_total + v_taxable; v_tax_total := v_tax_total + v_tax;
    v_count := v_count + 1;
  end loop;

  if v_intra then v_cgst := v_tax_total / 2; v_sgst := v_tax_total - v_cgst; end if;
  v_cod_max := coalesce((public.shop_setting('cod_max_rupees') #>> '{}')::int, 2000) * 100;
  if v_pay = 'cod' and v_sub > v_cod_max then raise exception 'COD_LIMIT'; end if;

  update public.shop_orders set subtotal_paise = v_sub, total_paise = v_sub, taxable_paise = v_taxable_total,
    cgst_paise = v_cgst, sgst_paise = v_sgst, igst_paise = case when v_intra then 0 else v_tax_total end
  where id = v_order.id;
  insert into public.shop_order_events (order_id, status, note)
  values (v_order.id, case when v_pay = 'cod' then 'placed' else 'pending_payment' end,
          case when v_pay = 'cod' then 'ऑर्डर मिळाली (कॅश ऑन डिलिव्हरी)' else 'पेमेंटची वाट' end);

  return jsonb_build_object('order_no', v_order.order_no, 'access_key', v_order.access_key, 'total_paise', v_sub,
    'status', case when v_pay = 'cod' then 'placed' else 'pending_payment' end, 'payment', v_pay);
end $$;
grant execute on function public.shop_place_order(jsonb) to anon, authenticated;

-- One order with its items and history, for the customer: order number + (link key or phone number)
create or replace function public.shop_get_order(p_order_no text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o public.shop_orders;
begin
  select * into o from public.shop_orders where order_no = upper(btrim(p_order_no));
  if not found then return null; end if;
  if not (p_key = o.access_key or public.shop_clean_phone(p_key) = o.ship_phone
          or public.shop_clean_phone(p_key) = (select phone from public.shop_customers where id = o.customer_id)) then
    return null;
  end if;
  return jsonb_build_object(
    'order_no', o.order_no, 'access_key', o.access_key, 'status', o.status, 'payment_method', o.payment_method,
    'payment_status', o.payment_status, 'subtotal_paise', o.subtotal_paise, 'shipping_paise', o.shipping_paise,
    'total_paise', o.total_paise, 'taxable_paise', o.taxable_paise, 'cgst_paise', o.cgst_paise, 'sgst_paise', o.sgst_paise,
    'igst_paise', o.igst_paise, 'created_at', o.created_at, 'paid_at', o.paid_at, 'shipped_at', o.shipped_at, 'delivered_at', o.delivered_at,
    'ship', jsonb_build_object('name', o.ship_name, 'phone', o.ship_phone, 'line1', o.ship_line1, 'line2', o.ship_line2,
      'landmark', o.ship_landmark, 'city', o.ship_city, 'state', o.ship_state, 'pincode', o.ship_pincode),
    'courier', o.courier, 'tracking_no', o.tracking_no, 'tracking_url', o.tracking_url,
    'invoice_no', o.invoice_no, 'invoice_date', o.invoice_date, 'seller', o.seller_snapshot, 'cancel_reason', o.cancel_reason,
    'razorpay_payment_id', o.razorpay_payment_id,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name_mr', i.name_mr, 'name_en', i.name_en, 'hsn', i.hsn, 'gst_rate', i.gst_rate,
        'qty', i.qty, 'unit_price_paise', i.unit_price_paise, 'line_total_paise', i.line_total_paise, 'taxable_paise', i.taxable_paise,
        'tax_paise', i.tax_paise) order by i.id) from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'at', e.created_at) order by e.created_at)
        from public.shop_order_events e where e.order_id = o.id), '[]'::jsonb)
  );
end $$;
grant execute on function public.shop_get_order(text, text) to anon, authenticated;

-- All orders for a phone number (customer's "माझ्या ऑर्डर"), only when the number matches an order they name
create or replace function public.shop_orders_for_phone(p_phone text, p_order_no text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_phone text := public.shop_clean_phone(p_phone); v_cust uuid;
begin
  select o.customer_id into v_cust from public.shop_orders o
  where o.order_no = upper(btrim(p_order_no)) and (o.ship_phone = v_phone or exists (select 1 from public.shop_customers c where c.id = o.customer_id and c.phone = v_phone));
  if v_cust is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('order_no', o.order_no, 'access_key', o.access_key, 'status', o.status,
      'total_paise', o.total_paise, 'created_at', o.created_at) order by o.created_at desc)
    from public.shop_orders o where o.customer_id = v_cust), '[]'::jsonb);
end $$;
grant execute on function public.shop_orders_for_phone(text, text) to anon, authenticated;

-- ---------------- payment (server function only) ----------------
create or replace function public.shop_payment_info(p_order_no text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders;
begin
  select * into o from public.shop_orders where order_no = upper(btrim(p_order_no)) and access_key = p_key;
  if not found then return null; end if;
  return jsonb_build_object('order_no', o.order_no, 'status', o.status, 'payment_status', o.payment_status, 'total_paise', o.total_paise,
    'razorpay_order_id', o.razorpay_order_id, 'name', o.ship_name, 'phone', o.ship_phone,
    'email', (select email from public.shop_customers where id = o.customer_id),
    'key_id', public.shop_setting('razorpay_key_id') #>> '{}',
    'key_secret', (select razorpay_key_secret from public.shop_secrets where id = 1),
    'webhook_secret', (select razorpay_webhook_secret from public.shop_secrets where id = 1));
end $$;
revoke execute on function public.shop_payment_info(text, text) from public, anon, authenticated;

create or replace function public.shop_webhook_secret()
returns text language sql stable security definer set search_path = public as $$
  select razorpay_webhook_secret from public.shop_secrets where id = 1;
$$;
revoke execute on function public.shop_webhook_secret() from public, anon, authenticated;

create or replace function public.shop_set_razorpay_order(p_order_no text, p_rp_order text)
returns void language sql security definer set search_path = public as $$
  update public.shop_orders set razorpay_order_id = p_rp_order, updated_at = now() where order_no = p_order_no;
$$;
revoke execute on function public.shop_set_razorpay_order(text, text) from public, anon, authenticated;

-- Mark an online order paid (after the payment signature was checked). Safe to call twice.
create or replace function public.shop_mark_paid(p_rp_order text, p_payment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders;
begin
  select * into o from public.shop_orders where razorpay_order_id = p_rp_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'order not found'); end if;
  if o.payment_status = 'paid' then return jsonb_build_object('ok', true, 'order_no', o.order_no, 'already', true); end if;
  -- Paid after the 45-minute hold ran out: take the order anyway (stock may go below zero; the admin sees it)
  if o.status = 'cancelled' and o.cancel_reason = 'expired' then
    update public.shop_products p set stock = p.stock - i.qty from public.shop_order_items i
    where i.order_id = o.id and i.product_id = p.id and p.stock is not null;
  end if;
  update public.shop_orders set payment_status = 'paid', razorpay_payment_id = p_payment, paid_at = now(),
    status = case when status in ('pending_payment', 'cancelled') then 'placed' else status end, cancel_reason = '', updated_at = now()
  where id = o.id;
  insert into public.shop_order_events (order_id, status, note) values (o.id, 'placed', 'ऑनलाइन पेमेंट मिळाले');
  return jsonb_build_object('ok', true, 'order_no', o.order_no);
end $$;
revoke execute on function public.shop_mark_paid(text, text) from public, anon, authenticated;

-- ---------------- admin ----------------
create or replace function public.admin_shop_catalog()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.name_mr) from public.shop_categories c), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'sold', (select coalesce(sum(i.qty), 0) from public.shop_order_items i join public.shop_orders o on o.id = i.order_id
                 where i.product_id = p.id and o.status not in ('cancelled', 'pending_payment')))
      order by p.sort_order, p.created_at desc) from public.shop_products p), '[]'::jsonb));
end $$;
grant execute on function public.admin_shop_catalog() to authenticated;

create or replace function public.admin_shop_save_category(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.shop_categories (id, slug, name_mr, name_en, sort_order, is_active)
  values (coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()), p ->> 'slug', p ->> 'name_mr', coalesce(p ->> 'name_en', ''),
          coalesce((p ->> 'sort_order')::int, 100), coalesce((p ->> 'is_active')::boolean, true))
  on conflict (id) do update set slug = excluded.slug, name_mr = excluded.name_mr, name_en = excluded.name_en,
    sort_order = excluded.sort_order, is_active = excluded.is_active
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.admin_shop_save_category(jsonb) to authenticated;

create or replace function public.admin_shop_save_product(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.shop_products (id, slug, category_id, name_mr, name_en, short_mr, short_en, description_mr, description_en,
    price_paise, mrp_paise, hsn, gst_rate, weight_g, stock, max_per_order, images, specs, is_active, coming_soon, sort_order)
  values (coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()), p ->> 'slug', nullif(p ->> 'category_id', '')::uuid,
    p ->> 'name_mr', coalesce(p ->> 'name_en', ''), coalesce(p ->> 'short_mr', ''), coalesce(p ->> 'short_en', ''),
    coalesce(p ->> 'description_mr', ''), coalesce(p ->> 'description_en', ''),
    (p ->> 'price_paise')::int, nullif(p ->> 'mrp_paise', '')::int, coalesce(p ->> 'hsn', ''), coalesce((p ->> 'gst_rate')::numeric, 0),
    nullif(p ->> 'weight_g', '')::int, nullif(p ->> 'stock', '')::int, coalesce((p ->> 'max_per_order')::int, 10),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'images', '[]'::jsonb)) x), '{}'),
    coalesce(p -> 'specs', '[]'::jsonb), coalesce((p ->> 'is_active')::boolean, false), coalesce((p ->> 'coming_soon')::boolean, false),
    coalesce((p ->> 'sort_order')::int, 100))
  on conflict (id) do update set slug = excluded.slug, category_id = excluded.category_id, name_mr = excluded.name_mr, name_en = excluded.name_en,
    short_mr = excluded.short_mr, short_en = excluded.short_en, description_mr = excluded.description_mr, description_en = excluded.description_en,
    price_paise = excluded.price_paise, mrp_paise = excluded.mrp_paise, hsn = excluded.hsn, gst_rate = excluded.gst_rate,
    weight_g = excluded.weight_g, stock = excluded.stock, max_per_order = excluded.max_per_order, images = excluded.images,
    specs = excluded.specs, is_active = excluded.is_active, coming_soon = excluded.coming_soon, sort_order = excluded.sort_order, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.admin_shop_save_product(jsonb) to authenticated;

create or replace function public.admin_shop_orders(p_status text default null, p_search text default null, p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s text := btrim(coalesce(p_search, ''));
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public.shop_expire_unpaid();
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.shop_orders group by status) x), '{}'::jsonb),
    'orders', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select o.order_no, o.status, o.payment_method, o.payment_status, o.total_paise, o.created_at, o.ship_name, o.ship_phone, o.ship_city,
        o.ship_state, o.tracking_no, (select sum(i.qty) from public.shop_order_items i where i.order_id = o.id) as items
      from public.shop_orders o
      where (p_status is null or p_status = '' or o.status = p_status or (p_status = 'to_do' and o.status in ('placed', 'confirmed', 'packed')))
        and (s = '' or o.order_no ilike '%' || s || '%' or o.ship_phone like '%' || regexp_replace(s, '[^0-9]', '', 'g') || '%' and regexp_replace(s, '[^0-9]', '', 'g') <> ''
             or o.ship_name ilike '%' || s || '%')
      order by o.created_at desc limit greatest(1, least(p_limit, 1000))) x), '[]'::jsonb));
end $$;
grant execute on function public.admin_shop_orders(text, text, int) to authenticated;

create or replace function public.admin_shop_order(p_order_no text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o public.shop_orders; c public.shop_customers;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into o from public.shop_orders where order_no = upper(btrim(p_order_no));
  if not found then return null; end if;
  select * into c from public.shop_customers where id = o.customer_id;
  return public.shop_get_order(o.order_no, o.access_key) || jsonb_build_object(
    'admin_note', o.admin_note, 'razorpay_order_id', o.razorpay_order_id, 'customer_note', o.customer_note,
    'customer', jsonb_build_object('name', c.name, 'phone', c.phone, 'email', c.email,
      'orders', (select count(*) from public.shop_orders x where x.customer_id = c.id and x.status <> 'cancelled')),
    'seller_now', jsonb_build_object('name', public.shop_setting('seller_name'), 'gstin', public.shop_setting('seller_gstin'),
      'address', public.shop_setting('seller_address'), 'state', public.shop_setting('seller_state'),
      'phone', public.shop_setting('seller_phone'), 'email', public.shop_setting('seller_email')));
end $$;
grant execute on function public.admin_shop_order(text) to authenticated;

/*
  Move an order along. Actions: confirm, pack, ship {courier, tracking_no, tracking_url}, deliver, cancel {reason},
  cod_collected, refunded, note {text}. Shipping gives the order its GST invoice number (PREFIX/26-27/0001).
*/
create or replace function public.admin_shop_update_order(p_order_no text, p_action text, p jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders; v_fy text; v_n int; v_today date := (now() at time zone 'Asia/Kolkata')::date; v_note text := '';
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into o from public.shop_orders where order_no = upper(btrim(p_order_no)) for update;
  if not found then raise exception 'order not found'; end if;

  if p_action = 'note' then
    update public.shop_orders set admin_note = left(coalesce(p ->> 'text', ''), 1000), updated_at = now() where id = o.id;
    return jsonb_build_object('ok', true);
  end if;
  if p_action in ('confirm', 'pack', 'ship', 'deliver') and o.status in ('cancelled', 'pending_payment', 'delivered') then
    raise exception 'This order is %; it cannot be moved on.', o.status;
  end if;

  if p_action = 'confirm' then
    update public.shop_orders set status = 'confirmed', updated_at = now() where id = o.id; v_note := 'ऑर्डर निश्चित झाली';
  elsif p_action = 'pack' then
    update public.shop_orders set status = 'packed', updated_at = now() where id = o.id; v_note := 'पॅकिंग झाले';
  elsif p_action = 'ship' then
    if o.invoice_no is null then
      v_fy := case when extract(month from v_today) >= 4
                then to_char(v_today, 'YY') || '-' || to_char(v_today + interval '1 year', 'YY')
                else to_char(v_today - interval '1 year', 'YY') || '-' || to_char(v_today, 'YY') end;
      insert into public.shop_invoice_counter (fy, last_no) values (v_fy, 1)
      on conflict (fy) do update set last_no = public.shop_invoice_counter.last_no + 1 returning last_no into v_n;
      update public.shop_orders set invoice_no = coalesce(nullif(public.shop_setting('invoice_prefix') #>> '{}', ''), 'CK') || '/' || v_fy || '/' || lpad(v_n::text, 4, '0'),
        invoice_date = v_today,
        seller_snapshot = jsonb_build_object('name', public.shop_setting('seller_name') #>> '{}', 'gstin', public.shop_setting('seller_gstin') #>> '{}',
          'address', public.shop_setting('seller_address') #>> '{}', 'state', public.shop_setting('seller_state') #>> '{}',
          'phone', public.shop_setting('seller_phone') #>> '{}', 'email', public.shop_setting('seller_email') #>> '{}')
      where id = o.id;
    end if;
    update public.shop_orders set status = 'shipped', shipped_at = now(), courier = left(coalesce(p ->> 'courier', ''), 80),
      tracking_no = left(coalesce(p ->> 'tracking_no', ''), 80), tracking_url = left(coalesce(p ->> 'tracking_url', ''), 300), updated_at = now()
    where id = o.id;
    v_note := btrim('पाठवले ' || coalesce(p ->> 'courier', '') || ' ' || coalesce(p ->> 'tracking_no', ''));
  elsif p_action = 'deliver' then
    update public.shop_orders set status = 'delivered', delivered_at = now(),
      payment_status = case when payment_status = 'cod_pending' then 'cod_collected' else payment_status end, updated_at = now()
    where id = o.id; v_note := 'पोहोचले';
  elsif p_action = 'cancel' then
    if o.status in ('cancelled', 'delivered') then raise exception 'This order is already %.', o.status; end if;
    if o.status <> 'shipped' then perform public.shop_restock(o.id); end if;
    update public.shop_orders set status = 'cancelled', cancel_reason = left(coalesce(p ->> 'reason', ''), 300),
      payment_status = case when payment_status = 'paid' then 'refund_due' else payment_status end, updated_at = now()
    where id = o.id; v_note := 'रद्द: ' || coalesce(p ->> 'reason', '');
  elsif p_action = 'cod_collected' then
    update public.shop_orders set payment_status = 'cod_collected', updated_at = now() where id = o.id and payment_method = 'cod';
    v_note := 'कॅश मिळाली';
  elsif p_action = 'refunded' then
    update public.shop_orders set payment_status = 'refunded', updated_at = now() where id = o.id and payment_status = 'refund_due';
    v_note := 'पैसे परत केले';
  else
    raise exception 'unknown action %', p_action;
  end if;
  insert into public.shop_order_events (order_id, status, note, by_admin)
  values (o.id, (select status from public.shop_orders where id = o.id), v_note, true);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.admin_shop_update_order(text, text, jsonb) to authenticated;

create or replace function public.admin_shop_customers(p_search text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s text := btrim(coalesce(p_search, ''));
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(x order by x.last_order desc nulls last) from (
    select c.name, c.phone, c.email, c.created_at, c.last_address,
      count(o.id) filter (where o.status not in ('cancelled', 'pending_payment')) as orders,
      coalesce(sum(o.total_paise) filter (where o.status not in ('cancelled', 'pending_payment')), 0) as spent_paise,
      max(o.created_at) as last_order
    from public.shop_customers c left join public.shop_orders o on o.customer_id = c.id
    where s = '' or c.name ilike '%' || s || '%' or c.phone like '%' || s || '%'
    group by c.id limit 1000) x), '[]'::jsonb);
end $$;
grant execute on function public.admin_shop_customers(text) to authenticated;

create or replace function public.admin_shop_set_secrets(p_key_secret text, p_webhook_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.shop_secrets (id) values (1) on conflict (id) do nothing;
  if p_key_secret is not null and p_key_secret <> '' then update public.shop_secrets set razorpay_key_secret = btrim(p_key_secret), updated_at = now() where id = 1; end if;
  if p_webhook_secret is not null and p_webhook_secret <> '' then update public.shop_secrets set razorpay_webhook_secret = btrim(p_webhook_secret), updated_at = now() where id = 1; end if;
  return public.admin_shop_secret_status();
end $$;
grant execute on function public.admin_shop_set_secrets(text, text) to authenticated;

create or replace function public.admin_shop_secret_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'key_secret', coalesce((select razorpay_key_secret <> '' from public.shop_secrets where id = 1), false),
    'webhook_secret', coalesce((select razorpay_webhook_secret <> '' from public.shop_secrets where id = 1), false));
end $$;
grant execute on function public.admin_shop_secret_status() to authenticated;
