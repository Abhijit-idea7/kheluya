// Sends चला खेळूया reminder notifications. Called by:
//   the daily timer   { mode: 'tick' }                     (anyone may call; sends at most once a day)
//   Admin             { mode: 'init' | 'test' | 'now', ... } (signed-in admins only)
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { runManual, runTick, type Deps, type Sub } from './core.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

/** The site's key pair: made once, kept in a locked table. */
async function keys(): Promise<{ publicKey: string; privateKey: string }> {
  const { data } = await db.from('push_keys').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (data) return { publicKey: data.public_key, privateKey: data.private_key };
  const k = webpush.generateVAPIDKeys();
  await db.from('push_keys').upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true });
  const again = await db.from('push_keys').select('public_key, private_key').eq('id', 1).single();
  return { publicKey: again.data!.public_key, privateKey: again.data!.private_key };
}

const deps: Deps = {
  nowIst() {
    const s = new Date(Date.now() + 330 * 60000).toISOString();
    return { day: s.slice(0, 10), hhmm: s.slice(11, 16) };
  },
  async setting(key) {
    const { data } = await db.from('site_settings').select('value').eq('key', key).maybeSingle();
    return data?.value;
  },
  async todayPuzzleName(day) {
    const { data } = await db
      .from('puzzles')
      .select('name_mr, type:puzzle_types(name_mr)')
      .eq('status', 'live')
      .eq('live_date', day)
      .order('number', { ascending: true })
      .limit(1)
      .maybeSingle();
    const t = (data as { type?: { name_mr?: string } } | null)?.type?.name_mr;
    return t || data?.name_mr || '';
  },
  async claimDaily(day, title, body) {
    const { data, error } = await db.from('push_log').insert({ day, kind: 'daily', title, body }).select('id').maybeSingle();
    if (error) return null; // already claimed today
    return data?.id ?? null;
  },
  async addLog(kind, title, body) {
    const { data } = await db.from('push_log').insert({ kind, title, body }).select('id').single();
    return data!.id;
  },
  async finishLog(id, sent, failed, removed) {
    await db.from('push_log').update({ sent, failed, removed }).eq('id', id);
  },
  async activeSubs(endpoint) {
    let q = db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('active', true);
    if (endpoint) q = q.eq('endpoint', endpoint);
    const { data } = await q;
    return (data ?? []) as Sub[];
  },
  async send(sub, payload) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 6 * 3600, urgency: 'high' }, // high: Android shows it at once instead of holding it while the phone is idle
      );
      return { ok: true, gone: false };
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      return { ok: false, gone: code === 404 || code === 410 };
    }
  },
  async markResults(sent, gone, failed) {
    const now = new Date().toISOString();
    if (sent.length) await db.from('push_subscriptions').update({ last_sent_at: now, failures: 0 }).in('id', sent);
    if (gone.length) await db.from('push_subscriptions').update({ active: false, updated_at: now }).in('id', gone);
    for (const id of failed) {
      const { data } = await db.from('push_subscriptions').select('failures').eq('id', id).single();
      const f = (data?.failures ?? 0) + 1;
      await db.from('push_subscriptions').update({ failures: f, active: f < 5 }).eq('id', id);
    }
  },
};

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const user = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await user.rpc('is_admin');
  return data === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? 'tick');
    const k = await keys();
    webpush.setVapidDetails('https://chalakheluya.com', k.publicKey, k.privateKey);

    if (mode === 'tick') return json(await runTick(deps));
    if (!(await isAdmin(req))) return json({ error: 'not allowed' }, 403);
    if (mode === 'init') return json({ publicKey: k.publicKey });
    if (mode === 'test' || mode === 'now') {
      const title = String(body.title ?? '').slice(0, 120).trim();
      const text = String(body.body ?? '').slice(0, 300).trim();
      if (!title) return json({ error: 'title missing' }, 400);
      return json(await runManual(deps, mode, title, text, body.endpoint ? String(body.endpoint) : undefined));
    }
    return json({ error: 'unknown mode' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
