import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Play } from 'lucide-react';
import Tile from '@/components/Tile';
import Illustration from '@/components/Illustration';
import { ShareToggle } from '@/components/ShareButtons';
import { ForYouRow, NextCard } from '@/components/SuggestCards';
import { doneIds, startedNumbers } from '@/lib/progress';
import { isQuick, suggest } from '@/lib/suggest';
import { getLivePuzzles } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';
import { addDays, dayName, dayTile, istToday, mondayOf } from '@/lib/dates';
import { newSessionId } from '@/lib/track';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const sessionId = useMemo(() => newSessionId(), []);
  const todayIso = istToday();
  const { data: recent, loading } = useAsync(() => getLivePuzzles({ limit: 60 }), []);
  // The daily puzzle is the newest non-quick one; quick puzzles get their own small card.
  const main = (recent ?? []).filter((p) => !isQuick(p));
  const today = main[0] ?? null;
  const quickList = (recent ?? []).filter(isQuick);
  const done = doneIds();
  const started = startedNumbers();
  const quick = quickList.find((p) => !done.has(p.id)) ?? quickList[0] ?? null;
  const sugg = recent ? suggest(recent, 'home', { exclude: [today?.id ?? '', quick?.id ?? ''], limit: 4 }) : [];
  // A puzzle left half-way goes to the very top; the rest fill "तुमच्यासाठी".
  const resume = sugg.find((s) => s.reason === 'resume') ?? null;
  const forYou = sugg.filter((s) => s !== resume).slice(0, 3);
  const isTodayFresh = today?.live_date === todayIso;
  const todayHalfway = !!today && started.has(today.number) && !done.has(today.id);
  const mon = mondayOf(todayIso);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    return { date, puzzle: main.find((p) => p.live_date === date) ?? null };
  });

  return (
    <div className="overflow-x-hidden">
      {/* HERO: today's puzzle comes first; the big logo only on wide screens */}
      <section className="max-w-site mx-auto px-4 sm:px-5 pt-4 lg:pt-8 grid gap-4 lg:gap-10 lg:grid-cols-[1.05fr_1fr] items-start">
        <div className="relative hidden lg:grid lg:order-2 place-items-center lg:mt-10">
          <div className="rays absolute inset-[-12%] pointer-events-none" aria-hidden="true" />
          <img
            src="/brand/logo-hero.webp"
            alt={t('app.logoAlt')}
            width={450}
            height={194}
            className="relative pop-in w-full max-w-[480px] h-auto drop-shadow-[0_6px_0_rgba(16,35,63,0.12)]"
          />
        </div>

        <div className="lg:order-1 min-w-0">
          <h1 className="text-[1.6rem] leading-tight lg:text-heading-xl">{t('home.hero.title')}</h1>
          <p className="hidden lg:block mt-2 text-xl leading-snug text-ink/80 max-w-xl">{t('home.hero.sub')}</p>

          {resume && (
            <div className="mt-4">
              <NextCard suggestion={resume} kicker={t('next.kickerResume')} from="fy" />
            </div>
          )}

          {/* Today's puzzle */}
          {loading ? (
            <div className="sticker mt-4 p-5 h-56 animate-pulse" aria-hidden="true" />
          ) : today ? (
            <article className="sticker relative overflow-hidden mt-4 p-4 sm:p-5" aria-labelledby="today-name">
              <div className="grid-corner absolute right-0 top-0 w-32 h-32 pointer-events-none" aria-hidden="true" />
              <div className="relative flex items-center gap-3">
                <Tile char={today.type?.tile ?? 'क'} size={56} today tilt={-4} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-heading font-bold text-lg text-orange-deep leading-tight">
                    {isTodayFresh ? t('home.today.label', { day: dayName(todayIso, lang) }) : t('home.today.latest')}
                  </p>
                  <h2 id="today-name" className="text-heading-md leading-tight">{pick(today, 'name', lang)}</h2>
                </div>
              </div>
              <p className="relative mt-2 text-xl leading-snug">{pick(today, 'about', lang)}</p>
              <p className="relative mt-2 flex flex-wrap gap-x-5 gap-y-1 text-lg text-ink/75">
                {pick(today, 'time', lang) && (
                  <span className="inline-flex items-center gap-2">
                    <Clock size={18} strokeWidth={2.4} aria-hidden="true" />
                    {pick(today, 'time', lang)}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange border-2 border-ink" aria-hidden="true" />
                  {t(`difficulty.${today.difficulty}`)}
                </span>
              </p>
              <Link to={`/khel/${today.number}`} className="relative btn btn-primary w-full mt-3 !text-[1.45rem]">
                <Play size={22} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
                {todayHalfway ? t('next.resume') : t('home.today.play')}
              </Link>
              <div className="relative">
                <ShareToggle puzzle={today} sessionId={sessionId} />
              </div>
            </article>
          ) : (
            <div className="sticker mt-4 p-5">
              <p className="text-xl">{t('home.today.none')}</p>
            </div>
          )}

          {quick && (
            <div className="mt-4">
              <NextCard suggestion={{ puzzle: quick, reason: 'quick' }} kicker={t('quick.kicker')} from="qk" tone="green" />
            </div>
          )}
        </div>
      </section>

      <ForYouRow items={forYou} />

      {/* THIS WEEK: one strip of seven days */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-8 lg:mt-10" aria-labelledby="week-h">
        <div className="flex items-baseline gap-3">
          <h2 id="week-h" className="text-heading-sm">{t('home.week.title')}</h2>
          <Link to="/kodi" className="ml-auto font-heading font-bold text-lg text-orange-deep underline underline-offset-4 whitespace-nowrap">
            {t('home.week.all')} →
          </Link>
        </div>
        <ul className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-3">
          {week.map(({ date, puzzle: p }) => {
            const isToday = date === todayIso;
            const future = date > todayIso;
            const played = !!p && done.has(p.id);
            const label = `${dayName(date, lang)}: ${p ? pick(p, 'name', lang) : future ? t('home.week.soon') : t('home.week.rest')}${played ? ` (${t('home.week.played')})` : ''}`;
            const inner = (
              <>
                <span className="relative">
                  <Tile char={p?.type?.tile ?? ''} size={40} today={isToday} className={!p || future ? 'opacity-40' : ''} />
                  {played && (
                    <span className="absolute -right-1.5 -top-1.5 grid place-items-center h-5 w-5 rounded-full bg-green text-white border-2 border-ink" aria-hidden="true">
                      <Check size={12} strokeWidth={4} />
                    </span>
                  )}
                </span>
                <span className={`text-sm leading-tight ${isToday ? 'font-bold' : 'text-ink/70'}`}>
                  {isToday ? t('home.week.today') : dayTile(date)}
                </span>
                {p && <span className="hidden sm:block text-base leading-tight font-bold truncate max-w-full px-1">{pick(p, 'name', lang)}</span>}
              </>
            );
            const cls = `h-full flex flex-col items-center text-center gap-1 rounded-2xl border-2 py-2 ${
              isToday ? 'bg-orange-soft border-ink shadow-sticker' : p ? 'bg-paper border-ink' : 'bg-transparent border-dashed border-ink/30'
            }`;
            return (
              <li key={date} className="min-w-0">
                {p ? (
                  <Link to={`/k/${p.number}`} className={`${cls} transition-transform active:translate-y-0.5`} aria-label={label}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls} aria-label={label}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* One promo: daily puzzle on WhatsApp */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-8 lg:mt-10">
        <div className="relative overflow-hidden rounded-3xl bg-navy text-white border-[3px] border-ink p-4 sm:p-6 grid gap-3 grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] items-center">
          <Illustration name="cheer" alt={t('img.cheer')} className="w-20 md:w-28" />
          <div>
            <h2 className="text-xl md:text-heading-sm text-white leading-tight">{t('home.notify.title')}</h2>
            <p className="mt-1 text-base leading-snug text-white/80 max-w-xl">{t('home.notify.body')}</p>
          </div>
          <Link to="/suchana" className="btn btn-primary col-span-2 md:col-span-1">{t('home.notify.cta')}</Link>
        </div>
      </section>
    </div>
  );
}
