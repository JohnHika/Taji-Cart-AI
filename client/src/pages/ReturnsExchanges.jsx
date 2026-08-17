import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCamera,
  FaCheckCircle,
  FaExchangeAlt,
  FaSearch,
  FaTimes,
  FaTruck,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import uploadImage from '../utils/UploadImage';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', color: 'bg-green-600' },
  { id: 'equity', label: 'Equity', color: 'bg-gold-600' },
  { id: 'split', label: 'Split', color: 'bg-plum-600' },
];

const STATUS_LABELS = {
  requested: { label: 'Awaiting hair', color: 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300' },
  hair_received: { label: 'Hair received — ready to complete', color: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/60' },
};

const ReturnsExchanges = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [loadingExchanges, setLoadingExchanges] = useState(true);
  const [exchanges, setExchanges] = useState([]);
  const [statusFilter, setStatusFilter] = useState('requested');

  // Step 1: find the original sale/order
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedReturnedItem, setSelectedReturnedItem] = useState(null);

  // Step 2: pick the replacement product
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [replacementSearch, setReplacementSearch] = useState('');
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [reason, setReason] = useState('');

  // Step 3: payment (only if replacement is pricier)
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [equityProofUrl, setEquityProofUrl] = useState('');
  const [equityProofUploading, setEquityProofUploading] = useState(false);
  const [equityApproved, setEquityApproved] = useState(false);
  const equityProofInputRef = React.useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [actingOnId, setActingOnId] = useState(null);

  // Redirect non-staff/non-admin away.
  useEffect(() => {
    if (!user?._id) return;
    const role = (user.role || '').toLowerCase();
    if (!['admin', 'staff', 'manager'].includes(role)) {
      toast.error('Returns & Exchanges is for staff use only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadExchanges = async (status) => {
    try {
      setLoadingExchanges(true);
      const res = await Axios({ url: '/api/exchanges', method: 'GET', params: status ? { status } : {} });
      if (res.data.success) setExchanges(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setLoadingExchanges(false);
    }
  };

  useEffect(() => {
    loadExchanges(statusFilter);
  }, [statusFilter]);

  // Loads a browsable list of recent transactions as soon as the page opens
  // (no term = most recent sales/orders), then re-runs on every keystroke,
  // debounced, so staff can either scroll a live list or narrow it down —
  // never forced to know/type an exact receipt number.
  useEffect(() => {
    if (selectedTransaction) return;
    const timer = setTimeout(() => {
      runSearch();
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedTransaction]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await Axios({ ...SummaryApi.getProduct });
      if (res.data.success) setProducts(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const runSearch = async () => {
    try {
      setSearching(true);
      const res = await Axios({ url: '/api/exchanges/search', method: 'GET', params: { term: searchTerm.trim() } });
      if (res.data.success) setSearchResults(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setSearching(false);
    }
  };

  const pickTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setSelectedReturnedItem(null);
    setSelectedReplacement(null);
    setReplacementSearch('');
    setReason('');
    setPaymentMethod('cash');
    setSplitCashAmount('');
    setEquityProofUrl('');
    setEquityApproved(false);
    if (products.length === 0) loadProducts();
  };

  const filteredReplacementProducts = useMemo(() => {
    const s = replacementSearch.trim().toLowerCase();
    if (!s) return products.slice(0, 12);
    return products.filter((p) =>
      p.name?.toLowerCase().includes(s) ||
      p.sku?.toLowerCase().includes(s) ||
      p.barcode?.toLowerCase().includes(s)
    ).slice(0, 30);
  }, [products, replacementSearch]);

  const returnedTotal = selectedReturnedItem
    ? selectedReturnedItem.unitPrice * selectedReturnedItem.quantity
    : 0;
  const replacementTotal = selectedReplacement
    ? selectedReplacement.price * (selectedReturnedItem?.quantity || 1)
    : 0;
  const priceDifference = selectedReplacement
    ? Math.round((replacementTotal - returnedTotal) * 100) / 100
    : 0;

  const splitEquityAmount = Math.max(0, priceDifference - (Number(splitCashAmount) || 0));

  const handleEquityProofSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setEquityProofUploading(true);
      setEquityApproved(false);
      const res = await uploadImage(file);
      const url = res?.data?.data?.url;
      if (!url) throw new Error('Upload did not return an image URL');
      setEquityProofUrl(url);
      toast.success('Equity confirmation photo attached');
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setEquityProofUploading(false);
    }
  };

  const resetFlow = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedTransaction(null);
    setSelectedReturnedItem(null);
    setSelectedReplacement(null);
    setReplacementSearch('');
    setReason('');
    setPaymentMethod('cash');
    setSplitCashAmount('');
    setEquityProofUrl('');
    setEquityApproved(false);
  };

  const submitExchange = async () => {
    if (!selectedTransaction || !selectedReturnedItem || !selectedReplacement) {
      toast.error('Select the returned item and its replacement first.');
      return;
    }
    if (priceDifference > 0 && (!equityProofUrl || !equityApproved) && paymentMethod !== 'cash') {
      toast.error('Attach and approve the Equity confirmation photo before completing this exchange.');
      return;
    }
    if (priceDifference > 0 && paymentMethod === 'split' && (Number(splitCashAmount) || 0) <= 0) {
      toast.error('Enter the cash portion of a split payment.');
      return;
    }

    let payment;
    if (priceDifference > 0) {
      if (paymentMethod === 'cash') {
        payment = { method: 'cash', amount: priceDifference };
      } else if (paymentMethod === 'equity') {
        payment = { method: 'equity', amount: priceDifference, payments: [{ method: 'equity', amount: priceDifference, proofImageUrl: equityProofUrl, approved: true }] };
      } else {
        payment = {
          method: 'split',
          payments: [
            { method: 'cash', amount: Number(splitCashAmount) || 0 },
            { method: 'equity', amount: splitEquityAmount, proofImageUrl: equityProofUrl, approved: true },
          ],
        };
      }
    }

    try {
      setSubmitting(true);
      const res = await Axios({
        url: '/api/exchanges',
        method: 'POST',
        data: {
          sourceType: selectedTransaction.sourceType,
          sourceId: selectedTransaction.sourceId,
          sourceNumber: selectedTransaction.sourceNumber,
          customerName: selectedTransaction.customerName,
          customerPhone: selectedTransaction.customerPhone,
          returnedItem: {
            product: selectedReturnedItem.product,
            unitPrice: selectedReturnedItem.unitPrice,
            quantity: selectedReturnedItem.quantity,
          },
          replacementItem: {
            product: selectedReplacement._id,
            quantity: selectedReturnedItem.quantity,
          },
          reason: reason.trim(),
          payment,
        },
      });

      if (res.data.success) {
        toast.success(`Exchange ${res.data.data.exchangeNumber} requested — waiting for the hair to arrive back.`);
        resetFlow();
        loadExchanges(statusFilter);
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const markHairReceived = async (id) => {
    try {
      setActingOnId(id);
      const res = await Axios({ url: `/api/exchanges/${id}/hair-received`, method: 'PUT' });
      if (res.data.success) {
        toast.success('Marked as received. You can now complete the exchange.');
        loadExchanges(statusFilter);
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const completeExchange = async (id) => {
    try {
      setActingOnId(id);
      const res = await Axios({ url: `/api/exchanges/${id}/complete`, method: 'PUT' });
      if (res.data.success) {
        toast.success('Exchange completed — stock updated.');
        loadExchanges(statusFilter);
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const cancelExchange = async (id) => {
    if (!window.confirm('Cancel this exchange request? This cannot be undone.')) return;
    try {
      setActingOnId(id);
      const res = await Axios({ url: `/api/exchanges/${id}/cancel`, method: 'PUT' });
      if (res.data.success) {
        toast.success('Exchange cancelled.');
        loadExchanges(statusFilter);
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface text-charcoal dark:text-white pb-16">
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/pos-dashboard')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brown-200 px-2.5 py-2 text-xs font-semibold text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to Sales Hub"
          >
            <FaArrowLeft size={12} />
            <span>Back</span>
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-sm">
              <FaExchangeAlt size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight">Returns & Exchanges</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">Hair-only exchanges — no cash refunds</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4 space-y-6">
        {/* Step 1: find the original transaction */}
        {!selectedTransaction && (
          <div className="rounded-2xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
              Step 1 — Pick the original sale
            </h2>
            <p className="mb-3 text-sm text-brown-500 dark:text-white/50">
              Browse recent sales and orders below, or narrow it down by receipt/order number, customer name or phone.
            </p>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by receipt number, order number, name or phone..."
                className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-plum-50/50 dark:bg-dm-card-2 text-sm focus:outline-none focus:border-plum-500"
              />
            </div>

            {searching && searchResults.length === 0 && (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {!searchTerm && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">
                    Most recent
                  </p>
                )}
                {searchResults.map((t) => (
                  <button
                    key={`${t.sourceType}-${t.sourceId}`}
                    type="button"
                    onClick={() => pickTransaction(t)}
                    className="w-full rounded-xl border border-brown-100 bg-plum-50/40 p-3 text-left transition-colors hover:border-plum-300 dark:border-dm-border dark:bg-dm-card-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        #{t.sourceNumber} <span className="text-xs font-normal text-brown-500 dark:text-white/50">({t.sourceType === 'sale' ? 'POS' : 'Online order'})</span>
                      </span>
                      <span className="text-sm font-bold text-plum-700 dark:text-gold-300">{DisplayPriceInShillings(t.total)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                      {t.customerName} {t.customerPhone ? `· ${t.customerPhone}` : ''} · {new Date(t.date).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-brown-400 dark:text-white/40 truncate">
                      {t.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {searchResults.length === 0 && !searching && (
              <p className="mt-4 text-sm text-brown-400 dark:text-white/40">
                {searchTerm
                  ? `No sales or orders match "${searchTerm}".`
                  : 'No recent sales or orders yet.'}
              </p>
            )}
          </div>
        )}

        {/* Step 1b: pick which item from that transaction is being returned */}
        {selectedTransaction && !selectedReturnedItem && (
          <div className="rounded-2xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                  Step 2 — Which item is being returned?
                </h2>
                <p className="text-xs text-brown-400 dark:text-white/40">
                  #{selectedTransaction.sourceNumber} · {selectedTransaction.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-xs font-semibold text-brown-500 underline dark:text-white/50"
              >
                Change
              </button>
            </div>
            {!selectedTransaction.items[0]?.priceIsExact && (
              <p className="mb-3 rounded-lg bg-gold-50 p-2 text-xs text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
                This is an online order — the price shown is the item&apos;s current catalog price, not necessarily
                what was paid at the time, since online orders don&apos;t store a per-item price.
              </p>
            )}
            <div className="space-y-2">
              {selectedTransaction.items.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedReturnedItem(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-brown-100 p-3 text-left transition-colors hover:border-plum-300 dark:border-dm-border"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-brown-500 dark:text-white/50">
                      {item.quantity} x {DisplayPriceInShillings(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-plum-700 dark:text-gold-300">
                    {DisplayPriceInShillings(item.unitPrice * item.quantity)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: pick replacement */}
        {selectedTransaction && selectedReturnedItem && !selectedReplacement && (
          <div className="rounded-2xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                  Step 3 — Pick the replacement
                </h2>
                <p className="text-xs text-brown-400 dark:text-white/40">
                  Returning {selectedReturnedItem.quantity}x {selectedReturnedItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnedItem(null)}
                className="text-xs font-semibold text-brown-500 underline dark:text-white/50"
              >
                Change
              </button>
            </div>
            <div className="relative mb-3">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
              <input
                type="text"
                value={replacementSearch}
                onChange={(e) => setReplacementSearch(e.target.value)}
                placeholder="Search replacement product..."
                className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-plum-50/50 dark:bg-dm-card-2 text-sm focus:outline-none focus:border-plum-500"
              />
            </div>
            {loadingProducts ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredReplacementProducts.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedReplacement(p)}
                    className="rounded-lg border border-brown-100 bg-white p-2 text-left transition-colors hover:border-plum-300 dark:border-dm-border dark:bg-dm-card-2"
                  >
                    <p className="text-xs font-semibold line-clamp-2 min-h-[2rem]">{p.name}</p>
                    <p className="mt-1 text-sm font-bold text-plum-700 dark:text-plum-300">{DisplayPriceInShillings(p.price)}</p>
                  </button>
                ))}
                {filteredReplacementProducts.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-brown-400 dark:text-white/40">No products found.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: confirm + payment if pricier */}
        {selectedTransaction && selectedReturnedItem && selectedReplacement && (
          <div className="rounded-2xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                Step 4 — Confirm exchange
              </h2>
              <button
                type="button"
                onClick={() => setSelectedReplacement(null)}
                className="text-xs font-semibold text-brown-500 underline dark:text-white/50"
              >
                Change
              </button>
            </div>

            <div className="space-y-2 rounded-xl bg-plum-50/40 p-3 text-sm dark:bg-dm-card-2">
              <div className="flex justify-between">
                <span className="text-brown-500 dark:text-white/50">Returning</span>
                <span className="font-medium">{selectedReturnedItem.quantity}x {selectedReturnedItem.name} ({DisplayPriceInShillings(returnedTotal)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brown-500 dark:text-white/50">Replacement</span>
                <span className="font-medium">{selectedReturnedItem.quantity}x {selectedReplacement.name} ({DisplayPriceInShillings(replacementTotal)})</span>
              </div>
              <div className="flex justify-between border-t border-brown-200 pt-2 font-bold dark:border-dm-border">
                <span>{priceDifference > 0 ? 'Customer owes' : priceDifference < 0 ? 'Difference (forfeited, no refund)' : 'Even swap'}</span>
                <span className={priceDifference > 0 ? 'text-plum-700 dark:text-gold-300' : 'text-brown-500 dark:text-white/50'}>
                  {DisplayPriceInShillings(Math.abs(priceDifference))}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Wrong colour, customer wanted a different type"
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm resize-none"
              />
            </div>

            {priceDifference > 0 && (
              <div className="mt-4 border-t border-brown-100 pt-4 dark:border-dm-border">
                <p className="mb-2 text-sm font-medium">Collect {DisplayPriceInShillings(priceDifference)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id !== 'split') setSplitCashAmount('');
                      }}
                      className={`min-h-[44px] rounded-lg text-sm font-medium text-white transition-opacity active:scale-[0.97] ${m.color} ${
                        paymentMethod === m.id ? 'opacity-100 ring-2 ring-offset-1 ring-gold-400' : 'opacity-70'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'split' && (
                  <div className="pt-3">
                    <label className="text-sm font-medium">Cash portion</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={splitCashAmount}
                      onChange={(e) => setSplitCashAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-brown-500 dark:text-white/50">
                      Equity portion: {DisplayPriceInShillings(splitEquityAmount)}
                    </p>
                  </div>
                )}

                {(paymentMethod === 'equity' || paymentMethod === 'split') && (
                  <div className="pt-3">
                    <label className="text-sm font-medium">Equity SMS confirmation</label>
                    <input
                      ref={equityProofInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleEquityProofSelected}
                      className="hidden"
                    />
                    {!equityProofUrl ? (
                      <button
                        type="button"
                        onClick={() => equityProofInputRef.current?.click()}
                        disabled={equityProofUploading}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brown-300 py-3 text-sm font-medium text-brown-600 transition-colors hover:bg-brown-50 disabled:opacity-60 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
                      >
                        <FaCamera />
                        {equityProofUploading ? 'Uploading…' : 'Attach confirmation photo'}
                      </button>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <div className="relative overflow-hidden rounded-lg border border-brown-200 dark:border-dm-border">
                          <img src={equityProofUrl} alt="Equity payment confirmation" className="max-h-32 w-full object-contain bg-white" />
                          <button
                            type="button"
                            onClick={() => { setEquityProofUrl(''); setEquityApproved(false); }}
                            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                            aria-label="Remove confirmation photo"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                        <label className="flex items-start gap-2.5 rounded-lg border border-brown-100 bg-white p-2.5 text-sm dark:border-dm-border dark:bg-dm-card-2">
                          <input
                            type="checkbox"
                            checked={equityApproved}
                            onChange={(e) => setEquityApproved(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-plum-700"
                          />
                          <span className="text-brown-700 dark:text-white/70">
                            I confirm this Equity payment SMS is genuine — approve payment
                          </span>
                        </label>
                        {equityApproved && (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                            <FaCheckCircle /> Approved by {user.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 rounded-lg bg-gold-50 p-3 text-xs text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
              This will be recorded as <strong>awaiting hair</strong> — the replacement is only handed over once the
              original hair is confirmed received back at the shop.
            </div>

            <button
              onClick={submitExchange}
              disabled={submitting || (priceDifference > 0 && (paymentMethod === 'equity' || paymentMethod === 'split') && (!equityProofUrl || !equityApproved))}
              className="mt-4 w-full bg-plum-700 hover:bg-plum-800 disabled:bg-brown-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {submitting ? 'Requesting…' : 'Request Exchange'}
            </button>
          </div>
        )}

        {/* Pending / completed exchanges */}
        <div className="rounded-2xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
              Exchanges
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 px-2 py-1.5 text-xs"
            >
              <option value="requested">Awaiting hair</option>
              <option value="hair_received">Ready to complete</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
          </div>

          {loadingExchanges ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : exchanges.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-brown-400 dark:text-white/40">
              <FaBoxOpen size={24} />
              <p className="text-sm">No exchanges in this status.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exchanges.map((ex) => (
                <div key={ex._id} className="rounded-xl border border-brown-100 p-3 dark:border-dm-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ex.exchangeNumber}</p>
                      <p className="text-xs text-brown-500 dark:text-white/50">
                        Ref #{ex.sourceNumber} · {ex.customerName || 'Customer'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_LABELS[ex.status]?.color || ''}`}>
                      {STATUS_LABELS[ex.status]?.label || ex.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-brown-600 dark:text-white/60">
                    Returned {ex.returnedItem.quantity}x {ex.returnedItem.name} → {ex.replacementItem.quantity}x {ex.replacementItem.name}
                  </p>
                  {ex.priceDifference > 0 && (
                    <p className="mt-1 text-xs text-plum-700 dark:text-gold-300">
                      Collected {DisplayPriceInShillings(ex.priceDifference)} difference
                    </p>
                  )}
                  {ex.reason && (
                    <p className="mt-1 text-xs italic text-brown-400 dark:text-white/40">&quot;{ex.reason}&quot;</p>
                  )}
                  {(ex.status === 'requested' || ex.status === 'hair_received') && (
                    <div className="mt-3 flex gap-2">
                      {ex.status === 'requested' && (
                        <button
                          onClick={() => markHairReceived(ex._id)}
                          disabled={actingOnId === ex._id}
                          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg bg-plum-700 text-xs font-semibold text-white transition-colors hover:bg-plum-800 disabled:opacity-60"
                        >
                          <FaTruck size={12} /> Mark Hair Received
                        </button>
                      )}
                      {ex.status === 'hair_received' && (
                        <button
                          onClick={() => completeExchange(ex._id)}
                          disabled={actingOnId === ex._id}
                          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg bg-green-600 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                        >
                          <FaCheckCircle size={12} /> Complete Exchange
                        </button>
                      )}
                      <button
                        onClick={() => cancelExchange(ex._id)}
                        disabled={actingOnId === ex._id}
                        className="min-h-[40px] rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-brown-400 dark:text-white/40">
                    Requested by {ex.requestedByName} · {new Date(ex.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnsExchanges;
