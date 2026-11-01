import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navItems } from '@/components/navItems';

export default function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper border-t-[3px] border-ink pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.label')}
    >
      <ul className="max-w-content mx-auto grid grid-cols-4">
        {navItems.map(({ to, key, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-h-[3.75rem] py-1 w-full font-heading font-bold ${
                  isActive ? 'text-ink' : 'text-ink/75'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid place-items-center h-8 w-12 rounded-full ${
                      isActive ? 'bg-orange border-2 border-ink' : ''
                    }`}
                  >
                    <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  <span className="text-base leading-none">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
