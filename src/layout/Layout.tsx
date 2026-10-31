import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-content mx-auto pb-24">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
