// Temporary sample data for the seven prototype puzzles.
// Replaced by the puzzles table once the database is added.

export type Lang = 'mr' | 'en';
type L = Record<Lang, string>;

export type SamplePuzzle = {
  number: number;
  dayIndex: number; // 0 = Sunday … 6 = Saturday (JavaScript getDay)
  tile: string; // the akshara shown on the day tile
  day: L;
  name: L;
  about: L;
  time: L;
  level: L;
};

export const sampleWeek: SamplePuzzle[] = [
  {
    number: 1, dayIndex: 1, tile: 'सो',
    day: { mr: 'सोमवार', en: 'Monday' },
    name: { mr: 'ओळखा पाहू', en: 'Olkha Pahu' },
    about: { mr: 'गोंधळलेली अक्षरे जुळवून शब्द ओळखा.', en: 'Unscramble the letters to find the word.' },
    time: { mr: '५–८ मिनिटे', en: '5–8 min' },
    level: { mr: 'सोपे', en: 'Easy' },
  },
  {
    number: 2, dayIndex: 2, tile: 'मं',
    day: { mr: 'मंगळवार', en: 'Tuesday' },
    name: { mr: 'मात्रा-साखळी', en: 'Matra Chain' },
    about: { mr: 'दर पायरीला एक अक्षर बदलून शब्दांची साखळी पूर्ण करा.', en: 'Change one letter per step to build a word chain.' },
    time: { mr: '१०–१५ मिनिटे', en: '10–15 min' },
    level: { mr: 'मध्यम', en: 'Medium' },
  },
  {
    number: 3, dayIndex: 3, tile: 'बु',
    day: { mr: 'बुधवार', en: 'Wednesday' },
    name: { mr: 'अक्षर-सुडोकू', en: 'Akshar Sudoku' },
    about: { mr: 'सहा अक्षरांचे सुडोकू सोडवा आणि लपलेले नाव शोधा.', en: 'Solve a six-letter sudoku and reveal a hidden name.' },
    time: { mr: '१०–२० मिनिटे', en: '10–20 min' },
    level: { mr: 'मध्यम', en: 'Medium' },
  },
  {
    number: 4, dayIndex: 4, tile: 'गु',
    day: { mr: 'गुरुवार', en: 'Thursday' },
    name: { mr: 'चार गट', en: 'Char Gat' },
    about: { mr: 'सोळा शब्दांचे चार लपलेले गट शोधा.', en: 'Sort sixteen words into four hidden groups.' },
    time: { mr: '१०–१५ मिनिटे', en: '10–15 min' },
    level: { mr: 'मध्यम', en: 'Medium' },
  },
  {
    number: 5, dayIndex: 5, tile: 'शु',
    day: { mr: 'शुक्रवार', en: 'Friday' },
    name: { mr: 'गुप्तलिपी', en: 'Guptalipi' },
    about: { mr: 'प्रत्येक आकड्यामागचे अक्षर ओळखून म्हणी उलगडा.', en: 'Crack the number code to reveal four proverbs.' },
    time: { mr: '१५–२५ मिनिटे', en: '15–25 min' },
    level: { mr: 'कठीण', en: 'Hard' },
  },
  {
    number: 6, dayIndex: 6, tile: 'श',
    day: { mr: 'शनिवार', en: 'Saturday' },
    name: { mr: 'मधुकोश', en: 'Madhukosh' },
    about: { mr: 'सात अक्षरांच्या पोळ्यातून जास्तीत जास्त शब्द बनवा.', en: 'Make as many words as you can from a seven-letter honeycomb.' },
    time: { mr: 'दिवसभर', en: 'All day' },
    level: { mr: 'मध्यम', en: 'Medium' },
  },
  {
    number: 7, dayIndex: 0, tile: 'र',
    day: { mr: 'रविवार', en: 'Sunday' },
    name: { mr: 'शब्दकोडे', en: 'Shabdakode' },
    about: { mr: 'बाराखडी पाटीवर टॅप करून ७×७ शब्दकोडे सोडवा.', en: 'Fill a 7×7 crossword with the tap-to-type letter board.' },
    time: { mr: '२०–३० मिनिटे', en: '20–30 min' },
    level: { mr: 'कठीण', en: 'Hard' },
  },
];

/** India-time weekday, so "today" flips at midnight IST wherever the server is. */
export function todayIndexIST(now = new Date()): number {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist.getDay();
}
