import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Smartphone, Hand, Send, Play } from 'lucide-react';
import Tile from '@/components/Tile';
import Illustration from '@/components/Illustration';
import ShareButtons from '@/components/ShareButtons';
import { ForYouRow, NextCard } from '@/components/SuggestCards';
import { doneIds } from '@/lib/progress';
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
  const quick = quickList.find((p) => !done.has(p.id)) ?? quickList[0] ?? null;
  const forYou = recent ? suggest(recent, 'home', { exclude: [today?.id ?? '', quick?.id ?? ''], limit: 3 }) : [];
  const isTodayFresh = today?.live_date === todayIso;
  const mon = mondayOf(todayIso);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    return { date, puzzle: main.find((p) => p.live_date === date) ?? null };
  });

  const steps = [
    { Icon: Smartphone, title: t('home.how.s1.title'), body: t('home.how.s1.body') },
    { Icon: Hand, title: t('home.how.s2.title'), body: t('home.how.s2.body') },
    { Icon: Send, title: t('home.how.s3.title'), body: t('home.how.s3.body') },
  ];
  const digits = lang === 'mr' ? ['१', '२', '३'] : ['1', '2', '3'];

  return (
    <div className="overflow-x-hidden">
      {/* HERO */}
      <section className="max-w-site mx-auto px-4 sm:px-5 pt-4 lg:pt-12 pb-4 grid gap-4 lg:gap-10 lg:grid-cols-[1.05fr_1fr] items-center">
        <div className="relative lg:order-2 grid place-items-center">
          <div className="rays absolute inset-[-12%] pointer-events-none" aria-hidden="true" />
          <img
            src="/brand/logo-hero.webp"
            alt={t('app.logoAlt')}
            width={450}
            height={194}
            className="relative pop-in w-[72%] sm:w-full max-w-[520px] h-auto drop-shadow-[0_6px_0_rgba(16,35,63,0.12)]"
          />
        </div>

        <div className="lg:order-1">
          <h1 className="text-heading-lg lg:text-heading-xl">{t('home.hero.title')}</h1>
          <p className="mt-3 text-[1.35rem] leading-snug text-ink/85 max-w-xl">{t('home.hero.sub')}</p>

          {/* Today's puzzle */}
          {loading ? (
            <div className="sticker mt-6 p-6 h-64 animate-pulse" aria-hidden="true" />
          ) : today ? (
            <article className="sticker relative overflow-hidden mt-6 p-5 sm:p-6" aria-labelledby="today-name">
              <div className="grid-corner absolute right-0 top-0 w-40 h-40 pointer-events-none" aria-hidden="true" />
              <div className="relative flex items-start gap-4">
                <Tile char={today.type?.tile ?? 'क'} size={68} today tilt={-4} />
                <div className="min-w-0">
                  <p className="font-heading font-bold text-xl text-orange-deep">
                    {isTodayFresh
                      ? t('home.today.label', { day: dayName(todayIso, lang) })
                      : t('home.today.latest')}
                  </p>
                  <h2 id="today-name" className="text-heading-md leading-tight">{pick(today, 'name', lang)}</h2>
                </div>
              </div>
              <p className="relative mt-3 text-[1.3rem] leading-snug">{pick(today, 'about', lang)}</p>
              <p className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-lg text-ink/80">
                {pick(today, 'time', lang) && (
                  <span className="inline-flex items-center gap-2">
                    <Clock size={20} strokeWidth={2.4} aria-hidden="true" />
                    {pick(today, 'time', lang)}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange border-2 border-ink" aria-hidden="true" />
                  {t(`difficulty.${today.difficulty}`)}
                </span>
              </p>
              <Link to={`/khel/${today.number}`} className="relative btn btn-primary w-full mt-5 text-[1.6rem]">
                <Play size={26} strokeWidth={2.8} fill="currentColor" aria-hidden="true" />
                {t('home.today.play')}
              </Link>
              <div className="relative">
                <ShareButtons puzzle={today} sessionId={sessionId} compact={false} />
              </div>
            </article>
          ) : (
            <div className="sticker mt-6 p-6">
              <p className="text-xl">{t('home.today.none')}</p>
            </div>
          )}

          {quick && (
            <div className="mt-6">
              <NextCard suggestion={{ puzzle: quick, reason: 'quick' }} kicker={t('quick.kicker')} from="qk" tone="green" />
            </div>
          )}
        </div>
      </section>

      <ForYouRow items={forYou} />

      {/* THIS WEEK */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-12 lg:mt-16" aria-labelledby="week-h">
        <h2 id="week-h" className="text-heading-md">{t('home.week.title')}</h2>
        <p className="mt-1 text-ink/80">{t('home.week.sub')}</p>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
          {week.map(({ date, puzzle: p }) => {
            const isToday = date === todayIso;
            const future = date > todayIso;
            const inner = (
              <>
                <Tile char={p?.type?.tile ?? dayTile(date)} size={52} today={isToday} className={`shrink-0 ${future ? 'opacity-50' : ''}`} />
                <span className="flex flex-col sm:items-center gap-0.5 min-w-0">
                  <span className="font-heading font-bold text-xl sm:text-lg leading-tight">{dayName(date, lang)}</span>
                  <span className="text-[1.2rem] sm:text-[1.1rem] leading-tight">
                    {p ? pick(p, 'name', lang) : future ? t('home.week.soon') : t('home.week.rest')}
                  </span>
                  {p && pick(p, 'time', lang) && <span className="text-base text-ink/70">{pick(p, 'time', lang)}</span>}
                </span>
                {isToday && (
                  <span className="ml-auto sm:ml-0 sm:mt-1 rounded-full bg-ink text-white text-base sm:text-sm font-bold px-3 py-0.5">{t('home.week.today')}</span>
                )}
              </>
            );
            const cls = `h-full flex flex-row sm:flex-col items-center sm:text-center gap-4 sm:gap-2 rounded-3xl border-[3px] border-ink px-4 sm:px-2 py-3 sm:pt-4 ${
              isToday ? 'bg-orange-soft shadow-sticker' : future || !p ? 'bg-cream border-dashed' : 'bg-paper shadow-[0_4px_0_0_#10233F]'
            }`;
            return (
              <li key={date}>
                {p ? (
                  <Link to={`/k/${p.number}`} className={`${cls} transition-transform active:translate-y-1`} aria-label={`${dayName(date, lang)}: ${pick(p, 'name', lang)}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <Link to="/kodi" className="btn btn-quiet text-xl">{t('home.week.all')}</Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-14 lg:mt-20" aria-labelledby="how-h">
        <h2 id="how-h" className="text-heading-md">{t('home.how.title')}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <li key={title} className="flex gap-4 items-start rounded-3xl bg-paper border-[3px] border-ink p-5">
              <span className="tile shrink-0" style={{ width: 52, height: 52, fontSize: 26 }} aria-hidden="true">
                {digits[i]}
              </span>
              <div>
                <h3 className="text-heading-sm flex items-center gap-2">
                  <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
                  {title}
                </h3>
                <p className="mt-1 text-lg leading-snug text-ink/85">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAMILIES + SHOP */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-14 lg:mt-20 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border-[3px] border-ink bg-green-soft p-6 sm:p-8 shadow-sticker-lg flex flex-col sm:flex-row-reverse gap-5 sm:items-center">
          <Illustration name="share" alt={t('img.share')} className="w-40 sm:w-44 shrink-0" />
          <div>
            <h2 className="text-heading-md">{t('home.family.title')}</h2>
            <p className="mt-2 text-lg leading-snug text-ink/85">{t('home.family.body')}</p>
            <Link to="/kutumb" className="btn btn-quiet mt-5 text-xl">{t('home.family.cta')}</Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink bg-orange-soft p-6 sm:p-8 shadow-sticker-lg">
          <span className="absolute right-[-44px] top-6 rotate-45 bg-ink text-white font-heading font-bold text-lg px-14 py-1">
            {t('home.shop.soon')}
          </span>
          <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
            <Illustration name="book" alt={t('img.book')} className="w-36 sm:w-40 shrink-0" />
            <div>
              <h2 className="text-heading-md pr-12 sm:pr-14">{t('home.shop.title')}</h2>
              <p className="mt-2 text-lg leading-snug text-ink/85">{t('home.shop.body')}</p>
              <Link to="/suchana" className="btn btn-primary mt-5 text-xl">{t('home.shop.cta')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* NOTIFY */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-14 lg:mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-navy text-white border-[3px] border-ink p-6 sm:p-10 grid gap-6 md:grid-cols-[auto_1fr_auto] items-center">
          <Illustration name="cheer" alt={t('img.cheer')} className="w-32 md:w-40" />
          <div>
            <h2 className="text-heading-md text-white">{t('home.notify.title')}</h2>
            <p className="mt-2 text-lg leading-snug text-white/85 max-w-xl">{t('home.notify.body')}</p>
          </div>
          <Link to="/suchana" className="btn btn-primary text-xl">{t('home.notify.cta')}</Link>
        </div>
      </section>
    </div>
  );
}
