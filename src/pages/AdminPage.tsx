import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function AdminPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.admin.heading')}
      description={t('pages.admin.description')}
    />
  );
}
