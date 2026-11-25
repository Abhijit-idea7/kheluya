import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { BarChart3, Bell, ExternalLink, Grid2x2, LogOut, MoreHorizontal, Settings as SettingsIcon, Shapes, ShoppingBag, Users } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { input, btnPrimary, btnQuiet, Card } from '@/admin/ui';
import AdminPuzzles from '@/admin/AdminPuzzles';
import AdminPuzzleEdit from '@/admin/AdminPuzzleEdit';
import AdminTypes from '@/admin/AdminTypes';
import AdminStats from '@/admin/AdminStats';
import AdminPeople from '@/admin/AdminPeople';
import AdminSettings from '@/admin/AdminSettings';
import AdminNotifications from '@/admin/AdminNotifications';
import AdminShop from '@/admin/shop/AdminShop';

type Gate = 'loading' | 'signedOut' | 'notAdmin' | 'admin';

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [gate, setGate] = useState<Gate>('loading');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!session) return setGate('signedOut');
    (async () => {
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (isAdmin) return setGate('admin');
      const { data: claimed } = await supabase.rpc('claim_first_admin');
      setGate(claimed ? 'admin' : 'notAdmin');
    })();
  }, [session]);

  useEffect(() => {
    document.title = 'Admin · चला खेळूया';
  }, []);

  if (!supabase) {
    return (
      <Shell>
        <Card>
          <h1 className="text-2xl">Database not connected yet</h1>
          <p className="mt-2">Switch on Bolt's database for this project, then reload this page.</p>
        </Card>
      </Shell>
    );
  }
  if (gate === 'loading') return <Shell><p className="animate-pulse">Loading…</p></Shell>;
  if (gate === 'signedOut') return <Shell><Login /></Shell>;
  if (gate === 'notAdmin') {
    return (
      <Shell>
        <Card>
          <h1 className="text-2xl">No admin access</h1>
          <p className="mt-2">{session?.user.email} is signed in but is not an admin.</p>
          <button className={`${btnQuiet} mt-4`} onClick={() => supabase!.auth.signOut()}>Sign out</button>
        </Card>
      </Shell>
    );
  }

  return <AdminLayout onSignOut={() => supabase!.auth.signOut()} />;
}

const MAIN = [
  { to: '/admin/shop', label: 'Shop', Icon: ShoppingBag },
  { to: '/admin/puzzles', label: 'Puzzles', Icon: Grid2x2 },
  { to: '/admin/stats', label: 'Stats', Icon: BarChart3 },
  { to: '/admin/people', label: 'People', Icon: Users },
];
const MORE = [
  { to: '/admin/notifications', label: 'Notifications', Icon: Bell },
  { to: '/admin/types', label: 'Puzzle types', Icon: Shapes },
  { to: '/admin/settings', label: 'Settings', Icon: SettingsIcon },
];

/**
 * The signed-in admin. Wide screens: menu across the top.
 * Phones: a tab bar at the bottom (Shop, Puzzles, Stats, People, More) like a phone app — nothing to slide.
 */
