import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { istToday } from '@/lib/dates';
import type { Puzzle } from '@/lib/types';
import { Badge, btnPrimary, btnQuiet, Card } from '@/admin/ui';

export function statusOf(p: Pick<Puzzle, 'status' | 'live_date'>): { label: string; tone: 'grey' | 'green' | 'orange' | 'navy' } {
  if (p.status === 'archived') return { label: 'Archived', tone: 'grey' };
  if (p.status === 'draft') return { label: 'Draft', tone: 'grey' };
  if (!p.live_date) return { label: 'Live (no date)', tone: 'orange' };
  const today = istToday();
  if (p.live_date > today) return { label: 'Scheduled', tone: 'orange' };
  if (p.live_date === today) return { label: 'Live today', tone: 'navy' };
  return { label: 'Live', tone: 'green' };
}

export default function AdminPuzzles() {
  const [rows, setRows] = useState<Puzzle[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'draft'>('all');

  useEffect(() => {
    supabase!
      .from('puzzles')
      .select('*, type:puzzle_types(name_mr,name_en,tile)')
      .order('live_date', { ascending: false, nullsFirst: true })
      .order('number', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as unknown as Puzzle[]);
      });
  }, []);

  const today = istToday();
  const shown = (rows ?? []).filter((p) =>
    filter === 'all' ? true : filter === 'draft' ? p.status === 'draft' : p.status === 'live' && (p.live_date ?? '') >= today,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Puzzles</h1>
        <Link to="/admin/puzzles/new" className={`${btnPrimary} ml-auto`}>+ New puzzle</Link>
      </div>
      <div className="mt-4 flex gap-2">
        {(['all', 'upcoming', 'draft'] as const).map((f) => (
          <button key={f} className={`${btnQuiet} ${filter === f ? '!bg-orange-soft' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'upcoming' ? 'Today & scheduled' : 'Drafts'}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 font-bold text-[#8A1C14]">{error}</p>}
      {!rows ? (
        <p className="mt-6 animate-pulse">Loading…</p>
      ) : shown.length === 0 ? (
        <Card className="mt-6">No puzzles here yet. Press <b>+ New puzzle</b> to upload the first one.</Card>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left">
            <thead className="bg-cream">
              <tr>
                <th className="p-3">No.</th>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Live date</th>
                <th className="p-3">Status</th>
                <th className="p-3">File</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const st = statusOf(p);
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="p-3 font-bold">{p.number}</td>
                    <td className="p-3">
                      <div className="font-bold">{p.name_mr}</div>
                      <div className="text-sm text-ink/60">{p.name_en}</div>
                    </td>
                    <td className="p-3">{p.type?.name_mr}</td>
                    <td className="p-3 whitespace-nowrap">{p.live_date ?? '—'}</td>
                    <td className="p-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="p-3">{p.file_version ? `v${p.file_version}` : <Badge tone="orange">No file</Badge>}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Link to={`/admin/puzzles/${p.id}`} className={btnQuiet}>Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
