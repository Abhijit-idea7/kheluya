import { Navigate, useLocation, useParams } from 'react-router-dom';
import NotFoundPage from '@/pages/NotFoundPage';
import Layout from '@/layout/Layout';

/**
 * kheluya.in/12 forwards here as chalakheluya.com/12 → send it to the puzzle page /k/12,
 * keeping the ?s= share tag. Anything that is not a number is a normal "not found".
 */
export default function ShortNumberRedirect() {
  const { n } = useParams();
  const { search } = useLocation();
  if (n && /^\d{1,6}$/.test(n)) return <Navigate to={`/k/${Number(n)}${search}`} replace />;
  return <Layout notFound={<NotFoundPage />} />;
}
