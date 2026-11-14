import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, X } from 'lucide-react';
import { istToday } from '@/lib/dates';

const LOADED_DAY = istToday();
const RELOAD_KEY = 'ck-stale-reload';
const AWAY_MS = 60 * 1000; // a tab counts as "come back to" after a minute away
const POLL_MS = 10 * 60 * 1000;

async function liveVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { v?: unknown };
    return typeof j.v === 'string' ? j.v : null;
  } catch {
    return null;
  }
}

/** Reload once per new version or day, never in a loop. */
function reloadOnce(reason: string) {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === reason) return;
    sessionStorage.setItem(RELOAD_KEY, reason);
  } catch {
    /* storage blocked: still reload */
  }
  window.location.reload();
}

/**
 * Many players keep one tab open for days. When they come back to it:
 * - a new day: the front page reloads to show today's puzzle; on any other puzzle a banner offers it;
 *   other pages reload.
 * - a newer version of the site is live: the page reloads (puzzle progress is saved on the phone).
 * Nothing happens while someone is actively playing, except a version check every 10 minutes on non-puzzle pages.
 */
export default function StaleGuard() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [banner, setBanner] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const onGame = pathname === '/' || pathname.startsWith('/khel/');
    let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : 0;

    const check = async (cameBack: boolean) => {
      const newDay = istToday() !== LOADED_DAY;
      if (newDay && (cameBack || !onGame)) {
        if (pathname.startsWith('/khel/')) setBanner(true);
        else return reloadOnce(`day:${istToday()}`);
      }
      if (onGame && !cameBack) return; // never reload a puzzle in the middle of play
      const v = await liveVersion();
      if (v && typeof __BUILD_ID__ === 'string' && v !== __BUILD_ID__) reloadOnce(`v:${v}`);
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      check(away >= AWAY_MS);
    };
    // Restored from the browser's back/forward memory: treat as coming back.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) check(true);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onShow);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') check(false);
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onShow);
      clearInterval(id);
    };
  }, [pathname]);

  if (!banner || !pathname.startsWith('/khel/')) return null;
  return (
    <div role="status" className="fixed left-3 right-3 bottom-3 z-40 mx-auto max-w-md p-4 rounded-3xl border-[3px] border-ink bg-orange-soft shadow-sticker">
      <div className="flex items-start gap-3">
        <p className="flex-1 font-heading font-extrabold text-2xl leading-tight">{t('stale.title')}</p>
        <button type="button" onClick={() => setBanner(false)} aria-label={t('playbar.close')} className="grid place-items-center h-11 w-11 rounded-xl border-2 border-ink bg-white">
          <X size={22} strokeWidth={2.8} aria-hidden="true" />
        </button>
      </div>
      <a href="/" className="btn btn-primary w-full mt-3 !text-[1.4rem]">
        <Play size={22} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
        {t('stale.play')}
      </a>
    </div>
  );
}
