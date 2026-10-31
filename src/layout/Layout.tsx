import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';

export default function Layout({ notFound }: { notFound?: React.ReactNode } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full">
        {notFound ?? <Outlet />}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