export function AdminLayout({ onSignOut }: { onSignOut: () => void }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 whitespace-nowrap px-3 py-2 rounded-xl font-bold ${isActive ? 'bg-orange-soft border-2 border-ink' : 'border-2 border-transparent hover:bg-cream'}`;
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMore(false), [pathname]);
  const inMore = MORE.some((m) => pathname.startsWith(m.to));

  return (
    <Shell
      onSignOut={onSignOut}
      nav={
        <nav className="hidden lg:flex flex-wrap gap-1">
          {[...MAIN, ...MORE].map((m) => <NavLink key={m.to} to={m.to} className={tab}>{m.label}</NavLink>)}
        </nav>
      }
    >
      <Routes>
        <Route index element={<Navigate to="/admin/puzzles" replace />} />
        <Route path="puzzles" element={<AdminPuzzles />} />
        <Route path="puzzles/new" element={<AdminPuzzleEdit />} />
        <Route path="puzzles/:id" element={<AdminPuzzleEdit />} />
        <Route path="types" element={<AdminTypes />} />
        <Route path="stats" element={<AdminStats />} />
        <Route path="people" element={<AdminPeople />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="shop/*" element={<AdminShop />} />
        <Route path="*" element={<Navigate to="/admin/puzzles" replace />} />
      </Routes>

      {/* Phone tab bar */}
      <nav aria-label="Admin" className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-paper border-t-[3px] border-ink grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {MAIN.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-bold ${isActive ? 'text-ink bg-orange-soft' : 'text-ink/60'}`}>
            <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-bold ${inMore || more ? 'text-ink bg-orange-soft' : 'text-ink/60'}`}>
          <MoreHorizontal size={22} strokeWidth={2.4} aria-hidden="true" />
          More
        </button>
      </nav>
      {more && (
        <div className="lg:hidden fixed inset-0 z-30 bg-ink/40" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-2 rounded-2xl border-[3px] border-ink bg-paper p-2 grid gap-1" onClick={(e) => e.stopPropagation()}>
            {MORE.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-bold ${isActive ? 'bg-orange-soft' : ''}`}>
                <Icon size={22} strokeWidth={2.4} aria-hidden="true" />{label}
              </NavLink>
            ))}
            <a href="/" className="flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-bold"><ExternalLink size={22} strokeWidth={2.4} aria-hidden="true" />Open the website</a>
            <button type="button" onClick={onSignOut} className="flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-bold text-[#8A1C14]"><LogOut size={22} strokeWidth={2.4} aria-hidden="true" />Sign out</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, nav, onSignOut }: { children: React.ReactNode; nav?: React.ReactNode; onSignOut?: () => void }) {
  return (
    <div className="min-h-screen bg-cream text-base leading-normal">
      <header className="bg-paper border-b-[3px] border-ink">
        <div className="max-w-site mx-auto px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 lg:flex-none">
            <a href="/" className="shrink-0">
              <img src="/brand/logo-mark.webp" alt="चला खेळूया" width={250} height={80} className="h-9 sm:h-10 w-auto" />
            </a>
            <span className="font-heading font-extrabold text-xl">Admin</span>
            <span className="hidden sm:inline text-xs text-ink/55" title="When this version was built (India time)">Version {__BUILD_STAMP__}</span>
            {onSignOut && <button className={`${btnQuiet} !py-1 !px-3 !text-sm ml-auto lg:order-last hidden lg:inline-flex`} onClick={onSignOut}>Sign out</button>}
          </div>
          {nav}
        </div>
      </header>
      <main className={`max-w-site mx-auto px-3 sm:px-4 py-4 sm:py-6 ${onSignOut ? 'pb-28 lg:pb-6' : ''}`}>{children}</main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    supabase!.rpc('admin_exists').then(({ data }) => setFirstTime(data === false));
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    setBusy(false);
  };

  const create = async () => {
    if (password.length < 8) return setMsg('Use a password of at least 8 characters.');
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase!.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else if (!data.session) setMsg('Account created. Check your email to confirm it, then sign in here.');
    setBusy(false);
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl">Admin sign in</h1>
      {firstTime && (
        <p className="mt-2 rounded-xl bg-orange-soft p-3 text-sm">
          No admin exists yet. Enter your email and a password, then press <b>Create admin account</b>. The first account becomes the admin.
        </p>
      )}
      <form onSubmit={signIn} className="mt-4 grid gap-3">
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <button className={btnPrimary} disabled={busy}>Sign in</button>
        {firstTime && (
          <button type="button" className={btnQuiet} disabled={busy} onClick={create}>Create admin account</button>
        )}
        {msg && <p className="text-sm font-bold text-[#8A1C14]">{msg}</p>}
      </form>
    </Card>
  );
}
