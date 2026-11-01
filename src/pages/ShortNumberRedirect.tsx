import { Navigate, useLocation, useParams } from 'react-router-dom';
import NotFoundPage from '@/pages/NotFoundPage';
import Layout from '@/layout/Layout';

/**
 * kheluya.in/12 forwards here as chalakheluya.com/12 → send it straight into the puzzle /khel/12
 * (not the info page: people tapping a friend's link expect the game), keeping the ?s= share tag. Anything that is not a number is a normal "not found".
 */
export default function ShortNumberRedirect() {
  const { n } = useParams();
  const { search } = useLocation();
  if (n && /^\d{1,6}$/.test(n)) return <Navigate to={`/khel/${Number(n)}${search}`} replace />;
  return <Layout notFound={<NotFoundPage />} />;
}
