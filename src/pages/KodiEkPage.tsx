import { useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Calendar, Gauge, Play, Timer, Trophy } from 'lucide-react';
import Tile from '@/components/Tile';
import PuzzleCard from '@/components/PuzzleCard';
import { ShareToggle } from '@/components/ShareButtons';
import Illustration from '@/components/Illustration';
import { NextCard } from '@/components/SuggestCards';
import { suggest } from '@/lib/suggest';
import { getLivePuzzles, getPlayCounts, getPuzzleByNumber, getTimeStats } from '@/lib/api';
import { myTime } from '@/lib/myTimes';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';
import { dayName, formatDuration, istToday, mrDigits, prettyDate } from '@/lib/dates';
import { newSessionId, readRef, trackArrival } from '@/lib/track';

export default function KodiEkPage() {
  const { n } = useParams();
  const { search, state } = useLocation() as { search: string; state?: { leftEarly?: boolean } };
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const num = Number(n);
  const sessionId = useMemo(() => newSessionId(), []);

  const { data: puzzle, loading } = useAsync(() => (Number.isInteger(num) && num > 0 ? getPuzzleByNumber(num) : Promise.resolve(null)), [num]);
  const { data: more } = useAsync(
    () => (puzzle ? getLivePuzzles({ typeId: puzzle.type_id, limit: 4 }) : Promise.resolve([])),
    [puzzle?.id],
  );
  const { data: counts } = useAsync(() => getPlayCounts(), []);
  const leftEarly = !!state?.leftEarly;
  const { data: alt } = useAsync(
    () => (puzzle && leftEarly ? getLivePuzzles({ limit: 60 }).then((l) => suggest(l, 'left', { exclude: [puzzle.id], limit: 1 })[0] ?? null) : Promise.resolve(null)),
    [puzzle?.id, leftEarly],
  );
  const { data: times } = useAsync(() => (puzzle ? getTimeStats(puzzle.id) : Promise.resolve(null)), [puzzle?.id]);

  // A visitor who came from a shared link
  useEffect(() => {
    const ref = readRef(search);
    if (puzzle) trackArrival(puzzle.id, sessionId, ref);
  }, [puzzle, search, sessionId]);

  const numTxt = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));

  if (loading) {
    return <p className="max-w-content mx-auto px-5 py-16 text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>;
  }
  if (!puzzle) {
    return (
      <div className="max-w-content mx-auto px-5 py-12 text-center">
        <Illustration name="confused" alt={t('img.confused')} className="w-56 mx-auto mb-6" />
        <h1 className="text-heading-md">{t('play.missing')}</h1>
        <Link to="/kodi" className="btn btn-primary mt-6">{t('play.allPuzzles')}</Link>
      </div>
    );
  }

  const isToday = puzzle.live_date === istToday();
  const plays = counts?.[puzzle.id];
  const mine = myTime(puzzle.id);
  const how = puzzle.type ? pick(puzzle.type, 'how', lang) : '';
  const others = (more ?? []).filter((p) => p.id !== puzzle.id).slice(0, 3);

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-3 sm:py-8">
      <Link to="/kodi" className="inline-flex items-center gap-2 min-h-[2.75rem] -ml-1 mb-2 font-heading font-bold text-lg text-ink/75 hover:text-ink">
        <ArrowLeft size={20} strokeWidth={2.6} aria-hidden="true" />
        {t('play.allPuzzles')}
      </Link>

      {alt && (
        <div className="mb-4 max-w-xl">
          <NextCard suggestion={alt} kicker={t('next.leftKicker')} from="lv" tone="green" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
        <article className="sticker relative overflow-hidden p-4 sm:p-6">
          <div className="grid-corner absolute right-0 top-0 w-40 h-40 pointer-events-none" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <Tile char={puzzle.type?.tile ?? 'क'} size={60} today={isToday} tilt={-4} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-heading font-bold text-lg text-orange-deep leading-tight">
                {puzzle.type ? pick(puzzle.type, 'name', lang) : ''} · {t('puzzle.number', { n: numTxt(puzzle.number) })}
              </p>
              <h1 className="text-heading-lg leading-tight">{pick(puzzle, 'name', lang)}</h1>
            </div>
          </div>
          {pick(puzzle, 'about', lang) && <p className="relative mt-3 text-xl leading-snug">{pick(puzzle, 'about', lang)}</p>}

          <p className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-lg text-ink/80">
            {puzzle.live_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={18} strokeWidth={2.4} aria-hidden="true" />
                {isToday ? t('puzzle.todays') : `${dayName(puzzle.live_date, lang)}, ${prettyDate(puzzle.live_date, lang)}`}
              </span>
            )}
            {pick(puzzle, 'time', lang) && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={18} strokeWidth={2.4} aria-hidden="true" />
                {pick(puzzle, 'time', lang)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Gauge size={18} strokeWidth={2.4} aria-hidden="true" />
              {t(`difficulty.${puzzle.difficulty}`)}
            </span>
          </p>
          {(times?.median_ms != null || mine != null || (plays != null && plays > 0)) && (
            <p className="relative mt-1 flex flex-wrap gap-x-4 gap-y-1 text-lg">
              {times?.median_ms != null && (
                <span className="inline-flex items-center gap-1.5 text-ink/80">
                  <Timer size={18} strokeWidth={2.4} aria-hidden="true" />
                  {t('time.typical', { t: formatDuration(times.median_ms, lang) })}
                </span>
              )}
              {mine != null && (
                <span className="inline-flex items-center gap-1.5 font-bold text-green">
                  <Trophy size={18} strokeWidth={2.4} aria-hidden="true" />
                  {t('time.yours', { t: formatDuration(mine, lang) })}
                </span>
              )}
              {plays != null && plays > 0 && (
                <span className="font-bold text-green">{t('puzzle.solvedBy', { n: numTxt(plays.toLocaleString('en-IN')) })}</span>
              )}
            </p>
          )}

          <Link to={`/khel/${puzzle.number}`} className="relative btn btn-primary w-full mt-4 !text-[1.5rem] !min-h-[3.25rem]">
            <Play size={24} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
            {t('puzzle.play')}
          </Link>
          <div className="relative">
            <ShareToggle puzzle={puzzle} sessionId={sessionId} />
          </div>
        </article>

        <aside className="grid gap-5">
          {!how && others.length === 0 && (
            <Illustration name="share" alt={t('img.share')} className="w-full max-w-sm mx-auto shadow-sticker-lg" />
          )}
          {how && (
            <section className="rounded-3xl border-[3px] border-ink bg-paper p-4 sm:p-5">
              <h2 className="text-heading-sm">{t('puzzle.howToPlay')}</h2>
              <p className="mt-1 text-lg leading-snug whitespace-pre-line">{how}</p>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="text-heading-sm mb-3">{t('puzzle.moreLikeThis')}</h2>
              <ul className="grid gap-3">
                {others.map((p) => (
                  <li key={p.id}>
                    <PuzzleCard puzzle={p} plays={counts?.[p.id]} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
