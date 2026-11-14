import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { readTextLarge, writeTextLarge, applyTextLargeToDocument } from '@/utils/textSize';
import { LANG_STORAGE_KEY } from '@/i18n';
import { navItems } from '@/components/navItems';
import MenuButton from '@/components/MenuButton';


export default function Header() {
  const { t, i18n } = useTranslation();
  const [textLarge, setTextLarge] = useState<boolean>(() => readTextLarge());

  useEffect(() => {
    applyTextLargeToDocument(textLarge);
    writeTextLarge(textLarge);
  }, [textLarge]);

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
          <MenuButton className="lg:hidden" textLarge={textLarge} setTextLarge={setTextLarge} />
        </div>
      </div>

    </header>
  );
}
