import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { FaSearch } from 'react-icons/fa';
import Axios from '../../../utils/Axios';
import {
  MAX_TRANSFER_QUANTITY,
  createStockTransferIdempotencyKey,
  isValidStockTransferQuantity,
} from '../../../utils/stockTransfer';

const shell = 'rounded-[26px] border border-white/80 bg-white/95 shadow-[0_22px_55px_-34px_rgba(52,13,48,0.48)] backdrop-blur dark:border-dm-border dark:bg-dm-card';
const label = 'text-[10px] font-black uppercase tracking-[0.16em] text-brown-400 dark:text-white/40';
const PAGE_SIZE = 50;
const RELEASE_STORAGE_KEY = 'nawiri:pending-stock-release-keys';
const DEFAULT_BRANCH = 'Main Store';
const storageKeyFor = (ownerId) => `${RELEASE_STORAGE_KEY}:${ownerId || 'anonymous'}`;

const persistReleaseKeys = (keys, ownerId) => {
  try {
    const serialized = JSON.stringify(keys);
    window.sessionStorage.setItem(storageKeyFor(ownerId), serialized);
    return window.sessionStorage.getItem(storageKeyFor(ownerId)) === serialized;
  } catch {
    return false;
  }
};

const readReleaseKeys = (ownerId) => {
  try {
    const stored = window.sessionStorage.getItem(storageKeyFor(ownerId));
    const parsed = stored ? JSON.parse(stored) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([operationId, record]) => (
      operationId.startsWith('dispatch:')
      && typeof record?.key === 'string'
      && isValidStockTransferQuantity(record.quantity)
      && typeof record.destinationBranch === 'string'
      && record.destinationBranch.trim().length <= 100
    )).map(([operationId, record]) => [operationId, { ...record, destinationBranch: record.destinationBranch.trim() || DEFAULT_BRANCH }]));
  } catch {
    return {};
  }
};

const initialDestinationBranch = (ownerId) => {
  const pending = Object.values(readReleaseKeys(ownerId))[0];
  return pending?.destinationBranch || DEFAULT_BRANCH;
};

