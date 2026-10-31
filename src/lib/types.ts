export type Lang = 'mr' | 'en';

export type PuzzleType = {
  id: string;
  slug: string;
  name_mr: string;
  name_en: string;
  about_mr: string;
  about_en: string;
  how_mr: string;
  how_en: string;
  tile: string;
  color: string;
  card_image_path: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Puzzle = {
  id: string;
  number: number;
  type_id: string;
  name_mr: string;
  name_en: string;
  about_mr: string;
  about_en: string;
  keywords: string;
  difficulty: Difficulty;
  time_mr: string;
  time_en: string;
  live_date: string | null; // YYYY-MM-DD
  status: 'draft' | 'live' | 'archived';
  file_folder: string | null;
  entry_file: string | null;
  file_version: number;
  card_image_path: string | null;
  type?: PuzzleType;
  /** true for the built-in sample puzzles shown before the database is connected */
  sample?: boolean;
};

export const pick = <T extends Record<string, unknown>>(o: T, field: string, lang: Lang): string => {
  const v = o[`${field}_${lang}`] as string | undefined;
  return v && v.trim() ? v : ((o[`${field}_mr`] as string | undefined) ?? '');
};
