import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { getLivePuzzles, getPuzzleByNumber, getTimeStats } from '@/lib/api';
import { markDone } from '@/lib/progress';
import { suggest } from '@/lib/suggest';
import { saveMyTime } from '@/lib/myTimes';
import { formatDuration } from '@/lib/dates';
import { publicFileUrl } from '@/lib/supabase';
import { preparePuzzleHtml } from '@/lib/bridge';
import { newSessionId, readRef, track, trackArrival, type Channel } from '@/lib/track';
import { shortLink } from '@/lib/share';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import Illustration from '@/components/Illustration';

type Phase = 'loading' | 'ready' | 'missing' | 'nofile' | 'error';
const CHANNELS: Channel[] = ['whatsapp', 'facebook', 'instagram', 'copy', 'native', 'other'];

export default function KhelPage() {
  const { n } = useParams();
  const { search } = useLocation();
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const num = Number(n);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [html, setHtml] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('loading');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sessionId = useMemo(() => newSessionId(), []);
  const navigate = useNavigate();
  // For the "left early" suggestion on the puzzle page
  const progressRef = useRef({ started: false, completed: false, since: Date.now() });

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

    // After finishing: suggest one puzzle to play next, shown inside the puzzle's result screen.
    const offerNext = async () => {
      try {
        const [s] = suggest(await getLivePuzzles({ limit: 60 }), 'finished', { exclude: [pid], limit: 1 });
        if (!s) return;
        const p = s.puzzle;
        frameRef.current?.contentWindow?.postMessage(
          {
            __ckHost: 1,
            type: 'next',
            kicker: s.reason === 'resume' ? t('next.kickerResume') : t('next.kicker'),
            title: pick(p, 'name', lang),
            sub: [p.type ? pick(p.type, 'name', lang) : '', pick(p, 'time', lang)].filter(Boolean).join(' · '),
            tile: p.type?.tile ?? 'क',
            cta: s.reason === 'resume' ? t('next.resume') : t('next.play'),
            more: t('next.more'),
            close: t('time.close'),
            to: `/khel/${p.number}?from=nx`,
          },
          '*',
        );
      } catch {
        /* no suggestion is fine */
      }
    };

    let startedSent = false;
    let completedSent = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const m = e.data as { __ck?: number; type?: string; channel?: string; time_ms?: number; mistakes?: number; hints?: number };
      if (!m || m.__ck !== 1) return;
      if (m.type === 'navigate') {
        const to = String((m as { to?: string }).to ?? '');
        if (/^\/khel\/\d+(\?from=(nx|lv|fy|qk))?$/.test(to) || to === '/kodi') navigate(to);
        return;
      }
      if (m.type === 'started') progressRef.current.started = true;
      if (m.type === 'started' && !startedSent) {
        startedSent = true;
        track({ puzzle_id: pid, session_id: sessionId, event: 'started' });
      } else if (m.type === 'completed' && !completedSent) {
        completedSent = true;
        progressRef.current.completed = true;
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
    return () => {
      flush();
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [puzzle, phase, search, sessionId, t, lang, navigate]);

  useEffect(() => {
    if (puzzle) document.title = `${pick(puzzle, 'name', lang)} · चला खेळूया`;
    return () => {
      document.title = 'चला खेळूया · रोज एक मराठी कोडे';
    };
  }, [puzzle, lang]);

  const name = puzzle ? pick(puzzle, 'name', lang) : '';

  return (
    <div className="h-[100dvh] flex flex-col bg-paper">
      <div className="shrink-0 flex items-center gap-3 px-2 sm:px-4 h-14 border-b-[3px] border-ink bg-paper">
        <Link
          to={puzzle ? `/k/${puzzle.number}` : '/kodi'}
          onClick={(e) => {
            // Left part-way after a real try: the puzzle page offers something different to play.
            const pr = progressRef.current;
            if (puzzle && pr.started && !pr.completed && Date.now() - pr.since > 45000) {
              e.preventDefault();
              navigate(`/k/${puzzle.number}`, { state: { leftEarly: true } });
            }
          }}
          className="inline-flex items-center gap-2 min-h-[2.75rem] px-3 rounded-xl border-[3px] border-ink bg-paper font-heading font-bold text-lg"
        >
          <ArrowLeft size={22} strokeWidth={2.6} aria-hidden="true" />
          {t('play.back')}
        </Link>
        <span className="font-heading font-bold text-xl truncate">{name}</span>
        <img src="/brand/logo-mark.webp" alt="" aria-hidden="true" width={250} height={80} className="ml-auto h-10 w-auto hidden sm:block" />
      </div>

      {phase === 'ready' ? (
        <iframe
          ref={frameRef}
          title={name}
          srcDoc={html}
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-forms"
          allow="fullscreen; autoplay; clipboard-write; web-share"
          allowFullScreen
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
    </div>
  );
}
