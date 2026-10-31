import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import PuzzleCard from '@/components/PuzzleCard';
import Illustration from '@/components/Illustration';
import { getLivePuzzles, getPlayCounts, getTypes } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';

export default function KodiPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const [typeId, setTypeId] = useState<string>('');
  const [query, setQuery] = useState('');

  const types = useAsync(() => getTypes(), []);
  const puzzles = useAsync(() => getLivePuzzles(), []);
  const counts = useAsync(() => getPlayCounts(), []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (puzzles.data ?? []).filter((p) => {
      if (typeId && p.type_id !== typeId) return false;
      if (!q) return true;
      const hay = [p.name_mr, p.name_en, p.keywords, p.type?.name_mr, p.type?.name_en, p.type?.slug, String(p.number)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [puzzles.data, typeId, query]);

  const chip = (active: boolean) =>
    `min-h-[3rem] px-4 rounded-2xl border-[3px] border-ink font-heading font-bold text-lg ${
      active ? 'bg-orange shadow-[0_3px_0_0_#10233F]' : 'bg-paper'
    }`;

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-6 sm:py-10">
      <h1 className="text-heading-lg">{t('pages.kodi.heading')}</h1>
      <p className="mt-2 text-ink/80">{t('pages.kodi.description')}</p>

      <label className="mt-6 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-paper px-4 min-h-touch max-w-xl">
        <Search size={24} strokeWidth={2.6} aria-hidden="true" />
        <span className="sr-only">{t('kodi.search')}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('kodi.searchHint')}
          className="flex-1 bg-transparent outline-none text-xl py-3 placeholder:text-ink/45"
          inputMode="search"
          autoCapitalize="none"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t('kodi.types')}>
        <button type="button" className={chip(typeId === '')} aria-pressed={typeId === ''} onClick={() => setTypeId('')}>
          {t('kodi.all')}
        </button>
        {(types.data ?? []).map((ty) => (
          <button key={ty.id} type="button" className={chip(typeId === ty.id)} aria-pressed={typeId === ty.id} onClick={() => setTypeId(ty.id)}>
            {pick(ty, 'name', lang)}
          </button>
        ))}
      </div>
      {typeId && types.data && (
        <Link to={`/prakar/${types.data.find((x) => x.id === typeId)?.slug}`} className="inline-block mt-3 text-lg font-bold underline underline-offset-4">
          {t('kodi.aboutType')}
        </Link>
      )}

      {puzzles.loading ? (
        <p className="mt-10 text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
      ) : shown.length === 0 ? (
        <div className="mt-10 text-center">
          <Illustration name="confused" alt={t('img.confused')} className="w-48 mx-auto mb-4" />
          <p className="text-xl">{t('kodi.none')}</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <PuzzleCard puzzle={p} plays={counts.data?.[p.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
