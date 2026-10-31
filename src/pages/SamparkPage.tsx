import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import PageShell from '@/components/PageShell';
import FormField, { inputClass } from '@/components/FormField';
import { addContactMessage } from '@/lib/api';

export default function SamparkPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('saving');
    try {
      await addContactMessage({ name: name.trim(), phone: phone.replace(/[^0-9+ ]/g, '').slice(0, 20), message: message.trim().slice(0, 2000) });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <PageShell title={t('pages.sampark.heading')} description={t('pages.sampark.description')}>
      {status === 'done' ? (
        <p role="status" className="mt-8 sticker p-6 text-xl font-bold">{t('sampark.thanks')}</p>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-6">
          <FormField label={t('sampark.message')}>
            <textarea className={`${inputClass} min-h-[10rem]`} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </FormField>
          <FormField label={t('suchana.name')} hint={t('suchana.nameHint')}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </FormField>
          <FormField label={t('sampark.phone')} hint={t('sampark.phoneHint')}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" />
          </FormField>
          {status === 'error' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('suchana.error')}</p>}
          <button type="submit" disabled={status === 'saving'} className="btn btn-primary w-full sm:w-auto">
            <Send size={24} strokeWidth={2.6} aria-hidden="true" />
            {status === 'saving' ? t('suchana.saving') : t('sampark.send')}
          </button>
        </form>
      )}
    </PageShell>
  );
}
