import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import AdminShopOrders from '@/admin/shop/AdminShopOrders';
import AdminShopProducts from '@/admin/shop/AdminShopProducts';
import AdminShopCustomers from '@/admin/shop/AdminShopCustomers';
import AdminShopSettings from '@/admin/shop/AdminShopSettings';

/** Admin → Shop: orders, products, customers, settings. */
export default function AdminShop() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `text-center whitespace-nowrap px-1 sm:px-4 py-2 rounded-xl border-2 font-bold text-sm sm:text-base ${isActive ? 'bg-orange-soft border-ink' : 'bg-white border-line'}`;
  return (
    <div className="grid gap-4 sm:gap-5 min-w-0">
      <div className="grid gap-2 sm:flex sm:items-center">
        <h1 className="text-2xl sm:text-3xl sm:mr-4">Shop</h1>
        <nav className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2">
          <NavLink to="/admin/shop/orders" className={tab}>Orders</NavLink>
          <NavLink to="/admin/shop/products" className={tab}>Products</NavLink>
          <NavLink to="/admin/shop/customers" className={tab}>Customers</NavLink>
          <NavLink to="/admin/shop/settings" className={tab}>Settings</NavLink>
        </nav>
      </div>
      <Routes>
        <Route index element={<Navigate to="/admin/shop/orders" replace />} />
        <Route path="orders" element={<AdminShopOrders />} />
        <Route path="products" element={<AdminShopProducts />} />
        <Route path="customers" element={<AdminShopCustomers />} />
        <Route path="settings" element={<AdminShopSettings />} />
        <Route path="*" element={<Navigate to="/admin/shop/orders" replace />} />
      </Routes>
    </div>
  );
}
