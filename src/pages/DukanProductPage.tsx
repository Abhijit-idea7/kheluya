import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function DukanProductPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.dukanProduct.heading')}
      description={t('pages.dukanProduct.description')}
    />
  );
}
