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
    <div className="max-w-content mx-auto px-4 sm:px-5 py-4 sm:py-8">
      {showBack && (
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 min-h-[2.75rem] -ml-1 mb-2 font-heading font-bold text-lg text-ink/75 hover:text-ink">
          <ArrowLeft size={20} strokeWidth={2.6} aria-hidden="true" />
          <span>{t('back')}</span>
        </button>
      )}
      {illustration && (
        <Illustration
          name={illustration.name}
          alt={illustration.alt}
          eager
          className={`mb-4 shadow-sticker-lg ${
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
