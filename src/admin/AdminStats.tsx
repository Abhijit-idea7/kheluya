import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addDays, istToday } from '@/lib/dates';
import { btnQuiet, Card, input, downloadCsv } from '@/admin/ui';
import { Bars, LineChart, Sparkline } from '@/admin/charts';

type Row = {
  puzzle_id: string; number: number; name_mr: string; type_name: string; live_date: string | null;
  opens: number; players: number; started: number; completed: number;
  median_solve_ms: number | null; avg_solve_ms: number | null; total_play_ms: number;
  shares: number; share_whatsapp: number; share_facebook: number; share_instagram: number; share_copy: number; share_native: number;
  arrivals: number; suggested: number;
};
const NUMERIC: (keyof Row)[] = [
  'opens', 'players', 'started', 'completed', 'median_solve_ms', 'avg_solve_ms', 'total_play_ms', 'shares',
  'share_whatsapp', 'share_facebook', 'share_instagram', 'share_copy', 'share_native', 'arrivals', 'suggested',
];

type Day = {
  day: string; opens: number; players: number; started: number; completed: number; median_solve_ms: number | null;
  play_ms: number; shares: number; share_whatsapp: number; share_facebook: number; share_instagram: number;
  share_copy: number; share_native: number; arrivals: number; suggested: number;
};
const DAY_NUM: (keyof Day)[] = [
  'opens', 'players', 'started', 'completed', 'median_solve_ms', 'play_ms', 'shares', 'share_whatsapp', 'share_facebook',
  'share_instagram', 'share_copy', 'share_native', 'arrivals', 'suggested',
];

// ---------- formatting ----------
const n = (v: number) => Math.round(v).toLocaleString('en-IN');
const minutes = (ms: number) => {
  const m = ms / 60000;
  return m > 0 && m < 10 ? m.toFixed(1) : n(m);
};
const playLabel = (ms: number) => (ms >= 600 * 60000 ? `${(ms / 3600000).toFixed(ms >= 100 * 3600000 ? 0 : 1)} hrs` : `${minutes(ms)} min`);
const mmss = (ms: number | null) => {
  if (ms == null) return '–';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
const rate = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
const pct = (a: number, b: number) => (b ? `${rate(a, b)}%` : '–');
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const toNum = <T,>(r: T, keys: (keyof T)[]) => {
  const out = { ...r } as Record<string, unknown>;
  for (const k of keys) out[k as string] = r[k] == null ? null : Number(r[k]);
  return out as T;
};

// ---------- daily data ----------
type Daily = { total: Day; days: Day[] };
const emptyDay = (day: string): Day => ({
  day, opens: 0, players: 0, started: 0, completed: 0, median_solve_ms: null, play_ms: 0, shares: 0, share_whatsapp: 0,
  share_facebook: 0, share_instagram: 0, share_copy: 0, share_native: 0, arrivals: 0, suggested: 0,
});

function useDaily(from: string, to: string, puzzleId: string | null) {
  const [data, setData] = useState<Daily | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    supabase!.rpc('admin_daily_stats', { p_from: from, p_to: to, p_puzzle: puzzleId }).then(({ data, error }) => {
      if (!alive) return;
      if (error) return setError(error.message);
      const rows = ((data ?? []) as Day[]).map((r) => toNum(r, DAY_NUM));
      const byDay = new Map(rows.filter((r) => r.day).map((r) => [r.day, r]));
      const days: Day[] = [];
      for (let d = from; d <= to && days.length < 400; d = addDays(d, 1)) days.push(byDay.get(d) ?? emptyDay(d));
      setData({ total: rows.find((r) => !r.day) ?? emptyDay(''), days });
    });
    return () => {
      alive = false;
    };
  }, [from, to, puzzleId]);
  return { data, error };
}

