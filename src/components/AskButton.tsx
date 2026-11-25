import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, PhoneCall, X } from 'lucide-react';
import FormField, { inputClass } from '@/components/FormField';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { businessFrom } from '@/lib/business';
import { saveLead, savedCustomer, type CartLine } from '@/lib/shop';

/**
 * "प्रश्न आहे? विचारा" — for people who want to ask before paying.
 * Two ways: open their own WhatsApp to the shop with the product filled in,
 * or leave their number so the shop contacts them (saved for Admin → Shop → Follow up).
 */
export default function AskButton({ about, items, className = '' }: { about: string; items: CartLine[]; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-quiet !border-green !text-[#1F5E2A] ${className}`}>
        <MessageCircle size={22} strokeWidth={2.6} aria-hidden="true" />
        {t('shop.ask.button')}
      </button>
      {open && <AskSheet about={about} items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

function AskSheet({ about, items, onClose }: { about: string; items: CartLine[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { data } = useAsync(() => getPublicSettings(), []);
  const b = data ? businessFrom(data) : null;
  const saved = savedCustomer();
  const [phone, setPhone] = useState(saved?.phone ?? '');
  const [name, setName] = useState(saved?.name ?? '');
  const [q, setQ] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'bad'>('idle');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const waText = `नमस्कार, मला चला खेळूया दुकानातील ${about} बद्दल विचारायचे आहे.\n${window.location.href}`;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(digits)) return setState('bad');
    setState('saving');
    await saveLead({ phone: digits, name: name.trim(), items, source: 'ask', question: `${about}${q.trim() ? ` — ${q.trim()}` : ''}` });
    setState('done');
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={t('shop.ask.title')} onClick={(e) => e.stopPropagation()}
        className="absolute left-3 right-3 bottom-3 mx-auto max-w-md max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-sticker grid gap-3">
        <div className="flex items-start gap-3">
          <h2 className="text-heading-sm mr-auto">{t('shop.ask.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('playbar.close')} className="grid place-items-center h-10 w-10 shrink-0 rounded-xl border-2 border-ink bg-paper">
            <X size={22} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>

        {b?.whatsapp && (
          <a href={`${b.whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full !min-h-[3.75rem] !text-xl">
            <MessageCircle size={24} strokeWidth={2.6} aria-hidden="true" />
            {t('shop.ask.whatsapp')}
          </a>
        )}
        {b?.whatsapp && <p className="text-center text-lg font-bold text-ink/60">{t('shop.ask.or')}</p>}

        {state === 'done' ? (
          <p role="status" className="rounded-2xl bg-green-soft border-2 border-green px-4 py-3 text-lg font-semibold">{t('shop.ask.done')}</p>
        ) : (
          <form onSubmit={send} className="grid gap-3 rounded-2xl border-2 border-line p-3">
            <p className="font-heading font-bold text-xl flex items-center gap-2"><PhoneCall size={22} strokeWidth={2.6} aria-hidden="true" />{t('shop.ask.callMe')}</p>
            <FormField label={t('shop.co.phone')}>
              <input className={inputClass} value={phone} onChange={(e) => { setPhone(e.target.value); setState('idle'); }} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
            </FormField>
            <FormField label={t('shop.notifyName')}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </FormField>
            <FormField label={t('shop.ask.question')}>
              <textarea className={`${inputClass} min-h-[4.5rem]`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} />
            </FormField>
            {state === 'bad' && <p role="alert" className="text-lg font-bold text-[#B42318]">{t('shop.notifyBad')}</p>}
            <button className="btn btn-primary w-full" disabled={state === 'saving'}>{state === 'saving' ? '…' : t('shop.ask.send')}</button>
          </form>
        )}
      </section>
    </div>
  );
}
