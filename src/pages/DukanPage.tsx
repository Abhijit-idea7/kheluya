import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import PageShell from '@/components/PageShell';
import FormField, { inputClass } from '@/components/FormField';
import Illustration from '@/components/Illustration';
import { addSubscriber } from '@/lib/api';
import { trackSite } from '@/lib/track';
import { useCommunityLink } from '@/lib/community';

const DONE_KEY = 'ck-book-interest';
const COPIES = [1, 2, 3, 5] as const;

/** Shop page: the first product (large-print Marathi puzzle book) + "tell me when it's ready" form. */
export default function DukanPage() {
  const { t } = useTranslation();
  const community = useCommunityLink();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [copies, setCopies] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'already' | 'error'>(() => {
    try { return localStorage.getItem(DONE_KEY) ? 'already' : 'idle'; } catch { return 'idle'; }
  });
  const [problem, setProblem] = useState('');
  const started = useRef(false);

  useEffect(() => { trackSite('shop_view'); }, []);
  const touch = () => {
    if (started.current) return;
    started.current = true;
    trackSite('book_form_start');
  };

  const digits = phone.replace(/[^0-9]/g, '');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length < 10 || digits.length > 13) return setProblem(t('book.badPhone'));
    setProblem('');
    setStatus('saving');
    try {
      await addSubscriber({ name: name.trim(), phone: digits, city: city.trim(), interest: 'book', source_page: '/dukan', copies, note: note.trim().slice(0, 500) });
      try { localStorage.setItem(DONE_KEY, String(Date.now())); } catch { /* ignore */ }
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const points = t('book.points', { returnObjects: true }) as string[];

  return (
    <PageShell title={t('book.title')} description={t('book.sub')}>
      <div className="sticker mt-6 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
        <Illustration name="book" alt={t('img.book')} eager className="w-40 sm:w-48 shrink-0" />
        <div>
          <span className="inline-block rounded-full bg-orange-soft border-2 border-ink px-3 py-0.5 font-heading font-bold">{t('book.soon')}</span>
          <ul className="mt-3 grid gap-2 text-xl">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <Check size={26} strokeWidth={3} className="shrink-0 mt-0.5 text-green" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {status === 'done' || status === 'already' ? (
        <div className="mt-8 rounded-3xl border-[3px] border-ink bg-paper p-6 text-center">
          <Illustration name="cheer" alt={t('img.cheer')} className="w-40 mx-auto mb-4" />
          <h2 className="text-heading-sm">{status === 'done' ? t('book.thanks') : t('book.already')}</h2>
          <p className="mt-2 text-xl">{t('book.thanksBody')}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            {community && (
              <a href={community} target="_blank" rel="noreferrer" className="btn btn-whatsapp">{t('community.cta')}</a>
            )}
            <Link to="/" className="btn btn-primary">{t('book.playToday')}</Link>
          </div>
          {status === 'already' && (
            <button className="mt-4 text-lg underline text-ink/70" onClick={() => setStatus('idle')}>{t('book.another')}</button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} onFocus={touch} className="mt-8 grid gap-6" noValidate>
          <h2 className="text-heading-sm">{t('book.formTitle')}</h2>
          <FormField label={t('book.phone')} hint={t('book.phoneHint')}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
          </FormField>
          <FormField label={t('book.name')}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </FormField>
          <FormField label={t('book.city')}>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </FormField>
          <fieldset>
            <legend className="font-heading font-bold text-xl">{t('book.copies')}</legend>
            <span className="block text-base text-ink/70">{t('book.copiesHint')}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COPIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCopies(copies === c ? null : c)}
                  aria-pressed={copies === c}
                  className={`min-h-touch min-w-[4.5rem] rounded-2xl border-[3px] border-ink px-4 text-xl font-bold ${copies === c ? 'bg-orange-soft' : 'bg-paper'}`}
                >
                  {t(`book.c${c}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <FormField label={t('book.note')} hint={t('book.noteHint')}>
            <textarea className={`${inputClass} min-h-[6rem]`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </FormField>
          {problem && <p role="alert" className="text-lg font-bold text-[#B42318]">{problem}</p>}
          {status === 'error' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('book.error')}</p>}
          <button type="submit" disabled={status === 'saving'} className="btn btn-whatsapp w-full sm:w-auto">
            <Check size={24} strokeWidth={3} aria-hidden="true" />
            {status === 'saving' ? t('book.saving') : t('book.submit')}
          </button>
          <p className="-mt-3 text-base text-ink/70">{t('book.consent')}</p>
        </form>
      )}
    </PageShell>
  );
}
