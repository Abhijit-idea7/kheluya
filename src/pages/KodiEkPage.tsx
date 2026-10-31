import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function KodiEkPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.kodiEk.heading')}
      description={t('pages.kodiEk.description')}
    />
  );
}
