import { useTranslation } from 'react-i18next';

type PageShellProps = {
  title: string;
  description: string;
  showBack?: boolean;
  children?: React.ReactNode;
};

export default function PageShell({ title, description, showBack = true, children }: PageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-6">
      {showBack && (
        <button
          onClick={() => window.history.back()}
          className="min-h-touch px-6 mb-6 rounded-xl bg-paper border-2 border-line text-ink flex items-center gap-2"
        >
          <span aria-hidden="true">←</span>
          <span>{t('back')}</span>
        </button>
      )}
      <h1 className="font-heading text-heading-md text-ink leading-tight">{title}</h1>
      <p className="mt-2 text-body-base text-ink/80">{description}</p>
      {children}
    </div>
  );
}
