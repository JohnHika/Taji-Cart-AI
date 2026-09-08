import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FaArrowLeft, FaBoxes, FaSearch, FaSync, FaTruckLoading, FaTimes } from 'react-icons/fa';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import { cn } from '../../lib/utils';
import { STORE_GATE_SESSION_KEY } from '../../components/AdminSecretGate';

// Backroom stock, kept separate from the live shop's Product.stock. Reachable
// only via the hidden AdminSecretGate trigger (see App.jsx) plus normal admin
// auth (PrivateRoute + server auth/admin middleware) — see that component's
// comment for why the trigger itself grants no privilege on its own.
const glassShell = 'rounded-3xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(75,30,62,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-dm-card/60';
const solidShell = 'rounded-3xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card';

const StoreInventoryContent = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [dispatchQty, setDispatchQty] = useState('');
  const [dispatchReason, setDispatchReason] = useState('');
  const [receiveQty, setReceiveQty] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Axios({ method: 'GET', url: '/api/admin/warehouse/inventory', params: { search } });
      setProducts(response.data?.data?.products || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load warehouse inventory.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const receive = async (productId) => {
    const quantity = Number(receiveQty[productId]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a positive quantity to receive.');
      return;
    }
    setBusyId(productId);
    try {
      await Axios({ method: 'POST', url: '/api/admin/warehouse/receive', data: { productId, quantity, reason: 'Received into warehouse' } });
      toast.success('Warehouse stock updated.');
      setReceiveQty((current) => ({ ...current, [productId]: '' }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not receive stock.');
    } finally {
      setBusyId(null);
    }
  };

  const openDispatch = (product) => {
    setDispatchTarget(product);
    setDispatchQty('');
    setDispatchReason('');
  };

  const confirmDispatch = async () => {
    const quantity = Number(dispatchQty);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > dispatchTarget.warehouseStock) {
      toast.error(`Enter a quantity between 1 and ${dispatchTarget.warehouseStock}.`);
      return;
    }
    setBusyId(dispatchTarget._id);
    try {
      await Axios({
        method: 'POST',
        url: '/api/admin/warehouse/dispatch',
        data: { productId: dispatchTarget._id, quantity, reason: dispatchReason.trim() || 'Dispatched to shop' },
      });
      toast.success(`Dispatched ${quantity} unit(s) to the shop.`);
      setDispatchTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not dispatch stock.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
      <header className={cn(glassShell, 'sticky top-0 z-30 m-0 rounded-none border-x-0 border-t-0')}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to dashboard"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FaBoxes className="text-plum-700 dark:text-plum-300" />
              <h1 className="truncate text-base font-bold text-charcoal dark:text-white">Store inventory</h1>
              <span className="rounded-full bg-brown-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brown-500 dark:bg-dm-card-2 dark:text-white/50">
                Admin only
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-brown-500 dark:text-white/50">Backroom stock, separate from what&apos;s live on the shop.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-plum-200 bg-white/80 px-3 py-2 text-sm font-semibold text-plum-700 hover:bg-plum-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-plum-800 dark:bg-dm-card dark:text-plum-200"
          >
            <FaSync className={loading ? 'animate-spin' : ''} size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <div className={cn(glassShell, 'flex items-center gap-2 p-3')}>
          <FaSearch className="ml-1 text-brown-400" size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or SKU"
            className="w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-brown-400 dark:text-white"
          />
        </div>

        <div className={cn(solidShell, 'overflow-hidden')}>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-brown-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-brown-400 dark:border-dm-border dark:text-white/40 sm:grid-cols-[1fr_100px_100px_220px]">
            <span>Product</span>
            <span className="text-right">Warehouse</span>
            <span className="text-right">Live shop</span>
            <span className="text-right">Actions</span>
          </div>

          {loading && !products.length ? (
            <div className="p-10 text-center text-sm text-brown-500 dark:text-white/50">Loading warehouse inventory…</div>
          ) : !products.length ? (
            <div className="p-10 text-center text-sm text-brown-500 dark:text-white/50">No products match that search.</div>
          ) : (
            <div className="divide-y divide-brown-100 dark:divide-dm-border">
              {products.map((product) => (
                <div key={product._id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm sm:grid-cols-[1fr_100px_100px_220px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-charcoal dark:text-white">{product.name}</p>
                    <p className="text-xs text-brown-500 dark:text-white/50">{product.sku || 'No SKU'}</p>
                  </div>
                  <span className="text-right font-bold text-plum-700 dark:text-plum-300">{product.warehouseStock ?? 0}</span>
                  <span className="text-right font-semibold text-charcoal dark:text-white">{product.stock ?? 0}</span>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min="1"
                      value={receiveQty[product._id] || ''}
                      onChange={(event) => setReceiveQty((current) => ({ ...current, [product._id]: event.target.value }))}
                      placeholder="Qty"
                      className="w-16 rounded-lg border border-brown-200 bg-ivory px-2 py-1.5 text-xs text-charcoal outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => receive(product._id)}
                      disabled={busyId === product._id}
                      className="rounded-lg border border-plum-200 px-2 py-1.5 text-xs font-semibold text-plum-700 hover:bg-plum-50 disabled:opacity-60 dark:border-plum-800 dark:text-plum-200"
                    >
                      Receive
                    </button>
                    <button
                      type="button"
                      onClick={() => openDispatch(product)}
                      disabled={!product.warehouseStock || busyId === product._id}
                      className="inline-flex items-center gap-1 rounded-lg bg-plum-700 px-2 py-1.5 text-xs font-bold text-white hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaTruckLoading size={11} /> Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog.Root open={Boolean(dispatchTarget)} onOpenChange={(open) => !open && setDispatchTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm" />
          <Dialog.Content className={cn(glassShell, 'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 p-5')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-bold text-charcoal dark:text-white">Dispatch to shop</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                  {dispatchTarget?.name} — {dispatchTarget?.warehouseStock} unit(s) available in the warehouse.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-lg p-1.5 text-brown-500 hover:bg-white/60 dark:text-white/50 dark:hover:bg-white/10" aria-label="Close">
                <FaTimes size={14} />
              </Dialog.Close>
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Quantity to dispatch</label>
            <input
              type="number"
              min="1"
              max={dispatchTarget?.warehouseStock}
              value={dispatchQty}
              onChange={(event) => setDispatchQty(event.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-brown-200 bg-white/80 px-3 py-2 text-sm text-charcoal outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-100 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />

            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Note (optional)</label>
            <input
              value={dispatchReason}
              onChange={(event) => setDispatchReason(event.target.value)}
              placeholder="e.g. Restocking shop floor"
              className="mt-1.5 w-full rounded-xl border border-brown-200 bg-white/80 px-3 py-2 text-sm text-charcoal outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-100 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className="rounded-xl px-4 py-2 text-sm font-semibold text-brown-600 hover:bg-white/60 dark:text-white/60 dark:hover:bg-white/10">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmDispatch}
                disabled={busyId === dispatchTarget?._id}
                className="rounded-xl bg-plum-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm dispatch
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

// UX-only gate, not a security boundary — PrivateRoute (requireAdmin) plus
// server-side auth/admin middleware already protect the actual API calls.
// This wrapper just makes "type the URL directly" bounce back to /dashboard
// instead of mounting the page (and its data fetch) at all, matching the
// hidden-trigger behavior described in AdminSecretGate.jsx.
const StoreInventory = () => {
  if (sessionStorage.getItem(STORE_GATE_SESSION_KEY) !== '1') {
    return <Navigate to="/dashboard" replace />;
  }
  return <StoreInventoryContent />;
};

export default StoreInventory;
