// Sample content shown only while the database is not yet connected.
import type { Puzzle, PuzzleType } from '@/lib/types';
import { addDays, istToday, mondayOf } from '@/lib/dates';

const t = (
  slug: string, name_mr: string, name_en: string, about_mr: string, about_en: string, tile: string, sort_order: number,
): PuzzleType => ({
  id: `sample-${slug}`, slug, name_mr, name_en, about_mr, about_en, how_mr: '', how_en: '', tile, color: '#F39200',
  card_image_path: null, sort_order, is_active: true,
});

export const sampleTypes: PuzzleType[] = [
  t('olkha-pahu', 'ओळखा पाहू', 'Olkha Pahu', 'गोंधळलेली अक्षरे जुळवून शब्द ओळखा.', 'Unscramble the letters to find the word.', 'ओ', 10),
  t('matra-sakhali', 'मात्रा-साखळी', 'Matra Chain', 'दर पायरीला एक अक्षर बदलून शब्दांची साखळी पूर्ण करा.', 'Change one letter per step to build a word chain.', 'मा', 20),
  t('akshar-sudoku', 'अक्षर-सुडोकू', 'Akshar Sudoku', 'अक्षरांचे सुडोकू सोडवा आणि लपलेले नाव शोधा.', 'Solve a letter sudoku and reveal a hidden name.', 'अ', 30),
  t('char-gat', 'चार गट', 'Char Gat', 'सोळा शब्दांचे चार लपलेले गट शोधा.', 'Sort sixteen words into four hidden groups.', 'चा', 40),
  t('guptalipi', 'गुप्तलिपी', 'Guptalipi', 'प्रत्येक आकड्यामागचे अक्षर ओळखून म्हणी उलगडा.', 'Crack the number code to reveal proverbs.', 'गु', 50),
  t('madhukosh', 'मधुकोश', 'Madhukosh', 'सात अक्षरांच्या पोळ्यातून जास्तीत जास्त शब्द बनवा.', 'Make words from a seven-letter honeycomb.', 'म', 60),
  t('shabdakode', 'शब्दकोडे', 'Shabdakode', 'बाराखडी पाटीवर टॅप करून शब्दकोडे सोडवा.', 'Fill a crossword with the tap-to-type letter board.', 'श', 70),
];

const times: Record<string, [string, string, Puzzle['difficulty']]> = {
  'olkha-pahu': ['५–८ मिनिटे', '5–8 min', 'easy'],
  'matra-sakhali': ['१०–१५ मिनिटे', '10–15 min', 'medium'],
  'akshar-sudoku': ['१०–२० मिनिटे', '10–20 min', 'medium'],
  'char-gat': ['१०–१५ मिनिटे', '10–15 min', 'medium'],
  guptalipi: ['१५–२५ मिनिटे', '15–25 min', 'hard'],
  madhukosh: ['दिवसभर', 'All day', 'medium'],
  shabdakode: ['२०–३० मिनिटे', '20–30 min', 'hard'],
};

/** One sample puzzle per day of the current week (Mon–Sun), live up to today. */
export function samplePuzzles(): Puzzle[] {
  const today = istToday();
  const mon = mondayOf(today);
  return sampleTypes.map((ty, i) => {
    const date = addDays(mon, i);
    const [tm, te, diff] = times[ty.slug];
    return {
      id: `sample-${i + 1}`, number: i + 1, type_id: ty.id, type: ty,
      name_mr: ty.name_mr, name_en: ty.name_en, about_mr: ty.about_mr, about_en: ty.about_en,
      keywords: ty.slug.replace(/-/g, ' '), difficulty: diff, time_mr: tm, time_en: te,
      live_date: date, status: date <= today ? 'live' : 'draft',
      file_folder: null, entry_file: null, file_version: 0, card_image_path: null, sample: true,
    } satisfies Puzzle;
  });
}
