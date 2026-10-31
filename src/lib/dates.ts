/** Today's date in India as YYYY-MM-DD, whatever the phone's time zone. */
export function istToday(now = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60000);
  return ist.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
}

/** Monday of the week containing the date (India week runs Mon–Sun on screen). */
export function mondayOf(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

const DAYS_MR = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TILES = ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'];
const MONTHS_MR = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayName = (iso: string, lang: 'mr' | 'en') => (lang === 'mr' ? DAYS_MR : DAYS_EN)[weekday(iso)];
export const dayTile = (iso: string) => TILES[weekday(iso)];

const MR_DIGITS = '०१२३४५६७८९';
export const mrDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => MR_DIGITS[Number(d)]);

export function prettyDate(iso: string, lang: 'mr' | 'en'): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'mr' ? `${mrDigits(d)} ${MONTHS_MR[m - 1]} ${mrDigits(y)}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

export function formatDuration(ms: number | null | undefined, lang: 'mr' | 'en'): string {
  if (ms == null) return '–';
  const total = Math.max(1, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const parts =
    lang === 'mr'
      ? [h ? `${h} तास` : '', m ? `${m} मि` : '', !h && sec ? `${sec} से` : '']
      : [h ? `${h}h` : '', m ? `${m}m` : '', !h && sec ? `${sec}s` : ''];
  const txt = parts.filter(Boolean).join(' ');
  return lang === 'mr' ? mrDigits(txt) : txt;
}
