import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import FestivalGreeting, { festivalActive, festivalFrom } from '@/components/FestivalGreeting';
import { addDays, istToday } from '@/lib/dates';

const SWITCHES: { key: string; label: string; when: string }[] = [
  { key: 'show_play_counts', label: 'Show "solved by N people" on puzzle cards', when: 'After a few weeks of real counts' },
  { key: 'social_links', label: 'Show Facebook / Instagram links in the footer', when: 'When the accounts are set up' },
  { key: 'whatsapp_community', label: 'Show "Join our WhatsApp community" (home page, end of every puzzle, footer)', when: 'When the community invite link is ready' },
  { key: 'whatsapp_channel_link', label: 'Show the WhatsApp Channel link', when: 'When the Channel is public' },
  { key: 'ask_for_next_puzzle', label: 'Ask players to message for the next puzzle', when: 'After studying usage' },
  { key: 'preorders', label: 'Allow book pre-orders', when: 'When Book Vol. 1 is announced' },
  { key: 'shop_selling', label: 'Shop: selling switched on', when: 'Razorpay approved, first book in hand' },
  { key: 'cash_on_delivery', label: 'Shop: cash on delivery', when: 'If UPI drop-off is high' },
  { key: 'english_labels', label: 'Offer the English language switch', when: 'On by default' },
];
const LINKS: { key: string; label: string; hint: string }[] = [
  { key: 'link_facebook', label: 'Facebook page link', hint: 'https://facebook.com/…' },
  { key: 'link_instagram', label: 'Instagram account link', hint: 'https://instagram.com/…' },
  { key: 'link_whatsapp_community', label: 'WhatsApp Community invite link', hint: 'https://chat.whatsapp.com/…' },
  { key: 'link_whatsapp_channel', label: 'WhatsApp Channel link', hint: 'https://whatsapp.com/channel/…' },
];

const FEST_KEYS = ['festival_on', 'festival_text', 'festival_from', 'festival_to', 'festival_sound'];

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    supabase!.from('site_settings').select('key,value').then(({ data }) => {
      const v: Record<string, unknown> = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      if (typeof v.festival_text !== 'string') v.festival_text = 'दिवाळीच्या हार्दिक शुभेच्छा!';
      if (typeof v.festival_from !== 'string' || !v.festival_from) v.festival_from = istToday();
      if (typeof v.festival_to !== 'string' || !v.festival_to) v.festival_to = addDays(istToday(), 4);
      if (typeof v.festival_sound !== 'boolean') v.festival_sound = true;
      setValues(v);
    });
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg('');
    const rows = [...SWITCHES.map((s) => s.key), ...LINKS.map((l) => l.key), ...FEST_KEYS].map((key) => ({
      key,
      value: values[key] ?? (key.startsWith('link_') || ['festival_text', 'festival_from', 'festival_to'].includes(key) ? '' : false),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase!.from('site_settings').upsert(rows, { onConflict: 'key' });
    setBusy(false);
    setMsg(error ? error.message : 'Saved. Visitors see the change on their next page load.');
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl">Settings</h1>
      <Card className="mt-5">
        <h2 className="text-xl mb-3">Switches</h2>
        <ul className="grid gap-3">
          {SWITCHES.map((s) => (
            <li key={s.key}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-6 w-6 shrink-0"
                  checked={values[s.key] === true}
                  onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.checked }))}
                />
                <span>
                  <span className="font-bold">{s.label}</span>
                  <span className="block text-sm text-ink/60">Turn on: {s.when}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-5">
        <h2 className="text-xl mb-3">Links</h2>
        <div className="grid gap-4">
          {LINKS.map((l) => (
            <Field key={l.key} label={l.label}>
              <input
                className={input}
                placeholder={l.hint}
                value={typeof values[l.key] === 'string' ? (values[l.key] as string) : ''}
                onChange={(e) => setValues((v) => ({ ...v, [l.key]: e.target.value.trim() }))}
              />
            </Field>
          ))}
        </div>
      </Card>
      <Card className="mt-5">
        <h2 className="text-xl mb-1">Festival greeting</h2>
        <p className="text-sm text-ink/60 mb-3">
          A short greeting with a diya and fireworks, shown each time someone opens a puzzle, between the two dates (India time). It switches itself off after the end date.
        </p>
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" className="h-6 w-6" checked={values.festival_on === true} onChange={(e) => setValues((v) => ({ ...v, festival_on: e.target.checked }))} />
          Show the festival greeting
        </label>
        <div className="mt-4 grid gap-4">
          <Field label="Message">
            <input className={input} value={String(values.festival_text ?? '')} onChange={(e) => setValues((v) => ({ ...v, festival_text: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input type="date" className={input} value={String(values.festival_from ?? '')} onChange={(e) => setValues((v) => ({ ...v, festival_from: e.target.value }))} />
            </Field>
            <Field label="To (last day)">
              <input type="date" className={input} value={String(values.festival_to ?? '')} onChange={(e) => setValues((v) => ({ ...v, festival_to: e.target.value }))} />
            </Field>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-6 w-6" checked={values.festival_sound !== false} onChange={(e) => setValues((v) => ({ ...v, festival_sound: e.target.checked }))} />
            <span>Short firework sound (stays silent for players who turned puzzle sounds off)</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnQuiet} onClick={() => setPreview(true)} disabled={!String(values.festival_text ?? '').trim()}>Preview</button>
            <span className="text-sm font-bold">
              {festivalActive(festivalFrom(values)) ? 'Showing to players now' : values.festival_on === true ? 'Switched on, but not within its dates' : 'Off'}
            </span>
          </div>
        </div>
        {preview && <FestivalGreeting text={String(values.festival_text ?? '')} sound={values.festival_sound !== false} onDone={() => setPreview(false)} />}
      </Card>
      <div className="mt-5 flex items-center gap-3">
        <button className={btnPrimary} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className="font-bold">{msg}</span>}
      </div>
    </div>
  );
}
