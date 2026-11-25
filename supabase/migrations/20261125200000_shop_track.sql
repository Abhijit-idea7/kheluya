-- Track orders with the mobile number + the delivery pincode (no order number needed).
-- The pincode is asked too, so that knowing someone's phone number alone does not show their orders and address.
create or replace function public.shop_track(p_phone text, p_pincode text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_phone text := public.shop_clean_phone(p_phone);
        v_pin text := regexp_replace(coalesce(p_pincode, ''), '[^0-9]', '', 'g');
begin
  if v_phone !~ '^[6-9][0-9]{9}$' or v_pin !~ '^[1-9][0-9]{5}$' then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('order_no', o.order_no, 'access_key', o.access_key, 'status', o.status,
      'payment_status', o.payment_status, 'total_paise', o.total_paise, 'created_at', o.created_at) order by o.created_at desc)
    from public.shop_orders o
    where o.ship_pincode = v_pin
      and (o.ship_phone = v_phone or exists (select 1 from public.shop_customers c where c.id = o.customer_id and c.phone = v_phone))
    limit 50), '[]'::jsonb);
end $$;
grant execute on function public.shop_track(text, text) to anon, authenticated;
