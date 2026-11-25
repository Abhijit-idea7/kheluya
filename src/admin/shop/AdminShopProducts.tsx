import { useEffect, useState } from 'react';
import { supabase, BUCKET } from '@/lib/supabase';
import { btnPrimary, btnQuiet, Card, Field, input } from '@/admin/ui';
import { rpc, rs } from '@/admin/shop/rpc';
import { imageUrl, type Spec } from '@/lib/shop';

type Cat = { id: string; slug: string; name_mr: string; name_en: string; sort_order: number; is_active: boolean };
type Prod = {
  id?: string; slug: string; category_id: string | null; name_mr: string; name_en: string; short_mr: string; short_en: string;
  description_mr: string; description_en: string; price_paise: number; mrp_paise: number | null; hsn: string; gst_rate: number;
  weight_g: number | null; stock: number | null; max_per_order: number; images: string[]; specs: Spec[]; is_active: boolean;
  coming_soon: boolean; sort_order: number; sold?: number;
};
const BLANK: Prod = {
  slug: '', category_id: null, name_mr: '', name_en: '', short_mr: '', short_en: '', description_mr: '', description_en: '',
  price_paise: 0, mrp_paise: null, hsn: '4901', gst_rate: 0, weight_g: null, stock: null, max_per_order: 10, images: [], specs: [],
  is_active: false, coming_soon: false, sort_order: 100,
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Products and categories: the shop's masters. */
export default function AdminShopProducts() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[] | null>(null);
  const [edit, setEdit] = useState<Prod | null>(null);
  const [err, setErr] = useState('');
  const load = () =>
    rpc<{ categories: Cat[]; products: Prod[] }>('admin_shop_catalog')
      .then((d) => { setCats(d?.categories ?? []); setProds(d?.products ?? []); })
      .catch((e) => setErr(e.message.includes('admin_shop_catalog') ? 'Shop: the database step has not been applied yet.' : e.message));
  useEffect(() => {
    load();
  }, []);

  if (err) return <p className="font-bold text-[#8A1C14]">{err}</p>;
  if (edit) return <ProductEditor p={edit} cats={cats} onDone={() => { setEdit(null); load(); }} />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold mr-auto">Products</h2>
        <button className={btnPrimary} onClick={() => setEdit({ ...BLANK })}>+ New product</button>
      </div>
      {!prods ? <p className="animate-pulse">Loading…</p> : prods.length === 0 ? <Card>No products yet. Press “+ New product”.</Card> : (
        <>
        <ul className="grid gap-2 md:hidden">
          {prods.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setEdit({ ...BLANK, ...p })} className="w-full text-left flex gap-3 rounded-2xl border-2 border-ink bg-paper p-2.5 active:bg-orange-soft/50">
                {p.images[0] ? <img src={imageUrl(p.images[0])} alt="" className="w-14 shrink-0 aspect-[3/4] object-contain bg-white rounded-lg border border-line" /> : <span className="block w-14 shrink-0 aspect-[3/4] rounded-lg bg-cream" />}
                <span className="min-w-0 flex-1">
                  <b className="block leading-snug">{p.name_mr}</b>
                  <span className="block text-sm text-ink/60 break-all">/{p.slug}</span>
                  <span className="block mt-0.5 tabular-nums">{rs(p.price_paise)}{p.mrp_paise ? <s className="ml-1 text-ink/50">{rs(p.mrp_paise)}</s> : null} · GST {Number(p.gst_rate)}%</span>
                  <span className="block text-sm">
                    <span className={p.stock !== null && p.stock <= 5 ? 'font-bold text-[#8A1C14]' : ''}>Stock {p.stock ?? '∞'}</span> · Sold {p.sold ?? 0} ·{' '}
                    <b>{p.is_active ? (p.coming_soon ? 'Coming soon' : 'On sale') : 'Hidden'}</b>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto rounded-2xl border-2 border-ink bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream"><tr>{['', 'Product', 'Category', 'Price', 'GST', 'Stock', 'Sold', 'Shown'].map((h) => <th key={h} className="p-2.5">{h}</th>)}</tr></thead>
            <tbody>
              {prods.map((p) => (
                <tr key={p.id} className="border-t border-line cursor-pointer hover:bg-orange-soft/40" onClick={() => setEdit({ ...BLANK, ...p })}>
                  <td className="p-2">{p.images[0] ? <img src={imageUrl(p.images[0])} alt="" className="w-12 aspect-[3/4] object-contain bg-white rounded-lg border border-line" /> : <span className="block w-12 aspect-[3/4] rounded-lg bg-cream" />}</td>
                  <td className="p-2.5 font-bold">{p.name_mr}<br /><span className="font-normal text-ink/60">/{p.slug}</span></td>
                  <td className="p-2.5">{cats.find((c) => c.id === p.category_id)?.name_mr ?? '—'}</td>
                  <td className="p-2.5 tabular-nums">{rs(p.price_paise)}{p.mrp_paise ? <s className="ml-1 text-ink/50">{rs(p.mrp_paise)}</s> : null}</td>
                  <td className="p-2.5">{Number(p.gst_rate)}%</td>
                  <td className={`p-2.5 tabular-nums ${p.stock !== null && p.stock <= 5 ? 'font-bold text-[#8A1C14]' : ''}`}>{p.stock ?? '∞'}</td>
                  <td className="p-2.5 tabular-nums">{p.sold ?? 0}</td>
                  <td className="p-2.5">{p.is_active ? (p.coming_soon ? 'Coming soon' : 'Yes') : 'Hidden'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <Categories cats={cats} onChanged={load} />
    </div>
  );
}

function Categories({ cats, onChanged }: { cats: Cat[]; onChanged: () => void }) {
  const [c, setC] = useState({ name_mr: '', name_en: '', slug: '' });
  const [msg, setMsg] = useState('');
  const save = async (row: Partial<Cat>) => {
    setMsg('');
    try {
      await rpc('admin_shop_save_category', { p: row });
      onChanged();
      setC({ name_mr: '', name_en: '', slug: '' });
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <Card>
      <h2 className="text-xl font-bold">Categories</h2>
      <p className="text-sm text-ink/60">Shown as buttons above the products when there is more than one.</p>
      <ul className="mt-3 grid gap-1.5">
        {cats.map((k) => (
          <li key={k.id} className="flex items-center gap-3">
            <span className="font-bold">{k.name_mr}</span><span className="text-ink/60">{k.name_en} · /{k.slug}</span>
            <button className={`${btnQuiet} !py-0.5 ml-auto`} onClick={() => save({ ...k, is_active: !k.is_active })}>{k.is_active ? 'Hide' : 'Show'}</button>
          </li>
        ))}
      </ul>
      <form className="mt-3 grid gap-2 sm:grid-cols-4 items-end" onSubmit={(e) => { e.preventDefault(); save({ ...c, slug: c.slug || slugify(c.name_en) }); }}>
        <Field label="Name (मराठी)"><input className={input} value={c.name_mr} onChange={(e) => setC({ ...c, name_mr: e.target.value })} required /></Field>
        <Field label="Name (English)"><input className={input} value={c.name_en} onChange={(e) => setC({ ...c, name_en: e.target.value, slug: slugify(e.target.value) })} required /></Field>
        <Field label="Web name"><input className={input} value={c.slug} onChange={(e) => setC({ ...c, slug: slugify(e.target.value) })} /></Field>
        <button className={btnQuiet}>Add category</button>
      </form>
      {msg && <p className="mt-2 font-bold text-[#8A1C14]">{msg}</p>}
    </Card>
  );
}

function ProductEditor({ p: start, cats, onDone }: { p: Prod; cats: Cat[]; onDone: () => void }) {
  const [p, setP] = useState<Prod>(start);
  const [price, setPrice] = useState(start.price_paise ? String(start.price_paise / 100) : '');
  const [mrp, setMrp] = useState(start.mrp_paise ? String(start.mrp_paise / 100) : '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Prod>(k: K, v: Prod[K]) => setP({ ...p, [k]: v });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!p.slug) return setMsg('Give the product a web name first (used in the picture folder).');
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files)) {
      const path = `shop/${p.slug}/${Date.now()}-${f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
      const { error } = await supabase!.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false, cacheControl: '31536000' });
      if (error) setMsg(`Upload failed: ${error.message}`);
      else added.push(path);
    }
    setP((cur) => ({ ...cur, images: [...cur.images, ...added] }));
    setBusy(false);
  };
  const move = (i: number, d: number) => {
    const imgs = [...p.images];
    const j = i + d;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set('images', imgs);
  };
  const save = async () => {
    setMsg('');
    const pr = Math.round(Number(price) * 100);
    if (!p.name_mr.trim() || !p.slug) return setMsg('Name (मराठी) and web name are needed.');
    if (!(pr >= 100)) return setMsg('Price must be at least ₹1.');
    setBusy(true);
    try {
      await rpc('admin_shop_save_product', { p: { ...p, price_paise: pr, mrp_paise: mrp ? Math.round(Number(mrp) * 100) : null, specs: p.specs.filter((s) => s.label_mr) } });
      onDone();
    } catch (e) {
      setMsg((e as Error).message.includes('duplicate') ? 'That web name is already used by another product.' : (e as Error).message);
      setBusy(false);
    }
  };
  const gstPart = Number(price) ? (Number(price) - Number(price) * 100 / (100 + Number(p.gst_rate))).toFixed(2) : '0';

  return (
    <div className="grid gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold mr-auto">{start.id ? `Edit: ${start.name_mr}` : 'New product'}</h2>
        <button className={btnQuiet} onClick={onDone}>Back</button>
      </div>
      <Card className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (मराठी)"><input className={input} value={p.name_mr} onChange={(e) => set('name_mr', e.target.value)} /></Field>
          <Field label="Name (English)"><input className={input} value={p.name_en} onChange={(e) => setP({ ...p, name_en: e.target.value, slug: start.id ? p.slug : slugify(e.target.value) })} /></Field>
          <Field label="Web name" hint="Used in the address: chalakheluya.com/dukan/…"><input className={input} value={p.slug} onChange={(e) => set('slug', slugify(e.target.value))} /></Field>
          <Field label="Category">
            <select className={input} value={p.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
              <option value="">—</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name_mr}</option>)}
            </select>
          </Field>
        </div>
        <Field label="One-line description (मराठी)"><input className={input} maxLength={240} value={p.short_mr} onChange={(e) => set('short_mr', e.target.value)} /></Field>
        <Field label="One-line description (English)"><input className={input} maxLength={240} value={p.short_en} onChange={(e) => set('short_en', e.target.value)} /></Field>
        <Field label="Full description (मराठी)"><textarea className={`${input} min-h-[7rem]`} value={p.description_mr} onChange={(e) => set('description_mr', e.target.value)} /></Field>
        <Field label="Full description (English)"><textarea className={`${input} min-h-[5rem]`} value={p.description_en} onChange={(e) => set('description_en', e.target.value)} /></Field>
      </Card>

      <Card className="grid gap-3">
        <h3 className="font-bold">Price, tax and stock</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Selling price ₹ (incl. GST)"><input className={input} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="MRP ₹ (optional, shown struck out)"><input className={input} inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} /></Field>
          <Field label="GST rate">
            <select className={input} value={String(Number(p.gst_rate))} onChange={(e) => set('gst_rate', Number(e.target.value))}>
              {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </Field>
          <Field label="HSN code" hint="Printed books 4901 · games and puzzles 9504"><input className={input} value={p.hsn} onChange={(e) => set('hsn', e.target.value)} /></Field>
          <Field label="Stock" hint="Leave empty if you don't want to count"><input className={input} inputMode="numeric" value={p.stock ?? ''} onChange={(e) => set('stock', e.target.value === '' ? null : Number(e.target.value))} /></Field>
          <Field label="Most per order"><input className={input} inputMode="numeric" value={p.max_per_order} onChange={(e) => set('max_per_order', Math.max(1, Number(e.target.value) || 1))} /></Field>
          <Field label="Weight (grams, optional)"><input className={input} inputMode="numeric" value={p.weight_g ?? ''} onChange={(e) => set('weight_g', e.target.value === '' ? null : Number(e.target.value))} /></Field>
          <Field label="Order in the list" hint="Smaller comes first"><input className={input} inputMode="numeric" value={p.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 100)} /></Field>
        </div>
        <p className="text-sm text-ink/60">GST included in this price: ₹{gstPart}. Please confirm the HSN and GST rate for each product with your CA.</p>
      </Card>

      <Card className="grid gap-3">
        <h3 className="font-bold">Pictures</h3>
        <div className="flex flex-wrap gap-3">
          {p.images.map((src, i) => (
            <div key={src} className="w-28">
              <img src={imageUrl(src)} alt="" className="w-28 aspect-[3/4] object-contain bg-white rounded-xl border border-line" />
              <div className="mt-1 flex gap-1 justify-center text-sm">
                <button className="px-2 border rounded" onClick={() => move(i, -1)} aria-label="Move left">←</button>
                <button className="px-2 border rounded text-[#8A1C14]" onClick={() => set('images', p.images.filter((x) => x !== src))}>Remove</button>
                <button className="px-2 border rounded" onClick={() => move(i, 1)} aria-label="Move right">→</button>
              </div>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} />
        <p className="text-sm text-ink/60">The first picture is shown in the list. Portrait (3:4) pictures — like a book cover — fit best; other shapes are shown whole.</p>
      </Card>

      <Card className="grid gap-2">
        <h3 className="font-bold">Details table (optional)</h3>
        {p.specs.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input className={input} placeholder="पाने / आकार…" value={s.label_mr ?? ''} onChange={(e) => set('specs', p.specs.map((x, k) => (k === i ? { ...x, label_mr: e.target.value } : x)))} />
            <input className={input} placeholder="१२० / A4…" value={s.value_mr ?? ''} onChange={(e) => set('specs', p.specs.map((x, k) => (k === i ? { ...x, value_mr: e.target.value } : x)))} />
            <button className={btnQuiet} onClick={() => set('specs', p.specs.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
        <button className={`${btnQuiet} justify-self-start`} onClick={() => set('specs', [...p.specs, { label_mr: '', value_mr: '' }])}>+ Add a detail</button>
      </Card>

      <Card className="grid gap-2">
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={p.is_active} onChange={(e) => set('is_active', e.target.checked)} />Show in the shop</label>
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={p.coming_soon} onChange={(e) => setP({ ...p, coming_soon: e.target.checked, is_active: e.target.checked ? true : p.is_active })} />Coming soon (shown in the shop, but cannot be ordered yet)</label>
      </Card>

      {msg && <p className="font-bold text-[#8A1C14]">{msg}</p>}
      <div className="flex gap-3">
        <button className={btnPrimary} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save product'}</button>
        <button className={btnQuiet} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