// The catalog runs to 500+ products. Fetching one capped page and filtering
// it client-side (the old approach) silently hid every product outside that
// page and made the search box lie -- "No inventory matches" for a product
// that's real, just not in the first slice. Search and paging both go to the
// server, which already supports both (see warehouse.controller.js).
const InventoryControl = () => {
  const user = useSelector((state) => state.user);
  const ownerId = String(user?._id || 'anonymous');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [destinationBranch, setDestinationBranch] = useState(() => initialDestinationBranch(ownerId));
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [busyId, setBusyId] = useState('');
  const [releaseKeys, setReleaseKeys] = useState(() => readReleaseKeys(ownerId));
  const [releaseKeysOwner, setReleaseKeysOwner] = useState(ownerId);
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [resolvingId, setResolvingId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (releaseKeysOwner === ownerId) return;
    const nextReleaseKeys = readReleaseKeys(ownerId);
    setReleaseKeys(nextReleaseKeys);
    setReleaseKeysOwner(ownerId);
    setDestinationBranch(initialDestinationBranch(ownerId));
    setQuantities({});
  }, [ownerId, releaseKeysOwner]);

  useEffect(() => {
    if (releaseKeysOwner !== ownerId) return;
    persistReleaseKeys(releaseKeys, ownerId);
  }, [ownerId, releaseKeys, releaseKeysOwner]);

  useEffect(() => {
    if (!transfers.length) return;
    setReleaseKeys((current) => {
      const next = { ...current };
      let changed = false;
      Object.entries(current).forEach(([operationId, record]) => {
        if (operationId.startsWith('dispatch:') && transfers.some((transfer) => transfer.idempotencyKey === record.key)) {
          delete next[operationId];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [transfers]);

  useEffect(() => {
    const pendingEntries = Object.entries(releaseKeys).filter(([operationId, record]) => operationId.startsWith('dispatch:') && record);
    if (!pendingEntries.length) return;
    setQuantities((current) => {
      const next = { ...current };
      let changed = false;
      pendingEntries.forEach(([operationId, record]) => {
        const productId = operationId.slice('dispatch:'.length);
        if (next[productId] === undefined || next[productId] === '') {
          next[productId] = String(record.quantity);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [releaseKeys]);

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
      return response.data?.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load inventory.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const response = await Axios({
        method: 'GET',
        url: '/api/stock-transfers/admin/transfers',
        params: { status: 'dispatched,partially_received,disputed', limit: 50 },
      });
      setTransfers(response.data?.data || []);
      return response.data?.data || [];
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load stock transfers.');
      return null;
    } finally {
      setTransfersLoading(false);
    }
  }, []);

  useEffect(() => { loadTransfers(); }, [loadTransfers]);

  const moveStock = async (product, kind) => {
    const rawQuantity = quantities[product._id];
    if (!isValidStockTransferQuantity(rawQuantity)) {
      toast.error(`Enter a whole-number quantity between 1 and ${MAX_TRANSFER_QUANTITY.toLocaleString()}.`);
      return;
    }
    const quantity = Number(rawQuantity);
    const releaseKeyId = `${kind}:${product._id}`;
    const previousKey = releaseKeys[releaseKeyId];
    const effectiveDestinationBranch = kind === 'dispatch' ? (previousKey?.destinationBranch || destinationBranch) : destinationBranch;
    if (kind === 'dispatch' && previousKey && previousKey.quantity !== quantity) {
      toast.error('Confirm the previous release appears in the transfer queue before starting another release for this product.');
      return;
    }
    const idempotencyKey = kind === 'dispatch'
      ? (previousKey?.quantity === quantity && previousKey?.destinationBranch === effectiveDestinationBranch
        ? previousKey.key
        : createStockTransferIdempotencyKey())
      : undefined;
    if (kind === 'dispatch') {
      const nextReleaseKeys = {
        ...releaseKeys,
        [releaseKeyId]: { key: idempotencyKey, quantity, destinationBranch: effectiveDestinationBranch, awaitingRefresh: true },
      };
      if (!persistReleaseKeys(nextReleaseKeys, ownerId)) {
        toast.error('Browser storage is unavailable. The release was not sent because safe retry protection could not be enabled.');
        return;
      }
      setReleaseKeys(nextReleaseKeys);
    }
    setBusyId(product._id);
    try {
      const response = await Axios({
        method: 'POST',
        url: kind === 'receive' ? '/api/admin/warehouse/receive' : '/api/admin/warehouse/dispatch',
        data: { productId: product._id, quantity, ...(idempotencyKey ? { idempotencyKey } : {}), destinationBranch: effectiveDestinationBranch, reason: kind === 'receive' ? 'Received through Store Management' : `Released to ${effectiveDestinationBranch} through Store Management` },
        ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
      });
      toast.success(kind === 'receive' ? 'Warehouse stock received.' : 'Transfer released; awaiting store confirmation.');
      if (kind === 'receive') setQuantities((current) => ({ ...current, [product._id]: '' }));
      const [inventorySnapshot, transferSnapshot] = await Promise.all([load(), loadTransfers()]);
      if (kind === 'dispatch') {
        const transferId = response.data?.data?._id;
        const closedReplayAcknowledged = ['confirmed', 'resolved', 'cancelled'].includes(response.data?.data?.status);
        const acknowledged = Boolean(transferId && (closedReplayAcknowledged || (Array.isArray(transferSnapshot)
          && transferSnapshot.some((transfer) => String(transfer._id) === String(transferId)))));
        if (acknowledged) {
          setQuantities((current) => ({ ...current, [product._id]: '' }));
          setReleaseKeys((current) => {
            const next = { ...current };
            delete next[releaseKeyId];
            return next;
          });
        } else if (!inventorySnapshot || !transferSnapshot) {
          toast.error('Release was accepted, but the refresh failed. Keep the same quantity and retry to safely confirm it.');
        } else {
          toast.error('Release was accepted, but it is not visible yet. Keep the same quantity and retry only after it appears in the transfer queue.');
        }
      }
    } catch (error) {
      const status = error.response?.status;
      if (kind === 'dispatch' && status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status)) {
        setReleaseKeys((current) => {
          const next = { ...current };
          delete next[releaseKeyId];
          return next;
        });
      }
      toast.error(error.response?.data?.message || 'Stock movement could not be completed.');
    } finally {
      setBusyId('');
    }
  };

  const resolveTransfer = async (transfer) => {
    const resolutionNote = String(resolutionNotes[transfer._id] || '').trim();
    if (!resolutionNote) {
      toast.error('Add a resolution note before closing this discrepancy.');
      return;
    }
    setResolvingId(transfer._id);
    try {
      await Axios({
        method: 'POST',
        url: `/api/stock-transfers/admin/transfers/${transfer._id}/resolve`,
        data: { action: 'reconcile_variance', resolutionNote },
      });
      toast.success(`${transfer.number} discrepancy resolved and logged.`);
      setResolutionNotes((current) => ({ ...current, [transfer._id]: '' }));
      await Promise.all([load(), loadTransfers()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer discrepancy could not be resolved.');
    } finally {
      setResolvingId('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPendingRelease = Object.keys(releaseKeys).length > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <section className={`${shell} overflow-hidden`}>
        <div className="flex flex-col gap-2 border-b border-brown-100 p-4 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={label}>Release → receive → reconcile</p>
            <h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Store stock transfers</h2>
            <p className="mt-1 text-sm text-brown-500 dark:text-white/55">Released units stay in transit until the destination staff member counts them.</p>
          </div>
          <span className="rounded-full bg-gold-50 px-3 py-1.5 text-xs font-black text-gold-800 dark:bg-gold-900/20 dark:text-gold-200">{transfers.length} open</span>
        </div>
        {transfersLoading ? <p className="p-6 text-sm text-brown-500">Loading transfer queue…</p> : transfers.length === 0 ? <p className="p-6 text-sm text-brown-500">No transfers are waiting for staff confirmation.</p> : (
          <div className="divide-y divide-brown-100 dark:divide-dm-border">
            {transfers.map((transfer) => {
              const dispatched = transfer.lines.reduce((sum, line) => sum + Number(line.dispatchedQuantity || 0), 0);
              const received = transfer.lines.reduce((sum, line) => sum + Number(line.receivedQuantity || 0), 0);
              const isDisputed = transfer.status === 'disputed';
              return (
                <article key={transfer._id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-charcoal dark:text-white">{transfer.number}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${isDisputed ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-gold-50 text-gold-800 dark:bg-gold-900/20 dark:text-gold-200'}`}>{transfer.status.replaceAll('_', ' ')}</span>
                      </div>
                      <p className="mt-1 text-xs text-brown-500">{transfer.destinationBranch} · released {new Date(transfer.releasedAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })} · {received}/{dispatched} units received</p>
                    </div>
                    <p className="text-xs font-bold text-brown-500">By {transfer.releasedBy?.name || 'Admin'}</p>
                  </div>
                  {transfer.notes && <p className="mt-3 rounded-xl bg-ivory px-3 py-2 text-xs text-brown-600 dark:bg-dm-card-2 dark:text-white/60">Admin note: {transfer.notes}</p>}
                  {transfer.receiptNote && <p className="mt-2 rounded-xl border border-red-100 bg-red-50/70 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200"><span className="font-black">Staff note:</span> {transfer.receiptNote}</p>}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wide text-brown-400"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Dispatched</th><th className="pb-2 text-right">Received</th><th className="pb-2 text-right">Variance</th></tr></thead>
                      <tbody>{transfer.lines.map((line) => {
                        const quantity = line.receivedQuantity === null || line.receivedQuantity === undefined ? '—' : line.receivedQuantity;
                        const variance = line.variance === null || line.variance === undefined ? '—' : `${line.variance > 0 ? '+' : ''}${line.variance}`;
                        return <tr key={`${transfer._id}-${line.product}`} className="border-t border-brown-100 dark:border-dm-border"><td className="py-2 font-bold text-charcoal dark:text-white">{line.productName}<span className="ml-2 font-normal text-brown-400">{line.sku || ''}</span>{line.receiptNote && <span className="mt-1 block text-[11px] font-normal text-red-700 dark:text-red-300">Staff: {line.receiptNote}</span>}</td><td className="py-2 text-right font-bold text-charcoal dark:text-white">{line.dispatchedQuantity}</td><td className="py-2 text-right text-charcoal dark:text-white">{quantity}</td><td className={`py-2 text-right font-black ${line.variance === 0 ? 'text-emerald-600' : (line.variance < 0 ? 'text-red-600' : 'text-amber-600')}`}>{variance}</td></tr>;
                      })}</tbody>
                    </table>
                  </div>
                  {isDisputed && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/70 p-3 dark:border-red-900/40 dark:bg-red-900/10"><p className="text-xs font-black text-red-800 dark:text-red-200">Staff reported a difference. Review the staff note and shipment, then reconcile the missing or excess units.</p><textarea value={resolutionNotes[transfer._id] || ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [transfer._id]: event.target.value }))} rows="2" maxLength="500" placeholder="Resolution note" className="mt-3 w-full rounded-xl border border-red-200 bg-white p-2.5 text-sm outline-none focus:border-red-500 dark:border-red-900/50 dark:bg-dm-card-2" /><button type="button" disabled={resolvingId === transfer._id} onClick={() => resolveTransfer(transfer)} className="mt-2 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{resolvingId === transfer._id ? 'Resolving…' : 'Resolve variance'}</button></div>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={`${shell} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-brown-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-dm-border">
        <div>
          <p className={label}>Backroom and shop floor</p>
          <h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Inventory control</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gold-200 bg-gold-50/70 px-3 py-2 text-sm dark:border-gold-800/50 dark:bg-gold-900/10">
            <span className="text-[10px] font-black uppercase tracking-wide text-gold-800 dark:text-gold-200">Destination</span>
            <input value={destinationBranch} onChange={(event) => setDestinationBranch(event.target.value)} disabled={hasPendingRelease} maxLength="100" placeholder="Main Store" className="w-32 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60" aria-label="Destination store" />
          </label>
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
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-ivory text-[11px] uppercase tracking-wide text-brown-400 dark:bg-dm-card-2">
            <tr>
              <th className="p-3 font-bold">Product</th>
              <th className="p-3 text-right">Backroom</th>
              <th className="p-3 text-right">In transit</th>
              <th className="p-3 text-right">Shop floor</th>
              <th className="p-3">Release / receive</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const releasePending = Boolean(releaseKeys[`dispatch:${product._id}`]);
              return (
              <tr key={product._id} className="border-t border-brown-100 dark:border-dm-border">
                <td className="p-3">
                  <p className="font-bold text-charcoal dark:text-white">{product.name}</p>
                  <p className="text-xs text-brown-500">{product.sku || 'No SKU'}</p>
                </td>
                <td className="p-3 text-right font-bold text-plum-700 dark:text-plum-300">{product.warehouseStock || 0}</td>
                <td className="p-3 text-right font-bold text-gold-700 dark:text-gold-300">{product.inTransitStock || 0}</td>
                <td className={`p-3 text-right font-bold ${product.stock <= 3 ? 'text-red-600' : 'text-charcoal dark:text-white'}`}>{product.stock || 0}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={MAX_TRANSFER_QUANTITY}
                      step="1"
                      value={quantities[product._id] || ''}
                      disabled={releasePending || busyId === product._id}
                      onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))}
                      placeholder="Qty"
                      className="w-16 rounded-lg border border-brown-200 bg-white px-2 py-1.5 outline-none dark:border-dm-border dark:bg-dm-card-2"
                    />
                    <button type="button" disabled={busyId === product._id || releasePending} onClick={() => moveStock(product, 'receive')} className="rounded-lg border border-plum-200 px-2 py-1.5 text-xs font-bold text-plum-700 hover:bg-plum-50">Receive</button>
                    <button type="button" disabled={busyId === product._id || !product.warehouseStock} onClick={() => moveStock(product, 'dispatch')} className="rounded-lg bg-plum-700 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">Release</button>
                  </div>
                </td>
              </tr>
              );
            })}
            {!loading && !products.length && <tr><td colSpan="5" className="p-8 text-center text-brown-500">No inventory matches that search.</td></tr>}
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
    </div>
  );
};

export default InventoryControl;
