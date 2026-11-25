import { useEffect, useState } from 'react';
import { btnQuiet, Card, downloadCsv, input } from '@/admin/ui';
import { rpc, rs, when } from '@/admin/shop/rpc';

type Cust = { name: string; phone: string; email: string; created_at: string; orders: number; spent_paise: number; last_order: string | null; last_address: Record<string, string> };

/** Customers: everyone who has ordered, with their orders and spend. */
export default function AdminShopCustomers() {
  const [rows, setRows] = useState<Cust[] | null>(null);
  const [q, setQ] = useState('');
  const load = () => rpc<Cust[]>('admin_shop_customers', { p_search: q || null }).then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold mr-auto">Customers {rows ? `(${rows.length})` : ''}</h2>
        <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className={`${input} !w-full sm:!w-56 !py-1.5 min-w-0`} type="search" placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={`${btnQuiet} !py-1`}>Search</button>
        </form>
        <button className={btnQuiet} disabled={!rows?.length} onClick={() => downloadCsv('chala-kheluya-customers.csv', (rows ?? []).map((c) => ({
          name: c.name, phone: c.phone, email: c.email, orders: c.orders, spent_rupees: c.spent_paise / 100, last_order: c.last_order ?? '',
          city: c.last_address?.city ?? '', state: c.last_address?.state ?? '', pincode: c.last_address?.pincode ?? '',
        })))}>Download CSV</button>
      </div>
      {!rows ? <p className="animate-pulse">Loading…</p> : rows.length === 0 ? <Card>No customers yet.</Card> : (
        <>
        <ul className="grid gap-2 md:hidden">
          {rows.map((c) => (
            <li key={c.phone} className="rounded-2xl border-2 border-ink bg-paper p-3">
              <div className="flex items-center gap-2"><b className="text-lg">{c.name}</b><span className="ml-auto tabular-nums font-bold">{rs(c.spent_paise)}</span></div>
              <div className="text-sm text-ink/65">{[c.last_address?.city, c.last_address?.state].filter(Boolean).join(', ')} · {c.orders} order{c.orders === 1 ? '' : 's'} · last {c.last_order ? when(c.last_order) : '—'}</div>
              <div className="mt-2 flex gap-2">
                <a className={`${btnQuiet} !py-1`} href={`tel:${c.phone}`}>{c.phone}</a>
                <a className={`${btnQuiet} !py-1`} href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream"><tr>{['Name', 'Phone', 'Place', 'Orders', 'Spent', 'Last order', ''].map((h) => <th key={h} className="p-2.5">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.phone} className="border-t border-line">
                  <td className="p-2.5 font-bold">{c.name}</td>
                  <td className="p-2.5 tabular-nums">{c.phone}</td>
                  <td className="p-2.5">{[c.last_address?.city, c.last_address?.state].filter(Boolean).join(', ')}</td>
                  <td className="p-2.5 tabular-nums">{c.orders}</td>
                  <td className="p-2.5 tabular-nums">{rs(c.spent_paise)}</td>
                  <td className="p-2.5 whitespace-nowrap">{c.last_order ? when(c.last_order) : '—'}</td>
                  <td className="p-2.5"><a className={`${btnQuiet} !py-0.5`} href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer">WhatsApp</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
