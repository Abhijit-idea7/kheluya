// चला खेळूया shop, browser side: catalogue, cart, customer details remembered on this phone, orders and payment.
import { useEffect, useState } from 'react';
import { supabase, publicFileUrl } from '@/lib/supabase';
import { mrDigits } from '@/lib/dates';
import { playerId } from '@/lib/track';

export type Category = { id: string; slug: string; name_mr: string; name_en: string };
export type Spec = { label_mr?: string; value_mr?: string; label_en?: string; value_en?: string };
export type Product = {
  id: string; slug: string; category_id: string | null; name_mr: string; name_en: string; short_mr: string; short_en: string;
  description_mr: string; description_en: string; price_paise: number; mrp_paise: number | null; images: string[]; specs: Spec[];
  max_per_order: number; coming_soon: boolean; in_stock: boolean; few_left: boolean;
};
export type Catalog = { categories: Category[]; products: Product[] };
export type CartLine = { id: string; qty: number };
export type Address = { line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
export type Customer = { name: string; phone: string; email: string; address: Address };
export type OrderItem = { name_mr: string; name_en: string; hsn: string; gst_rate: number; qty: number; unit_price_paise: number; line_total_paise: number; taxable_paise: number; tax_paise: number };
export type Pay = 'razorpay' | 'upi' | 'cod';
export type Order = {
  order_no: string; access_key: string; status: string; payment_method: Pay; payment_status: string;
  subtotal_paise: number; shipping_paise: number; total_paise: number; taxable_paise: number; cgst_paise: number; sgst_paise: number; igst_paise: number;
  created_at: string; paid_at: string | null; shipped_at: string | null; delivered_at: string | null;
  ship: Address & { name: string; phone: string };
  courier: string; tracking_no: string; tracking_url: string; invoice_no: string | null; invoice_date: string | null;
  seller: { name?: string; gstin?: string; address?: string; state?: string; phone?: string; email?: string };
  cancel_reason: string; razorpay_payment_id: string | null; upi_ref?: string | null; upi_submitted_at?: string | null; items: OrderItem[]; events: { status: string; note: string; at: string }[];
};

/** A single JSON value from an RPC (tolerating a one-row table shape). */
function one<T>(data: unknown): T | null {
  const v = Array.isArray(data) && data.length && typeof data[0] === 'object' && !('order_no' in (data[0] as object))
    ? Object.values(data[0] as Record<string, unknown>)[0]
    : data;
  return (v ?? null) as T | null;
}

export const imageUrl = (path: string) => (/^https?:\/\//.test(path) ? path : publicFileUrl(path));
export const pickLang = (o: Record<string, unknown>, field: string, lang: 'mr' | 'en') =>
  String((lang === 'en' && o[`${field}_en`]) || o[`${field}_mr`] || '');

/** ₹299 / ₹२९९ — whole rupees unless there are paise */
export function money(paise: number, lang: 'mr' | 'en' = 'mr'): string {
  const r = paise / 100;
  const s = r.toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `₹${lang === 'mr' ? mrDigits(s) : s}`;
}

export async function getCatalog(): Promise<Catalog> {
  if (!supabase) return { categories: [], products: [] };
  const { data, error } = await supabase.rpc('shop_catalog');
  if (error) throw error;
  const c = one<Catalog>(data);
  return { categories: c?.categories ?? [], products: (c?.products ?? []).map((p) => ({ ...p, specs: Array.isArray(p.specs) ? p.specs : [] })) };
}

// ---------- cart (on this phone) ----------
const CART_KEY = 'ck-cart';
const CART_EVENT = 'ck-cart';
export function readCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(v) ? v.filter((l) => l && typeof l.id === 'string' && Number(l.qty) > 0).map((l) => ({ id: l.id, qty: Math.min(100, Math.floor(Number(l.qty))) })) : [];
  } catch {
    return [];
  }
}
function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CART_EVENT));
}
export function setQty(id: string, qty: number, max = 10) {
  const lines = readCart().filter((l) => l.id !== id);
  if (qty > 0) lines.push({ id, qty: Math.min(qty, max) });
  writeCart(lines.sort((a, b) => a.id.localeCompare(b.id)));
}
export function addToCart(id: string, qty = 1, max = 10) {
  const cur = readCart().find((l) => l.id === id)?.qty ?? 0;
  setQty(id, cur + qty, max);
}
export const clearCart = () => writeCart([]);
/** The cart, kept up to date across the page (and other tabs). */
export function useCart(): CartLine[] {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  useEffect(() => {
    const on = () => setLines(readCart());
    window.addEventListener(CART_EVENT, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(CART_EVENT, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  return lines;
}

// ---------- customer details and orders remembered on this phone ----------
const CUSTOMER_KEY = 'ck-customer';
const ORDERS_KEY = 'ck-orders';
export function savedCustomer(): Customer | null {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null');
  } catch {
    return null;
  }
}
export function saveCustomer(c: Customer) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
export function savedOrders(): { order_no: string; key: string; at: number }[] {
  try {
    const v = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function rememberOrder(order_no: string, key: string) {
  const list = savedOrders().filter((o) => o.order_no !== order_no);
  list.unshift({ order_no, key, at: Date.now() });
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

// ---------- orders ----------
export type PlaceResult = { order_no: string; access_key: string; total_paise: number; status: string; payment: Pay };
/** Error codes from the database, e.g. OUT_OF_STOCK:<name> → { code, detail } */
export function shopError(e: unknown): { code: string; detail: string } {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  const hit = /([A-Z_]{4,})(?::(.*))?/.exec(m);
  return hit ? { code: hit[1], detail: (hit[2] ?? '').trim() } : { code: 'UNKNOWN', detail: m };
}
export async function placeOrder(c: Customer, lines: CartLine[], payment: Pay, note: string): Promise<PlaceResult> {
  if (!supabase) throw new Error('OFFLINE');
  const { data, error } = await supabase.rpc('shop_place_order', {
    p: {
      items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      payment,
      note,
      customer: { name: c.name, phone: c.phone, email: c.email },
      address: c.address,
      player_id: playerId(),
    },
  });
  if (error) throw error;
  const r = one<PlaceResult>(data)!;
  rememberOrder(r.order_no, r.access_key);
  return r;
}
/** After paying by UPI the customer types the reference number; the owner then checks it. */
export async function submitUpiRef(orderNo: string, key: string, ref: string): Promise<void> {
  if (!supabase) throw new Error('OFFLINE');
  const { error } = await supabase.rpc('shop_upi_submit', { p_order_no: orderNo, p_key: key, p_ref: ref });
  if (error) throw error;
}

/** UPI payment link: opens Google Pay / PhonePe / Paytm with the amount filled in. */
export function upiLink(upiId: string, payee: string, paise: number, orderNo: string): string {
  const q = new URLSearchParams({ pa: upiId, pn: payee || 'Chala Kheluya', am: (paise / 100).toFixed(2), cu: 'INR', tn: `Order ${orderNo}` });
  return `upi://pay?${q.toString().replace(/\+/g, '%20').replace(/%40/g, '@')}`;
}

export async function getOrder(orderNo: string, key: string): Promise<Order | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('shop_get_order', { p_order_no: orderNo, p_key: key });
  if (error) throw error;
  return one<Order>(data);
}
/** Unfinished checkout / "please contact me": saved so the shop can help on WhatsApp. Never throws. */
export async function saveLead(l: { phone: string; name?: string; city?: string; pincode?: string; items?: CartLine[]; source?: 'checkout' | 'ask'; question?: string }) {
  if (!supabase) return;
  try {
    await supabase.rpc('shop_save_lead', { p: { ...l, items: (l.items ?? []).map((i) => ({ id: i.id, qty: i.qty })), player_id: playerId() } });
  } catch {
    /* not important enough to bother the customer */
  }
}

/** Orders for a mobile number + delivery pincode (the "where is my order" page). */
export async function trackOrders(phone: string, pincode: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('shop_track', { p_phone: phone, p_pincode: pincode });
  if (error) throw error;
  const v = one<{ order_no: string; access_key: string; status: string; total_paise: number; created_at: string }[]>(data);
  return Array.isArray(v) ? v : [];
}
export async function ordersForPhone(phone: string, orderNo: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('shop_orders_for_phone', { p_phone: phone, p_order_no: orderNo });
  if (error) throw error;
  const v = one<{ order_no: string; access_key: string; status: string; total_paise: number; created_at: string }[]>(data);
  return Array.isArray(v) ? v : null;
}

// ---------- Razorpay payment ----------
declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: unknown) => void) => void };
  }
}
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('CHECKOUT_LOAD'));
    document.head.appendChild(s);
  });
}
/**
 * Opens Razorpay's payment window for an order. Resolves 'paid', 'closed' (customer closed it — the order waits,
 * and can be paid later from the order page) or throws.
 */
