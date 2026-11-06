import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid2x2, HelpCircle, Home, Info, Menu, ShoppingBag, Star, Users, X } from 'lucide-react';
import { readTextLarge, writeTextLarge, applyTextLargeToDocument } from '@/utils/textSize';
import { LANG_STORAGE_KEY } from '@/i18n';
import { navItems } from '@/components/navItems';
import { useCommunityLink } from '@/lib/community';

const WA = (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c0-.1-.3-.2-.5-.3Z" /></svg>
);

export default function Header() {
  const { t, i18n } = useTranslation();
  const [textLarge, setTextLarge] = useState<boolean>(() => readTextLarge());
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const community = useCommunityLink();

  useEffect(() => {
    applyTextLargeToDocument(textLarge);
    writeTextLarge(textLarge);
  }, [textLarge]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggleLang = () => {
    const next = i18n.language === 'mr' ? 'en' : 'mr';
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  };

  const sq = 'min-h-[3rem] min-w-[3rem] px-2.5 rounded-xl border-2 border-ink font-heading font-extrabold leading-none';
  const menuLinks = [
    { to: '/', label: t('nav.home'), Icon: Home },
    { to: '/majha-khel', label: t('nav.mine'), Icon: Star },
    { to: '/kodi', label: t('nav.kodi'), Icon: Grid2x2 },
    { to: '/madat', label: t('menu.how'), Icon: HelpCircle },
    { to: '/kutumb', label: t('menu.family'), Icon: Users },
    { to: '/dukan', label: t('nav.dukan'), Icon: ShoppingBag },
    { to: '/amchyabaddal', label: t('menu.about'), Icon: Info },
  ];

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b-[3px] border-ink">
      <div className="max-w-site mx-auto px-3 sm:px-5 py-1.5 flex items-center gap-2">
        <Link to="/" className="shrink min-w-0" aria-label={t('nav.home')}>
          <img src="/brand/logo-mark.webp" alt={t('app.logoAlt')} width={250} height={80} className="h-11 sm:h-12 w-auto max-w-full" />
        </Link>

        <nav className="hidden lg:block ml-6" aria-label={t('nav.label')}>
          <ul className="flex items-center gap-1">
            {navItems.map(({ to, key }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center min-h-[3rem] px-4 rounded-2xl font-heading font-bold text-[1.25rem] ${isActive ? 'bg-orange-soft text-ink' : 'text-ink hover:bg-cream'}`
                  }
                >
                  {t(key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button onClick={toggleLang} className={`${sq} hidden lg:block bg-paper text-base font-bold`} aria-label={t('lang.label')}>
            {i18n.language === 'mr' ? t('menu.english') : t('menu.marathi')}
          </button>
          <button
            onClick={() => setTextLarge((v) => !v)}
            className={`${sq} text-lg ${textLarge ? 'bg-orange text-ink' : 'bg-navy text-white'}`}
            aria-pressed={textLarge}
            aria-label={textLarge ? t('app.textSizeOn') : t('app.textSize')}
          >
            {textLarge ? 'अ−' : 'अ+'}
          </button>
          <button onClick={() => setOpen(true)} className={`${sq} lg:hidden bg-paper grid place-items-center`} aria-label={t('menu.open')} aria-expanded={open}>
            <Menu size={26} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-50 bg-cream flex flex-col" role="dialog" aria-modal="true" aria-label={t('menu.title')}>
          <div className="shrink-0 flex items-center gap-2 px-4 h-16 bg-paper border-b-[3px] border-ink">
            <span className="flex-1 font-heading font-extrabold text-2xl">{t('menu.title')}</span>
            <button onClick={() => setOpen(false)} className={`${sq} bg-paper grid place-items-center`} aria-label={t('menu.close')}>
              <X size={26} strokeWidth={2.8} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            <ul className="grid gap-2.5">
              {menuLinks.map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 min-h-[3.75rem] px-4 rounded-2xl border-2 font-heading font-bold text-[1.35rem] ${
                      pathname === to ? 'bg-orange-soft border-ink' : 'bg-white border-line'
                    }`}
                  >
                    <Icon size={24} strokeWidth={2.4} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {community && (
              <a href={community} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full mt-1">
                {WA}
                {t('community.cta')}
              </a>
            )}
            <div className="mt-auto pt-3 grid grid-cols-2 gap-2.5">
              <button onClick={() => setTextLarge((v) => !v)} className="btn btn-quiet !text-lg" aria-pressed={textLarge}>
                {textLarge ? 'अ− ' : 'अ+ '}
                {textLarge ? t('app.textSizeOn') : t('app.textSize')}
              </button>
              <button onClick={toggleLang} className="btn btn-quiet !text-lg">
                {i18n.language === 'mr' ? t('menu.english') : t('menu.marathi')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
