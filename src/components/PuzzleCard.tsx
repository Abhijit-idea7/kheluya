import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Users } from 'lucide-react';
import Tile from '@/components/Tile';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import { dayName, istToday, mrDigits, prettyDate } from '@/lib/dates';

export default function PuzzleCard({ puzzle, plays }: { puzzle: Puzzle; plays?: number }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const isToday = puzzle.live_date === istToday();
  const num = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));

  return (
    <Link
      to={`/k/${puzzle.number}`}
      className={`h-full flex gap-4 items-start rounded-3xl border-[3px] border-ink p-4 sm:p-5 transition-transform active:translate-y-1 ${
        isToday ? 'bg-orange-soft shadow-sticker' : 'bg-paper shadow-[0_4px_0_0_#10233F]'
      }`}
    >
      <Tile char={puzzle.type?.tile ?? 'क'} size={60} today={isToday} className="shrink-0" />
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="text-base font-bold text-orange-deep">
          {puzzle.type ? pick(puzzle.type, 'name', lang) : ''} · {t('puzzle.number', { n: num(puzzle.number) })}
        </span>
        <span className="font-heading font-extrabold text-2xl leading-tight">{pick(puzzle, 'name', lang)}</span>
        {puzzle.live_date && (
          <span className="text-lg text-ink/80">
            {isToday ? t('home.week.today') : `${dayName(puzzle.live_date, lang)}, ${prettyDate(puzzle.live_date, lang)}`}
          </span>
        )}
        <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-base text-ink/75">
          {pick(puzzle, 'time', lang) && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={18} strokeWidth={2.4} aria-hidden="true" />
              {pick(puzzle, 'time', lang)}
            </span>
          )}
          <span>{t(`difficulty.${puzzle.difficulty}`)}</span>
          {plays != null && plays > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users size={18} strokeWidth={2.4} aria-hidden="true" />
              {t('puzzle.solvedBy', { n: num(plays.toLocaleString('en-IN')) })}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
