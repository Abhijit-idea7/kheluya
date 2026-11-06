import { Home, Puzzle, ShoppingBag, Star } from 'lucide-react';

/** Desktop top menu (phones use the ☰ menu). */
export const navItems = [
  { to: '/', key: 'nav.home', Icon: Home },
  { to: '/kodi', key: 'nav.kodi', Icon: Puzzle },
  { to: '/majha-khel', key: 'nav.mine', Icon: Star },
  { to: '/dukan', key: 'nav.dukan', Icon: ShoppingBag },
] as const;
