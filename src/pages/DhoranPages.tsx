import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export function DhoranPrivacyPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('dhoran.privacy.heading')}
      description={t('dhoran.privacy.description')}
    />
  );
}

export function DhoranTermsPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t('dhoran.terms.heading')} description={t('dhoran.terms.description')} />
  );
}

export function DhoranShippingPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('dhoran.shipping.heading')}
      description={t('dhoran.shipping.description')}
    />
  );
}

export function DhoranRefundsPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('dhoran.refunds.heading')}
      description={t('dhoran.refunds.description')}
    />
  );
}
