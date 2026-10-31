import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PuzzleType } from '@/lib/types';
import Tile from '@/components/Tile';
import { Badge, btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';

type Draft = Omit<PuzzleType, 'id' | 'card_image_path' | 'color'> & { id?: string };
const blank: Draft = {
  slug: '', name_mr: '', name_en: '', about_mr: '', about_en: '', how_mr: '', how_en: '', tile: 'क', sort_order: 100, is_active: true,
};

export default function AdminTypes() {
  const [rows, setRows] = useState<PuzzleType[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    supabase!.from('puzzle_types').select('*').order('sort_order').then(({ data }) => setRows((data ?? []) as PuzzleType[]));
  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    if (!draft) return;
    setMsg(null);
    const slug = draft.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!slug || !draft.name_mr.trim() || !draft.name_en.trim())
      return setMsg({ ok: false, text: 'Web name, Marathi name and English name are required.' });
    setBusy(true);
    const { id, ...row } = { ...draft, slug };
    const { error } = id
      ? await supabase!.from('puzzle_types').update(row).eq('id', id)
      : await supabase!.from('puzzle_types').insert(row);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message.includes('duplicate') ? 'That web name is already used.' : error.message });
    setMsg({ ok: true, text: 'Saved.' });
    setDraft(null);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Puzzle types</h1>
        <span className="text-ink/70">{rows.length} types · no limit</span>
        <button className={`${btnPrimary} ml-auto`} onClick={() => { setDraft({ ...blank, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10 }); setMsg(null); }}>
          + New type
        </button>
      </div>
      {msg && <p className={`mt-3 font-bold ${msg.ok ? 'text-[#1F5E2A]' : 'text-[#8A1C14]'}`}>{msg.text}</p>}

      {draft && (
        <Card className="mt-5">
          <h2 className="text-xl mb-3">{draft.id ? `Edit: ${draft.name_mr}` : 'New puzzle type'}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name (Marathi) *"><input className={input} value={draft.name_mr} onChange={(e) => set('name_mr', e.target.value)} /></Field>
            <Field label="Name (English) *"><input className={input} value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} /></Field>
            <Field label="Web name *" hint="Used in the address: /prakar/web-name">
              <input className={input} value={draft.slug} onChange={(e) => set('slug', e.target.value)} placeholder="e.g. shabda-shodh" />
            </Field>
            <div className="flex gap-3 items-end">
              <Field label="Tile letter" className="w-28"><input className={input} value={draft.tile} maxLength={3} onChange={(e) => set('tile', e.target.value)} /></Field>
              <Tile char={draft.tile || '?'} size={48} />
            </div>
            <Field label="About (Marathi)" className="sm:col-span-2"><input className={input} value={draft.about_mr} onChange={(e) => set('about_mr', e.target.value)} /></Field>
            <Field label="About (English)" className="sm:col-span-2"><input className={input} value={draft.about_en} onChange={(e) => set('about_en', e.target.value)} /></Field>
            <Field label="How to play (Marathi)" className="sm:col-span-2" hint="Shown on puzzle pages. New line = new paragraph.">
              <textarea className={`${input} min-h-[7rem]`} value={draft.how_mr} onChange={(e) => set('how_mr', e.target.value)} />
            </Field>
            <Field label="How to play (English)" className="sm:col-span-2">
              <textarea className={`${input} min-h-[7rem]`} value={draft.how_en} onChange={(e) => set('how_en', e.target.value)} />
            </Field>
            <Field label="Display order" hint="Smaller comes first."><input type="number" className={input} value={draft.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></Field>
            <label className="flex items-center gap-2 mt-6 font-bold">
              <input type="checkbox" className="h-5 w-5" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Active (shown on the site)
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button className={btnPrimary} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save type'}</button>
            <button className={btnQuiet} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <Card key={t.id} className="flex gap-3 items-start">
            <Tile char={t.tile} size={48} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg">{t.name_mr} <span className="text-ink/60 font-normal">· {t.name_en}</span></div>
              <div className="text-sm text-ink/60">/prakar/{t.slug} · order {t.sort_order}</div>
              {!t.is_active && <Badge tone="grey">Inactive</Badge>}
            </div>
            <button className={btnQuiet} onClick={() => { setDraft({ ...t }); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
          </Card>
        ))}
      </div>
    </div>
  );
}
