import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Illustration from '@/components/Illustration';

type PageShellProps = {
  title: string;
  description: string;
  showBack?: boolean;
  illustration?: { name: React.ComponentProps<typeof Illustration>['name']; alt: string };
  children?: React.ReactNode;
};

export default function PageShell({ title, description, showBack = true, illustration, children }: PageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-content mx-auto px-4 sm:px-5 py-6 sm:py-10">
      {showBack && (
        <button onClick={() => window.history.back()} className="btn btn-quiet mb-6 text-xl">
          <ArrowLeft size={24} strokeWidth={2.6} aria-hidden="true" />
          <span>{t('back')}</span>
        </button>
      )}
      {illustration && (
        <Illustration
          name={illustration.name}
          alt={illustration.alt}
          eager
          className={`mb-6 shadow-sticker-lg ${
            illustration.name === 'morning' || illustration.name === 'diwali' ? 'w-full' : 'w-64 sm:w-72'
          }`}
        />
      )}
      <h1 className="text-heading-lg">{title}</h1>
      <p className="mt-2 text-body-base text-ink/80">{description}</p>
      {children}
    </div>
  );
}
