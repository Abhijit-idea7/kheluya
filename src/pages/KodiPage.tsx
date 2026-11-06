import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Play } from 'lucide-react';
import Tile from '@/components/Tile';
import { getLivePuzzles } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import { doneIds } from '@/lib/progress';
import { isQuick } from '@/lib/suggest';
import { addDays, dayName, istToday, prettyDate } from '@/lib/dates';

/** All puzzles: a plain list, unplayed first. No search, tabs or filters. */
export default function KodiPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const { data: puzzles, loading } = useAsync(() => getLivePuzzles(), []);
  const [moreTodo, setMoreTodo] = useState(false);
  const [moreDone, setMoreDone] = useState(false);

  const today = istToday();
  const done = doneIds();
  const list = (puzzles ?? []).filter((p) => !p.sample);
  const todo = [...list.filter((p) => !isQuick(p) && !done.has(p.id)), ...[...list.filter((p) => isQuick(p) && !done.has(p.id))].reverse()];
  const played = list.filter((p) => done.has(p.id));

  const when = (p: Puzzle) => {
    if (isQuick(p)) return [t('lib.quick'), pick(p, 'time', lang)].filter(Boolean).join(' · ');
    if (!p.live_date) return '';
    if (p.live_date === today) return t('lib.today');
    if (p.live_date === addDays(today, -1)) return t('lib.yesterday');
    return `${dayName(p.live_date, lang)}, ${prettyDate(p.live_date, lang)}`;
  };

  const row = (p: Puzzle, isDone: boolean) => (
    <li key={p.id}>
      <Link
        to={`/khel/${p.number}`}
        className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border-2 transition-transform active:translate-y-0.5 ${
          isDone ? 'border-line bg-transparent' : 'border-ink bg-paper shadow-sticker'
        }`}
      >
        <Tile char={p.type?.tile ?? 'क'} size={48} today={p.live_date === today && !isQuick(p)} className="shrink-0" />
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
          <span className="inline-flex items-center gap-1.5 h-12 px-4 rounded-xl border-2 border-ink bg-orange font-heading font-extrabold text-lg shrink-0 shadow-[0_3px_0_0_#10233F]">
            <Play size={18} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
            {t('lib.play')}
          </span>
        )}
      </Link>
    </li>
  );

  const shownTodo = moreTodo ? todo : todo.slice(0, 10);
  const shownDone = moreDone ? played : played.slice(0, 5);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
      <h1 className="text-heading-lg">{t('lib.title')}</h1>
      <p className="mt-1 text-lg text-ink/70">{t('lib.sub')}</p>

      {loading ? (
        <p className="mt-8 text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
      ) : (
        <>
          <h2 className="mt-6 mb-2.5 text-xl font-bold">{t('lib.unplayed')}</h2>
          {todo.length ? (
            <ul className="grid gap-2.5">{shownTodo.map((p) => row(p, false))}</ul>
          ) : (
            <p className="text-lg">{t('lib.allDone')}</p>
          )}
          {!moreTodo && todo.length > 10 && (
            <button className="btn btn-quiet w-full mt-3" onClick={() => setMoreTodo(true)}>{t('lib.more')}</button>
          )}

          {played.length > 0 && (
            <>
              <h2 className="mt-8 mb-2.5 text-xl font-bold">{t('lib.played')}</h2>
              <ul className="grid gap-2.5">{shownDone.map((p) => row(p, true))}</ul>
              {!moreDone && played.length > 5 && (
                <button className="btn btn-quiet w-full mt-3" onClick={() => setMoreDone(true)}>{t('lib.more')}</button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
