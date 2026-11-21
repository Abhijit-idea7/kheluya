import { useParams, useSearchParams } from 'react-router-dom';
import { useAsync } from '@/lib/useAsync';
import { getOrder, type Order } from '@/lib/shop';

const rs = (paise: number) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Indian-style amount in words, e.g. 1188 → "One Thousand One Hundred Eighty Eight" */
function words(n: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ' ' + a[x % 10] : ''}`);
  const three = (x: number) => `${x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : ''}${x % 100 ? two(x % 100) : ''}`;
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1000), rest = n % 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (th) parts.push(`${two(th)} Thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(' ');
}

/**
 * Printable GST tax invoice (or, with ?label=1, a large address label for the parcel).
 * Opened from the order page / Admin with the order's link key.
 */
export default function InvoicePage() {
  const { id = '' } = useParams();
  const [q] = useSearchParams();
  const label = q.get('label') === '1';
  const { data: o, loading } = useAsync(() => getOrder(id, q.get('k') ?? ''), [id]);

  if (loading) return <p className="p-8 text-xl">Loading…</p>;
  if (!o) return <p className="p-8 text-xl">Order not found.</p>;
  if (label) return <Label o={o} />;
  if (!o.invoice_no) return <p className="p-8 text-xl">The invoice is made when the order is shipped.</p>;

  const s = o.seller;
  const intra = o.igst_paise === 0;
  const rupees = Math.floor(o.total_paise / 100), paise = o.total_paise % 100;

  return (
    <div className="bg-white text-black min-h-screen">
      <style>{`@media print { .no-print { display: none !important } @page { size: A4; margin: 12mm } } .inv td, .inv th { border: 1px solid #333; padding: 4px 6px; font-size: 12px; vertical-align: top }`}</style>
      <div className="no-print p-3 flex gap-2 justify-center bg-cream border-b border-line">
        <button onClick={() => window.print()} className="btn btn-primary">Print / Save as PDF</button>
      </div>
      <div className="max-w-[800px] mx-auto p-6 font-sans text-[13px] leading-snug">
        <div className="flex justify-between items-start gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-xl font-bold">{s.name || 'चला खेळूया'}</p>
            <p className="whitespace-pre-line">{s.address}</p>
            {s.state && <p>State: {s.state}</p>}
            {s.gstin && <p><b>GSTIN:</b> {s.gstin}</p>}
            {(s.phone || s.email) && <p>{[s.phone, s.email].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">TAX INVOICE</p>
            <p><b>Invoice no:</b> {o.invoice_no}</p>
            <p><b>Invoice date:</b> {o.invoice_date}</p>
            <p><b>Order no:</b> {o.order_no}</p>
            <p><b>Payment:</b> {o.payment_method === 'cod' ? 'Cash on delivery' : `Online${o.razorpay_payment_id ? ` (${o.razorpay_payment_id})` : ''}`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-black">
          <div>
            <p className="font-bold">Bill to / Ship to</p>
            <p>{o.ship.name} · {o.ship.phone}</p>
            <p>{[o.ship.line1, o.ship.line2, o.ship.landmark].filter(Boolean).join(', ')}</p>
            <p>{o.ship.city}, {o.ship.state} – {o.ship.pincode}</p>
          </div>
          <div>
            <p><b>Place of supply:</b> {o.ship.state}</p>
            <p><b>Supply:</b> {intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}</p>
          </div>
        </div>
        <table className="inv w-full mt-3 border-collapse">
          <thead>
            <tr className="bg-[#eee]">
              <th>#</th><th className="text-left">Item</th><th>HSN</th><th>Qty</th><th className="text-right">Rate (₹)</th><th className="text-right">Taxable (₹)</th><th>GST %</th>
              {intra ? (<><th className="text-right">CGST (₹)</th><th className="text-right">SGST (₹)</th></>) : <th className="text-right">IGST (₹)</th>}
              <th className="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, k) => {
              const half = Math.floor(i.tax_paise / 2);
              return (
                <tr key={k}>
                  <td>{k + 1}</td>
                  <td>{i.name_mr}{i.name_en ? ` (${i.name_en})` : ''}</td>
                  <td className="text-center">{i.hsn}</td>
                  <td className="text-center">{i.qty}</td>
                  <td className="text-right">{rs(Math.round(i.taxable_paise / i.qty))}</td>
                  <td className="text-right">{rs(i.taxable_paise)}</td>
                  <td className="text-center">{Number(i.gst_rate)}</td>
                  {intra ? (<><td className="text-right">{rs(half)}</td><td className="text-right">{rs(i.tax_paise - half)}</td></>) : <td className="text-right">{rs(i.tax_paise)}</td>}
                  <td className="text-right">{rs(i.line_total_paise)}</td>
                </tr>
              );
            })}
            <tr className="font-bold">
              <td colSpan={5} className="text-right">Total</td>
              <td className="text-right">{rs(o.taxable_paise)}</td>
              <td />
              {intra ? (<><td className="text-right">{rs(o.cgst_paise)}</td><td className="text-right">{rs(o.sgst_paise)}</td></>) : <td className="text-right">{rs(o.igst_paise)}</td>}
              <td className="text-right">{rs(o.total_paise)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 flex justify-between gap-4">
          <p><b>Amount in words:</b> Rupees {words(rupees)}{paise ? ` and ${words(paise)} Paise` : ''} Only</p>
          <div className="text-right min-w-[200px]">
            <p>Delivery: ₹0.00</p>
            <p className="text-lg font-bold">Grand total: ₹{rs(o.total_paise)}</p>
          </div>
        </div>
        <div className="mt-10 flex justify-between items-end">
          <p className="text-[11px] text-[#555]">This is a computer-generated invoice.</p>
          <p className="text-center">For {s.name || 'चला खेळूया'}<br /><br /><br />Authorised signatory</p>
        </div>
      </div>
    </div>
  );
}

/** Big, clear address label to stick on the parcel. */
function Label({ o }: { o: Order }) {
  return (
    <div className="bg-white text-black min-h-screen">
      <style>{`@media print { .no-print { display: none !important } }`}</style>
      <div className="no-print p-3 flex justify-center bg-cream border-b border-line"><button onClick={() => window.print()} className="btn btn-primary">Print label</button></div>
      <div className="max-w-[520px] mx-auto m-6 p-6 border-[3px] border-black rounded-xl">
        <p className="text-sm">TO</p>
        <p className="text-3xl font-bold leading-tight">{o.ship.name}</p>
        <p className="text-2xl leading-snug mt-1">{[o.ship.line1, o.ship.line2].filter(Boolean).join(', ')}</p>
        {o.ship.landmark && <p className="text-xl">Near: {o.ship.landmark}</p>}
        <p className="text-2xl font-bold mt-1">{o.ship.city}, {o.ship.state}</p>
        <p className="text-4xl font-bold tracking-widest mt-1">PIN {o.ship.pincode}</p>
        <p className="text-2xl mt-2">📞 {o.ship.phone}</p>
        <div className="mt-4 pt-3 border-t-2 border-dashed border-black flex justify-between text-lg">
          <span>Order {o.order_no}</span>
          <span className="font-bold">{o.payment_method === 'cod' && o.payment_status === 'cod_pending' ? `COD ₹${rs(o.total_paise)}` : 'PREPAID'}</span>
        </div>
        {o.seller?.name && <p className="mt-3 text-sm">From: {o.seller.name}{o.seller.phone ? ` · ${o.seller.phone}` : ''}</p>}
      </div>
    </div>
  );
}
