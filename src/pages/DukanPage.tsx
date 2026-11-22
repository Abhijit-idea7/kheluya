import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Truck } from 'lucide-react';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { addToCart, getCatalog, imageUrl, money, pickLang, useCart, type Product } from '@/lib/shop';
import Illustration from '@/components/Illustration';
import { trackSite } from '@/lib/track';
import { useEffect } from 'react';

/** The shop: every active product. Until selling is switched on in Admin (or for a product marked coming soon), cards show "coming soon" instead of add-to-cart. */
export default function DukanPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const { data, loading } = useAsync(async () => {
    const [s, c] = await Promise.all([getPublicSettings(), getCatalog().catch(() => ({ categories: [], products: [] }))]);
    return { open: s.shop_selling === true, ...c };
  }, []);
  const [cat, setCat] = useState('');
  const cart = useCart();
  const count = cart.reduce((n, l) => n + l.qty, 0);
  useEffect(() => {
    if (data) trackSite('shop_view');
  }, [data]);

  if (loading) return <div className="max-w-site mx-auto px-4 py-10"><div className="sticker h-72 animate-pulse" aria-hidden="true" /></div>;
  const open = data?.open === true;
  if (!data?.products.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <Illustration name="book" alt="" eager className="w-44 mx-auto mb-4" />
        <h1 className="text-heading-lg">{t('shop.title')}</h1>
        <p className="mt-2 text-xl">{t('shop.empty')}</p>
        <Link to="/" className="btn btn-primary mt-5">{t('shop.playToday')}</Link>
      </div>
    );
  }

  const cats = data.categories.filter((c) => data.products.some((p) => p.category_id === c.id));
  const shown = cat ? data.products.filter((p) => p.category_id === cat) : data.products;

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-5 sm:py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-heading-lg">{t('shop.title')}</h1>
          <p className="text-lg text-ink/75">{t('shop.sub')}</p>
        </div>
        {open && count > 0 && (
          <Link to="/pishvi" className="btn btn-primary">
            <ShoppingCart size={22} strokeWidth={2.6} aria-hidden="true" />
            {t('shop.viewCart', { n: lang === 'mr' ? count.toLocaleString('mr-IN') : count })}
          </Link>
        )}
      </div>
      <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-soft border-2 border-green text-lg font-semibold">
        <Truck size={20} strokeWidth={2.4} aria-hidden="true" />
        {t('shop.freeDelivery')}
      </p>

      {cats.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2" role="tablist">
          {[{ id: '', name_mr: t('shop.all'), name_en: t('shop.all') }, ...cats].map((c) => (
            <button
              key={c.id || 'all'}
              role="tab"
              aria-selected={cat === c.id}
              onClick={() => setCat(c.id)}
              className={`min-h-touch px-4 rounded-2xl border-2 border-ink text-lg font-bold ${cat === c.id ? 'bg-orange-soft' : 'bg-paper'}`}
            >
              {lang === 'en' ? c.name_en || c.name_mr : c.name_mr}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-5 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <ProductCard key={p.id} p={p} lang={lang} open={open} />
        ))}
      </ul>
    </div>
  );
}

function ProductCard({ p, lang, open }: { p: Product; lang: 'mr' | 'en'; open: boolean }) {
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);
  const soon = p.coming_soon || !open;
  const can = !soon && p.in_stock;
  const add = () => {
    addToCart(p.id, 1, p.max_per_order);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  return (
    <li className="sticker overflow-hidden flex sm:flex-col">
      {/* Book covers are portrait: a 3:4 frame that shows the whole cover. On phones the cover sits on the left. */}
      <Link to={`/dukan/${p.slug}`} className="block shrink-0 w-[40%] sm:w-full bg-[#F3ECDD] p-2 sm:p-3">
        {p.images[0] ? (
          <img src={imageUrl(p.images[0])} alt={pickLang(p, 'name', lang)} loading="lazy" className="w-full aspect-[3/4] object-contain" />
        ) : (
          <Illustration name="book" alt="" className="w-full aspect-[3/4] object-cover rounded-lg" />
        )}
      </Link>
      <div className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 flex-1 min-w-0">
        <Link to={`/dukan/${p.slug}`} className="font-heading font-extrabold text-xl sm:text-[1.35rem] leading-tight hover:underline">{pickLang(p, 'name', lang)}</Link>
        {pickLang(p, 'short', lang) && <p className="text-base sm:text-lg leading-snug text-ink/80 line-clamp-3">{pickLang(p, 'short', lang)}</p>}
        <div className="mt-auto flex items-baseline gap-x-2 flex-wrap">
          <span className="font-heading font-extrabold text-2xl">{money(p.price_paise, lang)}</span>
          {p.mrp_paise && p.mrp_paise > p.price_paise && <s className="text-base sm:text-lg text-ink/55">{money(p.mrp_paise, lang)}</s>}
        </div>
        {soon ? (
          <span className="self-start rounded-full bg-orange-soft border-2 border-ink px-3 text-base font-bold">{t('shop.soon')}</span>
        ) : !p.in_stock ? (
          <span className="self-start rounded-full bg-cream border-2 border-line px-3 text-base font-bold text-ink/70">{t('shop.out')}</span>
        ) : p.few_left ? (
          <span className="text-base font-bold text-[#B42318]">{t('shop.few')}</span>
        ) : null}
        {can ? (
          <button type="button" onClick={add} className={`btn w-full !min-h-[3.25rem] !text-lg !px-2 ${added ? 'btn-whatsapp' : 'btn-primary'}`}>
            {added ? t('shop.added') : t('shop.add')}
          </button>
        ) : (
          <Link to={`/dukan/${p.slug}`} className="btn btn-quiet w-full !min-h-[3.25rem] !text-lg !px-2">{t('shop.details')}</Link>
        )}
      </div>
    </li>
  );
}
