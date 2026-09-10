import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaSearch } from 'react-icons/fa';
import Axios from '../../../utils/Axios';

const shell = 'rounded-[26px] border border-white/80 bg-white/95 shadow-[0_22px_55px_-34px_rgba(52,13,48,0.48)] backdrop-blur dark:border-dm-border dark:bg-dm-card';
const label = 'text-[10px] font-black uppercase tracking-[0.16em] text-brown-400 dark:text-white/40';
const PAGE_SIZE = 50;

// The catalog runs to 500+ products. Fetching one capped page and filtering
// it client-side (the old approach) silently hid every product outside that
// page and made the search box lie -- "No inventory matches" for a product
// that's real, just not in the first slice. Search and paging both go to the
// server, which already supports both (see warehouse.controller.js).
const InventoryControl = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Axios({
        method: 'GET',
        url: '/api/admin/warehouse/inventory',
        params: { search: debouncedSearch || undefined, page, limit: PAGE_SIZE },
      });
      setProducts(response.data?.data?.products || []);
      setTotal(response.data?.data?.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const moveStock = async (product, kind) => {
    const quantity = Number(quantities[product._id]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a positive quantity first.');
      return;
    }
    setBusyId(product._id);
    try {
      await Axios({
        method: 'POST',
        url: kind === 'receive' ? '/api/admin/warehouse/receive' : '/api/admin/warehouse/dispatch',
        data: { productId: product._id, quantity, reason: kind === 'receive' ? 'Received through Store Management' : 'Dispatched to shop through Store Management' },
      });
      toast.success(kind === 'receive' ? 'Warehouse stock received.' : 'Stock dispatched to the shop.');
      setQuantities((current) => ({ ...current, [product._id]: '' }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Stock movement could not be completed.');
    } finally {
      setBusyId('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <section className={`${shell} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-brown-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-dm-border">
        <div>
          <p className={label}>Backroom and shop floor</p>
          <h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Inventory control</h2>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-ivory px-3 py-2 text-sm dark:bg-dm-card-2">
          <FaSearch className="text-brown-400" size={12} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find product or SKU"
            className="w-52 bg-transparent outline-none"
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ivory text-[11px] uppercase tracking-wide text-brown-400 dark:bg-dm-card-2">
            <tr>
              <th className="p-3 font-bold">Product</th>
              <th className="p-3 text-right">Backroom</th>
              <th className="p-3 text-right">Shop floor</th>
              <th className="p-3">Move stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border-t border-brown-100 dark:border-dm-border">
                <td className="p-3">
                  <p className="font-bold text-charcoal dark:text-white">{product.name}</p>
                  <p className="text-xs text-brown-500">{product.sku || 'No SKU'}</p>
                </td>
                <td className="p-3 text-right font-bold text-plum-700 dark:text-plum-300">{product.warehouseStock || 0}</td>
                <td className={`p-3 text-right font-bold ${product.stock <= 3 ? 'text-red-600' : 'text-charcoal dark:text-white'}`}>{product.stock || 0}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantities[product._id] || ''}
                      onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))}
                      placeholder="Qty"
                      className="w-16 rounded-lg border border-brown-200 bg-white px-2 py-1.5 outline-none dark:border-dm-border dark:bg-dm-card-2"
                    />
                    <button type="button" disabled={busyId === product._id} onClick={() => moveStock(product, 'receive')} className="rounded-lg border border-plum-200 px-2 py-1.5 text-xs font-bold text-plum-700 hover:bg-plum-50">Receive</button>
                    <button type="button" disabled={busyId === product._id || !product.warehouseStock} onClick={() => moveStock(product, 'dispatch')} className="rounded-lg bg-plum-700 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">To shop</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !products.length && <tr><td colSpan="4" className="p-8 text-center text-brown-500">No inventory matches that search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-brown-100 p-4 text-xs text-brown-500 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between">
        <span>{loading ? 'Loading…' : `Showing ${rangeStart}–${rangeEnd} of ${total} products`}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-brown-200 px-3 py-1.5 font-bold text-brown-700 disabled:opacity-40 dark:border-dm-border dark:text-white/70">Previous</button>
          <span className="font-bold text-charcoal dark:text-white">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-brown-200 px-3 py-1.5 font-bold text-brown-700 disabled:opacity-40 dark:border-dm-border dark:text-white/70">Next</button>
        </div>
      </div>
    </section>
  );
};

export default InventoryControl;
