import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function KodiPage() {
  const { t } = useTranslation();
  return <PageShell title={t('pages.kodi.heading')} description={t('pages.kodi.description')} />;
}
