import { useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Calendar, Gauge, Play } from 'lucide-react';
import Tile from '@/components/Tile';
import PuzzleCard from '@/components/PuzzleCard';
import ShareButtons from '@/components/ShareButtons';
import Illustration from '@/components/Illustration';
import { getLivePuzzles, getPlayCounts, getPuzzleByNumber } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';
import { dayName, istToday, mrDigits, prettyDate } from '@/lib/dates';
import { newSessionId, readRef, track } from '@/lib/track';

export default function KodiEkPage() {
  const { n } = useParams();
  const { search } = useLocation();
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

  // A visitor who came from a shared link
  useEffect(() => {
    const ref = readRef(search);
    if (puzzle && ref) track({ puzzle_id: puzzle.id, session_id: sessionId, event: 'arrived', ref });
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
  const how = puzzle.type ? pick(puzzle.type, 'how', lang) : '';
  const others = (more ?? []).filter((p) => p.id !== puzzle.id).slice(0, 3);

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-6 sm:py-10">
      <Link to="/kodi" className="btn btn-quiet text-xl mb-6">
        <ArrowLeft size={24} strokeWidth={2.6} aria-hidden="true" />
        {t('play.allPuzzles')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-start">
        <article className="sticker relative overflow-hidden p-5 sm:p-7">
          <div className="grid-corner absolute right-0 top-0 w-40 h-40 pointer-events-none" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <Tile char={puzzle.type?.tile ?? 'क'} size={76} today={isToday} tilt={-4} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-heading font-bold text-xl text-orange-deep">
                {puzzle.type ? pick(puzzle.type, 'name', lang) : ''} · {t('puzzle.number', { n: numTxt(puzzle.number) })}
              </p>
              <h1 className="text-heading-lg leading-tight">{pick(puzzle, 'name', lang)}</h1>
            </div>
          </div>
          {pick(puzzle, 'about', lang) && <p className="relative mt-4 text-[1.35rem] leading-snug">{pick(puzzle, 'about', lang)}</p>}

          <ul className="relative mt-4 grid gap-2 text-lg">
            {puzzle.live_date && (
              <li className="flex items-center gap-3">
                <Calendar size={22} strokeWidth={2.4} aria-hidden="true" />
                {isToday ? t('puzzle.todays') : `${dayName(puzzle.live_date, lang)}, ${prettyDate(puzzle.live_date, lang)}`}
              </li>
            )}
            {pick(puzzle, 'time', lang) && (
              <li className="flex items-center gap-3">
                <Clock size={22} strokeWidth={2.4} aria-hidden="true" />
                {pick(puzzle, 'time', lang)}
              </li>
            )}
            <li className="flex items-center gap-3">
              <Gauge size={22} strokeWidth={2.4} aria-hidden="true" />
              {t(`difficulty.${puzzle.difficulty}`)}
            </li>
            {plays != null && plays > 0 && (
              <li className="font-bold text-green">{t('puzzle.solvedBy', { n: numTxt(plays.toLocaleString('en-IN')) })}</li>
            )}
          </ul>

          <Link to={`/khel/${puzzle.number}${search}`} className="relative btn btn-primary w-full mt-6 text-[1.75rem] min-h-[4.25rem]">
            <Play size={28} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
            {t('puzzle.play')}
          </Link>
          <div className="relative">
            <ShareButtons puzzle={puzzle} sessionId={sessionId} />
          </div>
        </article>

        <aside className="grid gap-6">
          {!how && others.length === 0 && (
            <Illustration name="share" alt={t('img.share')} className="w-full max-w-sm mx-auto shadow-sticker-lg" />
          )}
          {how && (
            <section className="rounded-3xl border-[3px] border-ink bg-paper p-5 sm:p-6">
              <h2 className="text-heading-sm">{t('puzzle.howToPlay')}</h2>
              <p className="mt-2 text-lg leading-relaxed whitespace-pre-line">{how}</p>
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
