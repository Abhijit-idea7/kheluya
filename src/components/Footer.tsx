import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const links = [
  { to: '/dhoran/privacy', key: 'footer.privacy' },
  { to: '/dhoran/terms', key: 'footer.terms' },
  { to: '/dhoran/shipping', key: 'footer.shipping' },
  { to: '/dhoran/refunds', key: 'footer.refunds' },
] as const;

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-cream border-t border-line">
      <ul className="max-w-content mx-auto px-4 py-4 flex flex-wrap gap-x-6 gap-y-2">
        {links.map(({ to, key }) => (
          <li key={to}>
            <Link
              to={to}
              className="min-h-touch flex items-center text-body-base underline underline-offset-4"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
      <p className="max-w-content mx-auto px-4 pb-4 text-sm text-ink/70">{t('footer.siteLine')}</p>
    </footer>
  );
}
