import { Fragment, useEffect, useMemo, useState } from 'react';
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

type Day = {
  date: string; opens: number; players: number; started: number; completed: number;
  median_ms: number | null; play_ms: number; shares: number; wa: number; fb: number; ig: number; copy: number; phone: number; arrivals: number;
};

const n = (v: number) => v.toLocaleString('en-IN');
const playMin = (ms: number) => (ms > 0 && ms < 600000 ? (ms / 60000).toFixed(1) : n(Math.round(ms / 60000)));
const mmss = (ms: number | null) => {
  if (ms == null) return '–';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const istDate = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10);
const prettyDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function ShareSplit({ wa, fb, ig, copy, phone }: { wa: number; fb: number; ig: number; copy: number; phone: number }) {
  const parts = [
    ['WhatsApp', wa],
    ['Facebook', fb],
    ['Instagram', ig],
    ['Copy', copy],
    ['Phone', phone],
  ].filter(([, v]) => (v as number) > 0);
  if (!parts.length) return null;
  return <div className="text-xs text-ink/65 leading-snug">{parts.map(([k, v]) => `${k} ${v}`).join(' · ')}</div>;
}

export default function AdminStats() {
  const [from, setFrom] = useState(addDays(istToday(), -29));
  const [to, setTo] = useState(istToday());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'puzzle' | 'type'>('puzzle');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    supabase!.rpc('admin_puzzle_stats', { p_from: from || null, p_to: to || null }).then(({ data, error }) => {
      if (error) return setError(error.message);
      setRows(
        ((data ?? []) as Row[]).map((r) => {
          const out = { ...r } as Record<string, unknown>;
          for (const k of NUMERIC) out[k] = r[k] == null ? null : Number(r[k]);
          return out as Row;
        }),
      );
    });
  }, [from, to]);

  const shown = useMemo(() => (rows ?? []).filter((r) => !typeFilter || r.type_name === typeFilter), [rows, typeFilter]);
  const sum = (list: Row[], k: keyof Row) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  const byType = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows ?? []) m.set(r.type_name, [...(m.get(r.type_name) ?? []), r]);
    return [...m.entries()].map(([type, list]) => ({ type, list }));
  }, [rows]);

  const exportCsv = () =>
    downloadCsv(`chala-kheluya-stats-${from}-to-${to}.csv`, shown.map((r) => ({
      number: r.number, puzzle: r.name_mr, type: r.type_name, released: r.live_date ?? '', opens: r.opens, players: r.players,
      started: r.started, completed: r.completed, completion_rate: pct(r.completed, r.started),
      median_solve_minutes: r.median_solve_ms == null ? '' : (r.median_solve_ms / 60000).toFixed(1),
      play_minutes: Math.round(r.total_play_ms / 60000), shares: r.shares, whatsapp: r.share_whatsapp, facebook: r.share_facebook,
      instagram: r.share_instagram, copy_link: r.share_copy, phone_share: r.share_native, arrivals_from_shares: r.arrivals,
    })));

  const totalsOf = shown;
  const th = 'p-2.5 font-bold text-sm whitespace-nowrap';
  const td = 'p-2.5 align-top';

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-3xl mr-auto">Stats</h1>
        <Field label="From"><input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <button className={btnQuiet} onClick={exportCsv} disabled={!shown.length}>Download CSV</button>
      </div>
      {error && <p className="mt-4 font-bold text-[#8A1C14]">{error}</p>}

      {rows && (
        <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {[
            ['Opens', n(sum(totalsOf, 'opens'))],
            ['Started', n(sum(totalsOf, 'started'))],
            ['Completed', n(sum(totalsOf, 'completed'))],
            ['Completion', pct(sum(totalsOf, 'completed'), sum(totalsOf, 'started'))],
            ['Play time', `${playMin(sum(totalsOf, 'total_play_ms'))} min`],
            ['Shares', n(sum(totalsOf, 'shares'))],
            ['Arrived via shares', n(sum(totalsOf, 'arrivals'))],
          ].map(([k, v]) => (
            <Card key={k} className="!p-3">
              <div className="text-sm text-ink/70">{k}</div>
              <div className="text-2xl font-heading font-extrabold">{v}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button className={`${btnQuiet} ${view === 'puzzle' ? '!bg-orange-soft' : ''}`} onClick={() => setView('puzzle')}>By puzzle</button>
        <button className={`${btnQuiet} ${view === 'type' ? '!bg-orange-soft' : ''}`} onClick={() => { setView('type'); setTypeFilter(''); }}>By puzzle type</button>
        {typeFilter && view === 'puzzle' && (
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-navy text-white px-3 py-1 text-sm font-bold">
            Type: {typeFilter}
            <button onClick={() => setTypeFilter('')} aria-label="Show all types" className="font-extrabold">✕</button>
          </span>
        )}
        <span className="ml-auto text-sm text-ink/60">Admin previews are not counted. Times are India time.</span>
      </div>

      {!rows ? (
        <p className="mt-6 animate-pulse">Loading…</p>
      ) : view === 'type' ? (
        <table className="mt-3 w-full text-left rounded-2xl border-2 border-ink bg-paper border-separate border-spacing-0 overflow-hidden">
          <thead className="bg-cream">
            <tr>
              {['Puzzle type', 'Puzzles', 'Opens', 'Players', 'Started', 'Completed', 'Done %', 'Play time', 'Shares', 'Arrived'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byType.map(({ type, list }) => (
              <tr key={type} className="cursor-pointer hover:bg-orange-soft/50" onClick={() => { setTypeFilter(type); setView('puzzle'); }}>
                <td className={`${td} border-t border-line font-bold text-lg`}>{type} <span className="text-sm font-normal text-orange-deep">→ see puzzles</span></td>
                <td className={`${td} border-t border-line`}>{list.length}</td>
                <td className={`${td} border-t border-line`}>{n(sum(list, 'opens'))}</td>
                <td className={`${td} border-t border-line`}>{n(sum(list, 'players'))}</td>
                <td className={`${td} border-t border-line`}>{n(sum(list, 'started'))}</td>
                <td className={`${td} border-t border-line`}>{n(sum(list, 'completed'))}</td>
                <td className={`${td} border-t border-line`}>{pct(sum(list, 'completed'), sum(list, 'started'))}</td>
                <td className={`${td} border-t border-line whitespace-nowrap`}>{playMin(sum(list, 'total_play_ms'))} min</td>
                <td className={`${td} border-t border-line`}>
                  {n(sum(list, 'shares'))}
                  <ShareSplit wa={sum(list, 'share_whatsapp')} fb={sum(list, 'share_facebook')} ig={sum(list, 'share_instagram')} copy={sum(list, 'share_copy')} phone={sum(list, 'share_native')} />
                </td>
                <td className={`${td} border-t border-line`}>{n(sum(list, 'arrivals'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : shown.length === 0 ? (
        <Card className="mt-3">No puzzles in this view.</Card>
      ) : (
        <table className="mt-3 w-full text-left rounded-2xl border-2 border-ink bg-paper border-separate border-spacing-0 overflow-hidden">
          <thead className="bg-cream">
            <tr>
              {['No.', 'Puzzle', 'Released', 'Opens', 'Players', 'Started', 'Completed', 'Median time', 'Play time', 'Shares', 'Arrived'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Fragment key={r.puzzle_id}>
                <tr
                  className={`cursor-pointer ${open === r.puzzle_id ? 'bg-orange-soft' : r.opens ? 'hover:bg-orange-soft/50' : 'text-ink/50 hover:bg-cream'}`}
                  onClick={() => setOpen(open === r.puzzle_id ? null : r.puzzle_id)}
                  aria-expanded={open === r.puzzle_id}
                >
                  <td className={`${td} border-t border-line font-bold`}>{r.number}</td>
                  <td className={`${td} border-t border-line min-w-[14rem]`}>
                    <div className="font-bold text-lg leading-tight">{r.name_mr}</div>
                    <div className="text-sm text-ink/60">{r.type_name}</div>
                    <div className="text-xs font-bold text-orange-deep mt-0.5">{open === r.puzzle_id ? '▲ hide days' : '▼ day by day'}</div>
                  </td>
                  <td className={`${td} border-t border-line whitespace-nowrap`}>{r.live_date ? prettyDay(r.live_date) : '–'}</td>
                  <td className={`${td} border-t border-line`}>{n(r.opens)}</td>
                  <td className={`${td} border-t border-line`}>{n(r.players)}</td>
                  <td className={`${td} border-t border-line`}>{n(r.started)}</td>
                  <td className={`${td} border-t border-line whitespace-nowrap`}>
                    {n(r.completed)} <span className="text-sm text-ink/60">({pct(r.completed, r.started)})</span>
                  </td>
                  <td className={`${td} border-t border-line whitespace-nowrap`}>{mmss(r.median_solve_ms)}</td>
                  <td className={`${td} border-t border-line whitespace-nowrap`}>{playMin(r.total_play_ms)} min</td>
                  <td className={`${td} border-t border-line`}>
                    {n(r.shares)}
                    <ShareSplit wa={r.share_whatsapp} fb={r.share_facebook} ig={r.share_instagram} copy={r.share_copy} phone={r.share_native} />
                  </td>
                  <td className={`${td} border-t border-line`}>{n(r.arrivals)}</td>
                </tr>
                {open === r.puzzle_id && (
                  <tr>
                    <td colSpan={11} className="border-t border-line bg-cream/60 p-3 sm:p-4">
                      <DayByDay puzzleId={r.puzzle_id} from={from} to={to} name={r.name_mr} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type Ev = { event: string; created_at: string; channel: string | null; session_id: string; player_id: string; value_ms: number | null };

function DayByDay({ puzzleId, from, to, name }: { puzzleId: string; from: string; to: string; name: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: Ev[] = [];
      const start = new Date(`${from}T00:00:00+05:30`).toISOString();
      const end = new Date(`${addDays(to, 1)}T00:00:00+05:30`).toISOString();
      for (let page = 0; page < 100; page++) {
        const { data, error } = await supabase!
          .from('play_events')
          .select('event,created_at,channel,session_id,player_id,value_ms')
          .eq('puzzle_id', puzzleId)
          .gte('created_at', start)
          .lt('created_at', end)
          .order('created_at')
          .range(page * 1000, page * 1000 + 999);
        if (error) {
          if (alive) setError(error.message);
          return;
        }
        all.push(...((data ?? []) as Ev[]));
        if (!data || data.length < 1000) break;
      }
      const map = new Map<string, Ev[]>();
      for (const e of all) {
        const d = istDate(e.created_at);
        map.set(d, [...(map.get(d) ?? []), e]);
      }
      const out: Day[] = [...map.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, evs]) => {
          const of = (k: string) => evs.filter((e) => e.event === k);
          const doneTimes = new Map<string, number>();
          for (const e of of('completed')) if (e.value_ms != null && e.value_ms >= 15000 && e.value_ms <= 10800000) doneTimes.set(e.session_id, e.value_ms);
          const sh = of('shared');
          const c = (ch: string) => sh.filter((e) => e.channel === ch).length;
          return {
            date,
            opens: of('opened').length,
            players: new Set(of('opened').map((e) => e.player_id)).size,
            started: new Set([...of('started'), ...of('completed')].map((e) => e.session_id)).size,
            completed: new Set(of('completed').map((e) => e.session_id)).size,
            median_ms: median([...doneTimes.values()]),
            play_ms: of('left').reduce((s, e) => s + (e.value_ms ?? 0), 0),
            shares: sh.length, wa: c('whatsapp'), fb: c('facebook'), ig: c('instagram'), copy: c('copy'), phone: c('native'),
            arrivals: of('arrived').length,
          };
        });
      if (alive) setDays(out);
    })();
    return () => {
      alive = false;
    };
  }, [puzzleId, from, to]);

  if (error) return <p className="font-bold text-[#8A1C14]">{error}</p>;
  if (!days) return <p className="animate-pulse">Loading days…</p>;
  if (!days.length) return <p>No visits to {name} between these dates.</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-bold">{name}: day by day</h3>
        <button
          className={`${btnQuiet} !py-1 ml-auto`}
          onClick={() =>
            downloadCsv(`chala-kheluya-${name}-daily.csv`, days.map((d) => ({
              date: d.date, opens: d.opens, players: d.players, started: d.started, completed: d.completed,
              median_solve_minutes: d.median_ms == null ? '' : (d.median_ms / 60000).toFixed(1), play_minutes: Math.round(d.play_ms / 60000),
              shares: d.shares, whatsapp: d.wa, facebook: d.fb, instagram: d.ig, copy_link: d.copy, phone_share: d.phone, arrivals: d.arrivals,
            })))
          }
        >
          Download days CSV
        </button>
      </div>
      <table className="w-full text-left bg-white rounded-xl border border-line border-separate border-spacing-0 overflow-hidden">
        <thead>
          <tr>
            {['Date', 'Opens', 'Players', 'Started', 'Completed', 'Median time', 'Play time', 'Shares', 'Arrived'].map((h) => (
              <th key={h} className="p-2 text-sm font-bold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td className="p-2 border-t border-line whitespace-nowrap font-bold">{prettyDay(d.date)}</td>
              <td className="p-2 border-t border-line">{n(d.opens)}</td>
              <td className="p-2 border-t border-line">{n(d.players)}</td>
              <td className="p-2 border-t border-line">{n(d.started)}</td>
              <td className="p-2 border-t border-line whitespace-nowrap">{n(d.completed)} <span className="text-sm text-ink/60">({pct(d.completed, d.started)})</span></td>
              <td className="p-2 border-t border-line whitespace-nowrap">{mmss(d.median_ms)}</td>
              <td className="p-2 border-t border-line whitespace-nowrap">{playMin(d.play_ms)} min</td>
              <td className="p-2 border-t border-line">{n(d.shares)}<ShareSplit wa={d.wa} fb={d.fb} ig={d.ig} copy={d.copy} phone={d.phone} /></td>
              <td className="p-2 border-t border-line">{n(d.arrivals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
