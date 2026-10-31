import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Puzzle, PuzzleType } from '@/lib/types';
import { istToday } from '@/lib/dates';
import { Badge, btnDanger, btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { prepareUpload, removePuzzleFiles, uploadPrepared, type Prepared } from '@/admin/upload';
import { statusOf } from '@/admin/AdminPuzzles';
import { metaFromPrepared } from '@/admin/puzzleMeta';

type Form = Pick<
  Puzzle,
  'type_id' | 'name_mr' | 'name_en' | 'about_mr' | 'about_en' | 'keywords' | 'difficulty' | 'time_mr' | 'time_en' | 'status'
> & { live_date: string };

const empty: Form = {
  type_id: '', name_mr: '', name_en: '', about_mr: '', about_en: '', keywords: '', difficulty: 'medium',
  time_mr: '', time_en: '', status: 'draft', live_date: '',
};

export default function AdminPuzzleEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [types, setTypes] = useState<PuzzleType[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [fileError, setFileError] = useState('');
  const [metaNote, setMetaNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    supabase!.from('puzzle_types').select('*').order('sort_order').then(({ data }) => setTypes((data ?? []) as PuzzleType[]));
    if (!id) return;
    supabase!.from('puzzles').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) return setMsg({ ok: false, text: error.message });
      const p = data as Puzzle;
      setPuzzle(p);
      setForm({
        type_id: p.type_id, name_mr: p.name_mr, name_en: p.name_en, about_mr: p.about_mr, about_en: p.about_en,
        keywords: p.keywords, difficulty: p.difficulty, time_mr: p.time_mr, time_en: p.time_en, status: p.status,
        live_date: p.live_date ?? '',
      });
    });
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (f: File | null) => {
    setFile(f);
    setPrepared(null);
    setFileError('');
    setMetaNote(null);
    if (!f) return;
    try {
      const prep = await prepareUpload(f);
      setPrepared(prep);
      const { meta, error } = await metaFromPrepared(prep);
      if (error) return setMetaNote({ ok: false, text: error });
      if (!meta) return setMetaNote({ ok: false, text: 'This file has no details block, so please fill in the details below.' });
      const type = meta.type
        ? types.find((t) => t.slug === meta.type || t.name_mr === meta.type || t.name_en.toLowerCase() === meta.type!.toLowerCase())
        : undefined;
      setForm((cur) => ({
        ...cur,
        type_id: type?.id ?? cur.type_id,
        name_mr: meta.name_mr ?? cur.name_mr,
        name_en: meta.name_en ?? cur.name_en,
        about_mr: meta.about_mr ?? cur.about_mr,
        about_en: meta.about_en ?? cur.about_en,
        difficulty: meta.difficulty ?? cur.difficulty,
        time_mr: meta.time_mr ?? cur.time_mr,
        time_en: meta.time_en ?? cur.time_en,
        keywords: meta.keywords ?? cur.keywords,
        live_date: meta.live_date ?? cur.live_date,
      }));
      if (meta.type && !type)
        setMetaNote({ ok: false, text: `Details filled from the file, but the puzzle type "${meta.type}" does not exist yet. Add it under Puzzle types, or pick a type below.` });
      else
        setMetaNote({ ok: true, text: `Details filled from the file${meta.live_date ? ', including a suggested live date' : ''}. Check them, set the date and status, and save.` });
    } catch (e) {
      setFileError((e as Error).message);
    }
  };

  const save = async () => {
    setMsg(null);
    if (!form.name_mr.trim()) return setMsg({ ok: false, text: 'Marathi name is required.' });
    if (!form.type_id) return setMsg({ ok: false, text: 'Choose a puzzle type.' });
    if (form.status === 'live' && !form.live_date) return setMsg({ ok: false, text: 'A live puzzle needs a live date.' });
    if (file && !prepared) return setMsg({ ok: false, text: fileError || 'The chosen file could not be read.' });
    if (form.status === 'live' && !prepared && !puzzle?.file_version)
      return setMsg({ ok: false, text: 'Upload the puzzle file before making it live.' });

    const row = { ...form, live_date: form.live_date || null, name_en: form.name_en.trim(), name_mr: form.name_mr.trim() };
    try {
      setBusy('Saving…');
      let saved: Puzzle;
      if (isNew) {
        const { data, error } = await supabase!.from('puzzles').insert(row).select('*').single();
        if (error) throw error;
        saved = data as Puzzle;
      } else {
        const { data, error } = await supabase!.from('puzzles').update(row).eq('id', id!).select('*').single();
        if (error) throw error;
        saved = data as Puzzle;
      }
      if (prepared) {
        const version = (saved.file_version ?? 0) + 1;
        const folder = await uploadPrepared(saved.number, version, prepared, (d, t) => setBusy(`Uploading files ${d} of ${t}…`));
        const { data, error } = await supabase!
          .from('puzzles')
          .update({ file_folder: folder, entry_file: prepared.entry, file_version: version })
          .eq('id', saved.id)
          .select('*')
          .single();
        if (error) throw error;
        saved = data as Puzzle;
      }
      setPuzzle(saved);
      setFile(null);
      setPrepared(null);
      setPreviewKey((k) => k + 1);
      setMsg({ ok: true, text: `Saved puzzle ${saved.number}.` });
      if (isNew) navigate(`/admin/puzzles/${saved.id}`, { replace: true });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!puzzle) return;
    if (!window.confirm(`Delete puzzle ${puzzle.number} "${puzzle.name_mr}", its files and all its play data? This cannot be undone.`)) return;
    try {
      setBusy('Deleting…');
      await removePuzzleFiles(puzzle.number);
      const { error } = await supabase!.from('puzzles').delete().eq('id', puzzle.id);
      if (error) throw error;
      navigate('/admin/puzzles', { replace: true });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setBusy('');
    }
  };

  const st = puzzle ? statusOf(puzzle) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/puzzles" className={btnQuiet}>← Puzzles</Link>
        <h1 className="text-3xl">{isNew ? 'New puzzle' : `Puzzle ${puzzle?.number ?? ''}`}</h1>
        {st && <Badge tone={st.tone}>{st.label}</Badge>}
        {puzzle && (
          <span className="text-ink/70">
            Short link: <b>kheluya.in/{puzzle.number}</b>
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_420px] items-start">
        <div className="grid gap-5">
          <Card>
            <h2 className="text-xl mb-3">1. Puzzle file</h2>
            <input
              type="file"
              accept=".html,.htm,.zip,text/html,application/zip"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="block w-full text-base file:mr-3 file:rounded-xl file:border-2 file:border-ink file:bg-orange-soft file:px-4 file:py-2 file:font-bold"
            />
            <p className="mt-2 text-sm text-ink/70">
              One .html file, or a .zip with the HTML plus its sounds and images. Uploading again creates a new version; play counts are kept.
            </p>
            {puzzle?.file_version ? (
              <p className="mt-2 text-sm">Current file: <b>v{puzzle.file_version}</b> · {puzzle.entry_file}</p>
            ) : null}
            {prepared && (
              <p className="mt-2 text-sm font-bold text-[#1F5E2A]">
                Ready to upload: {prepared.files.length} file(s), {(prepared.totalBytes / 1024 / 1024).toFixed(1)} MB, opens {prepared.entry}
              </p>
            )}
            {fileError && <p className="mt-2 text-sm font-bold text-[#8A1C14]">{fileError}</p>}
            {metaNote && (
              <p className={`mt-2 rounded-xl p-2.5 text-sm font-bold ${metaNote.ok ? 'bg-green-soft text-[#1F5E2A]' : 'bg-orange-soft text-[#7A4300]'}`}>
                {metaNote.text}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl mb-3">2. Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (Marathi) *">
                <input className={input} value={form.name_mr} onChange={(e) => set('name_mr', e.target.value)} />
              </Field>
              <Field label="Name (English)">
                <input className={input} value={form.name_en} onChange={(e) => set('name_en', e.target.value)} />
              </Field>
              <Field label="Puzzle type *" hint="Add new types under Puzzle types.">
                <select className={input} value={form.type_id} onChange={(e) => set('type_id', e.target.value)}>
                  <option value="">Choose…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name_mr} · {t.name_en}{t.is_active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select className={input} value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as Form['difficulty'])}>
                  <option value="easy">Easy · सोपे</option>
                  <option value="medium">Medium · मध्यम</option>
                  <option value="hard">Hard · कठीण</option>
                </select>
              </Field>
              <Field label="About (Marathi)" className="sm:col-span-2" hint="One short line shown on the puzzle card.">
                <input className={input} value={form.about_mr} onChange={(e) => set('about_mr', e.target.value)} />
              </Field>
              <Field label="About (English)" className="sm:col-span-2">
                <input className={input} value={form.about_en} onChange={(e) => set('about_en', e.target.value)} />
              </Field>
              <Field label="Time to solve (Marathi)" hint="e.g. १०–१५ मिनिटे">
                <input className={input} value={form.time_mr} onChange={(e) => set('time_mr', e.target.value)} />
              </Field>
              <Field label="Time to solve (English)" hint="e.g. 10–15 min">
                <input className={input} value={form.time_en} onChange={(e) => set('time_en', e.target.value)} />
              </Field>
              <Field label="Search words (English letters)" className="sm:col-span-2" hint="Words people may type to find it, e.g. sudoku akshar sant">
                <input className={input} value={form.keywords} onChange={(e) => set('keywords', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl mb-3">3. When it goes live</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Live date" hint={`India date. Today is ${istToday()}.`}>
                <input type="date" className={input} value={form.live_date} onChange={(e) => set('live_date', e.target.value)} />
              </Field>
              <Field label="Status" hint="Live + a future date = scheduled; it appears that morning.">
                <select className={input} value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="live">Live on its date</option>
                  <option value="archived">Archived (hidden)</option>
                </select>
              </Field>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <button className={btnPrimary} onClick={save} disabled={!!busy}>{busy || 'Save'}</button>
            {puzzle && (
              <Link to={`/k/${puzzle.number}`} target="_blank" className={btnQuiet}>Open puzzle page ↗</Link>
            )}
            {puzzle && <button className={`${btnDanger} ml-auto`} onClick={remove} disabled={!!busy}>Delete puzzle</button>}
          </div>
          {msg && <p className={`font-bold ${msg.ok ? 'text-[#1F5E2A]' : 'text-[#8A1C14]'}`}>{msg.text}</p>}
        </div>

        <div className="lg:sticky lg:top-4">
          <Card className="!p-3">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl">Phone preview</h2>
              {puzzle?.file_version ? (
                <button className={`${btnQuiet} ml-auto !py-1`} onClick={() => setPreviewKey((k) => k + 1)}>Reload</button>
              ) : null}
            </div>
            {puzzle?.file_version ? (
              <div className="mx-auto w-[390px] max-w-full h-[760px] rounded-[2rem] border-[6px] border-ink overflow-hidden bg-white">
                <iframe
                  key={previewKey}
                  title="Preview"
                  src={`/khel/${puzzle.number}?preview=1`}
                  className="w-full h-full border-0"
                  allow="fullscreen; autoplay; clipboard-write"
                />
              </div>
            ) : (
              <p className="p-6 text-center text-ink/70">Save with a file to see the preview here. Previews are not counted.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
