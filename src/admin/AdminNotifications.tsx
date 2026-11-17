import { useEffect, useState } from 'react';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { myEndpoint, pushStatus, pushSupported, turnOn } from '@/lib/push';

type Log = { created_at: string; day: string; kind: string; title: string; body: string; sent: number; failed: number; removed: number; taps: number };
type Summary = { keys: boolean; timer: boolean; cron_available: boolean; active: number; stopped: number; new_7d: number; log: Log[] };
const KEYS = ['push_on', 'push_time', 'push_title', 'push_body'] as const;
const TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/** Admin → Notifications: the daily reminder, a test to this phone, a special message, and what was sent. */
export default function AdminNotifications() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [err, setErr] = useState('');
  const [vals, setVals] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [special, setSpecial] = useState({ title: '', body: '' });

  const load = async () => {
    const [{ data, error }, st] = await Promise.all([
      supabase!.rpc('admin_push_summary'),
      supabase!.from('site_settings').select('key,value').in('key', KEYS as unknown as string[]),
    ]);
    if (error) return setErr(error.message.includes('admin_push_summary') ? 'Notifications: the new database step has not been applied yet.' : error.message);
    // A single JSON value; tolerate a one-row table shape too
    const raw = (Array.isArray(data) ? Object.values((data[0] ?? {}) as Record<string, unknown>)[0] : data) as Partial<Summary> | null;
    setSum({ keys: false, timer: false, cron_available: false, active: 0, stopped: 0, new_7d: 0, ...(raw ?? {}), log: Array.isArray(raw?.log) ? raw!.log : [] });
    setVals(Object.fromEntries((st.data ?? []).map((r) => [r.key, r.value])));
  };
  useEffect(() => {
    load();
  }, []);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase!.functions.invoke('push-send', { body });
    if (error) {
      let detail = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) detail = (await ctx.json()).error ?? detail;
      } catch {
        /* keep message */
      }
      throw new Error(detail);
    }
    return data as { error?: string; publicKey?: string; sent?: { sent: number; failed: number; removed: number } };
  };

  const setup = async () => {
    setBusy('setup');
    setMsg('');
    try {
      await call({ mode: 'init' });
      setMsg('Keys are ready.');
    } catch (e) {
      setMsg(`Could not reach the send function: ${(e as Error).message}. Has it been deployed in Bolt?`);
    }
    setBusy('');
    load();
  };

  const startTimer = async () => {
    setBusy('timer');
    const { data, error } = await supabase!.rpc('admin_push_schedule', { p_url: SUPABASE_URL, p_anon: SUPABASE_ANON_KEY });
    setMsg(error ? error.message : data === 'ok' ? 'Daily timer is running.' : data === 'no-cron' ? 'This database does not allow a timer (pg_cron). Tell Claude.' : String(data));
    setBusy('');
    load();
  };

  const save = async () => {
    const rows = KEYS.map((key) => ({ key, value: vals[key] ?? (key === 'push_on' ? false : '') }));
    const { error } = await supabase!.from('site_settings').upsert(rows, { onConflict: 'key' });
    setSaved(error ? error.message : 'Saved');
    setTimeout(() => setSaved(''), 2500);
  };

  const test = async () => {
    setBusy('test');
    setMsg('');
    try {
      if ((await pushStatus()) !== 'on') {
        const r = await turnOn();
        if (r !== 'on') {
          setMsg(r === 'blocked' ? 'Notifications are blocked in this browser. Allow them in the browser settings first.' : 'Could not switch notifications on for this browser.');
          setBusy('');
          return;
        }
      }
      const ep = await myEndpoint();
      const r = await call({ mode: 'test', endpoint: ep, title: String(vals.push_title || 'आजचे कोडे आले आहे'), body: 'हा चाचणी संदेश आहे — चला खेळूया!' });
      setMsg(r.error ? r.error : `Test sent (${r.sent?.sent ?? 0}). It should appear on this device within a minute.`);
    } catch (e) {
      setMsg(`Test failed: ${(e as Error).message}`);
    }
    setBusy('');
    load();
  };

  const sendNow = async () => {
    if (!special.title.trim()) return setMsg('Write a title for the special message.');
    if (!window.confirm(`Send "${special.title}" to all ${sum?.active ?? 0} phones now?`)) return;
    setBusy('now');
    try {
      const r = await call({ mode: 'now', title: special.title, body: special.body });
      setMsg(r.error ? r.error : `Sent to ${r.sent?.sent ?? 0} phones.`);
      setSpecial({ title: '', body: '' });
    } catch (e) {
      setMsg(`Sending failed: ${(e as Error).message}`);
    }
    setBusy('');
    load();
  };

  if (err) return <p className="font-bold text-[#8A1C14]">{err}</p>;
  if (!sum) return <p className="animate-pulse">Loading…</p>;
  const ready = sum.keys && sum.timer;
  const preview = (s: string) => s.replace(/\{name\}/g, 'शब्दकोडे');

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-ink/60">
          A free daily reminder on players’ phones (Android Chrome and most Android browsers). Players are asked after finishing a puzzle on their
          second day, and can switch it on or off from the ☰ menu.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <Card><div className="text-sm font-bold text-ink/65">Phones switched on</div><div className="text-3xl font-heading font-extrabold">{sum.active}</div><div className="text-sm text-ink/60">{sum.new_7d} new this week</div></Card>
        <Card><div className="text-sm font-bold text-ink/65">Switched off / gone</div><div className="text-3xl font-heading font-extrabold">{sum.stopped}</div><div className="text-sm text-ink/60">turned off or phone changed</div></Card>
        <Card className="col-span-2 md:col-span-1">
          <div className="text-sm font-bold text-ink/65">Status</div>
          <div className={`text-xl font-bold ${ready && vals.push_on === true ? 'text-green' : 'text-[#8A1C14]'}`}>
            {!sum.keys ? 'Not set up yet' : !sum.timer ? 'Timer not started' : vals.push_on === true ? 'Daily reminder is on' : 'Daily reminder is off'}
          </div>
        </Card>
      </div>

      {(!sum.keys || !sum.timer) && (
        <Card>
          <h2 className="text-xl font-bold">One-time setup</h2>
          <ol className="mt-2 grid gap-2 list-decimal pl-5">
            <li className={sum.keys ? 'text-ink/50 line-through' : ''}>
              Make the notification keys. <button className={`${btnQuiet} ml-2 !py-1`} onClick={setup} disabled={!!busy || sum.keys}>{busy === 'setup' ? 'Working…' : 'Set up'}</button>
            </li>
            <li className={sum.timer ? 'text-ink/50 line-through' : ''}>
              Start the daily timer. <button className={`${btnQuiet} ml-2 !py-1`} onClick={startTimer} disabled={!!busy || !sum.keys || sum.timer}>{busy === 'timer' ? 'Working…' : 'Start timer'}</button>
            </li>
          </ol>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold">Daily reminder</h2>
        <label className="mt-3 flex items-center gap-3 text-lg">
          <input type="checkbox" className="h-6 w-6 accent-[#2E8A3E]" checked={vals.push_on === true} onChange={(e) => setVals({ ...vals, push_on: e.target.checked })} />
          Send the daily reminder, and ask players to switch it on
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Time (India)">
            <select className={input} value={String(vals.push_time ?? '07:00')} onChange={(e) => setVals({ ...vals, push_time: e.target.value })}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <input className={input} value={String(vals.push_title ?? '')} maxLength={80} onChange={(e) => setVals({ ...vals, push_title: e.target.value })} />
          </Field>
        </div>
        <Field label="Text" hint="{name} is replaced by today’s puzzle type, e.g. शब्दकोडे" className="mt-3">
          <input className={input} value={String(vals.push_body ?? '')} maxLength={160} onChange={(e) => setVals({ ...vals, push_body: e.target.value })} />
        </Field>
        <div className="mt-3 rounded-2xl bg-[#1d2733] p-3 max-w-sm">
          <div className="rounded-xl bg-[#F3F1EC] px-3 py-2">
            <div className="text-xs text-ink/60">Chrome · chalakheluya.com</div>
            <div className="font-bold">{preview(String(vals.push_title ?? ''))}</div>
            <div className="text-sm">{preview(String(vals.push_body ?? ''))}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btnPrimary} onClick={save}>Save</button>
          <button className={btnQuiet} onClick={test} disabled={!!busy || !sum.keys || !pushSupported()}>
            {busy === 'test' ? 'Sending…' : 'Send a test to this device'}
          </button>
          {saved && <span className="font-bold text-green">{saved}</span>}
        </div>
        {!pushSupported() && <p className="mt-2 text-sm text-ink/60">This browser can’t receive notifications — open Admin in Chrome on Android to test.</p>}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Send a special message now</h2>
        <p className="text-sm text-ink/60">For occasions only (a festival, the book launch). Goes to every phone that has reminders on.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Title"><input className={input} maxLength={80} value={special.title} onChange={(e) => setSpecial({ ...special, title: e.target.value })} /></Field>
          <Field label="Text"><input className={input} maxLength={160} value={special.body} onChange={(e) => setSpecial({ ...special, body: e.target.value })} /></Field>
        </div>
        <button className={`${btnQuiet} mt-3`} onClick={sendNow} disabled={!!busy || !sum.keys || !sum.active}>
          {busy === 'now' ? 'Sending…' : `Send to ${sum.active} phones`}
        </button>
      </Card>

      {msg && <p className="font-bold">{msg}</p>}

      <Card>
        <h2 className="text-xl font-bold">What was sent</h2>
        {sum.log.length === 0 ? (
          <p className="mt-2 text-ink/70">Nothing yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm bg-white rounded-xl border border-line border-separate border-spacing-0 overflow-hidden">
              <thead className="bg-cream">
                <tr>{['When', 'Kind', 'Message', 'Sent', 'Failed', 'Removed', 'Taps that day'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {sum.log.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 border-t border-line whitespace-nowrap">{when(l.created_at)}</td>
                    <td className="px-3 py-1.5 border-t border-line">{l.kind}</td>
                    <td className="px-3 py-1.5 border-t border-line"><b>{l.title}</b> {l.body}</td>
                    <td className="px-3 py-1.5 border-t border-line tabular-nums">{l.sent}</td>
                    <td className="px-3 py-1.5 border-t border-line tabular-nums">{l.failed}</td>
                    <td className="px-3 py-1.5 border-t border-line tabular-nums">{l.removed}</td>
                    <td className="px-3 py-1.5 border-t border-line tabular-nums">{l.taps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-ink/50">Taps that day = people who opened the site from any notification on that day (not just that message). Removed = phones that no longer accept notifications.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
