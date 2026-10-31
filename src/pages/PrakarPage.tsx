import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Tile from '@/components/Tile';
import PuzzleCard from '@/components/PuzzleCard';
import { getLivePuzzles, getPlayCounts, getTypes } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { pick, type Lang } from '@/lib/types';

export default function PrakarPage() {
  const { type: slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';

  const types = useAsync(() => getTypes(), []);
  const type = types.data?.find((x) => x.slug === slug) ?? null;
  const puzzles = useAsync(() => (type ? getLivePuzzles({ typeId: type.id }) : Promise.resolve([])), [type?.id]);
  const counts = useAsync(() => getPlayCounts(), []);

  return (
    <div className="max-w-site mx-auto px-4 sm:px-5 py-6 sm:py-10">
      <Link to="/kodi" className="btn btn-quiet text-xl mb-6">
        <ArrowLeft size={24} strokeWidth={2.6} aria-hidden="true" />
        {t('play.allPuzzles')}
      </Link>
      {types.loading ? (
        <p className="text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
      ) : !type ? (
        <h1 className="text-heading-md">{t('kodi.typeMissing')}</h1>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Tile char={type.tile} size={76} tilt={-4} className="shrink-0" />
            <h1 className="text-heading-lg">{pick(type, 'name', lang)}</h1>
          </div>
          {pick(type, 'about', lang) && <p className="mt-4 text-[1.35rem] max-w-2xl">{pick(type, 'about', lang)}</p>}
          {pick(type, 'how', lang) && (
            <section className="mt-6 max-w-2xl rounded-3xl border-[3px] border-ink bg-paper p-5 sm:p-6">
              <h2 className="text-heading-sm">{t('puzzle.howToPlay')}</h2>
              <p className="mt-2 text-lg leading-relaxed whitespace-pre-line">{pick(type, 'how', lang)}</p>
            </section>
          )}
          <h2 className="mt-10 text-heading-md">{t('kodi.allOfType')}</h2>
          {(puzzles.data ?? []).length === 0 && !puzzles.loading ? (
            <p className="mt-4 text-xl">{t('kodi.none')}</p>
          ) : (
            <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(puzzles.data ?? []).map((p) => (
                <li key={p.id}>
                  <PuzzleCard puzzle={p} plays={counts.data?.[p.id]} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
