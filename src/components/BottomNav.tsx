import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Puzzle, ShoppingBag, Info } from 'lucide-react';

const items = [
  { to: '/', key: 'nav.home', Icon: Home },
  { to: '/kodi', key: 'nav.kodi', Icon: Puzzle },
  { to: '/dukan', key: 'nav.dukan', Icon: ShoppingBag },
  { to: '/amchyabaddal', key: 'nav.about', Icon: Info },
] as const;

export default function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-paper border-t-2 border-line">
      <ul className="max-w-content mx-auto grid grid-cols-4">
        {items.map(({ to, key, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-h-touch py-2 w-full ${
                  isActive ? 'text-orange' : 'text-ink'
                }`
              }
            >
              <Icon size={24} aria-hidden="true" />
              <span className="text-sm leading-none">{t(key)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
