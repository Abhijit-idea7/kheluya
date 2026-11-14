import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid2x2, Home, X } from 'lucide-react';
import { getLivePuzzles, getPublicSettings, getPuzzleByNumber, getTimeStats } from '@/lib/api';
import { doneIds, markDone, touchPuzzle } from '@/lib/progress';
import { randomUnplayed } from '@/lib/next';
import MenuButton from '@/components/MenuButton';
import { myTime, saveMyTime } from '@/lib/myTimes';
import { formatDuration, istToday, mrDigits, prettyDate } from '@/lib/dates';
import { publicFileUrl } from '@/lib/supabase';
import { preparePuzzleHtml } from '@/lib/bridge';
import { newSessionId, readRef, track, trackArrival, type Channel } from '@/lib/track';
import { shortLink } from '@/lib/share';
import { makeChallengeCard, type ResultCard } from '@/lib/shareCard';
import { useCommunityLink } from '@/lib/community';
import FestivalGreeting, { festivalActive, festivalFrom } from '@/components/FestivalGreeting';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import Illustration from '@/components/Illustration';

type Phase = 'loading' | 'ready' | 'missing' | 'nofile' | 'error';
const CHANNELS: Channel[] = ['whatsapp', 'facebook', 'instagram', 'copy', 'native', 'other'];

