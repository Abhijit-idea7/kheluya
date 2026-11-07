import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublicSettings } from '@/lib/api';
import { communityLinkFrom } from '@/lib/community';
import { btnDanger, btnQuiet, Card, downloadCsv } from '@/admin/ui';

type Sub = { id: string; name: string; phone: string; city: string; interest: string; source_page: string; copies: number | null; note: string | null; created_at: string };
type Msg = { id: string; name: string; phone: string; message: string; created_at: string };
type Tab = 'book' | 'list' | 'msgs';

const SEEN_KEY = 'ck-admin-people-seen';
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const ago = (iso?: string) => {
  if (!iso) return 'never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};
/** wa.me needs the country code; Indian 10-digit numbers get 91. */
const waNumber = (phone: string) => {
  const d = phone.replace(/[^0-9]/g, '');
  return d.length === 10 ? `91${d}` : d;
};
const waLink = (phone: string, text: string) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
const isBook = (s: Sub) => s.source_page === '/dukan';

/** The same number signed up twice counts once: keep the newest row, add up copies. */
function uniqueByPhone(rows: Sub[]): (Sub & { times: number })[] {
  const by = new Map<string, Sub & { times: number }>();
  for (const s of rows) {
    const k = s.phone.replace(/[^0-9]/g, '').slice(-10);
    const prev = by.get(k);
    if (!prev) by.set(k, { ...s, times: 1 });
    else {
      prev.times += 1;
      prev.copies = Math.max(prev.copies ?? 0, s.copies ?? 0) || null;
      if (!prev.note && s.note) prev.note = s.note;
    }
  }
  return [...by.values()];
}

export default function AdminPeople() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [community, setCommunity] = useState('');
  const [tab, setTab] = useState<Tab>('book');
  const [seen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; }
  });

  const load = () => {
    supabase!.from('subscribers').select('*').order('created_at', { ascending: false }).then(({ data }) => setSubs((data ?? []) as Sub[]));
    supabase!.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => setMsgs((data ?? []) as Msg[]));
  };
  useEffect(() => {
    load();
    getPublicSettings().then((s) => setCommunity(communityLinkFrom(s)));
    // Remember this visit, so next time "new" marks what arrived since.
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* ignore */ }
  }, []);

  const book = useMemo(() => uniqueByPhone((subs ?? []).filter(isBook)), [subs]);
  const list = useMemo(() => uniqueByPhone((subs ?? []).filter((s) => !isBook(s))), [subs]);
  const copies = book.reduce((t, s) => t + (s.copies ?? 1), 0);
  const isNew = (iso: string) => !!seen && iso > seen;
  const newCount = (rows: { created_at: string }[]) => rows.filter((r) => isNew(r.created_at)).length;

  const removeSub = async (s: Sub) => {
    if (!window.confirm(`Remove ${s.phone} from the list? This cannot be undone.`)) return;
    const q = supabase!.from('subscribers').delete().eq('phone', s.phone);
    await (isBook(s) ? q.eq('source_page', '/dukan') : q.neq('source_page', '/dukan'));
    load();
  };
  const removeMsg = async (m: Msg) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    await supabase!.from('contact_messages').delete().eq('id', m.id);
    load();
  };

  const tile = (k: Tab, label: string, value: string, sub: string, fresh: number) => (
    <button
      key={k}
      onClick={() => setTab(k)}
      className={`text-left rounded-2xl border-2 border-ink px-4 py-3 ${tab === k ? 'bg-orange-soft' : 'bg-paper hover:bg-cream'}`}
    >
      <div className="text-sm font-bold text-ink/65 flex items-center gap-2">
        {label}
        {fresh > 0 && <span className="rounded-full bg-green text-white text-xs px-2 py-0.5">{fresh} new</span>}
      </div>
      <div className="text-3xl font-heading font-extrabold tabular-nums">{value}</div>
      <div className="text-sm text-ink/60">{sub}</div>
    </button>
  );

  const loading = !subs || !msgs;
  const thankText = (s: Sub) =>
    `नमस्कार${s.name ? ' ' + s.name : ''}! चला खेळूया च्या मोठ्या अक्षरातील शब्दकोडी पुस्तकात रस दाखवल्याबद्दल धन्यवाद. पुस्तक तयार होताच आम्ही तुम्हाला इथेच कळवू. 🙏`;
  const inviteText = (s: Sub) =>
    `नमस्कार${s.name ? ' ' + s.name : ''}! चला खेळूया चे रोजचे कोडे आता आमच्या WhatsApp community मध्ये मिळते. इथे Join करा: ${community}`;

  return (
    <div>
      <h1 className="text-3xl">People</h1>
      <p className="mt-1 text-sm text-ink/55">Everyone who left a number or wrote to us. Tap a box to see the list. “New” = since your last visit to this page.</p>

      {loading ? (
        <p className="mt-6 animate-pulse">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
            {tile('book', 'Want the book', String(book.length), `${copies} copies · last ${ago(book[0]?.created_at)}`, newCount(book))}
            {tile('list', 'Old updates list', String(list.length), `last sign-up ${ago(list[0]?.created_at)}`, newCount(list))}
            {tile('msgs', 'Messages', String(msgs.length), `last ${ago(msgs[0]?.created_at)}`, newCount(msgs))}
          </div>

          {tab === 'book' && (
            <section className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl mr-auto">Want the book</h2>
                <button className={btnQuiet} disabled={!book.length} onClick={() => downloadCsv('chala-kheluya-book-interest.csv', book.map((s) => ({ when: when(s.created_at), name: s.name, whatsapp: s.phone, city: s.city, copies: s.copies ?? '', note: s.note ?? '' })))}>
                  Download CSV
                </button>
              </div>
              <p className="mt-1 text-sm text-ink/60">From the form on the shop page (/dukan). These are your first buyers — message them when the book is ready. The “Say thanks” button opens WhatsApp with a ready message.</p>
              {book.length === 0 ? (
                <Card className="mt-4">No one yet. The form is on the shop page. Shop visits are counted under Stats → Shop.</Card>
              ) : (
                <div className="mt-4 grid gap-3">
                  {book.map((s) => (
                    <Card key={s.id} className={isNew(s.created_at) ? '!border-green' : ''}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-xl font-bold">{s.name || 'No name'}</span>
                        <span className="font-bold tabular-nums">{s.phone}</span>
                        {s.city && <span className="text-ink/70">{s.city}</span>}
                        <span className="rounded-full bg-orange-soft border border-ink px-2 text-sm font-bold">{s.copies ? `${s.copies === 5 ? '5+' : s.copies} ${s.copies === 1 ? 'copy' : 'copies'}` : 'copies not said'}</span>
                        {isNew(s.created_at) && <span className="rounded-full bg-green text-white text-xs px-2 py-0.5">new</span>}
                        <span className="text-sm text-ink/55 ml-auto">{when(s.created_at)}{s.times > 1 ? ` · signed up ${s.times}×` : ''}</span>
                      </div>
                      {s.note && <p className="mt-2 rounded-xl bg-white border border-line p-3 whitespace-pre-line">“{s.note}”</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a className={btnQuiet} href={waLink(s.phone, thankText(s))} target="_blank" rel="noreferrer">Say thanks on WhatsApp</a>
                        <button className={`${btnDanger} ml-auto`} onClick={() => removeSub(s)}>Remove</button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'list' && (
            <section className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl mr-auto">Old updates list</h2>
                <button className={btnQuiet} disabled={!list.length} onClick={() => downloadCsv('chala-kheluya-updates-list.csv', list.map((s) => ({ when: when(s.created_at), name: s.name, whatsapp: s.phone, city: s.city, wants: s.interest, from_page: s.source_page })))}>
                  Download CSV
                </button>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                People who asked for puzzles on WhatsApp before the community existed (form at /suchana). Few new sign-ups are expected now — the community does this job.
                {community ? ' Use “Invite to community” to move each of them in.' : ' Switch on the WhatsApp community in Settings to get an “Invite” button here.'}
              </p>
              {list.length === 0 ? (
                <Card className="mt-4">No one on this list.</Card>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
                  <table className="w-full text-left">
                    <thead className="bg-cream">
                      <tr>{['When', 'Name', 'WhatsApp', 'City', 'Wants', ''].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {list.map((s) => (
                        <tr key={s.id} className={`border-t border-line ${isNew(s.created_at) ? 'bg-[#E9F6EC]' : ''}`}>
                          <td className="p-3 whitespace-nowrap text-sm">{when(s.created_at)}</td>
                          <td className="p-3">{s.name || '–'}</td>
                          <td className="p-3 font-bold whitespace-nowrap">{s.phone}</td>
                          <td className="p-3">{s.city || '–'}</td>
                          <td className="p-3">{s.interest === 'both' ? 'puzzles + book' : s.interest}</td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              {community && <a className={`${btnQuiet} !py-1 whitespace-nowrap`} href={waLink(s.phone, inviteText(s))} target="_blank" rel="noreferrer">Invite to community</a>}
                              <button className={`${btnDanger} !py-1`} onClick={() => removeSub(s)}>Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'msgs' && (
            <section className="mt-6">
              <h2 className="text-2xl">Messages</h2>
              <p className="mt-1 text-sm text-ink/60">From the contact form (/sampark). Most people now talk to you in the WhatsApp community instead; book questions arrive as notes under “Want the book”.</p>
              {msgs.length === 0 ? (
                <Card className="mt-4">No messages yet.</Card>
              ) : (
                <div className="mt-4 grid gap-3">
                  {msgs.map((m) => (
                    <Card key={m.id} className={isNew(m.created_at) ? '!border-green' : ''}>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-ink/70">
                        <span>{when(m.created_at)}</span>
                        <span className="font-bold text-ink">{m.name || 'No name'}</span>
                        {m.phone && <span>{m.phone}</span>}
                        {isNew(m.created_at) && <span className="rounded-full bg-green text-white text-xs px-2 py-0.5">new</span>}
                        <span className="ml-auto flex gap-2">
                          {m.phone && <a className={`${btnQuiet} !py-1`} href={waLink(m.phone, `नमस्कार${m.name ? ' ' + m.name : ''}! तुमच्या संदेशाबद्दल धन्यवाद. `)} target="_blank" rel="noreferrer">Reply on WhatsApp</a>}
                          <button className={`${btnDanger} !py-1`} onClick={() => removeMsg(m)}>Delete</button>
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line">{m.message}</p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
