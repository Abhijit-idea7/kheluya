import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function OrderPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t('pages.order.heading')} description={t('pages.order.description')} />
  );
}
