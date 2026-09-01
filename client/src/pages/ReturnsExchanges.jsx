import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCamera,
  FaCheckCircle,
  FaChevronRight,
  FaClipboardList,
  FaClock,
  FaCopy,
  FaExchangeAlt,
  FaHourglassHalf,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaTimes,
  FaTrash,
  FaTruck,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import uploadImage from '../utils/UploadImage';
import { compressImage } from '../utils/compressImage';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

// Mirrors the Sales Counter's payment options exactly, so a cashier moves
// between the two screens without relearning anything.
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', color: 'bg-green-600' },
  { id: 'equity', label: 'Equity', color: 'bg-gold-600' },
  { id: 'split', label: 'Split', color: 'bg-plum-600' },
  { id: 'text_forwarded', label: 'Text Fwd', color: 'bg-blue-600' },
];

const STATUS_LABELS = {
  requested: { label: 'Awaiting hair', color: 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300' },
  hair_received: { label: 'Ready to complete', color: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/60' },
};

const STEPS = [
  { key: 'transaction', label: 'Sale' },
  { key: 'returned', label: 'Returning' },
  { key: 'replacement', label: 'Replacement' },
  { key: 'confirm', label: 'Confirm' },
];

// Reads an exchange's swapped lines from the arrays (new shape) with the
// singular field as fallback (exchanges created before multi-item support).
const getReturnedLines = (ex) => (ex.returnedItems?.length ? ex.returnedItems : (ex.returnedItem ? [ex.returnedItem] : []));
const getReplacementLines = (ex) => (ex.replacementItems?.length ? ex.replacementItems : (ex.replacementItem ? [ex.replacementItem] : []));

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

  // Step 1b: the return basket — every item going back, keyed by product id:
  // { [productId]: { ...item, quantity } }. One exchange covers the whole
  // receipt, no per-item back-and-forth.
  const [returnBasket, setReturnBasket] = useState({});

  // Step 2: the replacement basket — every product going out, keyed by id:
  // { [productId]: { ...product, quantity } }. Quantities default to mirror
  // the returned total 1:1 but are independently adjustable per line.
  const [replacementBasket, setReplacementBasket] = useState({});

  // Step 2: pick the replacement product
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [replacementSearch, setReplacementSearch] = useState('');
  const [reason, setReason] = useState('');

  // Step 3: payment (only if the replacement is pricier overall)
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [forwardedText, setForwardedText] = useState('');
  const [forwardedTextApproved, setForwardedTextApproved] = useState(false);
  const [equityProofUrl, setEquityProofUrl] = useState('');
  const [equityProofUploading, setEquityProofUploading] = useState(false);
  const [equityProofUploadProgress, setEquityProofUploadProgress] = useState(0);
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
    setReturnBasket({});
    setReplacementBasket({});
    setReplacementSearch('');
    setReason('');
    setPaymentMethod('cash');
    setSplitCashAmount('');
    setAmountTendered('');
    setForwardedText('');
    setForwardedTextApproved(false);
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

  // One card per product (an order can repeat the same product across
  // lines), with the line quantity summed and the server-computed
  // returnable amount carried through.
  const returnableItems = useMemo(() => {
    if (!selectedTransaction) return [];
    const byProduct = new Map();
    for (const item of selectedTransaction.items) {
      const key = String(item.product);
      if (!byProduct.has(key)) byProduct.set(key, { ...item, quantity: 0 });
      byProduct.get(key).quantity += item.quantity;
    }
    return Array.from(byProduct.values());
  }, [selectedTransaction]);

  // --- Return basket ------------------------------------------------------

  // Tapping a line toggles it into/out of the basket at its full remaining
  // amount; the stepper adjusts the quantity afterwards (capped at what the
  // receipt still allows).
  const toggleReturnLine = (item) => {
    setReturnBasket((prev) => {
      const next = { ...prev };
      const key = String(item.product);
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { ...item, quantity: Math.max(1, item.returnableQty ?? item.quantity) };
      }
      return next;
    });
  };

  const adjustReturnQty = (productId, delta) => {
    setReturnBasket((prev) => {
      const entry = prev[productId];
      if (!entry) return prev;
      const max = Math.max(1, entry.returnableQty ?? entry.quantity);
      const next = Math.min(max, Math.max(1, entry.quantity + delta));
      return { ...prev, [productId]: { ...entry, quantity: next } };
    });
  };

  // --- Replacement basket ---------------------------------------------------

  // Total pieces going back / coming in — drives the pcs-parity hints so a
  // quantity mistake is visible before the exchange is recorded.
  const totalReturnedQty = useMemo(
    () => Object.values(returnBasket).reduce((sum, l) => sum + l.quantity, 0),
    [returnBasket]
  );
  const totalReplacementQty = useMemo(
    () => Object.values(replacementBasket).reduce((sum, l) => sum + l.quantity, 0),
    [replacementBasket]
  );

  // Picking a replacement starts the line at 1 — the cashier bumps it with
  // the stepper if the customer takes more. Deliberately NOT auto-copied
  // from the returned total: with several replacement products that would
  // hand EVERY line the full returned count and inflate the swap (e.g.
  // 2 returned pcs + 2 replacement products → 4 pcs out → wrong price
  // difference).
  const addReplacement = (product) => {
    setReplacementBasket((prev) => {
      const key = String(product._id);
      if (prev[key]) return prev; // already in the basket — stepper adjusts
      return { ...prev, [key]: { ...product, quantity: 1 } };
    });
  };

  const adjustReplacementQty = (productId, delta) => {
    setReplacementBasket((prev) => {
      const entry = prev[productId];
      if (!entry) return prev;
      const next = Math.max(1, entry.quantity + delta);
      return { ...prev, [productId]: { ...entry, quantity: next } };
    });
  };

  const removeReplacement = (productId) => {
    setReplacementBasket((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Shared compact stepper — 44px tap targets for phones, tabular numbers,
  // disabled edges at the bounds.
  const renderQtyStepper = ({ value, min, max, onDecrease, onIncrease, testId }) => (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card">
      <button
        type="button"
        onClick={onDecrease}
        disabled={value <= min}
        aria-label="Decrease quantity"
        data-testid={testId ? `${testId}-minus` : undefined}
        className="flex h-11 w-11 items-center justify-center text-plum-700 transition-colors hover:bg-plum-50 active:bg-plum-100 disabled:text-brown-300 disabled:hover:bg-transparent dark:text-plum-300 dark:hover:bg-dm-card-2"
      >
        <FaMinus size={11} />
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums text-plum-700 dark:text-plum-300" data-testid={testId}>
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={max != null && value >= max}
        aria-label="Increase quantity"
        data-testid={testId ? `${testId}-plus` : undefined}
        className="flex h-11 w-11 items-center justify-center text-plum-700 transition-colors hover:bg-plum-50 active:bg-plum-100 disabled:text-brown-300 disabled:hover:bg-transparent dark:text-plum-300 dark:hover:bg-dm-card-2"
      >
        <FaPlus size={11} />
      </button>
    </div>
  );

  // --- Totals across the whole exchange -------------------------------------

  const returnedTotal = useMemo(
    () => Object.values(returnBasket).reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [returnBasket]
  );
  const replacementTotal = useMemo(
    () => Object.values(replacementBasket).reduce((sum, l) => l.price * l.quantity, 0),
    [replacementBasket]
  );
  const priceDifference = Math.round((replacementTotal - returnedTotal) * 100) / 100;

  const splitEquityAmount = Math.max(0, priceDifference - (Number(splitCashAmount) || 0));

  // Cash tendered → change, mirroring the counter. Anything at or above the
  // owed amount is fine; the owed amount is what gets recorded either way.
  const amountTenderedValue = Number(amountTendered) || 0;
  const cashChange = Math.max(0, Math.round((amountTenderedValue - priceDifference) * 100) / 100);

  const returnBasketCount = Object.keys(returnBasket).length;
  const replacementBasketCount = Object.keys(replacementBasket).length;

  const activeStepIndex = !selectedTransaction ? 0
    : returnBasketCount === 0 ? 1
    : replacementBasketCount === 0 ? 2
    : 3;

  const pendingCount = useMemo(
    () => exchanges.filter((ex) => ex.status === 'requested').length,
    [exchanges]
  );
  const readyCount = useMemo(
    () => exchanges.filter((ex) => ex.status === 'hair_received').length,
    [exchanges]
  );

  const handleEquityProofSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setEquityProofUploading(true);
      setEquityProofUploadProgress(0);
      setEquityApproved(false);
      // Shop wifi is often slow — a raw camera photo (3-8MB) is what actually
      // causes uploads to stall. Shrinking it first is the real fix; upload
      // itself also retries automatically on a dropped/timed-out connection.
      const compressed = await compressImage(file);
      const res = await uploadImage(compressed, setEquityProofUploadProgress);
      const url = res?.data?.data?.url;
      if (!url) throw new Error('Upload did not return an image URL');
      setEquityProofUrl(url);
      toast.success('Equity confirmation photo attached');
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setEquityProofUploading(false);
      setEquityProofUploadProgress(0);
    }
  };

  const resetFlow = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedTransaction(null);
    setReturnBasket({});
    setReplacementBasket({});
    setReplacementSearch('');
    setReason('');
    setPaymentMethod('cash');
    setSplitCashAmount('');
    setAmountTendered('');
    setForwardedText('');
    setForwardedTextApproved(false);
    setEquityProofUrl('');
    setEquityApproved(false);
  };

  // Lets the admin (who received the confirmation SMS on their own phone)
  // copy it back out — same affordance as the Sales Counter.
  const copyForwardedText = async () => {
    if (!forwardedText.trim()) return;
    try {
      await navigator.clipboard.writeText(forwardedText);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy — copy it manually instead.');
    }
  };

  const submitExchange = async () => {
    if (!selectedTransaction) return;
    if (returnBasketCount === 0) {
      toast.error('Tick at least one item to return.');
      return;
    }
    if (replacementBasketCount === 0) {
      toast.error('Add at least one replacement item.');
      return;
    }
    if (priceDifference > 0 && (paymentMethod === 'equity' || paymentMethod === 'split') && (!equityProofUrl || !equityApproved)) {
      toast.error('Attach and approve the Equity confirmation photo before completing this exchange.');
      return;
    }
    if (priceDifference > 0 && paymentMethod === 'text_forwarded' && (!forwardedText.trim() || !forwardedTextApproved)) {
      toast.error('Paste and approve the forwarded confirmation message before completing this exchange.');
      return;
    }
    if (priceDifference > 0 && paymentMethod === 'split' && (Number(splitCashAmount) || 0) <= 0) {
      toast.error('Enter the cash portion of a split payment.');
      return;
    }
    if (priceDifference > 0 && paymentMethod === 'cash' && amountTenderedValue > 0 && amountTenderedValue < priceDifference) {
      toast.error('Amount tendered is less than what the customer owes.');
      return;
    }

    let payment;
    if (priceDifference > 0) {
      if (paymentMethod === 'cash') {
        payment = {
          method: 'cash',
          amount: priceDifference,
          amountTendered: amountTenderedValue > 0 ? amountTenderedValue : undefined,
          change: amountTenderedValue > 0 ? cashChange : undefined,
        };
      } else if (paymentMethod === 'equity') {
        payment = { method: 'equity', amount: priceDifference, payments: [{ method: 'equity', amount: priceDifference, proofImageUrl: equityProofUrl, approved: true }] };
      } else if (paymentMethod === 'text_forwarded') {
        payment = { method: 'text_forwarded', amount: priceDifference, forwardedText, approved: true, payments: [{ method: 'text_forwarded', amount: priceDifference, forwardedText, approved: true }] };
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
          returnedItems: Object.values(returnBasket).map((l) => ({
            product: l.product,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
          })),
          replacementItems: Object.values(replacementBasket).map((l) => ({
            product: l._id,
            quantity: l.quantity,
          })),
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

  // Renders one line of the return/replacement summary table on the
  // confirm step — qty × name with the line total on the right.
  const renderSummaryLine = (badge, labelClass, qty, name, total, extra) => (
    <div className="flex items-center gap-3 p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
        {extra || (labelClass === 'minus' ? '−' : '+')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{qty}× {name}</p>
      </div>
      <span className="shrink-0 text-sm font-bold">{DisplayPriceInShillings(total)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface text-charcoal dark:text-white pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/pos-dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to Sales Hub"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
              <FaExchangeAlt size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Returns &amp; Exchanges</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">Hair-only swaps — no cash refunds</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4 space-y-5">
        {/* At-a-glance stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
              <FaHourglassHalf size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Awaiting hair</p>
            <p className="mt-1 text-xl font-black tracking-tight">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
              <FaClipboardList size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Ready to complete</p>
            <p className="mt-1 text-xl font-black tracking-tight">{readyCount}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:col-span-1 sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <FaCheckCircle size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">On this filter</p>
            <p className="mt-1 text-xl font-black tracking-tight">{exchanges.length}</p>
          </div>
        </div>

        {/* New exchange flow */}
        <div className="rounded-2xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
          {/* Step progress */}
          <div className="flex items-center gap-1 border-b border-brown-100 px-4 pb-3 pt-4 dark:border-dm-border sm:px-6">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      idx < activeStepIndex
                        ? 'bg-plum-700 text-white'
                        : idx === activeStepIndex
                          ? 'bg-gold-500 text-white'
                          : 'bg-brown-100 text-brown-400 dark:bg-dm-card-2 dark:text-white/30'
                    }`}
                  >
                    {idx < activeStepIndex ? <FaCheckCircle size={11} /> : idx + 1}
                  </span>
                  <span className={`hidden text-xs font-semibold sm:inline ${idx === activeStepIndex ? 'text-charcoal dark:text-white' : 'text-brown-400 dark:text-white/40'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full ${idx < activeStepIndex ? 'bg-plum-700' : 'bg-brown-100 dark:bg-dm-card-2'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {/* Step 1: find the original transaction */}
            {!selectedTransaction && (
              <div>
                <h2 className="text-base font-bold tracking-tight">Which sale is this?</h2>
                <p className="mt-1 text-sm text-brown-500 dark:text-white/50">
                  Browse recent sales and orders below, or narrow it down by receipt/order number, customer name or phone.
                </p>
                <div className="relative mt-4">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by receipt number, order number, name or phone..."
                    className="w-full min-h-[46px] rounded-xl border border-brown-200 bg-ivory pl-10 pr-4 text-sm outline-none transition-colors focus:border-plum-500 focus:bg-white dark:border-dm-border dark:bg-dm-card-2 dark:text-white dark:focus:bg-dm-card"
                  />
                </div>

                {searching && searchResults.length === 0 && (
                  <div className="flex justify-center py-10"><LoadingSpinner /></div>
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
                        className="group flex w-full items-center gap-3 rounded-xl border border-brown-100 bg-ivory p-3 text-left transition-all hover:border-plum-300 hover:shadow-sm dark:border-dm-border dark:bg-dm-card-2"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          t.sourceType === 'sale'
                            ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300'
                            : 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300'
                        }`}>
                          {t.sourceType === 'sale' ? 'POS' : 'WEB'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">#{t.sourceNumber}</span>
                            <span className="shrink-0 text-sm font-bold text-plum-700 dark:text-gold-300">{DisplayPriceInShillings(t.total)}</span>
                          </div>
                          <p className="truncate text-xs text-brown-500 dark:text-white/50">
                            {t.customerName} {t.customerPhone ? `· ${t.customerPhone}` : ''} · {new Date(t.date).toLocaleDateString()}
                          </p>
                          <p className="truncate text-xs text-brown-400 dark:text-white/40">
                            {t.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <FaChevronRight className="shrink-0 text-brown-300 transition-transform group-hover:translate-x-0.5 dark:text-white/20" size={12} />
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && !searching && (
                  <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-brown-400 dark:text-white/40">
                    <FaSearch size={20} />
                    <p className="text-sm">
                      {searchTerm ? `No sales or orders match "${searchTerm}".` : 'No recent sales or orders yet.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 1b: tick EVERY item going back — one exchange covers the
                whole receipt, no per-item back-and-forth. */}
            {selectedTransaction && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">What is being returned?</h2>
                    <p className="mt-0.5 text-xs text-brown-400 dark:text-white/40">
                      #{selectedTransaction.sourceNumber} · {selectedTransaction.customerName} · tick everything going back
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="shrink-0 rounded-pill border border-brown-200 px-3 py-1.5 text-xs font-semibold text-brown-600 transition-colors hover:bg-brown-50 dark:border-dm-border dark:text-white/60 dark:hover:bg-dm-card-2"
                  >
                    Change sale
                  </button>
                </div>
                {!selectedTransaction.items[0]?.priceIsExact && (
                  <p className="mt-3 rounded-xl bg-gold-50 p-3 text-xs text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
                    This is an online order — the price shown is the item&apos;s current catalog price, not necessarily
                    what was paid at the time, since online orders don&apos;t store a per-item price.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  {returnableItems.map((item, idx) => {
                    const max = Math.max(1, item.returnableQty ?? item.quantity);
                    const fullyReturned = item.returnableQty === 0;
                    const inBasket = Boolean(returnBasket[String(item.product)]);
                    const basketQty = returnBasket[String(item.product)]?.quantity;
                    return (
                      <div
                        key={`${item.product}-${idx}`}
                        className={`rounded-xl border p-3 transition-all dark:border-dm-border ${
                          fullyReturned
                            ? 'border-brown-100 bg-brown-50/60 opacity-60 dark:bg-dm-card-2/40'
                            : inBasket
                              ? 'border-plum-400 bg-plum-50/60 dark:bg-plum-900/10'
                              : 'border-brown-100 bg-ivory hover:border-plum-300 hover:shadow-sm dark:bg-dm-card-2'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleReturnLine(item)}
                            disabled={fullyReturned}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
                            aria-label={inBasket ? `Remove ${item.name} from return basket` : `Add ${item.name} to return basket`}
                          >
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                                inBasket
                                  ? 'border-plum-600 bg-plum-700 text-white'
                                  : 'border-brown-300 bg-white text-transparent dark:border-dm-border dark:bg-dm-card'
                              }`}
                            >
                              <FaCheckCircle size={12} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{item.name}</p>
                              <p className="text-xs text-brown-500 dark:text-white/50">
                                Bought {item.quantity} × {DisplayPriceInShillings(item.unitPrice)}
                              </p>
                              <p className={`text-xs font-semibold ${fullyReturned ? 'text-brown-400 dark:text-white/30' : 'text-plum-700 dark:text-gold-300'}`}>
                                {fullyReturned
                                  ? 'Already fully exchanged'
                                  : `${item.returnableQty ?? item.quantity} returnable`}
                              </p>
                            </div>
                          </button>
                          <span className="shrink-0 pt-0.5 text-sm font-bold text-plum-700 dark:text-gold-300">
                            {DisplayPriceInShillings(item.unitPrice * (basketQty ?? max))}
                          </span>
                        </div>
                        {inBasket && (
                          <div className="mt-3 flex justify-end">
                            {renderQtyStepper({
                              value: basketQty,
                              min: 1,
                              max,
                              onDecrease: () => adjustReturnQty(String(item.product), -1),
                              onIncrease: () => adjustReturnQty(String(item.product), +1),
                              testId: `return-qty-${item.product}`,
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Return basket running total */}
                {returnBasketCount > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-plum-200 bg-plum-50/50 px-4 py-3 dark:border-plum-900/40 dark:bg-plum-900/10">
                    <span className="flex items-center gap-2 text-sm font-bold text-plum-800 dark:text-plum-200">
                      <FaShoppingBasket size={14} />
                      Returning {returnBasketCount} {returnBasketCount === 1 ? 'item' : 'items'} · {totalReturnedQty} pcs
                    </span>
                    <span className="text-sm font-black text-plum-800 dark:text-plum-200">
                      {DisplayPriceInShillings(returnedTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: pick replacements — add as many as needed, each with
                its own quantity. */}
            {selectedTransaction && returnBasketCount > 0 && (
              <div className="mt-6 border-t border-brown-100 pt-5 dark:border-dm-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Pick the replacement{replacementBasketCount > 0 ? 's' : ''}</h2>
                    <p className="mt-0.5 text-xs text-brown-400 dark:text-white/40">
                      For {totalReturnedQty} pcs going back · add as many products as the customer is taking
                    </p>
                  </div>
                </div>

                {/* Replacement basket */}
                {replacementBasketCount > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(replacementBasket).map(([id, line]) => (
                      <div key={id} className="flex items-center gap-3 rounded-xl border border-plum-200 bg-plum-50/40 p-3 dark:border-plum-900/40 dark:bg-plum-900/10">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{line.name}</p>
                          <p className="text-xs text-brown-500 dark:text-white/50">
                            {DisplayPriceInShillings(line.price)} each · {DisplayPriceInShillings(line.price * line.quantity)} total
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {renderQtyStepper({
                            value: line.quantity,
                            min: 1,
                            max: undefined,
                            onDecrease: () => adjustReplacementQty(id, -1),
                            onIncrease: () => adjustReplacementQty(id, +1),
                            testId: `replacement-qty-${id}`,
                          })}
                          <button
                            type="button"
                            onClick={() => removeReplacement(id)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label={`Remove ${line.name} from replacements`}
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 dark:border-green-900/40 dark:bg-green-900/10">
                      <span className="flex items-center gap-2 text-sm font-bold text-green-800 dark:text-green-200">
                        <FaCheckCircle size={14} />
                        Replacing with {replacementBasketCount} {replacementBasketCount === 1 ? 'item' : 'items'} · {totalReplacementQty} {totalReplacementQty === 1 ? 'pc' : 'pcs'}
                      </span>
                      <span className="text-sm font-black text-green-800 dark:text-green-200">
                        {DisplayPriceInShillings(replacementTotal)}
                      </span>
                    </div>
                    {totalReplacementQty !== totalReturnedQty && (
                      <p className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-2.5 text-xs font-semibold text-gold-800 dark:border-gold-900/40 dark:bg-gold-900/10 dark:text-gold-200">
                        Swapping {totalReturnedQty} returned {totalReturnedQty === 1 ? 'pc' : 'pcs'} for {totalReplacementQty} — adjust the quantities if that&apos;s not right.
                      </p>
                    )}
                  </div>
                )}

                <div className="relative mt-4">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
                  <input
                    type="text"
                    value={replacementSearch}
                    onChange={(e) => setReplacementSearch(e.target.value)}
                    placeholder="Search replacement product..."
                    className="w-full min-h-[46px] rounded-xl border border-brown-200 bg-ivory pl-10 pr-4 text-sm outline-none transition-colors focus:border-plum-500 focus:bg-white dark:border-dm-border dark:bg-dm-card-2 dark:text-white dark:focus:bg-dm-card"
                  />
                </div>
                {loadingProducts ? (
                  <div className="flex justify-center py-10"><LoadingSpinner /></div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {filteredReplacementProducts.map((p) => {
                      const inBasket = Boolean(replacementBasket[String(p._id)]);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => addReplacement(p)}
                          className={`relative overflow-hidden rounded-xl border text-left transition-all hover:shadow-sm dark:border-dm-border ${
                            inBasket
                              ? 'border-plum-400 ring-2 ring-plum-300 dark:border-plum-500 dark:ring-plum-700'
                              : 'border-brown-100 bg-ivory hover:border-plum-300 dark:bg-dm-card-2'
                          }`}
                        >
                          {inBasket && (
                            <span className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-plum-700 text-white shadow-sm">
                              <FaCheckCircle size={12} />
                            </span>
                          )}
                          <div className="flex aspect-square items-center justify-center bg-white dark:bg-dm-card">
                            {p.image?.[0] ? (
                              <img src={p.image[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-2xl">🛍️</span>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold leading-snug line-clamp-2 min-h-[2rem]">{p.name}</p>
                            <p className="mt-0.5 text-sm font-bold text-plum-700 dark:text-plum-300">{DisplayPriceInShillings(p.price)}</p>
                          </div>
                        </button>
                      );
                    })}
                    {filteredReplacementProducts.length === 0 && (
                      <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-brown-400 dark:text-white/40">
                        <FaBoxOpen size={20} />
                        <p className="text-sm">No products found.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: confirm the WHOLE exchange + one payment at the end. */}
            {selectedTransaction && returnBasketCount > 0 && replacementBasketCount > 0 && (
              <div className="mt-6 border-t border-brown-100 pt-5 dark:border-dm-border">
                <h2 className="text-base font-bold tracking-tight">Confirm the exchange</h2>

                <div className="mt-4 overflow-hidden rounded-xl border border-brown-100 dark:border-dm-border">
                  <div className="bg-ivory p-3 dark:bg-dm-card-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">Returning</p>
                  </div>
                  {Object.values(returnBasket).map((line) => (
                    <div key={`ret-${line.product}`} className="border-t border-brown-100 dark:border-dm-border">
                      {renderSummaryLine('bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/20 dark:text-red-300', 'minus', line.quantity, line.name, line.unitPrice * line.quantity)}
                    </div>
                  ))}
                  <div className="border-t border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">Replacement</p>
                  </div>
                  {Object.values(replacementBasket).map((line) => (
                    <div key={`rep-${line._id}`} className="border-t border-brown-100 dark:border-dm-border">
                      {renderSummaryLine('bg-green-100 text-xs font-bold text-green-600 dark:bg-green-900/20 dark:text-green-300', 'plus', line.quantity, line.name, line.price * line.quantity)}
                    </div>
                  ))}
                  <div className={`flex items-center justify-between border-t border-brown-100 px-3 py-2 text-xs dark:border-dm-border ${
                    totalReplacementQty === totalReturnedQty
                      ? 'text-brown-400 dark:text-white/40'
                      : 'font-semibold text-red-600 dark:text-red-300'
                  }`}>
                    <span>
                      {totalReturnedQty} {totalReturnedQty === 1 ? 'pc' : 'pcs'} out ↔ {totalReplacementQty} {totalReplacementQty === 1 ? 'pc' : 'pcs'} in
                    </span>
                    {totalReplacementQty !== totalReturnedQty && (
                      <span>Quantities don&apos;t match — check before requesting</span>
                    )}
                  </div>
                  <div className={`flex items-center justify-between border-t p-3 dark:border-dm-border ${
                    priceDifference > 0 ? 'bg-gold-50 dark:bg-gold-900/10' : 'bg-plum-50/50 dark:bg-dm-card-2'
                  }`}>
                    <span className="text-sm font-bold">
                      {priceDifference > 0 ? 'Customer owes' : priceDifference < 0 ? 'Forfeited (no refund)' : 'Even swap — nothing owed'}
                    </span>
                    <span className={`text-base font-black ${priceDifference > 0 ? 'text-gold-700 dark:text-gold-300' : 'text-brown-500 dark:text-white/50'}`}>
                      {DisplayPriceInShillings(Math.abs(priceDifference))}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold">Reason <span className="font-normal text-brown-400 dark:text-white/40">(optional)</span></label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Wrong colour, customer wanted a different type"
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-brown-200 bg-ivory px-3 py-2.5 text-sm outline-none transition-colors focus:border-plum-500 focus:bg-white resize-none dark:border-dm-border dark:bg-dm-card-2 dark:text-white dark:focus:bg-dm-card"
                  />
                </div>

                {priceDifference > 0 && (
                  <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50/50 p-4 dark:border-gold-900/30 dark:bg-gold-900/10">
                    <p className="mb-3 text-sm font-bold text-gold-800 dark:text-gold-200">
                      Collect {DisplayPriceInShillings(priceDifference)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(m.id);
                            if (m.id !== 'split') setSplitCashAmount('');
                          }}
                          className={`min-h-[44px] rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.97] ${m.color} ${
                            paymentMethod === m.id ? 'opacity-100 ring-2 ring-offset-1 ring-gold-400' : 'opacity-60 hover:opacity-80'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'cash' && (
                      <div className="mt-3">
                        <label className="text-sm font-medium">Amount tendered <span className="font-normal text-brown-400 dark:text-white/40">(optional)</span></label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder={priceDifference.toFixed(2)}
                          className="mt-1 w-full rounded-lg border border-brown-200 bg-white px-3 py-2.5 text-sm dark:border-dm-border dark:bg-dm-card-2"
                        />
                        {amountTenderedValue > 0 && cashChange > 0 && (
                          <p className="mt-1 text-sm font-medium text-green-600">
                            Change: {DisplayPriceInShillings(cashChange)}
                          </p>
                        )}
                        {amountTenderedValue > 0 && amountTenderedValue < priceDifference && (
                          <p className="mt-1 text-sm font-medium text-red-600">
                            Short by {DisplayPriceInShillings(Math.round((priceDifference - amountTenderedValue) * 100) / 100)}
                          </p>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'split' && (
                      <div className="mt-3">
                        <label className="text-sm font-medium">Cash portion</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={splitCashAmount}
                          onChange={(e) => setSplitCashAmount(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-lg border border-brown-200 bg-white px-3 py-2.5 text-sm dark:border-dm-border dark:bg-dm-card-2"
                        />
                        <p className="mt-1 text-xs text-brown-500 dark:text-white/50">
                          Equity portion: {DisplayPriceInShillings(splitEquityAmount)}
                        </p>
                      </div>
                    )}

                    {(paymentMethod === 'equity' || paymentMethod === 'split') && (
                      <div className="mt-3">
                        <label className="text-sm font-medium">Equity SMS confirmation</label>
                        <input
                          ref={equityProofInputRef}
                          id="equity-proof-input-returns-exchanges"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleEquityProofSelected}
                          style={{ position: 'absolute', left: '-9999px' }}
                        />
                        {!equityProofUrl ? (
                          // A <label htmlFor> (not a button + ref.click()) so iOS Safari treats
                          // opening the camera as a direct user gesture — a JS-triggered click()
                          // on a display:none input gets silently blocked on iOS.
                          <label
                            htmlFor="equity-proof-input-returns-exchanges"
                            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brown-300 bg-white py-3 text-sm font-medium text-brown-600 transition-colors hover:bg-brown-50 dark:border-dm-border dark:bg-dm-card dark:text-white/70 dark:hover:bg-dm-card-2 ${equityProofUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                          >
                            <FaCamera />
                            {equityProofUploading
                              ? (equityProofUploadProgress > 0 ? `Uploading… ${equityProofUploadProgress}%` : 'Uploading…')
                              : 'Attach confirmation photo'}
                          </label>
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

                    {paymentMethod === 'text_forwarded' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Forwarded confirmation message</label>
                          {forwardedText.trim() && (
                            <button
                              type="button"
                              onClick={copyForwardedText}
                              className="flex items-center gap-1 text-xs font-medium text-plum-700 hover:text-plum-800 dark:text-plum-300"
                            >
                              <FaCopy size={11} /> Copy
                            </button>
                          )}
                        </div>
                        <textarea
                          value={forwardedText}
                          onChange={(e) => {
                            setForwardedText(e.target.value);
                            setForwardedTextApproved(false);
                          }}
                          placeholder="Paste the M-Pesa/bank confirmation message forwarded to you here…"
                          rows={4}
                          className="mt-1 w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                        />
                        {forwardedText.trim() && (
                          <div className="mt-2 space-y-2">
                            <label className="flex items-start gap-2.5 rounded-lg border border-brown-100 bg-white p-2.5 text-sm dark:border-dm-border dark:bg-dm-card-2">
                              <input
                                type="checkbox"
                                checked={forwardedTextApproved}
                                onChange={(e) => setForwardedTextApproved(e.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0 accent-plum-700"
                              />
                              <span className="text-brown-700 dark:text-white/70">
                                I confirm this forwarded message is genuine — approve payment
                              </span>
                            </label>
                            {forwardedTextApproved && (
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

                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-plum-50 p-3 text-xs text-plum-800 dark:bg-plum-900/20 dark:text-plum-200">
                  <FaTruck className="mt-0.5 shrink-0" size={14} />
                  <span>
                    This will be recorded as <strong>awaiting hair</strong> — the replacement is only handed over once
                    the original hair is confirmed received back at the shop.
                  </span>
                </div>

                <button
                  onClick={submitExchange}
                  disabled={
                    submitting ||
                    (priceDifference > 0 && (paymentMethod === 'equity' || paymentMethod === 'split') && (!equityProofUrl || !equityApproved)) ||
                    (priceDifference > 0 && paymentMethod === 'text_forwarded' && (!forwardedText.trim() || !forwardedTextApproved)) ||
                    (priceDifference > 0 && paymentMethod === 'cash' && amountTenderedValue > 0 && amountTenderedValue < priceDifference)
                  }
                  className="mt-4 w-full min-h-[48px] rounded-xl bg-plum-700 text-sm font-bold text-white shadow-sm transition-all hover:bg-plum-800 active:scale-[0.99] disabled:bg-brown-300 disabled:active:scale-100"
                >
                  {submitting ? 'Requesting…' : 'Request Exchange'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending / completed exchanges */}
        <div className="rounded-2xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
          <div className="flex items-center justify-between border-b border-brown-100 p-4 dark:border-dm-border sm:px-6">
            <h2 className="text-base font-bold tracking-tight">Exchanges</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-pill border border-brown-200 bg-ivory px-3 py-1.5 text-xs font-semibold dark:border-dm-border dark:bg-dm-card-2"
            >
              <option value="requested">Awaiting hair</option>
              <option value="hair_received">Ready to complete</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
          </div>

          <div className="p-4 sm:p-6">
            {loadingExchanges ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : exchanges.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-brown-400 dark:text-white/40">
                <FaBoxOpen size={26} />
                <p className="text-sm">No exchanges in this status.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exchanges.map((ex) => {
                  const retLines = getReturnedLines(ex);
                  const repLines = getReplacementLines(ex);
                  const retSummary = retLines.map((l) => `${l.quantity}× ${l.name}`).join(', ');
                  const repSummary = repLines.map((l) => `${l.quantity}× ${l.name}`).join(', ');
                  const isMulti = retLines.length > 1 || repLines.length > 1;
                  return (
                    <div key={ex._id} className="overflow-hidden rounded-xl border border-brown-100 dark:border-dm-border">
                      <div className="flex items-start justify-between gap-2 bg-ivory p-3 dark:bg-dm-card-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">
                            {ex.exchangeNumber}
                            {isMulti && (
                              <span className="ml-2 rounded-full bg-plum-100 px-2 py-0.5 text-[10px] font-bold text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                                {retLines.length + repLines.length} items
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-brown-500 dark:text-white/50">
                            Ref #{ex.sourceNumber} · {ex.customerName || 'Customer'}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${STATUS_LABELS[ex.status]?.color || ''}`}>
                          {STATUS_LABELS[ex.status]?.label || ex.status}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="flex items-start gap-1.5 text-xs text-brown-600 dark:text-white/60">
                          <span className="min-w-0 flex-1 break-words">{retSummary}</span>
                          <FaExchangeAlt className="shrink-0 pt-0.5 text-brown-300 dark:text-white/25" size={10} />
                          <span className="min-w-0 flex-1 break-words">{repSummary}</span>
                        </p>
                        {ex.priceDifference > 0 && (
                          <p className="mt-1.5 text-xs font-semibold text-gold-700 dark:text-gold-300">
                            Collected {DisplayPriceInShillings(ex.priceDifference)} difference
                            {ex.payment?.method ? ` · ${PAYMENT_METHODS.find((m) => m.id === ex.payment.method)?.label || ex.payment.method}` : ''}
                          </p>
                        )}
                        {ex.reason && (
                          <p className="mt-1.5 text-xs italic text-brown-400 dark:text-white/40">&quot;{ex.reason}&quot;</p>
                        )}
                        {(ex.status === 'requested' || ex.status === 'hair_received') && (
                          <div className="mt-3 flex gap-2">
                            {ex.status === 'requested' && (
                              <button
                                onClick={() => markHairReceived(ex._id)}
                                disabled={actingOnId === ex._id}
                                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-plum-700 text-xs font-semibold text-white transition-colors hover:bg-plum-800 disabled:opacity-60"
                              >
                                <FaTruck size={12} /> Mark Hair Received
                              </button>
                            )}
                            {ex.status === 'hair_received' && (
                              <button
                                onClick={() => completeExchange(ex._id)}
                                disabled={actingOnId === ex._id}
                                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
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
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-brown-400 dark:text-white/40">
                          <FaClock size={9} />
                          {ex.requestedByName} · {new Date(ex.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsExchanges;