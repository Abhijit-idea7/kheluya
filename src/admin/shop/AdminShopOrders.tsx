import { useEffect, useState } from 'react';
import { btnDanger, btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { rpc, rs, when, METHOD_LABEL, PAY_LABEL, STATUS_LABEL, STATUS_TONE } from '@/admin/shop/rpc';
import type { Order } from '@/lib/shop';

type Row = { order_no: string; status: string; payment_method: string; payment_status: string; total_paise: number; created_at: string; ship_name: string; ship_phone: string; ship_city: string; ship_state: string; tracking_no: string; upi_ref: string | null; items: number };
type Money = { paid: number; cod_collected: number; cod_pending: number; to_check: number; refund_due: number };
type List = { counts: Record<string, number>; orders: Row[]; money?: Money };
type Detail = Order & { admin_note: string; customer_note: string; razorpay_order_id: string | null; customer: { name: string; phone: string; email: string; orders: number } };
const FILTERS: [string, string][] = [['to_do', 'To do'], ['to_check', 'Payment to check'], ['refund_due', 'Refund due'], ['', 'All'], ['placed', 'New'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['pending_payment', 'Awaiting payment'], ['cancelled', 'Cancelled']];
const COURIERS: Record<string, string> = {
  'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  DTDC: 'https://www.dtdc.in/tracking.asp', Delhivery: 'https://www.delhivery.com/track/package/', 'Blue Dart': 'https://www.bluedart.com/tracking',
  'Professional Couriers': 'https://www.tpcindia.com/', Other: '',
};

/** Orders: a to-do list, search, and one order at a time with the next action as a button. */
export default function AdminShopOrders() {
  const [filter, setFilter] = useState('to_do');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<List | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = () =>
    rpc<List>('admin_shop_orders', { p_status: filter || null, p_search: search || null, p_limit: 300 })
      .then((d) => setData({ counts: d?.counts ?? {}, orders: d?.orders ?? [], money: d?.money }))
      .catch((e) => setErr(e.message.includes('admin_shop_orders') ? 'Shop: the database step has not been applied yet.' : e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  if (err) return <p className="font-bold text-[#8A1C14]">{err}</p>;
  const c = data?.counts ?? {};
  const todo = (c.placed ?? 0) + (c.confirmed ?? 0) + (c.packed ?? 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><div className="text-sm font-bold text-ink/65">To pack and send</div><div className="text-3xl font-heading font-extrabold">{todo}</div></Card>
        <Card><div className="text-sm font-bold text-ink/65">On the way</div><div className="text-3xl font-heading font-extrabold">{c.shipped ?? 0}</div></Card>
        <Card><div className="text-sm font-bold text-ink/65">Delivered</div><div className="text-3xl font-heading font-extrabold">{c.delivered ?? 0}</div></Card>
        <Card><div className="text-sm font-bold text-ink/65">Awaiting payment</div><div className="text-3xl font-heading font-extrabold">{c.pending_payment ?? 0}</div></Card>
      </div>
      {(c.to_check ?? 0) > 0 && (
        <button className="text-left rounded-2xl border-[3px] border-green bg-green-soft p-3 font-bold" onClick={() => setFilter('to_check')}>
          {c.to_check} UPI payment{c.to_check === 1 ? '' : 's'} to check ({rs(data?.money?.to_check ?? 0)}) — look in your bank app, then press “Payment received” on the order.
        </button>
      )}
      {data?.money && (
        <p className="text-sm text-ink/70">
          Money so far: <b>{rs(data.money.paid + data.money.cod_collected)}</b> received ({rs(data.money.paid)} paid in advance, {rs(data.money.cod_collected)} cash collected)
          · cash still to collect <b>{rs(data.money.cod_pending)}</b>
          {data.money.refund_due > 0 && <> · <b className="text-[#8A1C14]">refunds due {rs(data.money.refund_due)}</b></>}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k || 'all'} className={`${btnQuiet} !py-1 ${filter === k ? '!bg-orange-soft' : ''}`} onClick={() => setFilter(k)}>
            {label}{k && k !== 'to_do' && c[k] ? ` (${c[k]})` : k === 'to_do' && todo ? ` (${todo})` : ''}
          </button>
        ))}
        <form className="ml-auto flex gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className={`${input} !w-56 !py-1.5`} placeholder="Order no., phone, name or UPI no." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={`${btnQuiet} !py-1`}>Search</button>
        </form>
      </div>
      {!data ? <p className="animate-pulse">Loading…</p> : data.orders.length === 0 ? <Card>No orders here.</Card> : (
        <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream"><tr>{['Order', 'When', 'Customer', 'Place', 'Items', 'Total', 'Payment', 'Status'].map((h) => <th key={h} className="p-2.5">{h}</th>)}</tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.order_no} className="border-t border-line cursor-pointer hover:bg-orange-soft/40" onClick={() => setOpen(o.order_no)}>
                  <td className="p-2.5 font-bold">{o.order_no}</td>
                  <td className="p-2.5 whitespace-nowrap">{when(o.created_at)}</td>
                  <td className="p-2.5">{o.ship_name}<br /><span className="text-ink/60">{o.ship_phone}</span></td>
                  <td className="p-2.5">{o.ship_city}, {o.ship_state}</td>
                  <td className="p-2.5 tabular-nums">{o.items}</td>
                  <td className="p-2.5 tabular-nums font-bold">{rs(o.total_paise)}</td>
                  <td className="p-2.5">{PAY_LABEL[o.payment_status] ?? o.payment_status}<br /><span className="text-ink/55">{METHOD_LABEL[o.payment_method] ?? o.payment_method}</span></td>
                  <td className="p-2.5"><span className={`rounded-full px-2.5 py-0.5 font-bold ${STATUS_TONE[o.status] ?? ''}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <OrderPanel orderNo={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

function OrderPanel({ orderNo, onClose, onChanged }: { orderNo: string; onClose: () => void; onChanged: () => void }) {
  const [o, setO] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ship, setShip] = useState({ courier: 'India Post', tracking_no: '', tracking_url: COURIERS['India Post'] });
  const [note, setNote] = useState('');
  const load = () => rpc<Detail>('admin_shop_order', { p_order_no: orderNo }).then((d) => { setO(d); setNote(d?.admin_note ?? ''); }).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  const act = async (action: string, p: Record<string, unknown> = {}) => {
    setBusy(true);
    setErr('');
    try {
      await rpc('admin_shop_update_order', { p_order_no: orderNo, p_action: action, p });
      await load();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const markPaid = () => {
    const ref = window.prompt(
      `Mark ${rs(o?.total_paise ?? 0)} as received for ${orderNo}?\n\nOnly do this after you have seen the money in your bank / UPI app.\nUPI reference number (optional):`,
      o?.upi_ref ?? '',
    );
    if (ref !== null) act('mark_paid', { ref: ref.trim() });
  };
  const notPaid = () => {
    const reason = window.prompt('The customer will see: “पेमेंट सापडले नाही.” Add a short note for them (optional):', 'कृपया क्रमांक तपासून पुन्हा लिहा.');
    if (reason !== null) act('not_paid', { reason });
  };
  const cancel = () => {
    const reason = window.prompt('Why is this order being cancelled? (the customer can see this)');
    if (reason !== null) act('cancel', { reason });
  };

  const site = window.location.origin;
  const link = o ? `${site}/order/${o.order_no}?k=${o.access_key}` : '';
  const waText = o
    ? o.status === 'shipped'
      ? `नमस्कार ${o.ship.name}, चला खेळूया कडून तुमची ऑर्डर ${o.order_no} पाठवली आहे.${o.courier ? ` ${o.courier}` : ''}${o.tracking_no ? ` ट्रॅकिंग नंबर: ${o.tracking_no}.` : ''} ऑर्डर पाहा: ${link}`
      : o.status === 'delivered'
        ? `नमस्कार ${o.ship.name}, तुमची ऑर्डर ${o.order_no} पोहोचली असेल अशी आशा आहे. चला खेळूया कडून खरेदी केल्याबद्दल मनःपूर्वक धन्यवाद! 🙏`
        : o.status === 'pending_payment'
          ? `नमस्कार ${o.ship.name}, चला खेळूया कडून तुमची ऑर्डर ${o.order_no} (${rs(o.total_paise)}) तयार आहे, पण पेमेंट अजून आलेले नाही. इथून पैसे भरा: ${link}`
          : `नमस्कार ${o.ship.name}, चला खेळूया कडून तुमची ऑर्डर ${o.order_no} (${rs(o.total_paise)}) मिळाली आहे. लवकरच पाठवू. ऑर्डर पाहा: ${link}`
    : '';
  const wa = o ? `https://wa.me/91${o.ship.phone}?text=${encodeURIComponent(waText)}` : '';
  const next: Record<string, [string, string] | null> = { placed: ['confirm', 'Confirm order'], confirmed: ['pack', 'Mark packed'], packed: null, shipped: ['deliver', 'Mark delivered'] };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full overflow-y-auto bg-cream p-5 grid gap-4 content-start" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold mr-auto">Order {orderNo}</h2>
          <button className={btnQuiet} onClick={onClose}>Close</button>
        </div>
        {err && <p className="font-bold text-[#8A1C14]">{err}</p>}
        {!o ? <p className="animate-pulse">Loading…</p> : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`rounded-full px-3 py-1 font-bold ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              <span className="rounded-full px-3 py-1 font-bold bg-white border border-line">{PAY_LABEL[o.payment_status]} · {METHOD_LABEL[o.payment_method] ?? o.payment_method}</span>
              <span className="text-sm text-ink/60">{when(o.created_at)}</span>
            </div>

            {o.payment_status === 'verifying' && (
              <Card className="!border-green !bg-green-soft">
                <h3 className="font-bold text-lg">Check this UPI payment</h3>
                <p className="mt-1">The customer says they paid <b>{rs(o.total_paise)}</b> to your UPI ID. Reference number: <b className="text-lg tabular-nums">{o.upi_ref}</b></p>
                <p className="text-sm text-ink/70">Open your bank / UPI business app and look for this number (or the amount from {o.ship.name}).</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className={btnPrimary} disabled={busy} onClick={() => act('mark_paid', {})}>Payment received ✓</button>
                  <button className={btnQuiet} disabled={busy} onClick={notPaid}>Not found — ask them to check</button>
                </div>
              </Card>
            )}
            <Card>
              <h3 className="font-bold mb-2">Next step</h3>
              <div className="flex flex-wrap gap-2">
                {next[o.status] && <button className={btnPrimary} disabled={busy} onClick={() => act(next[o.status]![0])}>{next[o.status]![1]}</button>}
                {o.payment_method === 'cod' && o.payment_status === 'cod_pending' && o.status === 'delivered' && <button className={btnQuiet} disabled={busy} onClick={() => act('cod_collected')}>Cash collected</button>}
                {o.payment_status === 'refund_due' && <button className={btnQuiet} disabled={busy} onClick={() => act('refunded')}>Mark refunded</button>}
                {o.payment_status === 'unpaid' && o.payment_method !== 'cod' && (o.status === 'pending_payment' || o.cancel_reason === 'expired') && (
                  <button className={btnQuiet} disabled={busy} onClick={markPaid}>Money received — mark paid</button>
                )}
                <a className={btnQuiet} href={wa} target="_blank" rel="noreferrer">WhatsApp the customer</a>
                <a className={btnQuiet} href={`/order/${o.order_no}/invoice?k=${o.access_key}&label=1`} target="_blank" rel="noreferrer">Print address label</a>
                {o.invoice_no && <a className={btnQuiet} href={`/order/${o.order_no}/invoice?k=${o.access_key}`} target="_blank" rel="noreferrer">Print invoice {o.invoice_no}</a>}
                {!['cancelled', 'delivered'].includes(o.status) && <button className={btnDanger} disabled={busy} onClick={cancel}>Cancel order</button>}
              </div>
              {o.status === 'pending_payment' && o.payment_status === 'unpaid' && (
                <p className="mt-2 text-sm text-ink/60">
                  {o.payment_method === 'upi'
                    ? 'Waiting for the customer to pay by UPI and type the reference number. Cancels itself after 24 hours without payment.'
                    : 'Waiting for online payment. Unpaid orders cancel themselves after 45 minutes.'}{' '}
                  If you already have the money, press “Money received — mark paid”.
                </p>
              )}
              {o.payment_status === 'refund_due' && <p className="mt-2 text-sm text-[#8A1C14]">{o.payment_method === 'upi' ? 'Send the money back to the customer from your UPI app, then press “Mark refunded”.' : 'Refund it in Razorpay (Payments → the payment → Refund), then press “Mark refunded”.'}</p>}
              {['confirmed', 'packed', 'placed'].includes(o.status) && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="font-bold mb-2">Ship it (this also makes the GST invoice)</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Courier">
                      <select className={input} value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value, tracking_url: COURIERS[e.target.value] ?? '' })}>
                        {Object.keys(COURIERS).map((k) => <option key={k}>{k}</option>)}
                      </select>
                    </Field>
                    <Field label="Tracking number"><input className={input} value={ship.tracking_no} onChange={(e) => setShip({ ...ship, tracking_no: e.target.value })} /></Field>
                    <Field label="Tracking link"><input className={input} value={ship.tracking_url} onChange={(e) => setShip({ ...ship, tracking_url: e.target.value })} /></Field>
                  </div>
                  <button className={`${btnPrimary} mt-2`} disabled={busy} onClick={() => act('ship', ship)}>Mark shipped</button>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-bold mb-2">Items</h3>
              <table className="w-full text-sm">
                <tbody>
                  {o.items.map((i, k) => (
                    <tr key={k} className="border-t border-line first:border-t-0">
                      <td className="py-1.5">{i.name_mr}<span className="text-ink/50"> · HSN {i.hsn || '—'} · GST {Number(i.gst_rate)}%</span></td>
                      <td className="py-1.5 text-right tabular-nums">{i.qty} × {rs(i.unit_price_paise)}</td>
                      <td className="py-1.5 text-right tabular-nums font-bold">{rs(i.line_total_paise)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink"><td className="py-1.5 font-bold">Total (incl. GST, free delivery)</td><td /><td className="py-1.5 text-right font-bold">{rs(o.total_paise)}</td></tr>
                  <tr><td className="text-ink/60 text-xs" colSpan={3}>Taxable {rs(o.taxable_paise)} · {o.igst_paise ? `IGST ${rs(o.igst_paise)}` : `CGST ${rs(o.cgst_paise)} + SGST ${rs(o.sgst_paise)}`}</td></tr>
                </tbody>
              </table>
            </Card>

            <Card>
              <h3 className="font-bold mb-1">Deliver to</h3>
              <p className="font-bold">{o.ship.name} · {o.ship.phone}</p>
              <p>{[o.ship.line1, o.ship.line2, o.ship.landmark].filter(Boolean).join(', ')}</p>
              <p>{o.ship.city}, {o.ship.state} – {o.ship.pincode}</p>
              {o.customer_note && <p className="mt-2 rounded-xl bg-orange-soft p-2">Customer’s note: “{o.customer_note}”</p>}
              <p className="mt-2 text-sm text-ink/60">Customer: {o.customer.name} · {o.customer.phone}{o.customer.email ? ` · ${o.customer.email}` : ''} · {o.customer.orders} order(s)</p>
              {o.razorpay_payment_id && <p className="text-sm text-ink/60">Razorpay payment: {o.razorpay_payment_id}</p>}
              {o.upi_ref && <p className="text-sm text-ink/60">UPI reference: {o.upi_ref}</p>}
              {o.courier && <p className="text-sm">Shipped by {o.courier} · {o.tracking_no}</p>}
              {o.cancel_reason && <p className="text-sm text-[#8A1C14]">Cancelled: {o.cancel_reason}</p>}
            </Card>

            <Card>
              <h3 className="font-bold mb-2">History</h3>
              <ul className="text-sm grid gap-1">
                {o.events.map((e, i) => <li key={i}><span className="text-ink/60">{when(e.at)}</span> · <b>{STATUS_LABEL[e.status] ?? e.status}</b> {e.note}</li>)}
              </ul>
              <Field label="Private note (only you see this)" className="mt-3">
                <textarea className={`${input} min-h-[4rem]`} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <button className={`${btnQuiet} mt-2`} onClick={() => act('note', { text: note })}>Save note</button>
              <p className="mt-3 text-xs text-ink/50 break-all">Customer’s order link: {link}</p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
