import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function PrakarPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.prakar.heading')}
      description={t('pages.prakar.description')}
    />
  );
}
