import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addDays, istToday } from '@/lib/dates';
import { btnQuiet, Card, Field, input, downloadCsv } from '@/admin/ui';

type Row = {
  puzzle_id: string; number: number; name_mr: string; type_name: string; live_date: string | null;
  opens: number; players: number; started: number; completed: number;
  median_solve_ms: number | null; avg_solve_ms: number | null; total_play_ms: number;
  shares: number; share_whatsapp: number; share_facebook: number; share_instagram: number; share_copy: number; share_native: number;
  arrivals: number;
};

const NUMERIC: (keyof Row)[] = [
  'opens', 'players', 'started', 'completed', 'median_solve_ms', 'avg_solve_ms', 'total_play_ms', 'shares',
  'share_whatsapp', 'share_facebook', 'share_instagram', 'share_copy', 'share_native', 'arrivals',
];
const mins = (ms: number | null) => (ms == null ? '–' : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`);
const hours = (ms: number) => (ms / 3600000).toFixed(1);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

export default function AdminStats() {
  const [from, setFrom] = useState(addDays(istToday(), -29));
  const [to, setTo] = useState(istToday());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    supabase!.rpc('admin_puzzle_stats', { p_from: from || null, p_to: to || null }).then(({ data, error }) => {
      if (error) setError(error.message);
      else
        setRows(
          ((data ?? []) as Row[]).map((r) => {
            const out = { ...r } as Record<string, unknown>;
            for (const k of NUMERIC) out[k] = r[k] == null ? null : Number(r[k]);
            return out as Row;
          }),
        );
    });
  }, [from, to]);

  const tot = (k: keyof Row) => (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const played = (rows ?? []).filter((r) => r.opens > 0);

  const exportCsv = () =>
    downloadCsv(`chala-kheluya-stats-${from}-to-${to}.csv`, (rows ?? []).map((r) => ({
      number: r.number, name: r.name_mr, type: r.type_name, live_date: r.live_date ?? '', opens: r.opens, players: r.players,
      started: r.started, completed: r.completed, completion_rate: pct(r.completed, r.started),
      median_solve_minutes: r.median_solve_ms == null ? '' : (r.median_solve_ms / 60000).toFixed(1),
      total_play_hours: hours(r.total_play_ms), shares: r.shares, whatsapp: r.share_whatsapp, facebook: r.share_facebook,
      instagram: r.share_instagram, copy_link: r.share_copy, phone_share: r.share_native, arrivals_from_shares: r.arrivals,
    })));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-3xl mr-auto">Stats</h1>
        <Field label="From"><input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <button className={btnQuiet} onClick={exportCsv} disabled={!rows?.length}>Download CSV</button>
      </div>
      {error && <p className="mt-4 font-bold text-[#8A1C14]">{error}</p>}

      {rows && (
        <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {[
            ['Opens', tot('opens')],
            ['Started', tot('started')],
            ['Completed', tot('completed')],
            ['Completion', pct(tot('completed'), tot('started'))],
            ['Play time', `${hours(tot('total_play_ms'))} h`],
            ['Shares', tot('shares')],
            ['Arrived via shares', tot('arrivals')],
          ].map(([k, v]) => (
            <Card key={k as string} className="!p-3">
              <div className="text-sm text-ink/70">{k}</div>
              <div className="text-2xl font-heading font-extrabold">{typeof v === 'number' ? v.toLocaleString('en-IN') : v}</div>
            </Card>
          ))}
        </div>
      )}

      {!rows ? (
        <p className="mt-6 animate-pulse">Loading…</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-[0.95rem]">
            <thead className="bg-cream">
              <tr>
                {['No.', 'Puzzle', 'Live', 'Opens', 'Players', 'Started', 'Done', 'Done %', 'Median time', 'Play hrs', 'WhatsApp', 'Facebook', 'Instagram', 'Copy', 'Phone', 'Arrived'].map((h) => (
                  <th key={h} className="p-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.puzzle_id} className={`border-t border-line ${r.opens ? '' : 'text-ink/50'}`}>
                  <td className="p-2.5 font-bold">{r.number}</td>
                  <td className="p-2.5"><div className="font-bold">{r.name_mr}</div><div className="text-sm text-ink/60">{r.type_name}</div></td>
                  <td className="p-2.5 whitespace-nowrap">{r.live_date ?? '–'}</td>
                  <td className="p-2.5">{r.opens}</td>
                  <td className="p-2.5">{r.players}</td>
                  <td className="p-2.5">{r.started}</td>
                  <td className="p-2.5">{r.completed}</td>
                  <td className="p-2.5">{pct(r.completed, r.started)}</td>
                  <td className="p-2.5 whitespace-nowrap">{mins(r.median_solve_ms)}</td>
                  <td className="p-2.5">{hours(r.total_play_ms)}</td>
                  <td className="p-2.5">{r.share_whatsapp}</td>
                  <td className="p-2.5">{r.share_facebook}</td>
                  <td className="p-2.5">{r.share_instagram}</td>
                  <td className="p-2.5">{r.share_copy}</td>
                  <td className="p-2.5">{r.share_native}</td>
                  <td className="p-2.5">{r.arrivals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && <p className="mt-3 text-sm text-ink/60">{played.length} of {rows.length} puzzles had visitors in this period. Admin previews are not counted.</p>}
    </div>
  );
}
