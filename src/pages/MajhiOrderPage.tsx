import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useAsync } from '@/lib/useAsync';
import { getOrder, money, savedCustomer, savedOrders, trackOrders } from '@/lib/shop';
import { prettyDate } from '@/lib/dates';
import FormField, { inputClass } from '@/components/FormField';

type Row = { order_no: string; access_key: string; status: string; total_paise: number; created_at: string };

/** "माझी ऑर्डर कुठे आहे?": look up orders with the mobile number + delivery pincode, and see orders placed from this phone. */
export default function MajhiOrderPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const { data: mine, loading } = useAsync(async () => {
    const list = savedOrders().slice(0, 20);
    const rows = await Promise.all(list.map((s) => getOrder(s.order_no, s.key).catch(() => null)));
    return rows.filter(Boolean).map((o) => ({ order_no: o!.order_no, access_key: o!.access_key, status: o!.status, total_paise: o!.total_paise, created_at: o!.created_at }));
  }, []);
  const saved = savedCustomer();
  const [phone, setPhone] = useState(saved?.phone ?? '');
  const [pin, setPin] = useState(saved?.address.pincode ?? '');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Row[] | null>(null);
  const [miss, setMiss] = useState(false);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setMiss(false);
    setFound(null);
    setBusy(true);
    const r = await trackOrders(phone, pin).catch(() => []);
    setBusy(false);
    if (!r.length) return setMiss(true);
    setFound(r);
  };
  const list = (rows: Row[]) => (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.order_no}>
          <Link to={`/order/${r.order_no}?k=${r.access_key}`} className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-ink bg-paper">
            <span className="flex-1">
              <span className="block font-heading font-extrabold text-xl">{r.order_no} · {money(r.total_paise, lang)}</span>
              <span className="block text-base text-ink/70">
                {prettyDate(new Date(new Date(r.created_at).getTime() + 330 * 60000).toISOString(), lang)} · {t(`shop.o.s_${r.status}`)}
              </span>
            </span>
            <ChevronRight size={24} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );

  const lookup = (
    <section className="sticker p-4 sm:p-5">
      <h2 className="text-heading-sm">{t('shop.mine.find')}</h2>
      <p className="text-lg text-ink/75">{t('shop.mine.findSub')}</p>
      <form onSubmit={find} className="mt-3 grid gap-3">
        <FormField label={t('shop.co.phone')}>
          <input className={inputClass} value={phone} onChange={(e) => { setPhone(e.target.value); setMiss(false); }} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
        </FormField>
        <FormField label={t('shop.mine.pin')} hint={t('shop.mine.pinHint')}>
          <input className={inputClass} value={pin} onChange={(e) => { setPin(e.target.value); setMiss(false); }} inputMode="numeric" autoComplete="postal-code" maxLength={7} />
        </FormField>
        {miss && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('shop.mine.notFound')}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t('shop.mine.go')}</button>
      </form>
      {found && <div className="mt-4">{list(found)}</div>}
    </section>
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8 grid gap-6">
      <div>
        <h1 className="text-heading-lg">{t('shop.mine.title')}</h1>
        <p className="text-lg text-ink/70">{t('shop.mine.sub')}</p>
      </div>
      {loading ? (
        <div className="sticker h-32 animate-pulse" aria-hidden="true" />
      ) : mine && mine.length ? (
        <>
          <section className="grid gap-2">
            <h2 className="text-heading-sm">{t('shop.mine.here')}</h2>
            {list(mine)}
          </section>
          {lookup}
        </>
      ) : (
        lookup
      )}
    </div>
  );
}
