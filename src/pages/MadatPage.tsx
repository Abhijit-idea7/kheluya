import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function MadatPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t('pages.madat.heading')} description={t('pages.madat.description')} />
  );
}
