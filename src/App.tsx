import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import Layout from '@/layout/Layout';
import HomePage from '@/pages/HomePage';
import KodiPage from '@/pages/KodiPage';
import PrakarPage from '@/pages/PrakarPage';
import KodiEkPage from '@/pages/KodiEkPage';
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

const AdminPage = lazy(() => import('@/pages/AdminPage'));

/** A new play page (and counting session) for every puzzle, also when moving from one to the next. */
function KhelRoute() {
  const { n } = useParams();
  return <KhelPage key={n} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/khel/:n" element={<KhelRoute />} />
        <Route path="/admin/*" element={<Suspense fallback={<p className="p-6">Loading…</p>}><AdminPage /></Suspense>} />
        <Route path="/:n" element={<ShortNumberRedirect />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/kodi" element={<KodiPage />} />
          <Route path="/prakar/:type" element={<PrakarPage />} />
          <Route path="/k/:n" element={<KodiEkPage />} />
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
