import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';
import Illustration from '@/components/Illustration';

export default function DukanPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.dukan.heading')}
      description={t('pages.dukan.comingSoon')}
      illustration={{ name: 'diwali', alt: t('img.diwali') }}
    >
      <div className="sticker mt-8 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
        <Illustration name="book" alt={t('img.book')} className="w-32 sm:w-40 shrink-0" />
        <div>
          <h2 className="text-heading-sm">{t('home.shop.title')}</h2>
          <p className="mt-1 text-lg leading-snug text-ink/85">{t('home.shop.body')}</p>
          <Link to="/suchana" className="btn btn-primary mt-4 text-xl">{t('home.shop.cta')}</Link>
        </div>
      </div>
    </PageShell>
  );
}
