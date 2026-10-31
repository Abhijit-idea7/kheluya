import { supabase } from '@/lib/supabase';
import type { Puzzle, PuzzleType } from '@/lib/types';
import { istToday } from '@/lib/dates';
import { samplePuzzles, sampleTypes } from '@/data/sample';

const PUZZLE_COLS =
  'id,number,type_id,name_mr,name_en,about_mr,about_en,keywords,difficulty,time_mr,time_en,live_date,status,file_folder,entry_file,file_version,card_image_path,type:puzzle_types(*)';

export const usingSample = () => !supabase;

export async function getTypes(): Promise<PuzzleType[]> {
  if (!supabase) return sampleTypes;
  const { data, error } = await supabase
    .from('puzzle_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name_mr');
  if (error) throw error;
  return data as PuzzleType[];
}

/** Live puzzles (today or earlier), newest first. */
export async function getLivePuzzles(opts: { typeId?: string; limit?: number } = {}): Promise<Puzzle[]> {
  const today = istToday();
  if (!supabase) {
    return samplePuzzles()
      .filter((p) => p.status === 'live' && (!opts.typeId || p.type_id === opts.typeId))
      .sort((a, b) => (b.live_date ?? '').localeCompare(a.live_date ?? ''))
      .slice(0, opts.limit ?? 999);
  }
  let q = supabase
    .from('puzzles')
    .select(PUZZLE_COLS)
    .eq('status', 'live')
    .lte('live_date', today)
    .order('live_date', { ascending: false })
    .order('number', { ascending: false });
  if (opts.typeId) q = q.eq('type_id', opts.typeId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Puzzle[];
}

export async function getPuzzleByNumber(n: number): Promise<Puzzle | null> {
  if (!supabase) return samplePuzzles().find((p) => p.number === n && p.status === 'live') ?? null;
  const { data, error } = await supabase.from('puzzles').select(PUZZLE_COLS).eq('number', n).maybeSingle();
  if (error) throw error;
  return (data as unknown as Puzzle) ?? null;
}

export async function getPublicSettings(): Promise<Record<string, unknown>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_settings').select('key,value');
  if (error) return {};
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

export async function getPlayCounts(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase.rpc('public_play_counts');
  if (error) return {};
  return Object.fromEntries(((data ?? []) as { puzzle_id: string; completed: number }[]).map((r) => [r.puzzle_id, Number(r.completed)]));
}

export async function addSubscriber(row: { name: string; phone: string; city: string; interest: string; source_page: string }) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('subscribers').insert({ ...row, consent: true });
  if (error) throw error;
}

export async function addContactMessage(row: { name: string; phone: string; message: string }) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('contact_messages').insert(row);
  if (error) throw error;
}

/** Typical (median) solving time; null until at least 10 people have solved it. */
export async function getTimeStats(puzzleId: string): Promise<{ solvers: number; median_ms: number | null }> {
  if (!supabase || puzzleId.startsWith('sample-')) return { solvers: 0, median_ms: null };
  const { data, error } = await supabase.rpc('public_time_stats', { p_puzzle: puzzleId });
  if (error || !data?.length) return { solvers: 0, median_ms: null };
  const r = data[0] as { solvers: number; median_ms: number | null };
  return { solvers: Number(r.solvers), median_ms: r.median_ms == null ? null : Number(r.median_ms) };
}
