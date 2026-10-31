import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function KhelPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t('pages.khel.heading')} description={t('pages.khel.description')} />
  );
}
