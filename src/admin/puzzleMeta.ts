/**
 * Puzzle details embedded in the puzzle's own HTML, so the uploader only sets date and status.
 *
 * Place anywhere in the HTML (usually inside <head>):
 *
 * <script type="application/json" id="ck-meta">
 * {
 *   "type": "akshar-sudoku",
 *   "name_mr": "अक्षर-सुडोकू",
 *   "name_en": "Akshar Sudoku",
 *   "about_mr": "सहा अक्षरांचे सुडोकू सोडवा आणि लपलेले नाव शोधा.",
 *   "about_en": "Solve a six-letter sudoku and reveal a hidden name.",
 *   "difficulty": "medium",
 *   "time_mr": "१०–२० मिनिटे",
 *   "time_en": "10–20 min",
 *   "keywords": "sudoku akshar",
 *   "live_date": "2026-11-04"
 * }
 * </script>
 *
 * "type" is the puzzle type's web name (see Admin → Puzzle types). "live_date" is optional.
 */
export type PuzzleMeta = {
  type?: string;
  name_mr?: string;
  name_en?: string;
  about_mr?: string;
  about_en?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_mr?: string;
  time_en?: string;
  keywords?: string;
  live_date?: string;
};

const TEXT_FIELDS = ['type', 'name_mr', 'name_en', 'about_mr', 'about_en', 'time_mr', 'time_en', 'keywords'] as const;

export function readPuzzleMeta(html: string): { meta: PuzzleMeta | null; error?: string } {
  const m = html.match(/<script[^>]*\bid\s*=\s*["']ck-meta["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return { meta: null };
  let raw: unknown;
  try {
    raw = JSON.parse(m[1]);
  } catch {
    return { meta: null, error: 'The details block (ck-meta) in this file is not valid JSON, so nothing was filled in.' };
  }
  if (!raw || typeof raw !== 'object') return { meta: null, error: 'The details block (ck-meta) is empty.' };
  const r = raw as Record<string, unknown>;
  const meta: PuzzleMeta = {};
  for (const k of TEXT_FIELDS) if (typeof r[k] === 'string' && (r[k] as string).trim()) meta[k] = (r[k] as string).trim().slice(0, 300);
  const d = String(r.difficulty ?? '').toLowerCase();
  if (d === 'easy' || d === 'medium' || d === 'hard') meta.difficulty = d;
  if (typeof r.live_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.live_date)) meta.live_date = r.live_date;
  return { meta };
}

/** Find the entry HTML inside a prepared upload and read its details block. */
export async function metaFromPrepared(prepared: { entry: string; files: { path: string; blob: Blob }[] }) {
  const f = prepared.files.find((x) => x.path === prepared.entry);
  if (!f) return { meta: null };
  return readPuzzleMeta(await f.blob.text());
}
