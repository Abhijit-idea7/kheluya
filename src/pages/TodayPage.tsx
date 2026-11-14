import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLivePuzzles } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { todayPuzzle } from '@/lib/next';
import KhelPage from '@/pages/KhelPage';
import Illustration from '@/components/Illustration';

/**
 * The front page: today's puzzle, ready to play. The same puzzle for everyone today.
 * An unfinished puzzle from another day never takes its place (it waits in "सर्व कोडी").
 */
export default function TodayPage() {
  const { t } = useTranslation();
  const { data: puzzles, loading, error } = useAsync(() => getLivePuzzles({ limit: 400 }), []);
  const p = puzzles ? todayPuzzle(puzzles) : null;

  if (loading) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-paper">
        <p className="text-xl font-heading font-bold animate-pulse">{t('play.loading')}</p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-paper p-6 text-center">
        <div className="max-w-md">
          <Illustration name="confused" alt={t('img.confused')} className="w-56 mx-auto mb-6" />
          <h1 className="text-heading-md">{error ? t('play.error') : t('today.none')}</h1>
          <Link to="/kodi" className="btn btn-primary mt-6">{t('play.allPuzzles')}</Link>
        </div>
      </div>
    );
  }
  return <KhelPage key={p.number} num={p.number} today />;
}
