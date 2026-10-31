import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readTextLarge, writeTextLarge, applyTextLargeToDocument } from '@/utils/textSize';

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
      localStorage.setItem('chala-kheluya-lang', next);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-line">
      <div className="max-w-content mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <img src="/brand/logo-strip.webp" alt={t('app.logoAlt')} className="h-14 w-auto" />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="min-h-touch px-4 rounded-xl bg-cream border-2 border-line text-ink font-heading text-heading-sm leading-none"
            aria-label={t('lang.label')}
          >
            {i18n.language === 'mr' ? t('app.switchToEnglish') : t('app.switchToMarathi')}
          </button>
          <button
            onClick={() => setTextLarge((v) => !v)}
            className="min-h-touch min-w-touch px-4 rounded-xl bg-navy text-white font-heading text-heading-sm leading-none border-2 border-navy"
            aria-pressed={textLarge}
            aria-label={textLarge ? t('app.textSizeOn') : t('app.textSize')}
          >
            अ+
          </button>
        </div>
      </div>
    </header>
  );
}
