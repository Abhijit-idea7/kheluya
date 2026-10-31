import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function SamparkPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.sampark.heading')}
      description={t('pages.sampark.description')}
    />
  );
}
