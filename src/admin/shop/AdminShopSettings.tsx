import { useEffect, useState } from 'react';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { rpc } from '@/admin/shop/rpc';
import { STATES } from '@/lib/shop';

const KEYS = ['shop_selling', 'cash_on_delivery', 'cod_max_rupees', 'seller_name', 'seller_gstin', 'seller_address', 'seller_state', 'seller_phone', 'seller_email', 'invoice_prefix', 'razorpay_key_id', 'upi_direct', 'upi_id', 'upi_name'] as const;

/** Shop settings: open/close, payments, the seller details printed on GST invoices, Razorpay keys. */
export default function AdminShopSettings() {
  const [v, setV] = useState<Record<string, unknown> | null>(null);
  const [sec, setSec] = useState<{ key_secret: boolean; webhook_secret: boolean } | null>(null);
  const [keySecret, setKeySecret] = useState('');
  const [hookSecret, setHookSecret] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    supabase!.from('site_settings').select('key,value').in('key', KEYS as unknown as string[]).then(({ data }) => setV(Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))));
    rpc<{ key_secret: boolean; webhook_secret: boolean }>('admin_shop_secret_status').then(setSec).catch(() => setSec(null));
  }, []);
  if (!v) return <p className="animate-pulse">Loading…</p>;
  const s = (k: string) => String(v[k] ?? '');
  const set = (k: string, val: unknown) => setV({ ...v, [k]: val });
  const save = async () => {
    setMsg('');
    const gstin = s('seller_gstin').trim().toUpperCase();
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) return setMsg('The GSTIN should be 15 characters, like 27ABCDE1234F1Z5.');
    if (v.upi_direct === true && !upiOk) return setMsg('Type a UPI ID like chalakheluya@okaxis before switching UPI on.');
    const rows = KEYS.map((key) => ({
      key,
      value: key === 'shop_selling' || key === 'cash_on_delivery' || key === 'upi_direct' ? v[key] === true : key === 'cod_max_rupees' ? Number(v[key] ?? 2000) || 2000 : key === 'seller_gstin' ? gstin : String(v[key] ?? '').trim(),
    }));
    const { error } = await supabase!.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) return setMsg(error.message);
    if (keySecret || hookSecret) {
      try {
        setSec(await rpc('admin_shop_set_secrets', { p_key_secret: keySecret, p_webhook_secret: hookSecret }));
        setKeySecret('');
        setHookSecret('');
      } catch (e) {
        return setMsg((e as Error).message);
      }
    }
    setMsg('Saved ✓');
  };
  const upiOk = /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.]{2,}$/.test(s('upi_id'));
  const ready = !!s('seller_name') && !!s('seller_state') && !!s('seller_address');
  const onlineReady = s('razorpay_key_id').length > 5 && sec?.key_secret;

  return (
    <div className="grid gap-4 max-w-3xl">
      <Card className="grid gap-2">
        <h2 className="text-xl font-bold">Shop open</h2>
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" className="h-6 w-6 accent-[#2E8A3E]" checked={v.shop_selling === true} onChange={(e) => set('shop_selling', e.target.checked)} />
          Selling is switched on (the shop shows products and takes orders)
        </label>
        <p className="text-sm text-ink/60">When off, products still show on the shop page as “coming soon”, with a “मला कळवा” button instead of add-to-cart.</p>
        {!ready && <p className="font-bold text-[#8A1C14]">Fill in the seller details below before switching selling on — they are printed on every GST invoice.</p>}
        {!onlineReady && v.cash_on_delivery !== true && !(v.upi_direct === true && upiOk) && <p className="font-bold text-[#8A1C14]">Turn on at least one way to pay: UPI to the shop, cash on delivery, or Razorpay.</p>}
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-xl font-bold">Payments</h2>
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" className="h-6 w-6 accent-[#2E8A3E]" checked={v.cash_on_delivery === true} onChange={(e) => set('cash_on_delivery', e.target.checked)} />
          Offer cash on delivery
        </label>
        <Field label="Cash on delivery: largest order (₹)"><input className={`${input} !w-40`} inputMode="numeric" value={s('cod_max_rupees')} onChange={(e) => set('cod_max_rupees', e.target.value)} /></Field>
        <div className="border-t border-line pt-3 grid gap-3">
          <p className="font-bold">UPI straight to the shop {v.upi_direct === true && upiOk ? <span className="text-green">— on ✓</span> : <span className="text-ink/60">— off</span>}</p>
          <p className="text-sm text-ink/60">
            For now, before Razorpay is active. The customer pays your UPI ID from Google Pay / PhonePe / Paytm (a button on their phone, or a QR code),
            then types the 12-digit UPI reference number. You check it in your bank app and press “Payment received” on the order. No fees.
            Use a business UPI ID (from your current account, or Google Pay / PhonePe for Business) — some apps limit payments to personal UPI IDs from a link.
          </p>
          <label className="flex items-center gap-3 text-lg">
            <input type="checkbox" className="h-6 w-6 accent-[#2E8A3E]" checked={v.upi_direct === true} onChange={(e) => set('upi_direct', e.target.checked)} />
            Offer “Pay by UPI” at checkout
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UPI ID (like chalakheluya@okaxis)"><input className={input} value={s('upi_id')} onChange={(e) => set('upi_id', e.target.value.trim())} /></Field>
            <Field label="Name shown to the customer" hint="The account name, as the UPI app will show it"><input className={input} value={s('upi_name')} onChange={(e) => set('upi_name', e.target.value)} /></Field>
          </div>
          {s('upi_id') && !upiOk && <p className="font-bold text-[#8A1C14]">That doesn’t look like a UPI ID — it should be like name@bank.</p>}
          {upiOk && <a className={`${btnQuiet} justify-self-start !py-1`} href={`upi://pay?pa=${encodeURIComponent(s('upi_id'))}&pn=${encodeURIComponent(s('upi_name') || 'Chala Kheluya')}&am=1.00&cu=INR&tn=Test`}>Test: pay ₹1 to this UPI ID (open on your phone)</a>}
        </div>
        <div className="border-t border-line pt-3 grid gap-3">
          <p className="font-bold">Razorpay (UPI, cards, netbanking) {onlineReady ? <span className="text-green">— ready ✓</span> : <span className="text-[#8A1C14]">— not set up</span>}</p>
          <p className="text-sm text-ink/60">In Razorpay: Account &amp; Settings → API Keys. Use the Test keys first, then the Live keys once Razorpay activates your account.</p>
          <Field label="Key ID (starts with rzp_test_ or rzp_live_)"><input className={input} value={s('razorpay_key_id')} onChange={(e) => set('razorpay_key_id', e.target.value.trim())} /></Field>
          <Field label={`Key secret ${sec?.key_secret ? '(saved — type a new one only to replace it)' : ''}`}>
            <input className={input} type="password" autoComplete="off" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder={sec?.key_secret ? '••••••••' : ''} />
          </Field>
          <details className="text-sm">
            <summary className="cursor-pointer font-bold">Webhook (recommended: confirms payments even if the customer closes the page)</summary>
            <ol className="mt-2 list-decimal pl-5 grid gap-1">
              <li>In Razorpay: Account &amp; Settings → Webhooks → Add new webhook.</li>
              <li>Webhook URL: <code className="bg-white px-1 break-all">{SUPABASE_URL}/functions/v1/shop-pay</code> <button className={`${btnQuiet} !py-0 !text-xs`} onClick={() => navigator.clipboard?.writeText(`${SUPABASE_URL}/functions/v1/shop-pay`)}>Copy</button></li>
              <li>Choose a secret word, and tick the events <b>payment.captured</b> and <b>order.paid</b>.</li>
              <li>Type the same secret word here:</li>
            </ol>
            <Field label={`Webhook secret ${sec?.webhook_secret ? '(saved)' : ''}`} className="mt-2">
              <input className={input} type="password" autoComplete="off" value={hookSecret} onChange={(e) => setHookSecret(e.target.value)} placeholder={sec?.webhook_secret ? '••••••••' : ''} />
            </Field>
          </details>
        </div>
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-xl font-bold">Seller details (printed on GST invoices)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name"><input className={input} value={s('seller_name')} onChange={(e) => set('seller_name', e.target.value)} /></Field>
          <Field label="GSTIN"><input className={input} value={s('seller_gstin')} onChange={(e) => set('seller_gstin', e.target.value.toUpperCase())} /></Field>
          <Field label="State (decides CGST+SGST or IGST)">
            <select className={input} value={s('seller_state')} onChange={(e) => set('seller_state', e.target.value)}>
              <option value="">—</option>
              {STATES.map((st) => <option key={st}>{st}</option>)}
            </select>
          </Field>
          <Field label="Invoice number prefix" hint="Invoices are numbered like CK/26-27/0001"><input className={input} value={s('invoice_prefix')} onChange={(e) => set('invoice_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))} /></Field>
          <Field label="Phone (also the customers’ WhatsApp help number)"><input className={input} value={s('seller_phone')} onChange={(e) => set('seller_phone', e.target.value)} /></Field>
          <Field label="Email"><input className={input} value={s('seller_email')} onChange={(e) => set('seller_email', e.target.value)} /></Field>
        </div>
        <Field label="Address"><textarea className={`${input} min-h-[5rem]`} value={s('seller_address')} onChange={(e) => set('seller_address', e.target.value)} /></Field>
      </Card>

      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={save}>Save shop settings</button>
        {msg && <span className={`font-bold ${msg.startsWith('Saved') ? 'text-green' : 'text-[#8A1C14]'}`}>{msg}</span>}
      </div>
    </div>
  );
}
