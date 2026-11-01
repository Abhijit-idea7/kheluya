import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import Tile from '@/components/Tile';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import { dayName, istToday, mrDigits, prettyDate } from '@/lib/dates';

export default function PuzzleCard({ puzzle, plays }: { puzzle: Puzzle; plays?: number }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const isToday = puzzle.live_date === istToday();
  const num = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));

  const when = puzzle.live_date
    ? isToday ? t('home.week.today') : `${dayName(puzzle.live_date, lang).slice(0, lang === 'mr' ? 99 : 3)}, ${prettyDate(puzzle.live_date, lang)}`
    : '';
  const meta = [when, pick(puzzle, 'time', lang), t(`difficulty.${puzzle.difficulty}`)].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/k/${puzzle.number}`}
      className={`h-full flex gap-3 items-center rounded-2xl border-[3px] border-ink px-3 py-2.5 transition-transform active:translate-y-0.5 shadow-sticker ${
        isToday ? 'bg-orange-soft' : 'bg-paper'
      }`}
    >
      <Tile char={puzzle.type?.tile ?? 'क'} size={48} today={isToday} className="shrink-0" />
      <span className="min-w-0 flex flex-col">
        <span className="text-sm font-bold text-orange-deep truncate">
          {puzzle.type ? pick(puzzle.type, 'name', lang) : ''} · {t('puzzle.number', { n: num(puzzle.number) })}
        </span>
        <span className="font-heading font-extrabold text-xl leading-tight truncate">{pick(puzzle, 'name', lang)}</span>
        <span className="text-base text-ink/70 leading-snug">
          {meta}
          {plays != null && plays > 0 && (
            <span className="flex items-center gap-1 text-green font-bold">
              <Users size={15} strokeWidth={2.6} aria-hidden="true" />
              {t('puzzle.solvedBy', { n: num(plays.toLocaleString('en-IN')) })}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
