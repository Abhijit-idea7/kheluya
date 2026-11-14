import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from '@/layout/Layout';
import TodayPage from '@/pages/TodayPage';
import KodiPage from '@/pages/KodiPage';
import MajhaKhelPage from '@/pages/MajhaKhelPage';
import KhelPage from '@/pages/KhelPage';
import MadatPage from '@/pages/MadatPage';
import KutumbPage from '@/pages/KutumbPage';
import AmchyabaddalPage from '@/pages/AmchyabaddalPage';
import SamparkPage from '@/pages/SamparkPage';
import SuchanaPage from '@/pages/SuchanaPage';
import DukanPage from '@/pages/DukanPage';
import DukanProductPage from '@/pages/DukanProductPage';
import PishviPage from '@/pages/PishviPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderPage from '@/pages/OrderPage';
import MajhiOrderPage from '@/pages/MajhiOrderPage';
import {
  DhoranPrivacyPage,
  DhoranTermsPage,
  DhoranShippingPage,
  DhoranRefundsPage,
} from '@/pages/DhoranPages';
import NotFoundPage from '@/pages/NotFoundPage';
import ShortNumberRedirect from '@/pages/ShortNumberRedirect';
import StaleGuard from '@/components/StaleGuard';

const AdminPage = lazy(() => import('@/pages/AdminPage'));

/** A new play page (and counting session) for every puzzle, also when moving from one to the next. */
function KhelRoute() {
  const { n } = useParams();
  return <KhelPage key={n} num={Number(n)} />;
}

/** Old puzzle info pages (/k/12) now open the puzzle itself. */
function OldInfoRedirect() {
  const { n } = useParams();
  return <Navigate to={`/khel/${n}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <StaleGuard />
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/khel/:n" element={<KhelRoute />} />
        <Route path="/admin/*" element={<Suspense fallback={<p className="p-6">Loading…</p>}><AdminPage /></Suspense>} />
        <Route path="/:n" element={<ShortNumberRedirect />} />
        <Route element={<Layout />}>
          <Route path="/kodi" element={<KodiPage />} />
          <Route path="/majha-khel" element={<MajhaKhelPage />} />
          <Route path="/prakar/:type" element={<Navigate to="/kodi" replace />} />
          <Route path="/k/:n" element={<OldInfoRedirect />} />
          <Route path="/madat" element={<MadatPage />} />
          <Route path="/kutumb" element={<KutumbPage />} />
          <Route path="/amchyabaddal" element={<AmchyabaddalPage />} />
          <Route path="/sampark" element={<SamparkPage />} />
          <Route path="/suchana" element={<SuchanaPage />} />
          <Route path="/dukan" element={<DukanPage />} />
          <Route path="/dukan/:slug" element={<DukanProductPage />} />
          <Route path="/pishvi" element={<PishviPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/majhi-order" element={<MajhiOrderPage />} />
          <Route path="/dhoran/privacy" element={<DhoranPrivacyPage />} />
          <Route path="/dhoran/terms" element={<DhoranTermsPage />} />
          <Route path="/dhoran/shipping" element={<DhoranShippingPage />} />
          <Route path="/dhoran/refunds" element={<DhoranRefundsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
