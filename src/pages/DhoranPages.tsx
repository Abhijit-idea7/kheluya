import LegalPage from '@/components/LegalPage';
import { PRIVACY, REFUNDS, SHIPPING, TERMS } from '@/content/legal';

export function DhoranPrivacyPage() {
  return <LegalPage doc={PRIVACY} path="/dhoran/privacy" />;
}
export function DhoranTermsPage() {
  return <LegalPage doc={TERMS} path="/dhoran/terms" />;
}
export function DhoranShippingPage() {
  return <LegalPage doc={SHIPPING} path="/dhoran/shipping" />;
}
export function DhoranRefundsPage() {
  return <LegalPage doc={REFUNDS} path="/dhoran/refunds" />;
}
