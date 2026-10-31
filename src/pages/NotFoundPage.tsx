import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-12 text-center">
      <h1 className="font-heading text-heading-lg text-ink">{t('notFound.heading')}</h1>
      <p className="mt-4 text-body-base text-ink/80">{t('notFound.description')}</p>
      <Link
        to="/"
        className="mt-8 inline-flex w-full max-w-sm min-h-touch items-center justify-center rounded-xl bg-orange text-white font-heading text-heading-sm"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  );
}
