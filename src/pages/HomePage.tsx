import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Share2, BookOpen, MessageCircle, Smartphone, Hand, Send } from 'lucide-react';
import Tile from '@/components/Tile';
import { sampleWeek, todayIndexIST, type Lang } from '@/data/sampleWeek';

// Week runs Monday → Sunday on screen
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const todayIdx = todayIndexIST();
  const today = sampleWeek.find((p) => p.dayIndex === todayIdx) ?? sampleWeek[0];
  const week = weekOrder.map((d) => sampleWeek.find((p) => p.dayIndex === d)!);

  const shareText = `${t('home.today.shareText', { name: today.name.mr })} https://kheluya.in/${today.number}?s=wa`;
  const shareHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

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
        {/* Illustration — first on phone, right on desktop */}
        <div className="relative lg:order-2 grid place-items-center">
          <div className="rays absolute inset-[-12%] pointer-events-none" aria-hidden="true" />
          <img
            src="/brand/logo-big.webp"
            alt={t('app.logoAlt')}
            width={454}
            height={250}
            className="relative pop-in w-[72%] sm:w-full max-w-[520px] h-auto drop-shadow-[0_6px_0_rgba(16,35,63,0.12)]"
          />
        </div>

        <div className="lg:order-1">
          <h1 className="text-heading-lg lg:text-heading-xl">{t('home.hero.title')}</h1>
          <p className="mt-3 text-[1.35rem] leading-snug text-ink/85 max-w-xl">{t('home.hero.sub')}</p>

          {/* Today's puzzle */}
          <article className="sticker relative overflow-hidden mt-6 p-5 sm:p-6" aria-labelledby="today-name">
            <div className="grid-corner absolute right-0 top-0 w-40 h-40 pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <Tile char={today.tile} size={68} today tilt={-4} />
              <div className="min-w-0">
                <p className="font-heading font-bold text-xl text-orange-deep">
                  {t('home.today.label', { day: today.day[lang] })}
                </p>
                <h2 id="today-name" className="text-heading-md leading-tight">{today.name[lang]}</h2>
              </div>
            </div>
            <p className="relative mt-3 text-[1.3rem] leading-snug">{today.about[lang]}</p>
            <p className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-lg text-ink/80">
              <span className="inline-flex items-center gap-2">
                <Clock size={20} strokeWidth={2.4} aria-hidden="true" />
                {today.time[lang]}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange border-2 border-ink" aria-hidden="true" />
                {today.level[lang]}
              </span>
            </p>
            <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
              <Link to={`/k/${today.number}`} className="btn btn-primary w-full text-[1.6rem]">
                {t('home.today.play')}
              </Link>
              <a href={shareHref} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full text-xl whitespace-nowrap">
                <Share2 size={22} strokeWidth={2.6} aria-hidden="true" />
                {t('home.today.share')}
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* THIS WEEK */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-12 lg:mt-16" aria-labelledby="week-h">
        <h2 id="week-h" className="text-heading-md">{t('home.week.title')}</h2>
        <p className="mt-1 text-ink/80">{t('home.week.sub')}</p>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
          {week.map((p) => {
            const isToday = p.dayIndex === todayIdx;
            return (
              <li key={p.number}>
                <Link
                  to={`/k/${p.number}`}
                  className={`h-full flex flex-row sm:flex-col items-center sm:text-center gap-4 sm:gap-2 rounded-3xl border-[3px] border-ink px-4 sm:px-2 py-3 sm:pt-4 transition-transform active:translate-y-1 ${
                    isToday ? 'bg-orange-soft shadow-sticker' : 'bg-paper shadow-[0_4px_0_0_#10233F]'
                  }`}
                  aria-label={`${p.day[lang]}: ${p.name[lang]}`}
                >
                  <Tile char={p.tile} size={52} today={isToday} className="shrink-0" />
                  <span className="flex flex-col sm:items-center gap-0.5 min-w-0">
                    <span className="font-heading font-bold text-xl sm:text-lg leading-tight">{p.day[lang]}</span>
                    <span className="text-[1.2rem] sm:text-[1.1rem] leading-tight">{p.name[lang]}</span>
                    <span className="text-base text-ink/70">{p.time[lang]}</span>
                  </span>
                  {isToday && (
                    <span className="ml-auto sm:ml-0 sm:mt-1 rounded-full bg-ink text-white text-base sm:text-sm font-bold px-3 py-0.5">{t('home.week.today')}</span>
                  )}
                </Link>
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
        <div className="rounded-3xl border-[3px] border-ink bg-green-soft p-6 sm:p-8 shadow-sticker-lg">
          <MessageCircle size={36} strokeWidth={2.4} className="text-green" aria-hidden="true" />
          <h2 className="mt-3 text-heading-md">{t('home.family.title')}</h2>
          <p className="mt-2 text-lg leading-snug text-ink/85">{t('home.family.body')}</p>
          <Link to="/kutumb" className="btn btn-quiet mt-5 text-xl">{t('home.family.cta')}</Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink bg-orange-soft p-6 sm:p-8 shadow-sticker-lg">
          <span className="absolute right-[-44px] top-6 rotate-45 bg-ink text-white font-heading font-bold text-lg px-14 py-1">
            {t('home.shop.soon')}
          </span>
          <BookOpen size={36} strokeWidth={2.4} className="text-orange-deep" aria-hidden="true" />
          <h2 className="mt-3 text-heading-md pr-16">{t('home.shop.title')}</h2>
          <p className="mt-2 text-lg leading-snug text-ink/85">{t('home.shop.body')}</p>
          <Link to="/suchana" className="btn btn-primary mt-5 text-xl">{t('home.shop.cta')}</Link>
        </div>
      </section>

      {/* NOTIFY */}
      <section className="max-w-site mx-auto px-4 sm:px-5 mt-14 lg:mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-navy text-white border-[3px] border-ink p-6 sm:p-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
          <div>
            <h2 className="text-heading-md text-white">{t('home.notify.title')}</h2>
            <p className="mt-2 text-lg leading-snug text-white/85 max-w-xl">{t('home.notify.body')}</p>
          </div>
          <Link to="/suchana" className="relative btn btn-primary text-xl">{t('home.notify.cta')}</Link>
        </div>
      </section>
    </div>
  );
}
