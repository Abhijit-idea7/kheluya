import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function PishviPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.pishvi.heading')}
      description={t('pages.pishvi.description')}
    />
  );
}
