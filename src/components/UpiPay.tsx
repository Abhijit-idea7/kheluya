import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Copy, Smartphone } from 'lucide-react';
import { money, shopError, submitUpiRef, upiLink, type Order } from '@/lib/shop';
import FormField, { inputClass } from '@/components/FormField';

/**
 * Pay by UPI straight to the shop's UPI ID (used before Razorpay is active):
 * 1. open the UPI app with the amount filled in (or scan the QR from another phone),
 * 2. type the UPI reference number, and the owner confirms after seeing the money.
 */
export default function UpiPay({ o, upiId, payee, onDone }: { o: Order; upiId: string; payee: string; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'mr';
  const link = upiLink(upiId, payee, o.total_paise, o.order_no);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [ref, setRef] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [link]);

  // The owner looked and could not find the payment: show their message
  const last = o.events[o.events.length - 1];
  const notFound = last && last.note.startsWith('पेमेंट सापडले नाही') ? last.note : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* old phones: the ID is on screen to type */
    }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const clean = ref.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length < 8) return setErr(t('shop.err.BAD_REF'));
    setBusy(true);
    try {
      await submitUpiRef(o.order_no, o.access_key, clean);
      onDone();
    } catch (e2) {
      const { code } = shopError(e2);
      setErr(t(`shop.err.${code}`, { defaultValue: t('shop.err.UNKNOWN') }));
    }
    setBusy(false);
  };

  if (o.payment_status === 'verifying') {
    return (
      <div className="p-4 rounded-2xl border-[3px] border-green bg-green-soft">
        <p className="text-xl font-bold">{t('shop.o.upiChecking')}</p>
        <p className="mt-1 text-lg">{t('shop.o.upiRefShown')}: <b className="tabular-nums break-all">{o.upi_ref}</b></p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-[3px] border-ink bg-orange-soft grid gap-4">
      <div>
        <h3 className="font-heading font-extrabold text-2xl">{t('shop.o.upiTitle', { amt: money(o.total_paise, lang) })}</h3>
        <p className="text-lg">{t('shop.o.upiDeadline')}</p>
      </div>
      {notFound && <p role="alert" className="p-3 rounded-xl bg-[#FDECEA] border-2 border-[#B42318] text-lg font-bold">{notFound}</p>}

      <div className="grid gap-2">
        <p className="font-heading font-bold text-xl">{t('shop.o.upiStep1')}</p>
        <a href={link} className="btn btn-primary w-full !min-h-[3.75rem] !text-xl">
          <Smartphone size={24} strokeWidth={2.6} aria-hidden="true" />
          {t('shop.o.upiApp', { amt: money(o.total_paise, lang) })}
        </a>
        <div className="mt-1 grid gap-3 sm:grid-cols-[auto_1fr] items-center bg-white rounded-2xl border-2 border-line p-3">
          {qr && <div className="w-44 h-44 mx-auto [&>svg]:w-full [&>svg]:h-full" role="img" aria-label="UPI QR" dangerouslySetInnerHTML={{ __html: qr }} />}
          <div className="text-lg leading-snug">
            <p className="text-ink/75">{t('shop.o.upiOr')}</p>
            <p className="mt-2">{t('shop.o.upiTo')}: <b>{payee}</b></p>
            <p className="flex flex-wrap items-center gap-2">
              <b className="break-all">{upiId}</b>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-xl border-2 border-ink px-2 py-0.5 text-base font-bold bg-paper">
                <Copy size={16} strokeWidth={2.6} aria-hidden="true" />{copied ? t('shop.o.copied') : t('shop.o.copy')}
              </button>
            </p>
            <p>{t('shop.o.upiAmount')}: <b>{money(o.total_paise, lang)}</b></p>
          </div>
        </div>
      </div>

      <form onSubmit={send} className="grid gap-2 border-t-2 border-ink/20 pt-3">
        <p className="font-heading font-bold text-xl">{t('shop.o.upiStep2')}</p>
        <FormField label={t('shop.o.upiRefLabel')} hint={t('shop.o.upiRefHint')}>
          <input className={inputClass} value={ref} onChange={(e) => { setRef(e.target.value); setErr(''); }} inputMode="numeric" autoComplete="off" placeholder="123456789012" />
        </FormField>
        {err && <p role="alert" className="text-lg font-bold text-[#B42318]">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t('shop.o.upiRefBtn')}</button>
      </form>
    </div>
  );
}