// ---------- metrics shown on the trend chart ----------
type Metric = { key: string; label: string; get: (d: Day) => number | null; fmt: (v: number) => string; whole: boolean };
const METRICS: Metric[] = [
  { key: 'players', label: 'Players', get: (d) => d.players, fmt: n, whole: true },
  { key: 'opens', label: 'Opens', get: (d) => d.opens, fmt: n, whole: true },
  { key: 'completed', label: 'Completed', get: (d) => d.completed, fmt: n, whole: true },
  { key: 'rate', label: 'Done %', get: (d) => rate(d.completed, d.started), fmt: (v) => `${Math.round(v)}%`, whole: true },
  { key: 'median', label: 'Typical time', get: (d) => (d.median_solve_ms == null ? null : d.median_solve_ms / 60000), fmt: (v) => `${+v.toFixed(1)}m`, whole: false },
  { key: 'play', label: 'Play time', get: (d) => d.play_ms / 60000, fmt: (v) => `${n(v)}m`, whole: true },
  { key: 'shares', label: 'Shares', get: (d) => d.shares, fmt: n, whole: true },
  { key: 'arrivals', label: 'Came via shares', get: (d) => d.arrivals, fmt: n, whole: true },
];

function DayTip({ d }: { d: Day }) {
  const line = (k: string, v: string) => (
    <div className="flex justify-between gap-3"><span className="text-ink/65">{k}</span><span className="font-bold tabular-nums">{v}</span></div>
  );
  return (
    <div className="space-y-0.5">
      <div className="font-bold mb-1">{longDate(d.day)}</div>
      {line('Players', n(d.players))}
      {line('Opens', n(d.opens))}
      {line('Completed', `${n(d.completed)} (${pct(d.completed, d.started)})`)}
      {line('Typical time', mmss(d.median_solve_ms))}
      {line('Play time', `${minutes(d.play_ms)} min`)}
      {line('Shares', n(d.shares))}
      {line('Came via shares', n(d.arrivals))}
    </div>
  );
}

