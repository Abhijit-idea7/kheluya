import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function CheckoutPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.checkout.heading')}
      description={t('pages.checkout.description')}
    />
  );
}
