import { useState } from 'react';
import { btnQuiet, Card, input } from '@/admin/ui';

/**
 * A message box for sending WhatsApp messages one person at a time from a list:
 * pick a ready message (or write your own), then press "Send" on each person.
 * {name}, {product} and {link} are filled in for each person. "Sent ✓" is remembered on this device.
 */
export type Template = { id: string; label: string; text: string };
export type Person = { id: string; phone: string; name?: string; product?: string; link?: string };

const SENT_KEY = 'ck-admin-wa-sent';
const readSent = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || '{}'); } catch { return {}; }
};

export const waNumber = (phone: string) => {
  const d = phone.replace(/[^0-9]/g, '');
  return d.length === 10 ? `91${d}` : d;
};

export function useWhatsAppComposer(templates: Template[], listKey: string) {
  const [tid, setTid] = useState(templates[0]?.id ?? 'own');
  const [text, setText] = useState(templates[0]?.text ?? 'नमस्कार{name}! ');
  const [sent, setSent] = useState<Record<string, string>>(readSent);
  const [copied, setCopied] = useState('');

  const fillFor = (p: Person) =>
    text
      .replace(/\{name\}/g, p.name ? ` ${p.name}` : '')
      .replace(/\{product\}/g, p.product ?? '')
      .replace(/\{link\}/g, p.link ?? '');
  const key = (p: Person) => `${listKey}:${tid}:${p.id}`;
  const mark = (p: Person) => {
    const next = { ...readSent(), [key(p)]: new Date().toISOString() };
    try { localStorage.setItem(SENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setSent(next);
  };
  const sentAt = (p: Person) => sent[key(p)];
  const count = (people: Person[]) => people.filter((p) => sent[key(p)]).length;

  const box = (people: Person[]) => (
    <Card className="grid gap-2">
      <h3 className="font-bold text-lg">Send a WhatsApp message</h3>
      <p className="text-sm text-ink/60">
        Pick a message, check it, then press <b>Send</b> next to each person — WhatsApp opens with the message ready.
        <code className="mx-1">{'{name}'}</code> becomes their name.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...templates, { id: 'own', label: 'Write my own', text: 'नमस्कार{name}! ' }].map((t) => (
          <button key={t.id} type="button" onClick={() => { setTid(t.id); setText(t.text); }} className={`${btnQuiet} !py-1 !px-3 !text-sm ${tid === t.id ? '!bg-orange-soft' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
      <textarea className={`${input} min-h-[7rem] !text-base leading-relaxed`} value={text} onChange={(e) => setText(e.target.value)} />
      <p className="text-sm font-bold text-ink/70">Sent this message to {count(people)} of {people.length}</p>
    </Card>
  );

  const buttons = (p: Person) => {
    const msg = fillFor(p);
    const at = sentAt(p);
    return (
      <>
        <a
          className={`${btnQuiet} !py-1 whitespace-nowrap ${at ? '' : '!bg-green !text-white !border-ink'}`}
          href={`https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => mark(p)}
        >
          {at ? `Sent ✓ ${new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — again` : 'Send on WhatsApp'}
        </a>
        <button
          type="button"
          className={`${btnQuiet} !py-1`}
          onClick={async () => {
            try { await navigator.clipboard.writeText(msg); } catch { /* ignore */ }
            setCopied(p.id);
            setTimeout(() => setCopied(''), 2000);
          }}
        >
          {copied === p.id ? 'Copied ✓' : 'Copy'}
        </button>
      </>
    );
  };

  return { box, buttons };
}
