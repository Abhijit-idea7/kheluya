import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function DukanPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.dukan.heading')}
      description={t('pages.dukan.comingSoon')}
    />
  );
}
