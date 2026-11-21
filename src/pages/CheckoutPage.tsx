import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import FormField, { inputClass } from '@/components/FormField';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import {
  clearCart, getCatalog, money, payOnline, pickLang, placeOrder, savedCustomer, saveCustomer, shopError, STATES, STATES_MR, useCart,
  type Customer,
} from '@/lib/shop';
import { mrDigits } from '@/lib/dates';

const EMPTY: Customer = { name: '', phone: '', email: '', address: { line1: '', line2: '', landmark: '', city: '', state: 'Maharashtra', pincode: '' } };

/** Checkout on one page: who you are, where to deliver, how to pay. Details are remembered on this phone. */
export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const navigate = useNavigate();
  const cart = useCart();
  const { data, loading } = useAsync(async () => {
    const [s, c] = await Promise.all([getPublicSettings(), getCatalog()]);
    return { s, c };
  }, []);
  const [c, setC] = useState<Customer>(() => {
    const saved = savedCustomer();
    return saved ? { ...EMPTY, ...saved, address: { ...EMPTY.address, ...saved.address } } : EMPTY;
  });
  const [pay, setPay] = useState<'razorpay' | 'cod' | ''>('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !data) return <div className="max-w-xl mx-auto px-4 py-10"><div className="sticker h-96 animate-pulse" aria-hidden="true" /></div>;
  const s = data.s;
  const open = s.shop_selling === true;
  const onlineOn = typeof s.razorpay_key_id === 'string' && s.razorpay_key_id.length > 5;
  const codOn = s.cash_on_delivery === true;
  const codMax = Number(s.cod_max_rupees ?? 2000) * 100;
  const lines = cart.map((l) => ({ ...l, p: data.c.products.find((p) => p.id === l.id) })).filter((l) => l.p);
  const total = lines.reduce((sum, l) => sum + l.p!.price_paise * l.qty, 0);
  const codOk = codOn && total <= codMax;
  const method = pay || (onlineOn ? 'razorpay' : codOk ? 'cod' : '');

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
      clearCart();
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
      setErr(t(`shop.err.${code}`, { d: detail, defaultValue: t('shop.err.UNKNOWN') }));
      setBusy(false);
    }
  };

  const radio = (value: 'razorpay' | 'cod', label: string, hint: string, disabled = false, extra = '') => (
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
          {codOn && radio('cod', t('shop.co.cod'), t('shop.co.codHint'), !codOk, codOk ? '' : t('shop.co.codLimit', { amt: money(codMax, lang) }))}
        </fieldset>

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
          {busy ? t('shop.co.placing') : method === 'razorpay' ? t('shop.co.placePay', { amt: money(total, lang) }) : t('shop.co.place')}
        </button>
        <p className="-mt-3 text-base text-ink/65">{t('shop.co.remember')}</p>
      </form>
    </div>
  );
}
