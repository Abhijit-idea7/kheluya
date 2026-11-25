-- Shop payments, part 2 (25 Nov 2026)
-- 1. Direct UPI: the customer pays the shop's own UPI ID (Google Pay / PhonePe / Paytm), types the
--    UPI reference number, and the owner ticks "Payment received" after seeing it in the bank app.
--    Works before Razorpay is active; switch it off in Admin once Razorpay is live if you like.
-- 2. "Payment received" also works for an online (Razorpay) order that did not confirm by itself.
-- 3. Admin orders: "Payment to check" and "Refund due" lists, and money totals.

alter table public.shop_orders drop constraint if exists shop_orders_payment_method_check;
alter table public.shop_orders add constraint shop_orders_payment_method_check check (payment_method in ('razorpay', 'cod', 'upi'));
alter table public.shop_orders drop constraint if exists shop_orders_payment_status_check;
alter table public.shop_orders add constraint shop_orders_payment_status_check
  check (payment_status in ('unpaid', 'verifying', 'paid', 'cod_pending', 'cod_collected', 'refund_due', 'refunded'));
alter table public.shop_orders add column if not exists upi_ref text;
alter table public.shop_orders add column if not exists upi_submitted_at timestamptz;

insert into public.site_settings (key, value) values
  ('upi_direct', 'false'), ('upi_id', '""'), ('upi_name', '""')
on conflict (key) do nothing;

create or replace function public.shop_expire_unpaid()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.shop_orders
           where status = 'pending_payment' and payment_status = 'unpaid'
             and case when payment_method = 'upi' then greatest(created_at, updated_at) < now() - interval '24 hours'
                    else created_at < now() - interval '45 minutes' end
           for update skip locked loop
    perform public.shop_restock(r.id);
    update public.shop_orders set status = 'cancelled', cancel_reason = 'expired', updated_at = now() where id = r.id;
    insert into public.shop_order_events (order_id, status, note) values (r.id, 'cancelled', 'पेमेंट पूर्ण झाले नाही');
    n := n + 1;
  end loop;
  return n;
end $$;

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
  if v_pay not in ('razorpay', 'cod', 'upi') then raise exception 'BAD_PAYMENT'; end if;
  if v_pay = 'upi' and (coalesce(public.shop_setting('upi_direct') = 'true'::jsonb, false) is not true
                        or coalesce(public.shop_setting('upi_id') #>> '{}', '') !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.]{2,}$') then raise exception 'UPI_OFF'; end if;
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
          case when v_pay = 'cod' then 'ऑर्डर मिळाली (कॅश ऑन डिलिव्हरी)' when v_pay = 'upi' then 'UPI पेमेंटची वाट' else 'पेमेंटची वाट' end);

  return jsonb_build_object('order_no', v_order.order_no, 'access_key', v_order.access_key, 'total_paise', v_sub,
    'status', case when v_pay = 'cod' then 'placed' else 'pending_payment' end, 'payment', v_pay);
end $$;

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
    'razorpay_payment_id', o.razorpay_payment_id, 'upi_ref', o.upi_ref, 'upi_submitted_at', o.upi_submitted_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name_mr', i.name_mr, 'name_en', i.name_en, 'hsn', i.hsn, 'gst_rate', i.gst_rate,
        'qty', i.qty, 'unit_price_paise', i.unit_price_paise, 'line_total_paise', i.line_total_paise, 'taxable_paise', i.taxable_paise,
        'tax_paise', i.tax_paise) order by i.id) from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'at', e.created_at) order by e.created_at)
        from public.shop_order_events e where e.order_id = o.id), '[]'::jsonb)
  );
end $$;

