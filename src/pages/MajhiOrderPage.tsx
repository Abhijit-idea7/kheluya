import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function MajhiOrderPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.majhiOrder.heading')}
      description={t('pages.majhiOrder.description')}
    />
  );
}
