import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function SuchanaPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.suchana.heading')}
      description={t('pages.suchana.description')}
      illustration={{ name: 'cheer', alt: t('img.cheer') }}
    />
  );
}
