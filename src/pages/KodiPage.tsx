import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Play, Shuffle } from 'lucide-react';
import Tile from '@/components/Tile';
import { getLivePuzzles } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import { doneIds } from '@/lib/progress';
import { randomUnplayed, unfinished } from '@/lib/next';
import { addDays, dayName, istToday, prettyDate } from '@/lib/dates';

const PAGE = 10;

/**
 * All puzzles. First a "pick one for me" button (no decision needed), then any unfinished puzzles,
 * then every puzzle newest first, ten at a time. No search, tabs or filters.
 */
export default function KodiPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const navigate = useNavigate();
  const { data: puzzles, loading } = useAsync(() => getLivePuzzles(), []);
  const [shown, setShown] = useState(PAGE);

  const today = istToday();
  const done = doneIds();
  const list = (puzzles ?? []).filter((p) => !p.sample);
  const half = unfinished(list);
  const halfIds = new Set(half.map((p) => p.id));
  const pickOne = randomUnplayed(list);

  const when = (p: Puzzle) => {
    if (!p.live_date) return '';
    if (p.live_date === today) return t('lib.today');
    if (p.live_date === addDays(today, -1)) return t('lib.yesterday');
    return `${dayName(p.live_date, lang)}, ${prettyDate(p.live_date, lang)}`;
  };

  const row = (p: Puzzle) => {
    const isDone = done.has(p.id);
    const isHalf = halfIds.has(p.id);
    return (
      <li key={p.id}>
        <Link
          to={`/khel/${p.number}`}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border-2 transition-transform active:translate-y-0.5 ${
            isDone ? 'border-line bg-transparent' : 'border-ink bg-paper shadow-sticker'
          }`}
        >
          <Tile char={p.type?.tile ?? 'क'} size={48} today={p.live_date === today} className="shrink-0" />
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="font-heading font-extrabold text-xl leading-tight truncate">{pick(p, 'name', lang)}</span>
            <span className="text-base text-ink/70 truncate">{when(p)}</span>
          </span>
          {isDone ? (
            <span className="inline-flex items-center gap-1.5 text-lg font-bold text-green shrink-0">
              <Check size={20} strokeWidth={3} aria-hidden="true" />
              {t('lib.done')}
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 h-12 px-4 rounded-xl border-2 border-ink font-heading font-extrabold text-lg shrink-0 shadow-[0_3px_0_0_#10233F] ${
                isHalf ? 'bg-orange-soft' : 'bg-orange'
              }`}
            >
              <Play size={18} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
              {isHalf ? t('lib.resume') : t('lib.play')}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
      <h1 className="text-heading-lg">{t('lib.title')}</h1>

      {loading ? (
        <p className="mt-8 text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
      ) : (
        <>
          {pickOne ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate(`/khel/${pickOne.number}?from=fy`)}
                className="btn btn-primary w-full !min-h-[4.5rem] !text-[1.6rem] !rounded-3xl"
              >
                <Shuffle size={26} strokeWidth={2.8} aria-hidden="true" />
                {t('finish.more')}
              </button>
              <p className="mt-1.5 text-center text-lg text-ink/70">{t('lib.pickHint')}</p>
            </div>
          ) : (
            <p className="mt-4 text-xl">{t('lib.allDone')}</p>
          )}

          {half.length > 0 && (
            <>
              <h2 className="mt-7 mb-2.5 text-xl font-bold">{t('lib.unfinished')}</h2>
              <ul className="grid gap-2.5">{half.slice(0, 3).map(row)}</ul>
            </>
          )}

          <h2 className="mt-7 mb-2.5 text-xl font-bold">{t('lib.all')}</h2>
          <ul className="grid gap-2.5">{list.slice(0, shown).map(row)}</ul>
          {list.length > shown && (
            <button className="btn btn-quiet w-full mt-3" onClick={() => setShown((n) => n + PAGE)}>{t('lib.more')}</button>
          )}
        </>
      )}
    </div>
  );
}
