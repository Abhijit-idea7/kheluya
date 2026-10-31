import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';

export default function AmchyabaddalPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('pages.amchyabaddal.heading')}
      description={t('pages.amchyabaddal.description')}
    />
  );
}
