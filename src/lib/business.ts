import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';

/**
 * The business behind the site — legal name, address, GSTIN, contact, grievance officer.
 * Typed once in Admin → Shop → Shop settings and shown on invoices, Contact, About, the policies and the footer.
 */
export type Business = {
  name: string;
  address: string;
  state: string;
  gstin: string;
  phone: string;
  email: string;
  grievance: string;
  hours: string;
  city: string;
  codMax: number;
  whatsapp: string;
};

export const FALLBACK_NAME = 'LearnTech Consulting';

export function businessFrom(s: Record<string, unknown>): Business {
  const str = (k: string) => (typeof s[k] === 'string' ? (s[k] as string).trim() : '');
  const phone = str('seller_phone');
  const digits = phone.replace(/[^0-9]/g, '');
  return {
    name: str('seller_name') || FALLBACK_NAME,
    address: str('seller_address'),
    state: str('seller_state'),
    gstin: str('seller_gstin'),
    phone,
    email: str('seller_email'),
    grievance: str('grievance_name'),
    hours: str('support_hours'),
    city: str('jurisdiction_city'),
    codMax: Number(s.cod_max_rupees ?? 2000) || 2000,
    whatsapp: digits ? `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}` : '',
  };
}

export function useBusiness(): Business | null {
  const { data } = useAsync(() => getPublicSettings(), []);
  return data ? businessFrom(data) : null;
}

/** Fill {{name}}-style blanks in a text. A blank with no value becomes "—". */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === '' ? '—' : String(v);
  });
}