/** The play page. `today`: opened as today's puzzle (the site's front page). */
export default function KhelPage({ num, today = false }: { num: number; today?: boolean }) {
  const location = useLocation();
  const { search } = location;
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [html, setHtml] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('loading');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sessionId = useMemo(() => newSessionId(), []);
  const navigate = useNavigate();
  // For the "left early" suggestion on the puzzle page
  const progressRef = useRef({ started: false, completed: false, since: Date.now() });
  const offerRef = useRef<(() => void) | null>(null);
  const nudgeShownRef = useRef(false);
  const [nudge, setNudge] = useState(false);
  const [rules, setRules] = useState(false);
  // Festival greeting (Admin → Settings): once each time a puzzle opens, while its dates last
  const { data: settings } = useAsync(() => getPublicSettings(), []);
  const fest = festivalFrom(settings);
  const [showFest, setShowFest] = useState(false);
  const festShownRef = useRef(false);
  const endFest = useCallback(() => setShowFest(false), []);
  // Read through a ref so a late-arriving setting never re-runs the counting effect
  const community = useCommunityLink();
  const communityRef = useRef('');
  // The WhatsApp challenge picture, made once the player has a result (this visit or an earlier one)
  const cardRef = useRef<{ blob: Blob; text: string } | null>(null);
  const [siteNote, setSiteNoteState] = useState('');
  // ?ckdebug=1 keeps a short log that survives the page reloading after a trip to WhatsApp
  const setSiteNote = (t: string) => {
    setSiteNoteState(t);
    logDiag(t);
  };
  communityRef.current = community;

  // Load the puzzle and its file
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = Number.isInteger(num) && num > 0 ? await getPuzzleByNumber(num) : null;
        if (!alive) return;
        if (!p) return setPhase('missing');
        setPuzzle(p);
        if (!p.file_folder || !p.entry_file) return setPhase('nofile');
        const res = await fetch(`${publicFileUrl(`${p.file_folder}/${p.entry_file}`)}?v=${p.file_version}`);
        if (!res.ok) throw new Error(`file ${res.status}`);
        const text = await res.text();
        if (!alive) return;
        setHtml(preparePuzzleHtml(text, publicFileUrl(p.file_folder), shortLink(p.number), `p${p.number}:`));
        setPhase('ready');
      } catch {
        if (alive) setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [num]);

  // Counting: opened / arrived / started / completed / shared / left
  useEffect(() => {
    if (!puzzle || phase !== 'ready') return;
    if (new URLSearchParams(search).get('preview') === '1') return; // admin preview: not counted
    const pid = puzzle.id;
    const ref = readRef(search);
    track({ puzzle_id: pid, session_id: sessionId, event: 'opened', ref });
    trackArrival(pid, sessionId, ref);
    const from = new URLSearchParams(search).get('from');
    if (from && /^(nx|lv|fy|qk)$/.test(from)) track({ puzzle_id: pid, session_id: sessionId, event: 'suggested', ref: from });

    // WhatsApp challenge picture: from the puzzle's result card, or from the time saved when the player finished
    const nm = pick(puzzle, 'name', 'mr');
    const link = shortLink(puzzle.number);
    const challengeText = (r: ResultCard) =>
      `🧩 मी आजचे *${nm}* सोडवले! ${r.big || (r.time ? `⏱ ${r.time}` : '')}\nतुम्ही किती वेळात सोडवाल? खेळून पाहा 👇\n${link}`;
    const clock = (ms: number) => {
      const sec = Math.round(ms / 1000);
      return mrDigits(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    };
    const savedCard = (): ResultCard => {
      const ms = myTime(pid);
      return { title: '', time: ms != null ? clock(ms) : '', big: '', line: '' };
    };
    const prepareCard = (r: ResultCard) =>
      makeChallengeCard(puzzle, r)
        .then((blob) => {
          const text = challengeText(r);
          cardRef.current = { blob, text };
          frameRef.current?.contentWindow?.postMessage({ __ckHost: 1, type: 'card', blob, text }, '*');
        })
        .catch(() => {});
    if (myTime(pid) != null) prepareCard(savedCard());

    // After finishing: a big "आणखी खेळा" (a random puzzle not played yet), a small "सर्व कोडी" link and
    // the WhatsApp community, under the result. Nothing starts by itself.
    const isToday = today || puzzle.live_date === istToday();
    const offerNext = async () => {
      const href = communityRef.current;
      const join = href ? { cta: t('community.cta'), href } : null;
      let p: Puzzle | null = null;
      try {
        p = randomUnplayed(await getLivePuzzles({ limit: 400 }), pid);
      } catch {
        /* no next puzzle is fine */
      }
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        {
          __ckHost: 1,
          type: 'next',
          kicker: isToday ? t('finish.tomorrow') : '',
          cta: p ? t('finish.more') : t('finish.all'),
          to: p ? `/khel/${p.number}?from=nx` : '/kodi',
          more: p ? t('finish.all') : '',
          join,
          close: t('time.close'),
        },
        '*',
      );
    };
    offerRef.current = offerNext;

    // Stuck for a while: a gentle offer of the rules or another puzzle
    let stuckTimer: ReturnType<typeof setTimeout> | undefined;

    let startedSent = false;
    let completedSent = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const m = e.data as { __ck?: number; type?: string; channel?: string; time_ms?: number; mistakes?: number; hints?: number; restored?: boolean };
      if (!m || m.__ck !== 1) return;
      if (m.type === 'diag') {
        logDiag(`frame: ${String((m as { s?: string }).s ?? '')}`);
        return;
      }
      if (m.type === 'navigate') {
        const to = String((m as { to?: string }).to ?? '');
        if (/^\/khel\/\d+(\?from=(nx|lv|fy|qk))?$/.test(to) || to === '/kodi') navigate(to);
        return;
      }
      if (m.type === 'started') { progressRef.current.started = true; touchPuzzle(puzzle.number); }
      if (m.type === 'started' && !startedSent) {
        startedSent = true;
        track({ puzzle_id: pid, session_id: sessionId, event: 'started' });
        {
          stuckTimer = setTimeout(() => {
            if (!progressRef.current.completed && !nudgeShownRef.current) {
              nudgeShownRef.current = true;
              setNudge(true);
            }
          }, 4 * 60 * 1000);
        }
      } else if (m.type === 'completed' && m.restored && !completedSent) {
        // Reopened a puzzle finished earlier (its end screen came back from saved progress).
        // Record it as done if this phone had missed it, and offer the next puzzle; no new solve time.
        completedSent = true;
        progressRef.current.completed = true;
        setNudge(false);
        const already = doneIds().has(pid);
        markDone(pid);
        if (!already) {
          offerNext();
          if (!startedSent) {
            startedSent = true;
            track({ puzzle_id: pid, session_id: sessionId, event: 'started' });
          }
          track({ puzzle_id: pid, session_id: sessionId, event: 'completed' });
        }
      } else if (m.type === 'completed' && !completedSent) {
        completedSent = true;
        progressRef.current.completed = true;
        setNudge(false);
        markDone(pid);
        offerNext();
        if (!startedSent) {
          startedSent = true;
          track({ puzzle_id: pid, session_id: sessionId, event: 'started' });
        }
        track({ puzzle_id: pid, session_id: sessionId, event: 'completed', value_ms: m.time_ms, mistakes: m.mistakes, hints: m.hints });
        if (typeof m.time_ms === 'number' && m.time_ms >= 1000) {
          const ms = m.time_ms;
          saveMyTime(pid, ms);
          getTimeStats(pid).then((st) => {
            frameRef.current?.contentWindow?.postMessage(
              {
                __ckHost: 1,
                type: 'toast',
                title: t('time.yoursShort', { t: formatDuration(ms, lang) }),
                sub: st.median_ms != null ? t('time.typical', { t: formatDuration(st.median_ms, lang) }) : '',
                close: t('time.close'),
              },
              '*',
            );
          });
        }
      } else if (m.type === 'card') {
        // The puzzle drew its result card: make the WhatsApp challenge picture and hand it back.
        const o = (m as { o?: Partial<ResultCard> }).o ?? {};
        prepareCard({ title: String(o.title ?? ''), time: String(o.time ?? ''), big: String(o.big ?? ''), line: String(o.line ?? '') });
      } else if (m.type === 'waShare') {
        // The puzzle could not share the picture itself: share it from the site page.
        const given = String((m as { text?: string }).text ?? '');
        const text = given.replace(/https?:\/\/\S+/g, '').trim()
          ? given
          : (cardRef.current?.text ?? challengeText(savedCard())).split(link).join(`${link}?s=wa`);
        (async () => {
          try {
            const blob = cardRef.current?.blob ?? (await makeChallengeCard(puzzle, savedCard()));
            await navigator.share({ files: [new File([blob], 'chala-kheluya.png', { type: 'image/png' })], text });
            setSiteNote('site: shared picture');
          } catch (err) {
            const why = (err as Error)?.name ?? 'error';
            setSiteNote(`site share failed: ${why}`);
            if (why !== 'AbortError') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
          }
        })();
      } else if (m.type === 'shared') {
        const ch = (CHANNELS as string[]).includes(m.channel ?? '') ? (m.channel as Channel) : 'other';
        track({ puzzle_id: pid, session_id: sessionId, event: 'shared', channel: ch, source: 'puzzle' });
      }
    };
    window.addEventListener('message', onMessage);

    // Play time: only while the page is on screen, flushed whenever it is hidden or closed.
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
    const flush = () => {
      if (visibleSince == null) return;
      const ms = Date.now() - visibleSince;
      visibleSince = null;
      if (ms >= 1000) track({ puzzle_id: pid, session_id: sessionId, event: 'left', value_ms: ms });
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
      else if (visibleSince == null) visibleSince = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    // Mark "played today" when a puzzle with saved progress is opened, so Home can offer to continue it today.
    try {
      for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) ?? '').startsWith(`p${puzzle.number}:`)) { touchPuzzle(puzzle.number); break; }
    } catch { /* storage blocked */ }
    return () => {
      flush();
      if (progressRef.current.started && !progressRef.current.completed) touchPuzzle(puzzle.number);
      clearTimeout(stuckTimer);
      offerRef.current = null;
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [puzzle, phase, search, sessionId, t, lang, navigate]);

  useEffect(() => {
    if (phase !== 'ready' || !settings || festShownRef.current) return;
    if (new URLSearchParams(search).get('preview') === '1') return;
    festShownRef.current = true;
    if (festivalActive(festivalFrom(settings))) setShowFest(true);
  }, [phase, settings, search]);

  useEffect(() => {
    if (puzzle) document.title = `${pick(puzzle, 'name', lang)} · चला खेळूया`;
    return () => {
      document.title = 'चला खेळूया · रोज एक मराठी कोडे';
    };
  }, [puzzle, lang]);

  const name = puzzle ? pick(puzzle, 'name', lang) : '';
  const debug = new URLSearchParams(search).get('ckdebug') === '1';
  const barBtn = 'inline-flex items-center gap-1.5 min-h-[3rem] px-3 rounded-xl border-2 border-ink bg-paper font-heading font-bold text-lg leading-none whitespace-nowrap';
  const howLines = puzzle?.type ? pick(puzzle.type, 'how', lang).split('\n').map((l) => l.trim()).filter(Boolean) : [];
  const playAnother = async () => {
    if (!puzzle) return;
    let p: Puzzle | null = null;
    try {
      p = randomUnplayed(await getLivePuzzles({ limit: 400 }), puzzle.id);
    } catch {
      p = null;
    }
    navigate(p ? `/khel/${p.number}?from=lv` : '/kodi');
  };
  const isTodayPage = today || (!!puzzle && puzzle.live_date === istToday());

  return (
    <div className="h-[100dvh] flex flex-col bg-paper">
      <div className="shrink-0 flex items-center gap-2 px-2 sm:px-4 h-16 border-b-[3px] border-ink bg-paper">
        <MenuButton />
        {isTodayPage ? (
          <div className="flex-1 min-w-0 leading-tight">
            <p className="font-heading font-extrabold text-xl truncate">{t('today.title')}</p>
            <p className="text-sm font-semibold text-ink/65 truncate">{prettyDate(istToday(), lang)}</p>
          </div>
        ) : (
          <>
            <Link to="/" className={barBtn}>
              <Home size={22} strokeWidth={2.6} aria-hidden="true" />
              {t('today.title')}
            </Link>
            <span className="flex-1 min-w-0 hidden sm:block font-heading font-bold text-xl truncate text-center">{name}</span>
            <span className="flex-1 sm:hidden" />
          </>
        )}
        {isTodayPage && (
          <Link to="/kodi" className={barBtn}>
            <Grid2x2 size={20} strokeWidth={2.6} aria-hidden="true" />
            <span className="max-[359px]:hidden">{t('nav.kodi')}</span>
          </Link>
        )}
        {puzzle?.type && (
          <button type="button" onClick={() => setRules(true)} className={barBtn}>
            {t('playbar.rulesShort')}
          </button>
        )}
      </div>

      {debug && <ShareDiag frameRef={frameRef} siteNote={siteNote} />}
      {phase === 'ready' ? (
        <iframe
          ref={frameRef}
          title={name}
          srcDoc={html}
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-forms"
          allow="fullscreen; autoplay; clipboard-write; web-share"
          allowFullScreen
          onLoad={() => {
            const win = frameRef.current?.contentWindow;
            if (!win) return;
            let ok = false;
            try {
              ok = !!navigator.canShare?.({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] });
            } catch {
              ok = false;
            }
            win.postMessage({ __ckHost: 1, type: 'hostShare', ok }, '*');
            if (cardRef.current) win.postMessage({ __ckHost: 1, type: 'card', ...cardRef.current }, '*');
            // Reopening a finished puzzle: show what to play next under its result (no countdown)
            if (puzzle && doneIds().has(puzzle.id)) setTimeout(() => offerRef.current?.(), 1200);
          }}
        />
      ) : (
        <div className="flex-1 overflow-auto grid place-items-center p-6 text-center">
          {phase === 'loading' ? (
            <p className="text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
          ) : (
            <div className="max-w-md">
              <Illustration name="confused" alt={t('img.confused')} className="w-56 mx-auto mb-6" />
              <h1 className="text-heading-md">
                {phase === 'missing' ? t('play.missing') : phase === 'nofile' ? t('play.noFile') : t('play.error')}
              </h1>
              <Link to="/kodi" className="btn btn-primary mt-6">{t('play.allPuzzles')}</Link>
            </div>
          )}
        </div>
      )}

      {showFest && <FestivalGreeting text={fest.text} sound={fest.sound} onDone={endFest} />}

      {nudge && (
        <section
          aria-label={t('playbar.stuckTitle')}
          className="fixed left-3 right-3 bottom-3 z-40 mx-auto max-w-md p-4 rounded-3xl border-[3px] border-ink bg-green-soft shadow-sticker"
        >
          <div className="flex items-start gap-3">
            <p className="flex-1 font-heading font-extrabold text-2xl leading-tight">{t('playbar.stuckTitle')}</p>
            <button type="button" onClick={() => setNudge(false)} aria-label={t('playbar.close')} className="grid place-items-center h-11 w-11 rounded-xl border-2 border-ink bg-white">
              <X size={22} strokeWidth={2.8} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button type="button" className="btn btn-quiet !text-lg !px-2" onClick={() => { setNudge(false); setRules(true); }}>
              {t('playbar.rules')}
            </button>
            <button type="button" className="btn btn-quiet !text-lg !px-2" onClick={() => { setNudge(false); playAnother(); }}>
              {t('playbar.another')}
            </button>
          </div>
        </section>
      )}

      {rules && puzzle?.type && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-ink/50 p-3" onClick={() => setRules(false)}>
          <div
            role="dialog"
            aria-label={t('playbar.rulesTitle')}
            className="w-full max-w-lg max-h-[85dvh] overflow-y-auto p-5 rounded-3xl border-[3px] border-ink bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-heading-md">{t('playbar.rulesTitle')}</h2>
            <p className="mt-1 text-lg text-ink/75">{pick(puzzle.type, 'name', lang)}</p>
            {howLines.length ? (
              <ol className="mt-3 grid gap-2.5">
                {howLines.map((l, i) => (
                  <li key={i} className="flex gap-3 text-xl leading-snug">
                    <span className="tile shrink-0" style={{ width: 34, height: 34, fontSize: 17 }} aria-hidden="true">{lang === 'mr' ? mrDigits(i + 1) : i + 1}</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-xl leading-snug">{pick(puzzle.type, 'about', lang)}</p>
            )}
            <button type="button" className="btn btn-primary w-full mt-5" onClick={() => setRules(false)}>{t('playbar.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function logDiag(t: string) {
  try {
    const log = JSON.parse(localStorage.getItem('ck-diag-log') || '[]') as string[];
    const now = new Date().toTimeString().slice(0, 8);
    localStorage.setItem('ck-diag-log', JSON.stringify([...log, `${now} ${t}`].slice(-8)));
  } catch {
    /* ignore */
  }
}

/** ?ckdebug=1 — a small box showing each step of the WhatsApp picture share (for checking on a phone). */
function ShareDiag({ frameRef, siteNote }: { frameRef: React.RefObject<HTMLIFrameElement | null>; siteNote: string }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      let d: unknown = null;
      try { d = (frameRef.current?.contentWindow as unknown as { __ckDiag?: unknown })?.__ckDiag ?? null; } catch { d = 'no access'; }
      const share = typeof navigator !== 'undefined' && 'share' in navigator;
      let log: string[] = [];
      try { log = JSON.parse(localStorage.getItem('ck-diag-log') || '[]') as string[]; } catch { log = []; }
      setTxt(`${JSON.stringify(d)} | site share:${share} ${siteNote}\nLOG: ${log.slice(-5).join(' ▸ ')}`);
    }, 1000);
    return () => clearInterval(id);
  }, [frameRef, siteNote]);
  return <div className="shrink-0 bg-black text-white text-xs p-2 break-all whitespace-pre-line">{txt || 'checking…'}</div>;
}
