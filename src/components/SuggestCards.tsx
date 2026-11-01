import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import Tile from '@/components/Tile';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import type { Reason, Suggestion } from '@/lib/suggest';

const subOf = (p: Puzzle, lang: Lang) => [p.type ? pick(p.type, 'name', lang) : '', pick(p, 'time', lang)].filter(Boolean).join(' · ');

/** One large "play this next" card: tile, name, type · time, big खेळा button. */
export function NextCard({
  suggestion, kicker, from, tone = 'paper',
}: { suggestion: Suggestion; kicker: string; from: 'lv' | 'qk' | 'nx' | 'fy'; tone?: 'paper' | 'green' }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const p = suggestion.puzzle;
  const resume = suggestion.reason === 'resume';
  return (
    <article
      className={`rounded-3xl border-[3px] border-ink px-4 py-3 shadow-sticker ${tone === 'green' ? 'bg-green-soft' : 'bg-paper'}`}
      aria-label={`${kicker}: ${pick(p, 'name', lang)}`}
    >
      <p className="font-heading font-bold text-base text-orange-deep">{kicker}</p>
      <div className="mt-1 flex items-center gap-3">
        <Tile char={p.type?.tile ?? 'क'} size={48} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl leading-tight truncate">{pick(p, 'name', lang)}</h3>
          <p className="text-base text-ink/70 leading-snug truncate">{subOf(p, lang)}</p>
        </div>
        <Link to={`/khel/${p.number}?from=${from}`} className="btn btn-primary shrink-0 !px-4 !text-[1.15rem]">
          <Play size={18} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
          {resume ? t('next.resume') : t('next.play')}
        </Link>
      </div>
    </article>
  );
}

const REASON_TONE: Record<Reason, string> = {
  resume: 'bg-orange-soft',
  quick: 'bg-green-soft',
  liked: 'bg-[#E7F1FB]',
  new: 'bg-cream',
};

/** "तुमच्यासाठी": a short row of suggestions — swipe on phones, three across on desktop. */
export function ForYouRow({ items }: { items: Suggestion[] }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  if (!items.length) return null;
  return (
    <section className="max-w-site mx-auto px-4 sm:px-5 mt-8 lg:mt-10" aria-labelledby="foryou-h">
      <h2 id="foryou-h" className="text-heading-sm">{t('foryou.title')}</h2>
      <p className="text-base text-ink/70">{t('foryou.sub')}</p>
      <ul className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 sm:pb-0">
        {items.map(({ puzzle: p, reason }) => (
          <li key={p.id} className="snap-start shrink-0 w-[62%] sm:w-auto">
            <Link
              to={`/khel/${p.number}?from=fy`}
              className="h-full flex flex-col gap-1.5 rounded-2xl border-[3px] border-ink bg-paper p-3 shadow-sticker transition-transform active:translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <Tile char={p.type?.tile ?? 'क'} size={40} className="shrink-0" />
                <span className={`rounded-full px-3 py-0.5 text-sm font-bold border-2 border-ink ${REASON_TONE[reason]}`}>
                  {t(`foryou.reason.${reason}`)}
                </span>
              </span>
              <span className="font-heading font-extrabold text-lg leading-tight">{pick(p, 'name', lang)}</span>
              <span className="text-base text-ink/75 leading-snug">{subOf(p, lang)}</span>
              <span className="mt-auto inline-flex items-center gap-2 font-heading font-bold text-base text-orange-deep">
                <Play size={16} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
                {reason === 'resume' ? t('next.resume') : t('next.play')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
