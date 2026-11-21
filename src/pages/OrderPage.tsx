import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ExternalLink, FileText, Package } from 'lucide-react';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { getOrder, money, payOnline, pickLang, rememberOrder, STEPS, type Order } from '@/lib/shop';
import { mrDigits, prettyDate } from '@/lib/dates';
import FormField, { inputClass } from '@/components/FormField';
import Illustration from '@/components/Illustration';

/** One order for the customer: status steps, payment, items, address, tracking, invoice. Opened with the link key or phone. */
export default function OrderPage() {
  const { id = '' } = useParams();
  const [q, setQ] = useSearchParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const key = q.get('k') ?? '';
  const isNew = q.get('new') === '1';
  const [reload, setReload] = useState(0);
  const { data: o, loading } = useAsync(() => (key ? getOrder(id, key) : Promise.resolve(null)), [id, key, reload]);
  const { data: settings } = useAsync(() => getPublicSettings(), []);
  const [phone, setPhone] = useState('');
  const [wrong, setWrong] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');

  if (o) rememberOrder(o.order_no, o.access_key);
  const num = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));

  // No key in the link (or a wrong one): ask for the phone number used with the order
  if (!loading && !o) {
    const find = async (e: React.FormEvent) => {
      e.preventDefault();
      const found = await getOrder(id, phone).catch(() => null);
      if (!found) return setWrong(true);
      setQ({ k: found.access_key }, { replace: true });
    };
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-heading-md">{t('shop.o.no')} {id.toUpperCase()}</h1>
        <form onSubmit={find} className="mt-4 grid gap-4">
          <FormField label={t('shop.o.ask')}>
            <input className={inputClass} value={phone} onChange={(e) => { setPhone(e.target.value); setWrong(false); }} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
          </FormField>
          {wrong && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('shop.o.wrong')}</p>}
          <button className="btn btn-primary w-full">{t('shop.o.show')}</button>
        </form>
      </div>
    );
  }
  if (loading || !o) return <div className="max-w-xl mx-auto px-4 py-10"><div className="sticker h-96 animate-pulse" aria-hidden="true" /></div>;

  const pay = async () => {
    setPaying(true);
    setPayErr('');
    try {
      await payOnline(o.order_no, o.access_key, o.items.map((i) => pickLang(i, 'name', lang)).join(', ').slice(0, 200));
    } catch {
      setPayErr(t('shop.err.PAY'));
    }
    setPaying(false);
    setReload((n) => n + 1);
  };
  const stepIdx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const sellerPhone = String(settings?.seller_phone ?? '').replace(/[^0-9]/g, '');
  const help = sellerPhone ? `https://wa.me/${sellerPhone.length === 10 ? `91${sellerPhone}` : sellerPhone}?text=${encodeURIComponent(`नमस्कार, माझी ऑर्डर ${o.order_no} बद्दल विचारायचे आहे.`)}` : '';
  const payLabel: Record<string, string> = {
    paid: t('shop.o.paid'), cod_pending: t('shop.o.codPending'), cod_collected: t('shop.o.codDone'), refund_due: t('shop.o.refundDue'), refunded: t('shop.o.refunded'),
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8 grid gap-5">
      {isNew && o.status !== 'pending_payment' && o.status !== 'cancelled' && (
        <div className="p-5 rounded-3xl border-[3px] border-green bg-green-soft text-center">
          <Illustration name="cheer" alt="" className="w-36 mx-auto mb-3" />
          <h1 className="text-heading-md">{t('shop.o.thanks')}</h1>
          {o.payment_method === 'cod' && <p className="mt-1 text-xl">{t('shop.o.thanksCod', { amt: money(o.total_paise, lang) })}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-heading-md mr-auto">{t('shop.o.no')} {o.order_no}</h2>
        <span className="text-lg text-ink/70">{t('shop.o.placedOn')}: {prettyDate(new Date(new Date(o.created_at).getTime() + 330 * 60000).toISOString(), lang)}</span>
      </div>

      {o.status === 'pending_payment' && (
        <div className="p-4 rounded-2xl border-[3px] border-ink bg-orange-soft">
          <p className="text-lg font-bold">{t('shop.o.payPending')}</p>
          <button onClick={pay} disabled={paying} className="btn btn-primary w-full mt-3">{paying ? t('shop.co.placing') : t('shop.o.payNow', { amt: money(o.total_paise, lang) })}</button>
          {payErr && <p className="mt-2 font-bold text-[#B42318]">{payErr}</p>}
        </div>
      )}
      {o.status === 'cancelled' && <p className="p-4 rounded-2xl border-2 border-[#B42318] bg-[#FDECEA] text-lg font-bold">{t('shop.o.cancelled')}</p>}

      {stepIdx >= 0 && (
        <ol className="grid gap-0" aria-label={t('shop.o.status')}>
          {STEPS.map((s, i) => {
            const done = i <= stepIdx;
            const ev = o.events.filter((e) => e.status === s).pop();
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`grid place-items-center h-9 w-9 rounded-full border-[3px] ${done ? 'bg-green border-green text-white' : 'bg-paper border-line text-ink/50'}`}>
                    {done ? <Check size={18} strokeWidth={3.2} aria-hidden="true" /> : <span className="text-sm font-bold">{num(i + 1)}</span>}
                  </span>
                  {i < STEPS.length - 1 && <span className={`w-1 flex-1 min-h-[1.25rem] ${i < stepIdx ? 'bg-green' : 'bg-line'}`} />}
                </div>
                <div className="pb-3">
                  <p className={`text-xl font-heading font-bold ${done ? '' : 'text-ink/50'}`}>{t(`shop.o.s_${s}`)}</p>
                  {ev && <p className="text-base text-ink/65">{new Date(ev.at).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {(o.tracking_no || o.tracking_url) && (
        <section className="p-4 rounded-2xl border-2 border-ink bg-white">
          <p className="flex items-center gap-2 text-lg"><Package size={22} strokeWidth={2.4} aria-hidden="true" />{o.courier} · {t('shop.o.trackNo')}: <b className="tabular-nums">{o.tracking_no}</b></p>
          {o.tracking_url && (
            <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full mt-3">
              <ExternalLink size={20} strokeWidth={2.6} aria-hidden="true" />{t('shop.o.track')}
            </a>
          )}
        </section>
      )}

      <section className="p-4 rounded-2xl border-2 border-ink bg-white">
        <h3 className="font-heading font-extrabold text-xl mb-2">{t('shop.o.items')}</h3>
        <ul className="grid gap-1.5 text-lg">
          {o.items.map((i, k) => (
            <li key={k} className="flex gap-3"><span className="flex-1">{pickLang(i, 'name', lang)} × {num(i.qty)}</span><span>{money(i.line_total_paise, lang)}</span></li>
          ))}
          <li className="flex gap-3"><span className="flex-1">{t('shop.delivery')}</span><span className="font-bold text-green">{t('shop.free')}</span></li>
          <li className="flex gap-3 border-t-2 border-line pt-2 font-heading font-extrabold text-2xl"><span className="flex-1">{t('shop.total')}</span><span>{money(o.total_paise, lang)}</span></li>
        </ul>
        {payLabel[o.payment_status] && <p className="mt-2 text-lg font-bold">{payLabel[o.payment_status]}</p>}
      </section>

      <section className="p-4 rounded-2xl border-2 border-line bg-paper text-lg leading-snug">
        <h3 className="font-heading font-extrabold text-xl mb-1">{t('shop.o.ship')}</h3>
        <p className="font-bold">{o.ship.name} · {o.ship.phone}</p>
        <p>{[o.ship.line1, o.ship.line2, o.ship.landmark].filter(Boolean).join(', ')}</p>
        <p>{o.ship.city}, {o.ship.state} — {o.ship.pincode}</p>
      </section>

      {o.invoice_no && (
        <Link to={`/order/${o.order_no}/invoice?k=${o.access_key}`} className="btn btn-quiet w-full">
          <FileText size={20} strokeWidth={2.6} aria-hidden="true" />{t('shop.o.invoice')}
        </Link>
      )}
      {help && <a href={help} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full">{t('shop.o.help')}</a>}
      <Link to="/majhi-order" className="text-center text-lg underline underline-offset-4">{t('shop.mine.title')}</Link>
    </div>
  );
}

export type { Order };
