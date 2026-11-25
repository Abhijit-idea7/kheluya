import { supabase } from '@/lib/supabase';

/** Call an admin function and return its single JSON value (tolerating a one-row table shape). */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase!.rpc(name, args);
  if (error) throw new Error(error.message);
  const v = Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === 'object' && Object.keys(data[0]).length === 1 && Object.keys(data[0])[0] === name
    ? Object.values(data[0])[0]
    : data;
  return v as T;
}

export const rs = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment', placed: 'New', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
export const PAY_LABEL: Record<string, string> = {
  unpaid: 'Unpaid', verifying: 'UPI – check payment', paid: 'Paid', cod_pending: 'COD – to collect', cod_collected: 'COD – collected', refund_due: 'Refund due', refunded: 'Refunded',
};
export const METHOD_LABEL: Record<string, string> = { razorpay: 'Online (Razorpay)', upi: 'UPI to shop', cod: 'Cash on delivery' };
export const STATUS_TONE: Record<string, string> = {
  pending_payment: 'bg-cream text-ink/70', placed: 'bg-orange text-ink', confirmed: 'bg-orange-soft', packed: 'bg-orange-soft',
  shipped: 'bg-[#E3EEFB] text-[#0C447C]', delivered: 'bg-green-soft text-[#1F5E2A]', cancelled: 'bg-[#FDECEA] text-[#8A1C14]',
};
