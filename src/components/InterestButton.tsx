import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { addSubscriber } from '@/lib/api';
import FormField, { inputClass } from '@/components/FormField';

/**
 * "कळवा" button: opens a small bottom sheet that saves a WhatsApp number as interest (subscribers, interest: book).
 * On shop cards this sits next to "माहिती"; when selling starts it can be swapped for add-to-cart.
 */
export default function InterestButton({ productName, slug, label, className = '' }: { productName: string; slug: string; label: string; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-primary ${className}`}>{label}</button>
      {open && <InterestSheet productName={productName} slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}

function InterestSheet({ productName, slug, onClose }: { productName: string; slug: string; onClose: () => void }) {
  const { t } = useTranslation();
  const key = `ck-notify-${slug}`;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'bad' | 'error'>(() => {
    try { return localStorage.getItem(key) ? 'done' : 'idle'; } catch { return 'idle'; }
  });
  // Close on the Back/Escape key, and stop the page behind from scrolling while the sheet is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return setState('bad');
    setState('saving');
    try {
      await addSubscriber({ name: name.trim(), phone: digits, city: '', interest: 'book', source_page: `/dukan/${slug}`, note: productName });
      try { localStorage.setItem(key, '1'); } catch { /* private mode */ }
      setState('done');
    } catch {
      setState('error');
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-ink/40" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('shop.notifyTitle')}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-3 right-3 bottom-3 mx-auto max-w-md rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-sticker"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 mr-auto">
            <h2 className="text-heading-sm">{t('shop.notifyTitle')}</h2>
            <p className="text-lg text-ink/75 mt-0.5">{t('shop.notifyBody')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('playbar.close')} className="grid place-items-center h-10 w-10 shrink-0 rounded-xl border-2 border-ink bg-paper">
            <X size={22} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
        {state === 'done' ? (
          <p className="mt-3 rounded-2xl bg-green-soft border-2 border-green px-4 py-3 text-lg font-semibold">{t('shop.notifyDone')}</p>
        ) : (
          <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
            <FormField label={t('shop.co.phone')}>
              <input className={inputClass} value={phone} onChange={(e) => { setPhone(e.target.value); if (state === 'bad') setState('idle'); }} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" autoFocus />
            </FormField>
            <FormField label={t('shop.notifyName')}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </FormField>
            {state === 'bad' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('shop.notifyBad')}</p>}
            {state === 'error' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('shop.notifyErr')}</p>}
            <button type="submit" disabled={state === 'saving'} className="btn btn-primary w-full">{state === 'saving' ? '…' : t('shop.notifyBtn')}</button>
          </form>
        )}
      </section>
    </div>
  );
}
