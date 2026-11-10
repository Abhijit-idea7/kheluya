import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Play, RotateCcw, Star } from 'lucide-react';
import Tile from '@/components/Tile';
import Illustration from '@/components/Illustration';
import { getLivePuzzles } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang, type Puzzle } from '@/lib/types';
import { todayPlan } from '@/lib/next';
import { myStats } from '@/lib/myStats';
import { useCommunityLink } from '@/lib/community';
import { mrDigits } from '@/lib/dates';
import { forgetProgress } from '@/lib/progress';

const WA = (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c0-.1-.3-.2-.5-.3Z" /></svg>
);

/** Home: one question, one big button. The site decides what to play next. */
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const num = (v: number | string) => (lang === 'mr' ? mrDigits(v) : String(v));
  const community = useCommunityLink();
  const { data: puzzles, loading } = useAsync(() => getLivePuzzles({ limit: 400 }), []);
  const navigate = useNavigate();
  const [askRestart, setAskRestart] = useState(false);

  const hour = Number(new Date(Date.now() + 330 * 60000).toISOString().slice(11, 13));
  const greet = hour < 12 ? t('home2.greetMorning') : hour < 17 ? t('home2.greetDay') : t('home2.greetEvening');

  if (loading || !puzzles) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-6">
        <div className="sticker h-80 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  const plan = todayPlan(puzzles);
  const stats = myStats(puzzles);
  if (!plan.next && !plan.main) {
    return <p className="max-w-xl mx-auto px-4 py-10 text-xl">{t('home2.none')}</p>;
  }

  const hasQuick = !!plan.quick;
  const meta = (p: Puzzle) => [pick(p, 'time', lang), t(`difficulty.${p.difficulty}`)].filter(Boolean).join(' · ');

  // What the screen says, by situation
  let kicker = greet;
  let title = plan.mainIsToday ? t('home2.freshTitle') : t('home2.latestTitle');
  let line = '';
  let btn = t('home2.play');
  let half = false;
  const p = plan.next;
  if (plan.state === 'resume') {
    kicker = t('home2.resumeKicker');
    title = t('home2.resumeTitle');
    line = t('home2.resumeLine');
    btn = t('home2.resumeBtn');
    half = true;
  } else if (plan.state === 'quick') {
    kicker = t('home2.quickKicker');
    title = t('home2.quickTitle');
    btn = t('home2.quickBtn');
  }

  // When continuing a half-done puzzle, the other thing to play: today's puzzle, else the quick one.
  const other =
    half && p
      ? plan.main && !plan.mainDone && plan.main.id !== p.id
        ? plan.main
        : plan.quick && !plan.quickDone && plan.quick.id !== p.id
          ? plan.quick
          : null
      : null;
  const otherLabel = other && other.id === plan.main?.id ? (plan.mainIsToday ? t('home2.playToday') : t('home2.playLatest')) : t('home2.quickBtn');

  const pill = (n: string, label: string, done: boolean) => (
    <div className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 ${done ? 'bg-green-soft border-green' : 'bg-paper border-line'}`}>
      {done ? (
        <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-green text-white">
          <Check size={18} strokeWidth={3.2} aria-hidden="true" />
        </span>
      ) : (
        <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full border-[3px] border-[#B9AE95] text-base font-bold text-ink/70">{n}</span>
      )}
      <span className="text-lg font-semibold leading-tight">{label}</span>
    </div>
  );

  const progress = (
    <div>
      <p className="text-base font-semibold text-ink/70 mb-1.5">{t('home2.todayLabel')}</p>
      <div className="flex gap-2.5">
        {pill(num(1), t('home2.mainPill'), plan.mainDone)}
        {hasQuick && pill(num(2), t('home2.quickPill'), plan.quickDone)}
      </div>
    </div>
  );

  const statsLink = (
    <div className="flex items-center justify-between gap-3">
      {stats.solved > 0 ? (
      <Link to="/majha-khel" className="inline-flex items-center gap-2 min-h-[2.75rem] text-lg font-bold underline underline-offset-4">
        <Star size={20} strokeWidth={2.4} aria-hidden="true" />
        {stats.streak > 1
          ? t('home2.statsLine', { n: num(stats.solved), d: num(stats.streak) })
          : t('home2.statsLineShort', { n: num(stats.solved) })}
      </Link>
      ) : (
        <span />
      )}
      <Link to="/kodi" className="min-h-[2.75rem] inline-flex items-center text-lg font-semibold text-ink/70 underline underline-offset-4">
        {t('home2.all')}
      </Link>
    </div>
  );

  // All done for today: celebrate, invite back tomorrow
  if (plan.state === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
        <Illustration name="cheer" alt={t('img.cheer')} className="w-44 shadow-sticker-lg" eager />
        <h1 className="text-heading-lg leading-tight mt-1">{hasQuick ? t('home2.doneTitle') : t('home2.doneTitleOne')}</h1>
        {stats.streak > 1 && (
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-soft border-2 border-ink text-lg font-bold">
            <Star size={20} strokeWidth={2.4} aria-hidden="true" />
            {t('home2.streak', { n: num(stats.streak) })}
          </p>
        )}
        <p className="text-xl">{t('home2.tomorrow')}</p>
        <div className="w-full grid gap-3 mt-2">
          {community && (
            <a href={community} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full !min-h-[4.25rem] !text-[1.4rem]">
              {WA}
              {t('home2.remind')}
            </a>
          )}
          {p && (
            <Link to={`/khel/${p.number}?from=fy`} className="btn btn-quiet w-full">
              <Play size={20} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
              {t('home2.more')}
            </Link>
          )}
        </div>
        <div className="w-full mt-2">{progress}</div>
        <div className="w-full">{statsLink}</div>
      </div>
    );
  }

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 pt-5 pb-4 lg:pt-10 grid gap-5 lg:gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
      <section className="max-w-xl w-full mx-auto lg:mx-0 flex flex-col gap-4" aria-labelledby="home-title">
        <div>
          <p className="font-heading font-bold text-xl text-orange-deep">{kicker}</p>
          <h1 id="home-title" className="text-heading-lg lg:text-heading-xl leading-tight">{title}</h1>
        </div>

        {p && (
          <article className="sticker relative overflow-hidden p-5">
            <div className="grid-corner absolute right-0 top-0 w-32 h-32 pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <Tile char={p.type?.tile ?? 'क'} size={72} today={plan.state !== 'quick'} tilt={-3} className="shrink-0" />
              <div className="min-w-0">
                <h2 className="text-heading-md leading-tight">{pick(p, 'name', lang)}</h2>
                <p className="text-lg text-ink/70 inline-flex items-center gap-1.5">
                  <Clock size={17} strokeWidth={2.4} aria-hidden="true" />
                  {meta(p)}
                </p>
              </div>
            </div>
            <p className="relative mt-3 text-xl leading-snug">{line || pick(p, 'about', lang)}</p>
            {half && (
              <p className="relative mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-soft border-2 border-ink text-base font-bold">
                {t('home2.half')}
              </p>
            )}
          </article>
        )}

        {p && (
          <Link to={`/khel/${p.number}`} className="btn btn-primary w-full !min-h-[5.25rem] !text-[2rem] !rounded-3xl">
            <Play size={30} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
            {btn}
          </Link>
        )}

        {/* Half-done puzzle: never the only way forward — start it again, or play today's instead */}
        {half && p && (
          <div className="grid gap-3">
            {other && (
              <Link to={`/khel/${other.number}`} className="btn btn-quiet w-full">
                <Play size={20} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
                {otherLabel}
              </Link>
            )}
            {!askRestart ? (
              <button type="button" onClick={() => setAskRestart(true)} className="inline-flex items-center justify-center gap-2 min-h-[3rem] text-lg font-semibold text-ink/75 underline underline-offset-4">
                <RotateCcw size={19} strokeWidth={2.6} aria-hidden="true" />
                {t('home2.restart')}
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-ink bg-paper p-4 text-center">
                <p className="text-lg font-semibold">{t('home2.restartAsk')}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" className="btn btn-quiet" onClick={() => setAskRestart(false)}>{t('home2.restartNo')}</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      forgetProgress(p.number);
                      navigate(`/khel/${p.number}`);
                    }}
                  >
                    {t('home2.restartYes')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* An unfinished puzzle from an earlier day: offered quietly, below today's */}
        {!half && plan.older && (
          <Link to={`/khel/${plan.older.number}`} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-line bg-paper">
            <Tile char={plan.older.type?.tile ?? 'क'} size={44} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-base text-ink/65">{t('home2.olderLabel')}</span>
              <span className="block text-lg font-bold leading-tight truncate">{pick(plan.older, 'name', lang)}</span>
            </span>
            <span className="text-lg font-bold text-orange-deep whitespace-nowrap">{t('home2.olderGo')} →</span>
          </Link>
        )}

        <div className="lg:hidden flex flex-col gap-3 mt-2">
          {progress}
          {statsLink}
        </div>
      </section>

      <aside className="hidden lg:flex flex-col gap-5 pt-16">
        {progress}
        {statsLink}
        {community && (
          <a href={community} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl border-2 border-green bg-green-soft">
            <span className="text-[#1DA851]">{WA}</span>
            <span className="text-lg font-semibold">{t('community.title')}: <b>{t('community.cta')}</b></span>
          </a>
        )}
      </aside>
    </div>
  );
}
