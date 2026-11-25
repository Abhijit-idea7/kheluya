import { useTranslation } from 'react-i18next';
import LegalPage from '@/components/LegalPage';
import { ABOUT } from '@/content/legal';

export default function AmchyabaddalPage() {
  const { t } = useTranslation();
  return <LegalPage doc={ABOUT} path="/amchyabaddal" footer="about" illustration={{ name: 'morning', alt: t('img.morning') }} />;
}
