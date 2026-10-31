import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Illustration from '@/components/Illustration';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-content mx-auto px-4 py-10 text-center">
      <Illustration name="confused" alt={t('img.confused')} eager className="w-64 sm:w-80 mx-auto mb-8 shadow-sticker-lg" />
      <h1 className="text-heading-lg">{t('notFound.heading')}</h1>
      <p className="mt-4 text-body-base text-ink/80">{t('notFound.description')}</p>
      <Link to="/" className="btn btn-primary mt-8 w-full max-w-sm">
        {t('notFound.cta')}
      </Link>
    </div>
  );
}
