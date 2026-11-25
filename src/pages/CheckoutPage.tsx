import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import FormField, { inputClass } from '@/components/FormField';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import {
  clearCart, getCatalog, saveLead, money, payOnline, pickLang, placeOrder, savedCustomer, saveCustomer, shopError, STATES, STATES_MR, useCart,
  type Customer, type Pay,
} from '@/lib/shop';
import { mrDigits } from '@/lib/dates';
import AskButton from '@/components/AskButton';

const EMPTY: Customer = { name: '', phone: '', email: '', address: { line1: '', line2: '', landmark: '', city: '', state: 'Maharashtra', pincode: '' } };

/** Checkout on one page: who you are, where to deliver, how to pay. Details are remembered on this phone. */
export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const navigate = useNavigate();
  const cart = useCart();
  // "Buy now": check out just this one product, without touching the cart
  const [params] = useSearchParams();
  const buyId = params.get('buy');
  const buyQty = Math.max(1, Math.min(100, Number(params.get('qty')) || 1));
  const [placing, setPlacing] = useState(false);
  const leadKey = useRef('');
  const { data, loading } = useAsync(async () => {
    const [s, c] = await Promise.all([getPublicSettings(), getCatalog()]);
    return { s, c };
  }, []);
  const [c, setC] = useState<Customer>(() => {
    const saved = savedCustomer();
    return saved ? { ...EMPTY, ...saved, address: { ...EMPTY.address, ...saved.address } } : EMPTY;
  });
  const [pay, setPay] = useState<Pay | ''>('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Cart recovery: once a name and a valid mobile are typed, remember this unfinished checkout (a second after typing stops)
  const leadPhone = c.phone.replace(/[^0-9]/g, '').slice(-10);
  const leadItems = (buyId ? [{ id: buyId, qty: buyQty }] : cart).map((l) => `${l.id}:${l.qty}`).join(',');
  useEffect(() => {
    if (!/^[6-9][0-9]{9}$/.test(leadPhone) || c.name.trim().length < 2 || !leadItems) return;
    const key = `${leadPhone}|${c.name.trim()}|${c.address.city.trim()}|${c.address.pincode}|${leadItems}`;
    if (key === leadKey.current) return;
    const tm = setTimeout(() => {
      leadKey.current = key;
      saveLead({
        phone: leadPhone, name: c.name.trim(), city: c.address.city.trim(), pincode: c.address.pincode, source: 'checkout',
        items: leadItems.split(',').map((x) => ({ id: x.split(':')[0], qty: Number(x.split(':')[1]) })),
      });
    }, 1200);
    return () => clearTimeout(tm);
  }, [leadPhone, c.name, c.address.city, c.address.pincode, leadItems]);

  if (loading || !data) return <div className="max-w-xl mx-auto px-4 py-10"><div className="sticker h-96 animate-pulse" aria-hidden="true" /></div>;
  const s = data.s;
  const open = s.shop_selling === true;
  const onlineOn = typeof s.razorpay_key_id === 'string' && s.razorpay_key_id.length > 5;
  const upiOn = s.upi_direct === true && /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.]{2,}$/.test(String(s.upi_id ?? ''));
  const codOn = s.cash_on_delivery === true;
  const codMax = Number(s.cod_max_rupees ?? 2000) * 100;
  const chosen = buyId ? [{ id: buyId, qty: buyQty }] : cart;
  const lines = chosen.map((l) => ({ ...l, p: data.c.products.find((p) => p.id === l.id) })).filter((l) => l.p);
  const total = lines.reduce((sum, l) => sum + l.p!.price_paise * l.qty, 0);
  const codOk = codOn && total <= codMax;
  const method: Pay | '' = pay || (onlineOn ? 'razorpay' : upiOn ? 'upi' : codOk ? 'cod' : '');

  // Order placed: show a calm "opening payment" screen (the cart is empty by now)
  if (placing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center" role="status">
        <div className="mx-auto h-14 w-14 rounded-full border-[5px] border-orange border-t-transparent animate-spin" aria-hidden="true" />
        <p className="mt-5 text-heading-sm">{t('shop.co.opening')}</p>
      </div>
    );
  }
  if (!open) return <p className="max-w-xl mx-auto px-4 py-10 text-xl">{t('shop.co.closed')}</p>;
  if (!lines.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <p className="text-xl">{t('shop.cartEmpty')}</p>
        <Link to="/dukan" className="btn btn-primary mt-4">{t('shop.cartGo')}</Link>
      </div>
    );
  }

  const set = (k: keyof Customer, v: string) => setC({ ...c, [k]: v });
  const setA = (k: keyof Customer['address'], v: string) => setC({ ...c, address: { ...c.address, [k]: v } });
  const digits = c.phone.replace(/[^0-9]/g, '').slice(-10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    // Quick checks here; the database checks everything again
    if (c.name.trim().length < 2) return setErr(t('shop.err.BAD_NAME'));
    if (!/^[6-9][0-9]{9}$/.test(digits)) return setErr(t('shop.err.BAD_PHONE'));
    if (c.address.line1.trim().length < 3 || c.address.city.trim().length < 2) return setErr(t('shop.err.BAD_ADDRESS'));
    if (!/^[1-9][0-9]{5}$/.test(c.address.pincode.replace(/\s/g, ''))) return setErr(t('shop.err.BAD_PINCODE'));
    if (!method) return setErr(t('shop.err.ONLINE_OFF'));
    setBusy(true);
    const clean: Customer = { ...c, phone: digits, address: { ...c.address, pincode: c.address.pincode.replace(/\s/g, '') } };
    saveCustomer(clean);
    try {
      const r = await placeOrder(clean, lines.map(({ id, qty }) => ({ id, qty })), method, note.trim());
      setPlacing(true);
      if (!buyId) clearCart();
      if (r.payment === 'razorpay') {
        try {
          await payOnline(r.order_no, r.access_key, lines.map((l) => pickLang(l.p!, 'name', lang)).join(', ').slice(0, 200));
        } catch {
          /* the order page offers to pay again */
        }
      }
      navigate(`/order/${r.order_no}?k=${r.access_key}&new=1`, { replace: true });
    } catch (e2) {
      const { code, detail } = shopError(e2);
      setPlacing(false);
      setErr(t(`shop.err.${code}`, { d: detail, defaultValue: t('shop.err.UNKNOWN') }));
      setBusy(false);
    }
  };

  const radio = (value: Pay, label: string, hint: string, disabled = false, extra = '') => (
    <label className={`flex items-start gap-3 p-4 rounded-2xl border-[3px] ${disabled ? 'border-line opacity-60' : 'border-ink'} ${method === value ? 'bg-orange-soft' : 'bg-paper'}`}>
      <input type="radio" name="pay" className="mt-1 h-6 w-6 accent-[#F39200]" checked={method === value} disabled={disabled} onChange={() => setPay(value)} />
      <span>
        <span className="block font-heading font-bold text-xl">{label}</span>
        <span className="block text-base text-ink/75">{extra || hint}</span>
      </span>
    </label>
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
      <h1 className="text-heading-lg">{t('shop.co.title')}</h1>
      <form onSubmit={submit} className="mt-5 grid gap-6" noValidate>
        <fieldset className="grid gap-4">
          <legend className="font-heading font-extrabold text-2xl mb-1">{t('shop.co.you')}</legend>
          <FormField label={t('shop.co.name')}><input className={inputClass} value={c.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></FormField>
          <FormField label={t('shop.co.phone')} hint={t('shop.co.phoneHint')}>
            <input className={inputClass} value={c.phone} onChange={(e) => set('phone', e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
          </FormField>
          <FormField label={t('shop.co.email')}><input className={inputClass} value={c.email} onChange={(e) => set('email', e.target.value)} inputMode="email" autoComplete="email" /></FormField>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="font-heading font-extrabold text-2xl mb-1">{t('shop.co.addr')}</legend>
          <FormField label={t('shop.co.line1')}><input className={inputClass} value={c.address.line1} onChange={(e) => setA('line1', e.target.value)} autoComplete="address-line1" /></FormField>
          <FormField label={t('shop.co.line2')}><input className={inputClass} value={c.address.line2} onChange={(e) => setA('line2', e.target.value)} autoComplete="address-line2" /></FormField>
          <FormField label={t('shop.co.landmark')}><input className={inputClass} value={c.address.landmark} onChange={(e) => setA('landmark', e.target.value)} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('shop.co.city')}><input className={inputClass} value={c.address.city} onChange={(e) => setA('city', e.target.value)} autoComplete="address-level2" /></FormField>
            <FormField label={t('shop.co.pincode')}>
              <input className={inputClass} value={c.address.pincode} onChange={(e) => setA('pincode', e.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={7} />
            </FormField>
          </div>
          <FormField label={t('shop.co.state')}>
            <select className={inputClass} value={c.address.state} onChange={(e) => setA('state', e.target.value)} autoComplete="address-level1">
              {STATES.map((st) => <option key={st} value={st}>{lang === 'mr' && STATES_MR[st] ? `${STATES_MR[st]} (${st})` : st}</option>)}
            </select>
          </FormField>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="font-heading font-extrabold text-2xl mb-1">{t('shop.co.pay')}</legend>
          {onlineOn && radio('razorpay', t('shop.co.online'), t('shop.co.onlineHint'))}
          {upiOn && radio('upi', t('shop.co.upi'), t('shop.co.upiHint'))}
          {codOn && radio('cod', t('shop.co.cod'), t('shop.co.codHint'), !codOk, codOk ? '' : t('shop.co.codLimit', { amt: money(codMax, lang) }))}
        </fieldset>

        <AskButton about={lines.map((l) => `"${l.p!.name_mr}" × ${l.qty}`).join(', ')} items={lines.map(({ id, qty }) => ({ id, qty }))} className="w-full" />

        <FormField label={t('shop.co.note')}>
          <textarea className={`${inputClass} min-h-[5rem]`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </FormField>

        <section className="p-4 rounded-2xl border-2 border-ink bg-white">
          <h2 className="font-heading font-extrabold text-xl mb-2">{t('shop.co.summary')}</h2>
          <ul className="grid gap-1.5 text-lg">
            {lines.map((l) => (
              <li key={l.id} className="flex gap-3"><span className="flex-1">{pickLang(l.p!, 'name', lang)} × {lang === 'mr' ? mrDigits(l.qty) : l.qty}</span><span>{money(l.p!.price_paise * l.qty, lang)}</span></li>
            ))}
            <li className="flex gap-3"><span className="flex-1">{t('shop.delivery')}</span><span className="font-bold text-green">{t('shop.free')}</span></li>
            <li className="flex gap-3 border-t-2 border-line pt-2 font-heading font-extrabold text-2xl"><span className="flex-1">{t('shop.total')}</span><span>{money(total, lang)}</span></li>
          </ul>
        </section>

        {err && <p role="alert" className="text-lg font-bold text-[#B42318]">{err}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full !min-h-[4.5rem] !text-[1.45rem]">
          <Check size={26} strokeWidth={3} aria-hidden="true" />
          {busy ? t('shop.co.placing') : method === 'razorpay' ? t('shop.co.placePay', { amt: money(total, lang) }) : method === 'upi' ? t('shop.co.placeUpi') : t('shop.co.place')}
        </button>
        <p className="-mt-3 text-base text-ink/65">{t('shop.co.remember')}</p>
        <p className="-mt-3 text-base text-ink/65">
          {t('shop.co.agree1')} <Link to="/dhoran/terms" className="underline">{t('footer.terms')}</Link>,{' '}
          <Link to="/dhoran/shipping" className="underline">{t('footer.shipping')}</Link> {t('shop.co.agreeAnd')}{' '}
          <Link to="/dhoran/refunds" className="underline">{t('footer.refunds')}</Link> {t('shop.co.agree2')}
        </p>
      </form>
    </div>
  );
}