-- The customer types the UPI reference (UTR) after paying. Opened with the order link key or the phone number.
create or replace function public.shop_upi_submit(p_order_no text, p_key text, p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders; v_ref text := upper(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  select * into o from public.shop_orders where order_no = upper(btrim(p_order_no)) for update;
  if not found or not (p_key = o.access_key or public.shop_clean_phone(p_key) = o.ship_phone) then raise exception 'NOT_FOUND'; end if;
  if o.payment_method <> 'upi' then raise exception 'BAD_PAYMENT'; end if;
  if o.payment_status in ('paid', 'verifying') then return jsonb_build_object('ok', true, 'already', true); end if;
  if o.status <> 'pending_payment' then raise exception 'ORDER_CLOSED'; end if;
  if length(v_ref) < 8 or length(v_ref) > 35 then raise exception 'BAD_REF'; end if;
  update public.shop_orders set upi_ref = v_ref, upi_submitted_at = now(), payment_status = 'verifying', updated_at = now() where id = o.id;
  insert into public.shop_order_events (order_id, status, note) values (o.id, 'pending_payment', 'UPI संदर्भ क्रमांक मिळाला: ' || v_ref);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.shop_upi_submit(text, text, text) to anon, authenticated;

create or replace function public.admin_shop_orders(p_status text default null, p_search text default null, p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s text := btrim(coalesce(p_search, ''));
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public.shop_expire_unpaid();
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.shop_orders group by status) x), '{}'::jsonb)
              || jsonb_build_object('to_check', (select count(*) from public.shop_orders where payment_status = 'verifying'),
                                    'refund_due', (select count(*) from public.shop_orders where payment_status = 'refund_due')),
    'money', jsonb_build_object(
      'paid', coalesce((select sum(total_paise) from public.shop_orders where payment_status = 'paid'), 0),
      'cod_collected', coalesce((select sum(total_paise) from public.shop_orders where payment_status = 'cod_collected'), 0),
      'cod_pending', coalesce((select sum(total_paise) from public.shop_orders where payment_status = 'cod_pending' and status <> 'cancelled'), 0),
      'to_check', coalesce((select sum(total_paise) from public.shop_orders where payment_status = 'verifying'), 0),
      'refund_due', coalesce((select sum(total_paise) from public.shop_orders where payment_status = 'refund_due'), 0)),
    'orders', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select o.order_no, o.status, o.payment_method, o.payment_status, o.total_paise, o.created_at, o.ship_name, o.ship_phone, o.ship_city,
        o.ship_state, o.tracking_no, o.upi_ref, (select sum(i.qty) from public.shop_order_items i where i.order_id = o.id) as items
      from public.shop_orders o
      where (p_status is null or p_status = '' or o.status = p_status or (p_status = 'to_do' and o.status in ('placed', 'confirmed', 'packed'))
             or (p_status = 'to_check' and o.payment_status = 'verifying') or (p_status = 'refund_due' and o.payment_status = 'refund_due'))
        and (s = '' or o.order_no ilike '%' || s || '%' or o.upi_ref ilike '%' || s || '%' or o.ship_phone like '%' || regexp_replace(s, '[^0-9]', '', 'g') || '%' and regexp_replace(s, '[^0-9]', '', 'g') <> ''
             or o.ship_name ilike '%' || s || '%')
      order by o.created_at desc limit greatest(1, least(p_limit, 1000))) x), '[]'::jsonb));
end $$;

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

  if p_action = 'mark_paid' then
    -- The owner saw the money arrive (UPI to the shop's account, or an online payment that did not confirm by itself)
    if o.payment_method = 'cod' then raise exception 'Cash on delivery orders are paid when delivered.'; end if;
    if o.payment_status not in ('unpaid', 'verifying') then raise exception 'This order is already %.', o.payment_status; end if;
    if o.status = 'cancelled' and o.cancel_reason <> 'expired' then raise exception 'This order was cancelled.'; end if;
    if o.status = 'cancelled' then   -- it had expired and given its stock back: take it again
      update public.shop_products pr set stock = pr.stock - i.qty from public.shop_order_items i
      where i.order_id = o.id and i.product_id = pr.id and pr.stock is not null;
    end if;
    update public.shop_orders set payment_status = 'paid', paid_at = now(), cancel_reason = '',
      upi_ref = coalesce(nullif(btrim(coalesce(p ->> 'ref', '')), ''), upi_ref),
      status = case when status in ('pending_payment', 'cancelled') then 'placed' else status end, updated_at = now()
    where id = o.id;
    v_note := 'पेमेंट मिळाले';
  elsif p_action = 'not_paid' then
    -- The reference the customer typed did not show up: send it back to "awaiting payment" with a message
    if o.payment_status <> 'verifying' then raise exception 'Nothing to check on this order.'; end if;
    update public.shop_orders set payment_status = 'unpaid', upi_submitted_at = null, updated_at = now() where id = o.id;
    v_note := btrim('पेमेंट सापडले नाही. ' || coalesce(p ->> 'reason', ''));
  elsif p_action = 'confirm' then
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
