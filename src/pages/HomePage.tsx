import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <PageShell title={t('home.heading')} description={t('home.description')} showBack={false}>
      <section className="mt-8 rounded-2xl bg-paper border-2 border-line p-6 shadow-sm">
        <h2 className="font-heading text-heading-md text-ink">{t('home.hero.title')}</h2>
        <p className="mt-1 text-body-base text-ink/80">{t('home.hero.puzzleName')}</p>
        <button className="mt-6 w-full min-h-touch py-4 rounded-xl bg-orange text-white font-heading text-heading-sm">
          {t('home.hero.cta')}
        </button>
      </section>
    </PageShell>
  );
}
