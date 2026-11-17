import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check } from 'lucide-react';
import { noteAsked, timeLabel, turnOn } from '@/lib/push';

/**
 * Floating card at the bottom of the screen after a finish: "रोज सकाळी नव्या कोड्याची आठवण करू?"
 * Stays until the player chooses. "हो" asks the phone (its own Allow / Block question).
 */
export default function ReminderSheet({ time, onClose }: { time: unknown; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const [state, setState] = useState<'ask' | 'working' | 'on' | 'blocked' | 'error'>('ask');
  const when = timeLabel(time, lang);

  const later = () => {
    noteAsked();
    onClose();
  };
  const yes = async () => {
    noteAsked();
    setState('working');
    const r = await turnOn();
    setState(r === 'on' ? 'on' : r === 'blocked' ? 'blocked' : r === 'off' ? 'ask' : 'error');
    if (r === 'off') return onClose(); // closed the phone's question without choosing
    setTimeout(onClose, r === 'on' ? 2800 : 5000);
  };

  return (
    <section
      role="dialog"
      aria-label={t('remind.title')}
      className="fixed left-3 right-3 bottom-3 z-40 mx-auto max-w-md p-4 rounded-3xl border-[3px] border-ink bg-paper shadow-sticker"
    >
      {state === 'on' ? (
        <p className="flex items-center gap-3 font-heading font-extrabold text-xl leading-tight text-[#1F5E2A]">
          <span className="grid place-items-center h-11 w-11 shrink-0 rounded-full bg-green text-white">
            <Check size={24} strokeWidth={3} aria-hidden="true" />
          </span>
          {t('remind.done', { when })}
        </p>
      ) : state === 'blocked' || state === 'error' ? (
        <div>
          <p className="font-heading font-bold text-xl leading-snug">{state === 'blocked' ? t('remind.blocked') : t('remind.error')}</p>
          <button type="button" className="btn btn-quiet w-full mt-3" onClick={onClose}>{t('playbar.close')}</button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="grid place-items-center h-12 w-12 shrink-0 rounded-2xl border-2 border-ink bg-orange-soft">
              <Bell size={26} strokeWidth={2.4} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-heading font-extrabold text-[1.35rem] leading-tight">{t('remind.title')}</p>
              <p className="text-base text-ink/70 mt-0.5">{t('remind.sub', { when })}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2.5">
            <button type="button" className="btn btn-quiet !text-lg !px-2" onClick={later} disabled={state === 'working'}>
              {t('remind.later')}
            </button>
            <button type="button" className="btn btn-primary !text-lg !px-2" onClick={yes} disabled={state === 'working'}>
              {state === 'working' ? '…' : t('remind.yes')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
