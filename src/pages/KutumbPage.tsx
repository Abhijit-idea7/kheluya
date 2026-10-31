import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function KutumbPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.kutumb.heading')}
      description={t('pages.kutumb.description')}
    />
  );
}
