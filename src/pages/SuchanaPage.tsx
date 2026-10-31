import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import PageShell from '@/components/PageShell';
import FormField, { inputClass } from '@/components/FormField';
import Illustration from '@/components/Illustration';
import { addSubscriber } from '@/lib/api';

export default function SuchanaPage() {
  const { t } = useTranslation();
  const { state } = useLocation() as { state?: { from?: string } };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [interest, setInterest] = useState<'puzzles' | 'book' | 'both'>('both');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [problem, setProblem] = useState('');

  const digits = phone.replace(/[^0-9]/g, '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length < 10 || digits.length > 13) return setProblem(t('suchana.badPhone'));
    if (!consent) return setProblem(t('suchana.needConsent'));
    setProblem('');
    setStatus('saving');
    try {
      await addSubscriber({ name: name.trim(), phone: digits, city: city.trim(), interest, source_page: state?.from ?? '/suchana' });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="max-w-content mx-auto px-4 py-10 text-center">
        <Illustration name="cheer" alt={t('img.cheer')} eager className="w-60 mx-auto mb-6 shadow-sticker-lg" />
        <h1 className="text-heading-lg">{t('suchana.thanks')}</h1>
        <p className="mt-3 text-xl">{t('suchana.thanksBody')}</p>
      </div>
    );
  }

  return (
    <PageShell
      title={t('pages.suchana.heading')}
      description={t('pages.suchana.description')}
      illustration={{ name: 'cheer', alt: t('img.cheer') }}
    >
      <form onSubmit={submit} className="mt-8 grid gap-6" noValidate>
        <FormField label={t('suchana.phone')} hint={t('suchana.phoneHint')}>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
        </FormField>
        <FormField label={t('suchana.name')} hint={t('suchana.nameHint')}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Suresh Kulkarni" />
        </FormField>
        <FormField label={t('suchana.city')} hint={t('suchana.cityHint')}>
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" placeholder="Pune" />
        </FormField>
        <fieldset>
          <legend className="font-heading font-bold text-xl">{t('suchana.interest')}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(['both', 'puzzles', 'book'] as const).map((k) => (
              <label key={k} className={`flex items-center gap-3 min-h-touch rounded-2xl border-[3px] border-ink px-4 text-lg ${interest === k ? 'bg-orange-soft' : 'bg-paper'}`}>
                <input type="radio" name="interest" checked={interest === k} onChange={() => setInterest(k)} className="h-6 w-6 accent-[#F39200]" />
                {t(`suchana.i_${k}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-lg">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-7 w-7 shrink-0 accent-[#2E8A3E]" />
          {t('suchana.consent')}
        </label>
        {problem && <p role="alert" className="text-lg font-bold text-[#B42318]">{problem}</p>}
        {status === 'error' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('suchana.error')}</p>}
        <button type="submit" disabled={status === 'saving'} className="btn btn-whatsapp w-full sm:w-auto">
          <Check size={24} strokeWidth={3} aria-hidden="true" />
          {status === 'saving' ? t('suchana.saving') : t('suchana.submit')}
        </button>
      </form>
    </PageShell>
  );
}