function Tabs<T extends string>({ value, onChange, items, small }: { value: T; onChange: (v: T) => void; items: [T, string][]; small?: boolean }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-[#EFE8D8] p-1">
      {items.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`rounded-lg px-3 ${small ? 'py-1 text-sm' : 'py-1.5'} font-bold transition-colors ${
            value === k ? 'bg-white text-ink shadow-[0_2px_0_0_#10233F]' : 'text-ink/65 hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Trend({ daily, title, csvName, compact }: { daily: Daily; title: string; csvName: string; compact?: boolean }) {
  const [metric, setMetric] = useState('players');
  const [asTable, setAsTable] = useState(false);
  const m = METRICS.find((x) => x.key === metric)!;
  const points = daily.days.map((d) => ({ x: d.day, y: m.get(d) }));
  const csv = () =>
    downloadCsv(csvName, daily.days.map((d) => ({
      date: d.day, players: d.players, opens: d.opens, started: d.started, completed: d.completed, completion_rate: pct(d.completed, d.started),
      median_solve_minutes: d.median_solve_ms == null ? '' : (d.median_solve_ms / 60000).toFixed(1), play_minutes: Math.round(d.play_ms / 60000),
      shares: d.shares, whatsapp: d.share_whatsapp, facebook: d.share_facebook, instagram: d.share_instagram, copy_link: d.share_copy,
      phone_share: d.share_native, came_via_shares: d.arrivals, from_suggestions: d.suggested,
    })));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold mr-auto`}>{title}</h3>
        <button className="text-sm font-bold text-orange-deep hover:underline" onClick={() => setAsTable(!asTable)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
        <button className="text-sm font-bold text-orange-deep hover:underline" onClick={csv}>Download days CSV</button>
      </div>
      {!asTable && (
        <>
          <Tabs small value={metric} onChange={setMetric} items={METRICS.map((x) => [x.key, x.label])} />
          <div className="mt-3">
            <LineChart
              label={`${m.label} per day`}
              points={points}
              fmt={m.fmt}
              whole={m.whole}
              height={compact ? 200 : 260}
              tooltip={(i) => <DayTip d={daily.days[i]} />}
            />
          </div>
        </>
      )}
      {asTable && (
        <div className="max-h-none overflow-x-auto">
          <table className="w-full text-left text-sm bg-white rounded-xl border border-line border-separate border-spacing-0 overflow-hidden">
            <thead className="bg-cream">
              <tr>
                {['Date', 'Players', 'Opens', 'Completed', 'Typical time', 'Play time', 'Shares', 'Came via shares'].map((h) => (
                  <th key={h} className="px-3 py-2 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...daily.days].reverse().map((d) => (
                <tr key={d.day} className={d.opens ? '' : 'text-ink/40'}>
                  <td className="px-3 py-1.5 border-t border-line whitespace-nowrap font-bold">{longDate(d.day)}</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums">{n(d.players)}</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums">{n(d.opens)}</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums whitespace-nowrap">{n(d.completed)} <span className="text-ink/55">({pct(d.completed, d.started)})</span></td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums whitespace-nowrap">{mmss(d.median_solve_ms)}</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums whitespace-nowrap">{minutes(d.play_ms)} min</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums">{n(d.shares)}</td>
                  <td className="px-3 py-1.5 border-t border-line tabular-nums">{n(d.arrivals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- KPI tiles ----------
function Kpi({ label, value, sub, spark }: { label: string; value: string; sub?: string; spark?: (number | null)[] }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-paper px-4 pt-3 pb-2 flex flex-col">
      <div className="text-sm font-bold text-ink/65">{label}</div>
      <div className="text-3xl font-heading font-extrabold leading-tight tabular-nums">{value}</div>
      <div className="text-sm text-ink/60 min-h-[1.25rem]">{sub}</div>
      {spark && <div className="mt-auto pt-1"><Sparkline values={spark} /></div>}
    </div>
  );
}

function Overview({ daily }: { daily: Daily }) {
  const t = daily.total;
  const s = (f: (d: Day) => number | null) => daily.days.map(f);
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <Kpi label="Players" value={n(t.players)} sub="different people" spark={s((d) => d.players)} />
      <Kpi label="Opens" value={n(t.opens)} sub={t.players ? `${(t.opens / t.players).toFixed(1)} visits per player` : 'visits'} spark={s((d) => d.opens)} />
      <Kpi label="Completed" value={n(t.completed)} sub={`${pct(t.completed, t.started)} of people who started`} spark={s((d) => d.completed)} />
      <Kpi label="Typical time" value={mmss(t.median_solve_ms)} sub="to finish a puzzle" spark={s((d) => d.median_solve_ms)} />
      <Kpi label="Play time" value={playLabel(t.play_ms)} sub={t.players ? `${minutes(t.play_ms / t.players)} min per player` : ''} spark={s((d) => d.play_ms)} />
      <Kpi label="Shares" value={n(t.shares)} sub={t.shares ? `WhatsApp ${pct(t.share_whatsapp, t.shares)}` : ''} spark={s((d) => d.shares)} />
      <Kpi label="Came via shares" value={n(t.arrivals)} sub="people from shared links" spark={s((d) => d.arrivals)} />
      <Kpi label="From suggestions" value={n(t.suggested)} sub="opened from a ‘next’ card" spark={s((d) => d.suggested)} />
    </div>
  );
}

// ---------- puzzle detail card ----------
function shareItems(r: { wa: number; fb: number; ig: number; copy: number; phone: number }) {
  return [
    { label: 'WhatsApp', value: r.wa },
    { label: 'Facebook', value: r.fb },
    { label: 'Instagram', value: r.ig },
    { label: 'Copy link', value: r.copy },
    { label: 'Phone share', value: r.phone },
  ];
}

function PuzzleDetail({ r, from, to }: { r: Row; from: string; to: string }) {
  // Chart starts on the release day (no flat line of zeros before the puzzle existed).
  const start = r.live_date && r.live_date > from && r.live_date <= to ? r.live_date : from;
  const { data, error } = useDaily(start, to, r.puzzle_id);
  const fact = (k: string, v: string) => (
    <div className="flex justify-between gap-3 py-1 border-b border-line/70 last:border-0">
      <span className="text-ink/65">{k}</span><span className="font-bold tabular-nums text-right">{v}</span>
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl bg-white border border-line p-4">
        <h4 className="font-bold mb-2">Details</h4>
        <div className="text-[0.95rem]">
          {fact('Type', r.type_name)}
          {fact('Released', r.live_date ? longDate(r.live_date) : '–')}
          {fact('Visits', r.players ? `${n(r.opens)} (${(r.opens / r.players).toFixed(1)} per player)` : n(r.opens))}
          {fact('Typical time', mmss(r.median_solve_ms))}
          {fact('Average time', mmss(r.avg_solve_ms))}
          {fact('Play time', playLabel(r.total_play_ms))}
          {fact('Came via shares', `${n(r.arrivals)} people`)}
          {fact('From suggestions', n(r.suggested))}
        </div>
      </div>
      <div className="rounded-xl bg-white border border-line p-4">
        <h4 className="font-bold mb-3">How far people got <span className="font-normal text-ink/55">(people)</span></h4>
        <Bars
          fmt={n}
          items={[
            { label: 'Opened', value: r.players },
            { label: 'Started', value: r.started, note: r.players ? `${pct(r.started, r.players)}` : undefined },
            { label: 'Completed', value: r.completed, note: r.started ? `${pct(r.completed, r.started)}` : undefined },
          ]}
        />
        <p className="mt-3 text-sm text-ink/55">Each person counts once, however many times they opened it. Completed % is out of people who started.</p>
      </div>
      <div className="rounded-xl bg-white border border-line p-4">
        <h4 className="font-bold mb-3">Shares by button <span className="font-normal text-ink/55">({n(r.shares)})</span></h4>
        {r.shares ? (
          <Bars fmt={n} items={shareItems({ wa: r.share_whatsapp, fb: r.share_facebook, ig: r.share_instagram, copy: r.share_copy, phone: r.share_native })} />
        ) : (
          <p className="text-ink/60">No shares yet.</p>
        )}
      </div>
      <div className="lg:col-span-3 rounded-xl bg-white border border-line p-4">
        {error && <p className="font-bold text-[#8A1C14]">{error}</p>}
        {!data && !error && <p className="animate-pulse">Loading days…</p>}
        {data && <Trend compact daily={data} title="Day by day" csvName={`chala-kheluya-${r.number}-daily.csv`} />}
      </div>
    </div>
  );
}

// ---------- main screen ----------
type SortKey = 'number' | 'players' | 'opens' | 'rate' | 'median' | 'play' | 'shares';

export default function AdminStats() {
  const today = istToday();
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'puzzle' | 'type'>('puzzle');
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'number', desc: true });
  const daily = useDaily(from, to, null);

  useEffect(() => {
    setRows(null);
    supabase!.rpc('admin_puzzle_stats', { p_from: from || null, p_to: to || null }).then(({ data, error }) => {
      if (error) return setError(error.message);
      setRows(((data ?? []) as Row[]).map((r) => toNum(r, NUMERIC)));
    });
  }, [from, to]);

  const preset = (days: number) => { setFrom(addDays(today, -(days - 1))); setTo(today); };
  const presetOn = (days: number) => to === today && from === addDays(today, -(days - 1));

  const sortVal = (r: Row): number => {
    switch (sort.key) {
      case 'players': return r.players;
      case 'opens': return r.opens;
      case 'rate': return rate(r.completed, r.started) ?? -1;
      case 'median': return r.median_solve_ms ?? -1;
      case 'play': return r.total_play_ms;
      case 'shares': return r.shares;
      default: return r.number;
    }
  };
  const shown = useMemo(() => {
    const list = (rows ?? []).filter((r) => !typeFilter || r.type_name === typeFilter);
    return [...list].sort((a, b) => (sort.desc ? sortVal(b) - sortVal(a) : sortVal(a) - sortVal(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, typeFilter, sort]);
  const sum = (list: Row[], k: keyof Row) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  const byType = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows ?? []) m.set(r.type_name, [...(m.get(r.type_name) ?? []), r]);
    return [...m.entries()].map(([type, list]) => ({ type, list })).sort((a, b) => sum(b.list, 'opens') - sum(a.list, 'opens'));
  }, [rows]);

  const exportCsv = () =>
    downloadCsv(`chala-kheluya-stats-${from}-to-${to}.csv`, shown.map((r) => ({
      number: r.number, puzzle: r.name_mr, type: r.type_name, released: r.live_date ?? '', opens: r.opens, players: r.players,
      started: r.started, completed: r.completed, completion_rate: pct(r.completed, r.started),
      median_solve_minutes: r.median_solve_ms == null ? '' : (r.median_solve_ms / 60000).toFixed(1),
      play_minutes: Math.round(r.total_play_ms / 60000), shares: r.shares, whatsapp: r.share_whatsapp, facebook: r.share_facebook,
      instagram: r.share_instagram, copy_link: r.share_copy, phone_share: r.share_native, came_via_shares: r.arrivals, from_suggestions: r.suggested,
    })));

  const Th = ({ k, children, right }: { k?: SortKey; children: string; right?: boolean }) => (
    <th className={`px-3 py-2.5 text-sm font-bold whitespace-nowrap ${right ? 'text-right' : ''}`}>
      {k ? (
        <button
          className={`inline-flex items-center gap-1 hover:text-orange-deep ${sort.key === k ? 'text-orange-deep' : ''}`}
          onClick={() => setSort({ key: k, desc: sort.key === k ? !sort.desc : true })}
        >
          {children}
          <span className="text-xs w-2">{sort.key === k ? (sort.desc ? '▼' : '▲') : ''}</span>
        </button>
      ) : children}
    </th>
  );
  const td = 'px-3 py-2 border-t border-line';
  const num = `${td} text-right tabular-nums whitespace-nowrap`;

  const DoneCell = ({ done, started }: { done: number; started: number }) => {
    const r = rate(done, started);
    return (
      <td className={num}>
        <span className="inline-flex items-center gap-2 justify-end">
          <span className="hidden md:block w-14 h-2 rounded-full bg-[#EFE8D8] overflow-hidden">
            <span className="block h-full rounded-full bg-green" style={{ width: `${r ?? 0}%` }} />
          </span>
          <span className="w-10">{r == null ? '–' : `${r}%`}</span>
        </span>
      </td>
    );
  };

  return (
    <div>
      {/* Header + date range */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl mr-auto">Stats</h1>
        <Tabs<string>
          value={presetOn(7) ? '7' : presetOn(30) ? '30' : presetOn(90) ? '90' : 'custom'}
          onChange={(v) => v !== 'custom' && preset(Number(v))}
          items={[['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['custom', 'Custom']]}
        />
        <div className="flex items-center gap-2">
          <input type="date" aria-label="From" className={`${input} !w-auto !py-1.5`} value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <span className="text-ink/60">to</span>
          <input type="date" aria-label="To" className={`${input} !w-auto !py-1.5`} value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/55">{longDate(from)} – {longDate(to)} · India time · admin previews are not counted</p>
      {error && <p className="mt-4 font-bold text-[#8A1C14]">{error}</p>}
      {daily.error && <p className="mt-4 font-bold text-[#8A1C14]">{daily.error}</p>}

      {/* KPIs + trend */}
      <div className="mt-5">
        {daily.data ? <Overview daily={daily.data} /> : !daily.error && <p className="animate-pulse">Loading…</p>}
      </div>
      {daily.data && (
        <Card className="mt-4">
          <Trend daily={daily.data} title="Daily engagement · all puzzles" csvName={`chala-kheluya-daily-${from}-to-${to}.csv`} />
        </Card>
      )}

      {/* Puzzle table */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl mr-2">Puzzles</h2>
        <Tabs<'puzzle' | 'type'>
          value={view}
          onChange={(v) => { setView(v); setTypeFilter(''); setOpen(null); }}
          items={[['puzzle', 'By puzzle'], ['type', 'By type']]}
        />
        {typeFilter && view === 'puzzle' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-navy text-white px-3 py-1 text-sm font-bold">
            {typeFilter}
            <button onClick={() => setTypeFilter('')} aria-label="Show all types" className="font-extrabold">✕</button>
          </span>
        )}
        <button className={`${btnQuiet} !py-1.5 ml-auto`} onClick={exportCsv} disabled={!shown.length}>Download CSV</button>
      </div>
      <p className="mt-1 text-sm text-ink/55">
        {view === 'puzzle' ? 'Tap a row for details, shares and the day-by-day chart. Tap a column name to sort.' : 'Tap a type to see its puzzles.'}
      </p>

      {!rows ? (
        <p className="mt-4 animate-pulse">Loading…</p>
      ) : view === 'type' ? (
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-base border-separate border-spacing-0">
            <thead className="bg-cream">
              <tr>
                <Th>Puzzle type</Th><Th right>Puzzles</Th><Th right>Opens</Th><Th right>Players*</Th><Th right>Done</Th><Th right>Play time</Th><Th right>Shares</Th><Th right>Came via shares</Th>
              </tr>
            </thead>
            <tbody>
              {byType.map(({ type, list }) => (
                <tr key={type} className="cursor-pointer hover:bg-orange-soft/50" onClick={() => { setTypeFilter(type); setView('puzzle'); }}>
                  <td className={`${td} font-bold`}>{type} <span className="text-sm font-normal text-orange-deep">→</span></td>
                  <td className={num}>{list.length}</td>
                  <td className={num}>{n(sum(list, 'opens'))}</td>
                  <td className={num}>{n(sum(list, 'players'))}</td>
                  <DoneCell done={sum(list, 'completed')} started={sum(list, 'started')} />
                  <td className={num}>{playLabel(sum(list, 'total_play_ms'))}</td>
                  <td className={num}>{n(sum(list, 'shares'))}</td>
                  <td className={num}>{n(sum(list, 'arrivals'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 border-t border-line text-xs text-ink/55">* Players added up across puzzles, so one person who played two puzzles counts twice.</p>
        </div>
      ) : shown.length === 0 ? (
        <Card className="mt-3">No puzzles in this view.</Card>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-base border-separate border-spacing-0">
            <thead className="bg-cream">
              <tr>
                <Th k="number">No.</Th>
                <Th>Puzzle</Th>
                <Th>Released</Th>
                <Th k="players" right>Players</Th>
                <Th k="opens" right>Opens</Th>
                <Th k="rate" right>Done</Th>
                <Th k="median" right>Typical time</Th>
                <Th k="play" right>Play time</Th>
                <Th k="shares" right>Shares</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isOpen = open === r.puzzle_id;
                return (
                  <Fragment key={r.puzzle_id}>
                    <tr
                      className={`cursor-pointer ${isOpen ? 'bg-orange-soft' : r.opens ? 'hover:bg-orange-soft/40' : 'text-ink/45 hover:bg-cream'}`}
                      onClick={() => setOpen(isOpen ? null : r.puzzle_id)}
                      aria-expanded={isOpen}
                    >
                      <td className={`${td} font-bold tabular-nums`}>{r.number}</td>
                      <td className={`${td} max-w-[18rem]`}>
                        <div className="truncate">
                          <span className="font-bold text-[1.05rem]">{r.name_mr}</span>
                          {r.type_name !== r.name_mr && <span className="ml-2 text-sm text-ink/55">{r.type_name}</span>}
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap text-ink/75`}>{r.live_date ? shortDate(r.live_date) : '–'}</td>
                      <td className={`${num} font-bold`}>{n(r.players)}</td>
                      <td className={num}>{n(r.opens)}</td>
                      <DoneCell done={r.completed} started={r.started} />
                      <td className={num}>{mmss(r.median_solve_ms)}</td>
                      <td className={num}>{playLabel(r.total_play_ms)}</td>
                      <td className={num}>{n(r.shares)}</td>
                      <td className={`${td} text-center text-orange-deep font-bold`}>
                        <span className={`inline-block transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={10} className="border-t border-line bg-cream/70 p-3 sm:p-4">
                          <PuzzleDetail r={r} from={from} to={to} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
