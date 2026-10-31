import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { btnDanger, btnQuiet, Card, downloadCsv } from '@/admin/ui';

type Sub = { id: string; name: string; phone: string; city: string; interest: string; source_page: string; created_at: string };
type Msg = { id: string; name: string; phone: string; message: string; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export default function AdminPeople() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);

  const load = () => {
    supabase!.from('subscribers').select('*').order('created_at', { ascending: false }).then(({ data }) => setSubs((data ?? []) as Sub[]));
    supabase!.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => setMsgs((data ?? []) as Msg[]));
  };
  useEffect(load, []);

  const removeSub = async (s: Sub) => {
    if (!window.confirm(`Remove ${s.phone} from the list?`)) return;
    await supabase!.from('subscribers').delete().eq('id', s.id);
    load();
  };
  const removeMsg = async (m: Msg) => {
    if (!window.confirm('Delete this message?')) return;
    await supabase!.from('contact_messages').delete().eq('id', m.id);
    load();
  };

  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">Subscribers</h1>
          <span className="text-ink/70">{subs?.length ?? '…'} numbers</span>
          <button
            className={`${btnQuiet} ml-auto`}
            disabled={!subs?.length}
            onClick={() => downloadCsv('chala-kheluya-subscribers.csv', (subs ?? []).map(({ id: _id, ...r }) => ({ ...r, created_at: when(r.created_at) })))}
          >
            Download CSV
          </button>
        </div>
        {!subs ? (
          <p className="mt-4 animate-pulse">Loading…</p>
        ) : subs.length === 0 ? (
          <Card className="mt-4">Nobody has left a number yet. The form is at /suchana.</Card>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
            <table className="w-full text-left">
              <thead className="bg-cream">
                <tr>{['When', 'Name', 'WhatsApp', 'City', 'Wants', 'From page', ''].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="p-3 whitespace-nowrap">{when(s.created_at)}</td>
                    <td className="p-3">{s.name || '–'}</td>
                    <td className="p-3 font-bold">{s.phone}</td>
                    <td className="p-3">{s.city || '–'}</td>
                    <td className="p-3">{s.interest}</td>
                    <td className="p-3 text-sm">{s.source_page}</td>
                    <td className="p-3"><button className={btnDanger} onClick={() => removeSub(s)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl">Messages</h2>
        {!msgs ? (
          <p className="mt-4 animate-pulse">Loading…</p>
        ) : msgs.length === 0 ? (
          <Card className="mt-4">No messages yet. The contact form is at /sampark.</Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {msgs.map((m) => (
              <Card key={m.id}>
                <div className="flex flex-wrap gap-3 text-sm text-ink/70">
                  <span>{when(m.created_at)}</span>
                  <span className="font-bold text-ink">{m.name || 'No name'}</span>
                  {m.phone && <span>{m.phone}</span>}
                  <button className={`${btnDanger} ml-auto !py-1`} onClick={() => removeMsg(m)}>Delete</button>
                </div>
                <p className="mt-2 whitespace-pre-line">{m.message}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
