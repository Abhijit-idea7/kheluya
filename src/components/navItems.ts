import { Home, Puzzle, ShoppingBag, Info } from 'lucide-react';

export const navItems = [
  { to: '/', key: 'nav.home', Icon: Home },
  { to: '/kodi', key: 'nav.kodi', Icon: Puzzle },
  { to: '/dukan', key: 'nav.dukan', Icon: ShoppingBag },
  { to: '/amchyabaddal', key: 'nav.about', Icon: Info },
] as const;
