import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useBusiness, type Business } from '@/lib/business';

const L = {
  mr: {
    title: 'व्यवसायाची माहिती', name: 'व्यवसायाचे नाव', address: 'पत्ता', gstin: 'GSTIN', phone: 'फोन / WhatsApp', email: 'ईमेल', hours: 'वेळ',
    grievance: 'तक्रार अधिकारी', grievanceNote: 'तक्रार मिळाल्याचे ४८ तासांत कळवतो आणि एका महिन्याच्या आत निवारण करतो.',
    site: 'संकेतस्थळ', whatsapp: 'WhatsApp वर बोला', call: 'फोन करा',
  },
  en: {
    title: 'Business details', name: 'Business name', address: 'Address', gstin: 'GSTIN', phone: 'Phone / WhatsApp', email: 'Email', hours: 'Hours',
    grievance: 'Grievance officer', grievanceNote: 'We acknowledge a complaint within 48 hours and resolve it within one month.',
    site: 'Website', whatsapp: 'Chat on WhatsApp', call: 'Call',
  },
};

/**
 * The statutory block: who runs the site and how to reach them (Consumer Protection (E-Commerce) Rules, 2020).
 * Values come from Admin → Shop → Shop settings. `compact` leaves out the action buttons.
 */
export default function BusinessDetails({ compact = false, showGrievance = true }: { compact?: boolean; showGrievance?: boolean }) {
  const b = useBusiness();
  const { i18n } = useTranslation();
  const l = L[i18n.language === 'en' ? 'en' : 'mr'];
  if (!b) return <div className="sticker h-40 animate-pulse" aria-hidden="true" />;
  return (
    <section className="sticker p-4 sm:p-5 grid gap-3 text-lg leading-snug" aria-label={l.title}>
      <h2 className="text-heading-sm">{l.title}</h2>
      <dl className="grid gap-2 sm:grid-cols-[11rem_1fr] sm:gap-x-4">
        <Row k={l.name} v={b.name} />
        {b.address && <Row k={l.address} v={<span className="whitespace-pre-line">{b.address}</span>} />}
        {b.gstin && <Row k={l.gstin} v={<span className="tabular-nums">{b.gstin}</span>} />}
        {b.phone && <Row k={l.phone} v={<a className="underline" href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`}><span className="whitespace-nowrap">{b.phone}</span></a>} />}
        {b.email && <Row k={l.email} v={<a className="underline break-all" href={`mailto:${b.email}`}>{b.email}</a>} />}
        {b.hours && <Row k={l.hours} v={b.hours} />}
        <Row k={l.site} v="chalakheluya.com · kheluya.in" />
        {showGrievance && (b.grievance || b.email) && (
          <Row
            k={l.grievance}
            v={
              <>
                {b.grievance && <b>{b.grievance}</b>}
                {b.grievance && <br />}
                {b.email}{b.email && b.phone ? ' · ' : ''}{b.phone && <span className="whitespace-nowrap">{b.phone}</span>}
                <span className="block text-base text-ink/70">{l.grievanceNote}</span>
              </>
            }
          />
        )}
      </dl>
      {!compact && <Actions b={b} l={l} />}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="font-bold text-ink/70 sm:text-ink">{k}</dt>
      <dd className="-mt-1.5 sm:mt-0 mb-1 sm:mb-0">{v}</dd>
    </>
  );
}

function Actions({ b, l }: { b: Business; l: (typeof L)['mr'] }) {
  if (!b.whatsapp && !b.phone && !b.email) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {b.whatsapp && (
        <a href={b.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
          <MessageCircle size={22} strokeWidth={2.6} aria-hidden="true" />{l.whatsapp}
        </a>
      )}
      {b.phone && (
        <a href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-quiet">
          <Phone size={22} strokeWidth={2.6} aria-hidden="true" />{l.call}
        </a>
      )}
      {b.email && (
        <a href={`mailto:${b.email}`} className="btn btn-quiet">
          <Mail size={22} strokeWidth={2.6} aria-hidden="true" />{l.email}
        </a>
      )}
    </div>
  );
}
