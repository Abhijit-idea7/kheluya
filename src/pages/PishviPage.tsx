import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useAsync } from '@/lib/useAsync';
import { getCatalog, imageUrl, money, pickLang, setQty, useCart } from '@/lib/shop';
import { mrDigits } from '@/lib/dates';
import Illustration from '@/components/Illustration';

/** The cart: what's in it, change quantities, total, then checkout. */
export default function PishviPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const cart = useCart();
  const { data: cat, loading } = useAsync(() => getCatalog(), []);
  const num = (v: number) => (lang === 'mr' ? mrDigits(v) : String(v));

  const lines = (cat?.products ?? []).length
    ? cart.map((l) => ({ ...l, p: cat!.products.find((p) => p.id === l.id) })).filter((l) => l.p)
    : [];
  const total = lines.reduce((s, l) => s + l.p!.price_paise * l.qty, 0);

  if (loading) return <div className="max-w-xl mx-auto px-4 py-10"><div className="sticker h-60 animate-pulse" aria-hidden="true" /></div>;

  if (!lines.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <Illustration name="book" alt="" className="w-48 mx-auto mb-4" />
        <h1 className="text-heading-md">{t('shop.cartEmpty')}</h1>
        <Link to="/dukan" className="btn btn-primary mt-5">{t('shop.cartGo')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
      <h1 className="text-heading-lg">{t('shop.cart')}</h1>
      <ul className="mt-4 grid gap-3">
        {lines.map(({ id, qty, p }) => (
          <li key={id} className="flex gap-3 p-3 rounded-2xl border-2 border-ink bg-paper">
            <Link to={`/dukan/${p!.slug}`} className="shrink-0 w-16 aspect-[3/4] rounded-lg border border-line overflow-hidden bg-[#F3ECDD]">
              {p!.images[0] ? <img src={imageUrl(p!.images[0])} alt="" className="w-full h-full object-contain" /> : <Illustration name="book" alt="" className="w-full h-full object-cover" />}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-lg leading-tight">{pickLang(p!, 'name', lang)}</p>
              <p className="text-lg">{money(p!.price_paise, lang)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button aria-label="-" onClick={() => setQty(id, qty - 1, p!.max_per_order)} className="grid place-items-center h-11 w-11 rounded-xl border-2 border-ink bg-white">
                  {qty === 1 ? <Trash2 size={20} strokeWidth={2.4} aria-hidden="true" /> : <Minus size={20} strokeWidth={3} aria-hidden="true" />}
                </button>
                <span className="min-w-[2rem] text-center font-heading font-extrabold text-xl tabular-nums">{num(qty)}</span>
                <button aria-label="+" onClick={() => setQty(id, qty + 1, p!.max_per_order)} className="grid place-items-center h-11 w-11 rounded-xl border-2 border-ink bg-white">
                  <Plus size={20} strokeWidth={3} aria-hidden="true" />
                </button>
                <span className="ml-auto font-heading font-extrabold text-xl">{money(p!.price_paise * qty, lang)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 p-4 rounded-2xl border-2 border-ink bg-white grid gap-1.5 text-xl">
        <div className="flex justify-between"><span>{t('shop.delivery')}</span><span className="font-bold text-green">{t('shop.free')}</span></div>
        <div className="flex justify-between font-heading font-extrabold text-2xl"><span>{t('shop.total')}</span><span>{money(total, lang)}</span></div>
      </div>
      <Link to="/checkout" className="btn btn-primary w-full mt-4 !min-h-[4.5rem] !text-[1.5rem]">{t('shop.checkout')}</Link>
    </div>
  );
}