export async function payOnline(orderNo: string, key: string, title: string): Promise<'paid' | 'closed'> {
  if (!supabase) throw new Error('OFFLINE');
  const { data, error } = await supabase.functions.invoke('shop-pay', { body: { mode: 'create', order_no: orderNo, key } });
  if (error) throw new Error(((await (error as { context?: Response }).context?.json?.().catch(() => null)) as { error?: string } | null)?.error ?? error.message);
  const r = data as { paid?: boolean; key_id: string; razorpay_order_id: string; amount: number; prefill: Record<string, string> };
  if (r.paid) return 'paid';
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: r.key_id,
      order_id: r.razorpay_order_id,
      amount: r.amount,
      currency: 'INR',
      name: 'चला खेळूया',
      description: title,
      prefill: r.prefill,
      theme: { color: '#F39200' },
      modal: { ondismiss: () => resolve('closed'), confirm_close: true },
      handler: async (resp: Record<string, string>) => {
        const v = await supabase!.functions.invoke('shop-pay', { body: { mode: 'verify', order_no: orderNo, key, ...resp } });
        if (v.error) reject(new Error('PAYMENT_NOT_VERIFIED'));
        else resolve('paid');
      },
    });
    rzp.open();
  });
}

export const STATES = [
  'Maharashtra', 'Goa', 'Gujarat', 'Karnataka', 'Madhya Pradesh', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala', 'Delhi',
  'Rajasthan', 'Uttar Pradesh', 'Chhattisgarh', 'Odisha', 'West Bengal', 'Bihar', 'Jharkhand', 'Punjab', 'Haryana', 'Himachal Pradesh',
  'Uttarakhand', 'Jammu and Kashmir', 'Ladakh', 'Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim',
  'Tripura', 'Chandigarh', 'Puducherry', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Andaman and Nicobar Islands',
];
export const STATES_MR: Record<string, string> = {
  Maharashtra: 'महाराष्ट्र', Goa: 'गोवा', Gujarat: 'गुजरात', Karnataka: 'कर्नाटक', 'Madhya Pradesh': 'मध्य प्रदेश', Telangana: 'तेलंगणा',
  'Andhra Pradesh': 'आंध्र प्रदेश', 'Tamil Nadu': 'तमिळनाडू', Kerala: 'केरळ', Delhi: 'दिल्ली', Rajasthan: 'राजस्थान', 'Uttar Pradesh': 'उत्तर प्रदेश',
  Chhattisgarh: 'छत्तीसगड',
};

/** Order steps shown to the customer */
export const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'] as const;
