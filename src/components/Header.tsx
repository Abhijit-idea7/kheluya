import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { readTextLarge, writeTextLarge, applyTextLargeToDocument } from '@/utils/textSize';
import { LANG_STORAGE_KEY } from '@/i18n';
import { navItems } from '@/components/navItems';

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

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b-[3px] border-ink">
      <div className="max-w-site mx-auto px-3 sm:px-5 py-1.5 flex items-center gap-3">
        <Link to="/" className="shrink min-w-0" aria-label={t('nav.home')}>
          <img
            src="/brand/logo-mark.webp"
            alt={t('app.logoAlt')}
            width={250}
            height={80}
            className="h-10 sm:h-12 w-auto max-w-full"
          />
        </Link>

        <nav className="hidden lg:block ml-6" aria-label={t('nav.label')}>
          <ul className="flex items-center gap-1">
            {navItems.map(({ to, key }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center min-h-[2.75rem] px-4 rounded-2xl font-heading font-bold text-[1.25rem] ${
                      isActive ? 'bg-orange-soft text-ink' : 'text-ink hover:bg-cream'
                    }`
                  }
                >
                  {t(key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={toggleLang}
            className="min-h-[2.75rem] min-w-[2.75rem] px-2.5 rounded-xl bg-paper border-2 border-ink font-heading font-bold text-base leading-none"
            aria-label={t('lang.label')}
          >
            {i18n.language === 'mr' ? 'EN' : 'मराठी'}
          </button>
          <button
            onClick={() => setTextLarge((v) => !v)}
            className={`min-h-[2.75rem] min-w-[2.75rem] px-2.5 rounded-xl border-2 border-ink font-heading font-extrabold text-lg leading-none ${
              textLarge ? 'bg-orange text-ink' : 'bg-navy text-white'
            }`}
            aria-pressed={textLarge}
            aria-label={textLarge ? t('app.textSizeOn') : t('app.textSize')}
          >
            {textLarge ? 'अ−' : 'अ+'}
          </button>
        </div>
      </div>
    </header>
  );
}
