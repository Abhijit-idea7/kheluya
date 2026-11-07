import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { istToday } from '@/lib/dates';

/** Festival greeting settings, from Admin → Settings (site_settings keys). */
export type Festival = { on: boolean; text: string; from: string; to: string; sound: boolean };

export function festivalFrom(s: Record<string, unknown> | null | undefined): Festival {
  const str = (k: string) => (typeof s?.[k] === 'string' ? (s[k] as string) : '');
  return {
    on: s?.festival_on === true,
    text: str('festival_text'),
    from: str('festival_from'),
    to: str('festival_to'),
    sound: s?.festival_sound !== false,
  };
}

/** Switched on, has a message, and today (India time) is within its dates. */
export function festivalActive(f: Festival, today = istToday()): boolean {
  return f.on && !!f.text.trim() && (!f.from || today >= f.from) && (!f.to || today <= f.to);
}

const COLS = ['#F39200', '#FFC15A', '#E24B4A', '#2E8A3E', '#D4537E', '#378ADD', '#FFFFFF'];
const DURATION = 2600;

/** A short, soft firework: a rising whistle, then a crackle. Skipped if the browser blocks sound. */
function playFirework() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.18;
    master.connect(ac.destination);

    // rising whistle
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 0.4);

    // bang + crackle (shaped noise)
    const len = Math.floor(ac.sampleRate * 0.9);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const crackle = Math.random() < 0.02 ? 1 : 0.25;
      d[i] = (Math.random() * 2 - 1) * crackle * Math.pow(1 - p, 2.2);
    }
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const ng = ac.createGain();
    ng.gain.value = 0.9;
    n.connect(f).connect(ng).connect(master);
    n.start(t + 0.38);
    setTimeout(() => ac.close().catch(() => {}), 1600);
  } catch {
    /* no sound is fine */
  }
}

type Spark = { key: string; style: React.CSSProperties; flash?: boolean };

/** One firework at (cx%, cy%): a flash, then bright streaks shooting outward. */
function burst(id: string, cx: number, cy: number, delay: number, count = 14, dist = 90): Spark[] {
  const flash: Spark = {
    key: `${id}-f`,
    flash: true,
    style: { left: `${cx}%`, top: `${cy}%`, animation: `ck-flash 0.5s ease-out ${delay}s both` },
  };
  return [
    flash,
    ...Array.from({ length: count }, (_, i) => ({
      key: `${id}-${i}`,
      style: {
        left: `${cx}%`,
        top: `${cy}%`,
        background: COLS[i % (COLS.length - 1)],
        ['--a' as string]: `${Math.round((360 / count) * i)}deg`,
        ['--r' as string]: `${Math.round(dist * (0.8 + (i % 3) * 0.12))}px`,
        animation: `ck-streak 1s cubic-bezier(.15,.75,.3,1) ${delay}s both`,
      },
    })),
  ];
}

/**
 * The festival greeting: a big flickering diya and the message pop up over the puzzle with
 * fireworks around it, then fade (about 2.4 s). A tap anywhere skips it.
 */
export default function FestivalGreeting({ text, sound, onDone }: { text: string; sound: boolean; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const still = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const sparks = useMemo(
    () =>
      still
        ? []
        : [
            ...burst('a', 25, 22, 0.1),
            ...burst('b', 75, 20, 0.45),
            ...burst('c', 50, 10, 0.8, 12, 80),
            ...burst('d', 24, 80, 1.05),
            ...burst('e', 76, 78, 1.3),
          ],
    [still],
  );

  useEffect(() => {
    let muted = false;
    try {
      muted = localStorage.getItem('ck-sound') === 'false';
    } catch {
      muted = false;
    }
    if (sound && !muted && !still) {
      playFirework();
      const t2 = setTimeout(playFirework, 650);
      return () => clearTimeout(t2);
    }
    return undefined;
  }, [sound, still]);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), DURATION - 400);
    const t2 = setTimeout(onDone, DURATION);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 transition-opacity duration-400"
      style={{ opacity: leaving ? 0 : 1 }}
      onClick={onDone}
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes ck-streak{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateY(0) scaleY(.3)}12%{opacity:1}55%{opacity:1;transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(var(--r) * -.8)) scaleY(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(var(--r) * -1)) scaleY(.5)}}
        @keyframes ck-flash{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}30%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.4)}}
        @keyframes ck-pop{0%{opacity:0;transform:scale(.5)}18%{opacity:1;transform:scale(1.08)}28%{transform:scale(1)}100%{opacity:1;transform:scale(1)}}
        @keyframes ck-flick{0%,100%{transform:scaleY(1) rotate(-2deg)}50%{transform:scaleY(1.2) rotate(2deg)}}
        @keyframes ck-glow{0%,100%{opacity:.55}50%{opacity:.9}}
      `}</style>
      {sparks.map((s) =>
        s.flash ? (
          <span key={s.key} aria-hidden="true" className="absolute h-10 w-10 rounded-full" style={{ ...s.style, background: 'radial-gradient(circle, #FFFFFF 0%, #FFE2B0 45%, rgba(255,226,176,0) 70%)' }} />
        ) : (
          <span key={s.key} aria-hidden="true" className="absolute h-6 w-[5px] rounded-full" style={{ ...s.style, transformOrigin: '50% 50%' }} />
        ),
      )}
      <div
        className="relative w-[min(82vw,320px)] rounded-[28px] border-[3px] border-ink bg-paper px-5 pt-5 pb-6 text-center shadow-sticker-lg"
        style={{ animation: still ? undefined : 'ck-pop 0.7s ease-out both' }}
      >
        <div aria-hidden="true" className="relative mx-auto h-[118px] w-[170px]">
          <span
            className="absolute left-1/2 top-1 h-16 w-16 -translate-x-1/2 rounded-full"
            style={{ background: '#FFE2B0', animation: still ? undefined : 'ck-glow 0.9s ease-in-out infinite' }}
          />
          <span
            className="absolute left-1/2 top-3 -ml-[14px] h-[46px] w-7"
            style={{
              background: '#F39200',
              borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
              boxShadow: 'inset 0 -10px 0 #FFC15A',
              transformOrigin: 'bottom center',
              animation: still ? undefined : 'ck-flick 0.45s ease-in-out infinite',
            }}
          />
          <span className="absolute left-1/2 top-[54px] h-3 w-1.5 -translate-x-1/2 rounded bg-ink" />
          <span
            className="absolute bottom-0 left-0 h-[52px] w-[170px] border-[3px] border-ink"
            style={{ background: '#B85F00', borderRadius: '6px 6px 90px 90px', boxShadow: 'inset 0 -10px 0 #8C4A00' }}
          />
          <span className="absolute bottom-[30px] left-[28px] right-[28px] h-1.5 rounded bg-[#FFC15A]" />
        </div>
        <p className="mt-4 font-heading font-extrabold text-[1.45rem] leading-tight text-ink">{text}</p>
      </div>
    </div>,
    document.body,
  );
}
