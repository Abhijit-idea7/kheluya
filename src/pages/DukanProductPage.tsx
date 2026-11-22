import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Minus, Plus, ShoppingCart, Truck, Wallet } from 'lucide-react';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { addToCart, getCatalog, imageUrl, money, pickLang, readCart, setQty } from '@/lib/shop';
import Illustration from '@/components/Illustration';
import InterestButton from '@/components/InterestButton';
import { mrDigits } from '@/lib/dates';

/** One product: pictures, price, description and details, quantity, add to cart / buy now. */
export default function DukanProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const { data, loading } = useAsync(async () => {
    const [s, c] = await Promise.all([getPublicSettings(), getCatalog()]);
    return { settings: s, product: c.products.find((p) => p.slug === slug) ?? null };
  }, [slug]);
  const [img, setImg] = useState(0);
  const [qty, setQ] = useState(1);
  const [added, setAdded] = useState(false);

  if (loading) return <div className="max-w-site mx-auto px-4 py-10"><div className="sticker h-96 animate-pulse" aria-hidden="true" /></div>;
  const p = data?.product;
  const open = data?.settings.shop_selling === true;
  if (!p) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <Illustration name="confused" alt="" className="w-48 mx-auto mb-4" />
        <p className="text-xl">{t('shop.notFound')}</p>
        <Link to="/dukan" className="btn btn-primary mt-4">{t('shop.back')}</Link>
      </div>
    );
  }
  const soon = p.coming_soon || !open;
  const can = !soon && p.in_stock;
  const num = (v: number) => (lang === 'mr' ? mrDigits(v) : String(v));
  const add = () => {
    addToCart(p.id, qty, p.max_per_order);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => {
    const inCart = readCart().find((l) => l.id === p.id)?.qty ?? 0;
    if (inCart < qty) setQty(p.id, qty, p.max_per_order);
    navigate('/checkout');
  };
  const specs = p.specs.filter((s) => (lang === 'en' ? s.label_en || s.label_mr : s.label_mr) && (s.value_mr || s.value_en));

  return (
    <div className={`max-w-site mx-auto px-4 sm:px-5 py-4 sm:py-8 ${can ? 'pb-32 lg:pb-8' : ''}`}>
      <Link to="/dukan" className="inline-flex items-center gap-2 min-h-[2.75rem] mb-2 font-heading font-bold text-lg text-ink/75 hover:text-ink">
        <ArrowLeft size={20} strokeWidth={2.6} aria-hidden="true" />
        {t('shop.back')}
      </Link>
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div>
          {/* Portrait frame: the whole cover is shown, sized so the price stays near on a phone */}
          <div className="sticker overflow-hidden bg-[#F3ECDD] p-3 flex justify-center items-center">
            {p.images[img] ? (
              <img src={imageUrl(p.images[img])} alt={pickLang(p, 'name', lang)} className="h-[min(46vh,30rem)] lg:h-auto lg:max-h-[42rem] w-auto max-w-full aspect-[3/4] object-contain" />
            ) : (
              <Illustration name="book" alt="" eager className="h-[min(46vh,30rem)] lg:h-auto w-auto max-w-full aspect-[3/4] object-cover rounded-lg" />
            )}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {p.images.map((src, i) => (
                <button key={src} onClick={() => setImg(i)} aria-label={`${i + 1}`} className={`shrink-0 w-16 aspect-[3/4] rounded-lg border-[3px] overflow-hidden bg-[#F3ECDD] ${i === img ? 'border-ink' : 'border-line'}`}>
                  <img src={imageUrl(src)} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-heading-md sm:text-heading-lg leading-tight">{pickLang(p, 'name', lang)}</h1>
          {pickLang(p, 'short', lang) && <p className="text-xl leading-snug text-ink/85">{pickLang(p, 'short', lang)}</p>}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-heading font-extrabold text-[2rem] sm:text-[2.2rem]">{money(p.price_paise, lang)}</span>
            {p.mrp_paise && p.mrp_paise > p.price_paise && (
              <>
                <s className="text-xl text-ink/55">{money(p.mrp_paise, lang)}</s>
                <span className="text-lg font-bold text-green">{t('shop.save', { amt: money(p.mrp_paise - p.price_paise, lang) })}</span>
              </>
            )}
          </div>
          {soon && <p className="self-start rounded-full bg-orange-soft border-2 border-ink px-3 py-0.5 text-xl font-bold">{t('shop.soon')}</p>}
          {soon && (
            <InterestButton productName={p.name_mr} slug={p.slug} label={t('shop.interest')} className="w-full lg:w-auto lg:self-start" />
          )}
          {!soon && !p.in_stock && <p className="text-xl font-bold text-[#B42318]">{t('shop.out')}</p>}
          {can && p.few_left && <p className="text-lg font-bold text-[#B42318]">{t('shop.few')}</p>}

          {can && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{t('shop.qty')}</span>
                <button type="button" aria-label="-" onClick={() => setQ(Math.max(1, qty - 1))} className="grid place-items-center h-12 w-12 rounded-xl border-2 border-ink bg-paper">
                  <Minus size={22} strokeWidth={3} aria-hidden="true" />
                </button>
                <span className="min-w-[2.5rem] text-center font-heading font-extrabold text-2xl tabular-nums">{num(qty)}</span>
                <button type="button" aria-label="+" onClick={() => setQ(Math.min(p.max_per_order, qty + 1))} className="grid place-items-center h-12 w-12 rounded-xl border-2 border-ink bg-paper">
                  <Plus size={22} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
              <div className="hidden lg:grid gap-3 grid-cols-2">
                <button type="button" onClick={add} className={`btn w-full ${added ? 'btn-whatsapp' : 'btn-quiet'}`}>{added ? t('shop.added') : t('shop.add')}</button>
                <button type="button" onClick={buyNow} className="btn btn-primary w-full">{t('shop.buyNow')}</button>
              </div>
            </>
          )}

          <ul className="grid gap-2 text-lg">
            <li className="flex items-center gap-2"><Truck size={22} strokeWidth={2.4} aria-hidden="true" />{t('shop.freeDelivery')}</li>
            {data?.settings.cash_on_delivery === true && <li className="flex items-center gap-2"><Wallet size={22} strokeWidth={2.4} aria-hidden="true" />{t('shop.codAvail')}</li>}
          </ul>

          {pickLang(p, 'description', lang) && <p className="text-lg leading-relaxed whitespace-pre-line">{pickLang(p, 'description', lang)}</p>}
          {specs.length > 0 && (
            <table className="w-full text-lg border-2 border-line rounded-xl overflow-hidden border-separate border-spacing-0 bg-white">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i}>
                    <th className="text-left font-bold px-3 py-2 border-t border-line first:border-t-0 w-2/5 align-top">{lang === 'en' ? s.label_en || s.label_mr : s.label_mr}</th>
                    <td className="px-3 py-2 border-t border-line">{lang === 'en' ? s.value_en || s.value_mr : s.value_mr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {can && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-paper border-t-[3px] border-ink px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 shadow-[0_-4px_12px_rgba(16,35,63,0.12)]">
          <div className="min-w-0 mr-auto leading-tight">
            <p className="font-heading font-extrabold text-2xl">{money(p.price_paise * qty, lang)}</p>
            {qty > 1 && <p className="text-sm text-ink/65">{num(qty)} × {money(p.price_paise, lang)}</p>}
          </div>
          <button type="button" onClick={add} aria-label={t('shop.add')} className={`grid place-items-center h-14 w-14 shrink-0 rounded-2xl border-[3px] border-ink ${added ? 'bg-green text-white' : 'bg-white'}`}>
            <ShoppingCart size={26} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <button type="button" onClick={buyNow} className="btn btn-primary !min-h-[3.5rem] !px-5 !text-xl shrink-0">{t('shop.buyNow')}</button>
        </div>
      )}
      {added && <p role="status" className="lg:hidden fixed left-3 right-3 bottom-24 z-30 rounded-2xl bg-green text-white text-center font-bold text-lg py-2">{t('shop.added')}</p>}
    </div>
  );
}
