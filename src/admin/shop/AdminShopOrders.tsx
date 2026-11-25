import { useEffect, useState } from 'react';
import { btnDanger, btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { rpc, rs, when, METHOD_LABEL, PAY_LABEL, STATUS_LABEL, STATUS_TONE } from '@/admin/shop/rpc';
import type { Order } from '@/lib/shop';
import { Link } from 'react-router-dom';
import type { Followup } from '@/admin/shop/AdminShopFollowups';

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
  const [follow, setFollow] = useState<Followup[]>([]);
  useEffect(() => { rpc<Followup[]>('admin_shop_followups').then((d) => setFollow(Array.isArray(d) ? d : [])).catch(() => setFollow([])); }, []);
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
        {([['to_do', 'To pack and send', todo], ['shipped', 'On the way', c.shipped ?? 0], ['delivered', 'Delivered', c.delivered ?? 0], ['pending_payment', 'Awaiting payment', c.pending_payment ?? 0]] as const).map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`text-left rounded-2xl border-2 border-ink p-3 sm:p-4 ${filter === k ? 'bg-orange-soft' : 'bg-paper'}`}>
            <div className="text-sm font-bold text-ink/65">{label}</div>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold">{n}</div>
          </button>
        ))}
      </div>
      {follow.filter((f) => f.status === 'open').length > 0 && (
        <Link to="/admin/shop/followup" className="rounded-2xl border-[3px] border-orange bg-orange-soft p-3 font-bold">
          {follow.filter((f) => f.status === 'open').length} people to follow up on WhatsApp
          {follow.some((f) => f.stage === 'ask' && f.status === 'open') ? ' — including someone who asked us to contact them' : ''} →
        </Link>
      )}
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
      <label className="sm:hidden flex items-center gap-2">
        <span className="font-bold shrink-0">Show</span>
        <select className={`${input} !py-2 font-bold`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map(([k, label]) => (
            <option key={k || 'all'} value={k}>{label}{k && k !== 'to_do' && c[k] ? ` (${c[k]})` : k === 'to_do' && todo ? ` (${todo})` : ''}</option>
          ))}
        </select>
      </label>
      <div className="hidden sm:flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k || 'all'} className={`${btnQuiet} !py-1 shrink-0 whitespace-nowrap ${filter === k ? '!bg-orange-soft' : ''}`} onClick={() => setFilter(k)}>
            {label}{k && k !== 'to_do' && c[k] ? ` (${c[k]})` : k === 'to_do' && todo ? ` (${todo})` : ''}
          </button>
        ))}
      </div>
      <form className="flex gap-2 sm:max-w-md" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input className={`${input} !py-1.5 min-w-0`} type="search" placeholder="Order no., phone, name or UPI no." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={`${btnQuiet} !py-1 shrink-0`}>Search</button>
      </form>
      {!data ? <p className="animate-pulse">Loading…</p> : data.orders.length === 0 ? <Card>No orders here.</Card> : (
        <>
        {/* Phones: one card per order */}
        <ul className="grid gap-2 md:hidden">
          {data.orders.map((o) => (
            <li key={o.order_no}>
              <button type="button" onClick={() => setOpen(o.order_no)} className="w-full text-left rounded-2xl border-2 border-ink bg-paper p-3 active:bg-orange-soft/50">
                <div className="flex items-center gap-2">
                  <b className="text-lg">{o.order_no}</b>
                  <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${STATUS_TONE[o.status] ?? ''}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                  <b className="ml-auto text-lg tabular-nums">{rs(o.total_paise)}</b>
                </div>
                <div className="mt-1 text-base">{o.ship_name} · <span className="tabular-nums">{o.ship_phone}</span></div>
                <div className="text-sm text-ink/65">{o.ship_city} · {o.items} item{o.items === 1 ? '' : 's'} · {PAY_LABEL[o.payment_status] ?? o.payment_status} · {when(o.created_at)}</div>
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
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
        </>
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
  const [noteMsg, setNoteMsg] = useState('');
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
  const msgs = o ? customerMessages(o, link) : [];
  const defaultMsg = o
    ? o.status === 'pending_payment' ? 'pay' : o.status === 'shipped' ? 'shipped' : o.status === 'delivered' ? 'thanks' : o.status === 'cancelled' ? 'cancelled' : 'received'
    : 'received';
  const next: Record<string, [string, string] | null> = { placed: ['confirm', 'Confirm order'], confirmed: ['pack', 'Mark packed'], packed: null, shipped: ['deliver', 'Mark delivered'] };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full overflow-y-auto overscroll-contain bg-cream px-3 pb-6 sm:px-5 grid grid-cols-[minmax(0,1fr)] gap-4 content-start [&>*]:min-w-0" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 -mx-3 sm:-mx-5 px-3 sm:px-5 py-3 bg-cream border-b-2 border-ink/15 flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold mr-auto">Order {orderNo}</h2>
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

            <MessageBox key={`${o.order_no}-${defaultMsg}`} msgs={msgs} initial={defaultMsg} phone={o.ship.phone} />

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
              <div className="mt-2 flex items-center gap-3">
                <button className={btnQuiet} disabled={busy} onClick={async () => { setNoteMsg(''); await act('note', { text: note }); setNoteMsg('Saved ✓'); setTimeout(() => setNoteMsg(''), 3000); }}>Save note</button>
                {noteMsg && <span role="status" className="font-bold text-green">{noteMsg}</span>}
              </div>
              <p className="mt-3 text-xs text-ink/50 break-all">Customer’s order link: {link}</p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

type Msg = { id: string; label: string; text: string };

/** Ready Marathi messages for each stage of an order, to copy or send on WhatsApp. */
function customerMessages(o: Detail, link: string): Msg[] {
  const hi = `नमस्कार ${o.ship.name},`;
  const amt = rs(o.total_paise);
  const list: Msg[] = [
    { id: 'received', label: 'Order received', text: `${hi} चला खेळूया कडून तुमची ऑर्डर ${o.order_no} (${amt}) मिळाली आहे. २ कामकाजाच्या दिवसांत पार्सल पाठवू. ऑर्डर कुठे आहे ते इथे पाहा: ${link}` },
    { id: 'pay', label: 'Payment reminder', text: `${hi} चला खेळूया कडून तुमची ऑर्डर ${o.order_no} (${amt}) तयार आहे, पण पेमेंट अजून आलेले नाही. इथून पैसे भरा: ${link}` },
    { id: 'shipped', label: 'Sent (tracking)', text: `${hi} चला खेळूया कडून तुमची ऑर्डर ${o.order_no} पाठवली आहे.${o.courier ? ` ${o.courier}` : ''}${o.tracking_no ? ` ट्रॅकिंग नंबर: ${o.tracking_no}.` : ''} साधारण ३ ते ७ दिवसांत पोहोचेल. ऑर्डर पाहा: ${link}` },
    { id: 'thanks', label: 'Delivered – thank you', text: `${hi} तुमची ऑर्डर ${o.order_no} पोहोचली असेल अशी आशा आहे. चला खेळूया कडून खरेदी केल्याबद्दल मनःपूर्वक धन्यवाद! 🙏 काही अडचण असल्यास याच नंबरवर कळवा.` },
    { id: 'cancelled', label: 'Cancelled', text: `${hi} तुमची ऑर्डर ${o.order_no} रद्द झाली आहे.${o.cancel_reason && o.cancel_reason !== 'expired' ? ` कारण: ${o.cancel_reason}.` : ''}${o.payment_status === 'refund_due' || o.payment_status === 'refunded' ? ` भरलेले ${amt} ५ ते ७ कामकाजाच्या दिवसांत परत मिळतील.` : ''} काही प्रश्न असल्यास याच नंबरवर कळवा.` },
  ];
  if (o.payment_status === 'refunded') list.push({ id: 'refunded', label: 'Refund sent', text: `${hi} ऑर्डर ${o.order_no} चे ${amt} परत पाठवले आहेत. बँक खात्यात दिसायला १–२ दिवस लागू शकतात. धन्यवाद.` });
  return list;
}

function MessageBox({ msgs, initial, phone }: { msgs: Msg[]; initial: string; phone: string }) {
  const [id, setId] = useState(initial);
  const [text, setText] = useState(() => msgs.find((m) => m.id === initial)?.text ?? msgs[0]?.text ?? '');
  const [copied, setCopied] = useState(false);
  const pick = (m: Msg) => { setId(m.id); setText(m.text); setCopied(false); };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.getElementById('cust-msg') as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const digits = phone.replace(/[^0-9]/g, '');
  return (
    <Card>
      <h3 className="font-bold">Message for the customer</h3>
      <p className="text-sm text-ink/60">Pick the stage, check the text, then Copy (paste it in any WhatsApp) or open WhatsApp directly.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {msgs.map((m) => (
          <button key={m.id} type="button" onClick={() => pick(m)} className={`${btnQuiet} !py-1 !px-3 !text-sm ${id === m.id ? '!bg-orange-soft' : ''}`}>{m.label}</button>
        ))}
      </div>
      <textarea id="cust-msg" className={`${input} mt-2 min-h-[8rem] !text-base leading-relaxed`} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex">
        <button type="button" className={btnPrimary} onClick={copy}>{copied ? 'Copied ✓' : 'Copy message'}</button>
        <a className={btnQuiet} href={`https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Open in WhatsApp</a>
      </div>
      <p className="mt-1 text-sm text-ink/60">Customer’s number: <a className="underline" href={`tel:${digits}`}>{phone}</a></p>
    </Card>
  );
}
