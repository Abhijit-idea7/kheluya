// चला खेळूया shop payments through Razorpay.
//   { mode: 'create', order_no, key }  → opens a Razorpay order for an unpaid shop order, returns what Checkout needs
//   { mode: 'verify', order_no, key, razorpay_order_id, razorpay_payment_id, razorpay_signature } → confirms the payment
//   Razorpay webhook (header X-Razorpay-Signature) → confirms payments even if the customer closed the page
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkPaymentSignature, checkWebhookSignature, paidFromWebhook } from './core.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Info = {
  order_no: string; status: string; payment_status: string; total_paise: number; razorpay_order_id: string | null;
  name: string; phone: string; email: string; key_id: string; key_secret: string; webhook_secret: string;
};

async function info(orderNo: string, key: string): Promise<Info | null> {
  const { data, error } = await db.rpc('shop_payment_info', { p_order_no: String(orderNo ?? ''), p_key: String(key ?? '') });
  if (error) throw new Error(error.message);
  return (data as Info) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const raw = await req.text();

    // Razorpay webhook
    const sig = req.headers.get('x-razorpay-signature');
    if (sig) {
      const { data: secret } = await db.rpc('shop_webhook_secret');
      if (!(await checkWebhookSignature(String(secret ?? ''), raw, sig))) return json({ error: 'bad signature' }, 400);
      const paid = paidFromWebhook(JSON.parse(raw));
      if (paid) await db.rpc('shop_mark_paid', { p_rp_order: paid.orderId, p_payment: paid.paymentId });
      return json({ ok: true });
    }

    const body = JSON.parse(raw || '{}');
    const o = await info(body.order_no, body.key);
    if (!o) return json({ error: 'ORDER_NOT_FOUND' }, 404);

    if (body.mode === 'create') {
      if (o.payment_status === 'paid') return json({ paid: true, order_no: o.order_no });
      if (o.status !== 'pending_payment') return json({ error: 'ORDER_NOT_PAYABLE', status: o.status }, 409);
      if (!o.key_id || !o.key_secret) return json({ error: 'ONLINE_NOT_READY' }, 503);
      let rpOrder = o.razorpay_order_id;
      if (!rpOrder) {
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${o.key_id}:${o.key_secret}`)}` },
          body: JSON.stringify({ amount: o.total_paise, currency: 'INR', receipt: o.order_no, notes: { order_no: o.order_no } }),
        });
        const rp = await res.json();
        if (!res.ok || !rp.id) return json({ error: 'RAZORPAY_ERROR', detail: rp?.error?.description ?? res.status }, 502);
        rpOrder = rp.id as string;
        await db.rpc('shop_set_razorpay_order', { p_order_no: o.order_no, p_rp_order: rpOrder });
      }
      return json({ key_id: o.key_id, razorpay_order_id: rpOrder, amount: o.total_paise, prefill: { name: o.name, contact: o.phone, email: o.email || undefined } });
    }

    if (body.mode === 'verify') {
      if (o.payment_status === 'paid') return json({ ok: true, order_no: o.order_no });
      const ok =
        !!o.razorpay_order_id &&
        body.razorpay_order_id === o.razorpay_order_id &&
        (await checkPaymentSignature(o.key_secret, o.razorpay_order_id, String(body.razorpay_payment_id ?? ''), String(body.razorpay_signature ?? '')));
      if (!ok) return json({ error: 'PAYMENT_NOT_VERIFIED' }, 400);
      const { data, error } = await db.rpc('shop_mark_paid', { p_rp_order: o.razorpay_order_id, p_payment: String(body.razorpay_payment_id) });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    return json({ error: 'unknown mode' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
