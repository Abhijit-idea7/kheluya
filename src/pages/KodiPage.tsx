import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import PuzzleCard from '@/components/PuzzleCard';
import { isQuick } from '@/lib/suggest';
import Illustration from '@/components/Illustration';
import { getLivePuzzles, getPlayCounts, getTypes } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';

export default function KodiPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const [typeId, setTypeId] = useState<string>('');
  const [group, setGroup] = useState<'all' | 'daily' | 'quick'>('all');
  const [query, setQuery] = useState('');

  const types = useAsync(() => getTypes(), []);
  const puzzles = useAsync(() => getLivePuzzles(), []);
  const counts = useAsync(() => getPlayCounts(), []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (puzzles.data ?? []).filter((p) => {
      if (typeId && p.type_id !== typeId) return false;
      if (group === 'daily' && isQuick(p)) return false;
      if (group === 'quick' && !isQuick(p)) return false;
      if (!q) return true;
      const hay = [p.name_mr, p.name_en, p.keywords, p.type?.name_mr, p.type?.name_en, p.type?.slug, String(p.number)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [puzzles.data, typeId, query, group]);
  const typeOptions = (types.data ?? []).filter((ty) => group === 'all' || (group === 'quick') === !!ty.is_quick);

  const tab = (active: boolean) =>
    `min-h-[2.75rem] px-4 rounded-xl font-heading font-bold text-lg ${active ? 'bg-paper border-2 border-ink shadow-[0_2px_0_0_#10233F]' : 'text-ink/70'}`;

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-4 sm:py-8">
      <h1 className="text-heading-lg">{t('pages.kodi.heading')}</h1>
      <p className="mt-1 text-lg text-ink/75">{t('pages.kodi.description')}</p>

      <div className="mt-4 inline-flex gap-1 rounded-2xl bg-[#EFE8D8] p-1" role="group" aria-label={t('kodi.types')}>
        {(['all', 'daily', 'quick'] as const).map((g) => (
          <button key={g} type="button" className={tab(group === g)} aria-pressed={group === g} onClick={() => { setGroup(g); setTypeId(''); }}>
            {t(g === 'all' ? 'kodi.tabAll' : g === 'daily' ? 'kodi.tabDaily' : 'kodi.tabQuick')}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] max-w-2xl">
        <label className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-paper px-3 min-h-touch">
          <Search size={20} strokeWidth={2.6} aria-hidden="true" />
          <span className="sr-only">{t('kodi.search')}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('kodi.searchHint')}
            className="flex-1 min-w-0 bg-transparent outline-none text-lg py-2 placeholder:text-ink/45"
            inputMode="search"
            autoCapitalize="none"
          />
        </label>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          aria-label={t('kodi.types')}
          className="min-h-touch rounded-2xl border-[3px] border-ink bg-paper px-3 text-lg font-bold"
        >
          <option value="">{t('kodi.anyType')}</option>
          {typeOptions.map((ty) => (
            <option key={ty.id} value={ty.id}>{pick(ty, 'name', lang)}</option>
          ))}
        </select>
      </div>
      {typeId && types.data && (
        <Link to={`/prakar/${types.data.find((x) => x.id === typeId)?.slug}`} className="inline-block mt-2 text-lg font-bold underline underline-offset-4">
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
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
