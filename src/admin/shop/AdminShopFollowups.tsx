import { useEffect, useState } from 'react';
import { btnPrimary, btnQuiet, Card, input } from '@/admin/ui';
import { rpc, rs, when } from '@/admin/shop/rpc';

export type Followup = {
  kind: 'lead' | 'order'; ref: string; name: string; phone: string; city: string;
  items: { id?: string; slug?: string; name: string; qty: number }[]; total_paise: number;
  stage: 'ask' | 'checkout' | 'unpaid' | 'expired'; question: string; status: 'open' | 'contacted' | 'done';
  contacted_at: string | null; at: string; access_key: string | null;
};

const STAGE: Record<Followup['stage'], [string, string]> = {
  ask: ['Asked us to contact them', 'bg-green-soft text-[#1F5E2A]'],
  checkout: ['Filled checkout, did not order', 'bg-orange-soft'],
  unpaid: ['Ordered, payment not finished', 'bg-orange-soft'],
  expired: ['Order cancelled — never paid', 'bg-[#FDECEA] text-[#8A1C14]'],
};

/** People to help over WhatsApp: unfinished checkouts, "please contact me" requests, unpaid orders. */
export default function AdminShopFollowups() {
  const [rows, setRows] = useState<Followup[] | null>(null);
  const [err, setErr] = useState('');
  const load = () => rpc<Followup[]>('admin_shop_followups').then((d) => setRows(Array.isArray(d) ? d : [])).catch((e) => setErr(e.message.includes('admin_shop_followups') ? 'Follow up: the database step has not been applied yet.' : e.message));
  useEffect(() => { load(); }, []);
  const mark = async (f: Followup, status: 'contacted' | 'done') => {
    await rpc('admin_shop_followup_mark', { p_kind: f.kind, p_ref: f.ref, p_status: status }).catch((e) => setErr(e.message));
    load();
  };

  if (err) return <p className="font-bold text-[#8A1C14]">{err}</p>;
  if (!rows) return <p className="animate-pulse">Loading…</p>;
  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-2xl font-bold">Follow up ({rows.length})</h2>
        <p className="text-sm text-ink/65">
          People who typed their name and mobile at checkout but did not order, asked us to contact them, or ordered without finishing the payment (last 7–30 days).
          Someone drops off this list by themselves once they place an order. Send the ready message, then mark them.
        </p>
      </div>
      {rows.length === 0 ? <Card>No one to follow up right now.</Card> : rows.map((f) => <Row key={`${f.kind}-${f.ref}`} f={f} onMark={mark} />)}
    </div>
  );
}

function message(f: Followup): string {
  const site = window.location.origin;
  const hi = `नमस्कार${f.name ? ` ${f.name}` : ''}, चला खेळूया कडून बोलत आहे.`;
  const what = f.items.map((i) => `"${i.name}"${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ') || 'आमच्या दुकानातील वस्तू';
  const one = f.items.length === 1 && f.items[0].id;
  const back = one ? `${site}/checkout?buy=${f.items[0].id}&qty=${f.items[0].qty}` : f.items[0]?.slug ? `${site}/dukan/${f.items[0].slug}` : `${site}/dukan`;
  switch (f.stage) {
    case 'ask':
    {
      const q = f.question.includes('—') ? f.question.split('—').slice(1).join('—').trim() : '';
      return `${hi} तुम्ही ${what} बद्दल विचारले होते${q ? `: ${q}${/[?.!।]$/.test(q) ? '' : '.'}` : '.'} सांगा, काय मदत करू? 🙏`;
    }
    case 'checkout':
      return `${hi} तुम्ही आमच्या दुकानात ${what} निवडले होते, पण ऑर्डर पूर्ण झाली नाही. काही अडचण आली का? काही प्रश्न असल्यास इथेच विचारा. ऑर्डर पूर्ण करण्यासाठी: ${back}`;
    case 'unpaid':
      return `${hi} तुमची ऑर्डर ${f.ref} (${rs(f.total_paise)}) तयार आहे, पण पेमेंट अजून झालेले नाही. काही अडचण आली का? इथून पैसे भरता येतील: ${site}/order/${f.ref}?k=${f.access_key}`;
    case 'expired':
      return `${hi} तुमची ऑर्डर ${f.ref} चे पेमेंट पूर्ण न झाल्याने ती रद्द झाली. अजून हवी असल्यास पुन्हा ऑर्डर करता येईल: ${site}/dukan — किंवा इथेच कळवा, आम्ही मदत करू.`;
  }
}

function Row({ f, onMark }: { f: Followup; onMark: (f: Followup, s: 'contacted' | 'done') => void }) {
  const [text, setText] = useState(() => message(f));
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* select-and-copy by hand */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const go = async (s: 'contacted' | 'done') => { setBusy(true); await onMark(f, s); setBusy(false); };
  const [label, tone] = STAGE[f.stage];
  return (
    <Card className={`grid gap-2 ${f.stage === 'ask' && f.status === 'open' ? '!border-green' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-lg">{f.name || 'No name'}</b>
        <a className="underline tabular-nums" href={`tel:${f.phone}`}>{f.phone}</a>
        {f.city && <span className="text-ink/60">{f.city}</span>}
        <span className="ml-auto text-sm text-ink/55">{when(f.at)}</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${tone}`}>{label}</span>
        {f.kind === 'order' && <span className="text-sm font-bold">{f.ref}</span>}
        {f.status === 'contacted' && <span className="rounded-full px-2.5 py-0.5 text-sm font-bold bg-[#E3EEFB] text-[#0C447C]">Contacted {f.contacted_at ? when(f.contacted_at) : ''}</span>}
      </div>
      <p className="text-base">{f.items.map((i) => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ') || '—'}{f.total_paise ? <b> · {rs(f.total_paise)}</b> : null}</p>
      {f.stage === 'ask' && f.question.includes('—') && <p className="rounded-xl bg-white border border-line p-2">“{f.question.split('—').slice(1).join('—').trim()}”</p>}
      <textarea className={`${input} min-h-[8rem] !text-base leading-relaxed`} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className={btnPrimary} onClick={copy}>{copied ? 'Copied ✓' : 'Copy message'}</button>
        <a className={btnQuiet} href={`https://wa.me/91${f.phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={() => f.status === 'open' && go('contacted')}>Open in WhatsApp</a>
        {f.status === 'open' && <button type="button" className={btnQuiet} disabled={busy} onClick={() => go('contacted')}>Mark contacted</button>}
        <button type="button" className={btnQuiet} disabled={busy} onClick={() => go('done')}>Done — remove</button>
      </div>
    </Card>
  );
}
