import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import AdminShopOrders from '@/admin/shop/AdminShopOrders';
import AdminShopProducts from '@/admin/shop/AdminShopProducts';
import AdminShopCustomers from '@/admin/shop/AdminShopCustomers';
import AdminShopSettings from '@/admin/shop/AdminShopSettings';

/** Admin → Shop: orders, products, customers, settings. */
export default function AdminShop() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-xl border-2 font-bold ${isActive ? 'bg-orange-soft border-ink' : 'bg-white border-line'}`;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl mr-4">Shop</h1>
        <NavLink to="/admin/shop/orders" className={tab}>Orders</NavLink>
        <NavLink to="/admin/shop/products" className={tab}>Products</NavLink>
        <NavLink to="/admin/shop/customers" className={tab}>Customers</NavLink>
        <NavLink to="/admin/shop/settings" className={tab}>Shop settings</NavLink>
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
