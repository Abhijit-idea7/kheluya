import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Play } from 'lucide-react';
import Tile from '@/components/Tile';
import { getLivePuzzles, getTimeStats } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';
import { myStats } from '@/lib/myStats';
import { todayPlan } from '@/lib/next';
import { dayName, dayTile, formatDuration, mrDigits } from '@/lib/dates';

/** "माझा खेळ": the player's own numbers, from this phone only. */
export default function MajhaKhelPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const num = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));
  const { data: puzzles, loading } = useAsync(() => getLivePuzzles({ limit: 400 }), []);
  const stats = puzzles ? myStats(puzzles) : null;
  const last = stats?.lastTimed ?? null;
  const { data: typical } = useAsync(() => (last ? getTimeStats(last.puzzle.id) : Promise.resolve(null)), [last?.puzzle.id]);

  if (loading || !puzzles || !stats) {
    return <p className="max-w-xl mx-auto px-4 py-10 text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>;
  }
  const next = todayPlan(puzzles).next;

  const minutes = Math.round(stats.totalMs / 60000);
  const timeTxt = minutes >= 60
    ? t('mine.hours', { h: num(Math.floor(minutes / 60)), m: num(minutes % 60) })
    : t('mine.mins', { m: num(minutes) });

  const card = (big: string, label: string, accent = false) => (
    <div className={`flex flex-col px-4 py-3 rounded-2xl border-2 border-ink ${accent ? 'bg-orange-soft' : 'bg-paper'}`}>
      <span className="font-heading font-extrabold text-[2.1rem] leading-tight">{big}</span>
      <span className="text-lg font-semibold leading-tight">{label}</span>
    </div>
  );

  const maxFav = Math.max(1, ...stats.favourites.map((f) => f.n));

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 sm:py-8 flex flex-col gap-4">
      <div>
        <h1 className="text-heading-lg">{t('mine.title')}</h1>
        <p className="text-lg text-ink/70">{t('mine.sub')}</p>
      </div>

      {stats.solved === 0 ? (
        <p className="text-xl leading-snug">{t('mine.empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {card(num(stats.solved), t('mine.solved'), true)}
            {card(num(stats.streak), t('mine.streak'))}
            {card(timeTxt, t('mine.time'))}
            {card(num(stats.kinds), t('mine.kinds'))}
          </div>

          <section className="p-4 rounded-2xl border-2 border-ink bg-paper">
            <h2 className="text-xl font-bold mb-3">{t('mine.week', { n: num(stats.weekDays) })}</h2>
            <ol className="grid grid-cols-7">
              {stats.week.map((w) => (
                <li key={w.date} className="flex flex-col items-center gap-1">
                  {w.played ? (
                    <span className={`grid place-items-center h-10 w-10 rounded-full bg-green text-white ${w.today ? 'ring-[3px] ring-orange' : ''}`}>
                      <Check size={20} strokeWidth={3.2} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className={`h-10 w-10 rounded-full border-[3px] ${w.today ? 'border-orange' : 'border-line'}`} />
                  )}
                  <span className={`text-sm ${w.today ? 'font-bold' : 'text-ink/70'}`}>
                    {w.today ? t('lib.today') : lang === 'mr' ? dayTile(w.date) : dayName(w.date, lang).slice(0, 3)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="p-4 rounded-2xl border-2 border-ink bg-paper">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{t('mine.milestone', { n: num(stats.milestone.target) })}</h2>
              <span className="text-lg text-ink/70">{t('mine.left', { n: num(stats.milestone.left) })}</span>
            </div>
            <div className="mt-2 h-4 rounded-full bg-[#EFE8D8] overflow-hidden">
              <div className="h-full rounded-full bg-orange" style={{ width: `${Math.max(4, stats.milestone.pct)}%` }} />
            </div>
          </section>

          {stats.favourites.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-2">{t('mine.fav')}</h2>
              <ul className="grid gap-2">
                {stats.favourites.map(({ type, n }) => (
                  <li key={type.id} className="flex items-center gap-3">
                    <Tile char={type.tile} size={40} className="shrink-0" />
                    <span className="w-32 text-lg font-semibold truncate">{pick(type, 'name', lang)}</span>
                    <span className="flex-1 h-3 rounded-full bg-[#EFE8D8] overflow-hidden">
                      <span className="block h-full rounded-full bg-navy" style={{ width: `${(n / maxFav) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right text-lg font-bold">{num(n)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {last && (
            <p className="text-lg leading-snug">
              {typical?.median_ms
                ? t('mine.compare', { name: pick(last.puzzle, 'name', lang), mine: formatDuration(last.ms, lang), typical: formatDuration(typical.median_ms, lang) })
                : t('mine.compareMine', { name: pick(last.puzzle, 'name', lang), mine: formatDuration(last.ms, lang) })}
            </p>
          )}
        </>
      )}

      {next && (
        <Link to={`/khel/${next.number}`} className="btn btn-primary w-full !min-h-[4.5rem] !text-[1.6rem] mt-2">
          <Play size={26} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
          {t('mine.next')}
        </Link>
      )}
      <p className="text-base text-ink/60">{t('mine.note')}</p>
    </div>
  );
}
