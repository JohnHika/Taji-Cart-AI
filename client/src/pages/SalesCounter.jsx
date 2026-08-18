import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import {
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaMinus,
  FaPause,
  FaPlus,
  FaPrint,
  FaSearch,
  FaShoppingBasket,
  FaTimes,
  FaTrash,
  FaUser,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import DeliveryModeSelector from '../components/DeliveryModeSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import useMobile from '../hooks/useMobile';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import uploadImage from '../utils/UploadImage';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { calculateSalesCounterTotals } from '../utils/salesCounterTotals';
import { nawiriBrand } from '../config/brand';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', color: 'bg-green-600' },
  { id: 'equity', label: 'Equity', color: 'bg-gold-600' },
  { id: 'split', label: 'Split', color: 'bg-plum-600' },
  { id: 'text_forwarded', label: 'Text Forwarded', color: 'bg-blue-600' },
];

const FULFILLMENT_TYPES = [
  { id: 'in_store', label: 'In-Store' },
  { id: 'pickup', label: 'Pickup Later' },
  { id: 'delivery', label: 'Delivery' },
];

const paymentMethodLabel = (method) =>
  PAYMENT_METHODS.find((m) => m.id === method)?.label || method || 'N/A';

const PAGE_SIZE = 24;
const QUICK_PICKS_COUNT = 8;

// An in-progress sale (cart + customer/payment fields) previously lived only
// in memory, so a refresh — or a crash/reload while mid-sale — silently wiped
// it with no way to recover. Sales Counter is a tab a cashier can realistically
// leave open for a whole shift, so this snapshots the draft to sessionStorage
// (scoped to this browser tab, matching how auth tokens are stored) on every
// change and restores it on mount; resetSale() clears it once the sale is
// actually held or completed.
const DRAFT_STORAGE_KEY = 'nawiri:salesCounterDraft';

const loadDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const SalesCounter = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const mobileHeaderRef = useRef(null);
  const mobileFooterRef = useRef(null);
  const [isMobile] = useMobile(1024);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0);
  const [mobileFooterHeight, setMobileFooterHeight] = useState(0);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const restoredDraft = useRef(loadDraft()).current;

  const [cart, setCart] = useState(() => restoredDraft?.cart || []);
  const [showCart, setShowCart] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState(() => restoredDraft?.fulfillmentType || 'in_store');
  // Walk-in = customer is physically at the counter right now. Online = this
  // is a website/WhatsApp order being paid for/recorded at the counter on
  // the customer's behalf. Defaults to walk-in, the normal counter case.
  const [saleSource, setSaleSource] = useState(() => restoredDraft?.saleSource || 'walkin');
  const [deliveryDetails, setDeliveryDetails] = useState(() => restoredDraft?.deliveryDetails || { mode: 'standard', zoneId: '', saccoOperatorId: '', saccoDestinationTown: '' });
  const [deliveryFeePreview, setDeliveryFeePreview] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(() => restoredDraft?.paymentMethod || 'cash');
  const [amountTendered, setAmountTendered] = useState(() => restoredDraft?.amountTendered || '');
  const [splitCashAmount, setSplitCashAmount] = useState(() => restoredDraft?.splitCashAmount || '');
  const [equityProofUrl, setEquityProofUrl] = useState(() => restoredDraft?.equityProofUrl || '');
  const [equityProofUploading, setEquityProofUploading] = useState(false);
  const [equityApproved, setEquityApproved] = useState(() => Boolean(restoredDraft?.equityApproved));
  const equityProofInputRef = useRef(null);
  const [forwardedText, setForwardedText] = useState(() => restoredDraft?.forwardedText || '');
  const [forwardedTextApproved, setForwardedTextApproved] = useState(() => Boolean(restoredDraft?.forwardedTextApproved));
  const [customerName, setCustomerName] = useState(() => restoredDraft?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(() => restoredDraft?.customerPhone || '');
  const [saleNote, setSaleNote] = useState(() => restoredDraft?.saleNote || '');
  const [deliveryNote, setDeliveryNote] = useState(() => restoredDraft?.deliveryNote || '');
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showFullReceipt, setShowFullReceipt] = useState(false);
  const [heldSales, setHeldSales] = useState([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [holding, setHolding] = useState(false);
  const [resumingId, setResumingId] = useState(null);
  const [activeHeldSaleId, setActiveHeldSaleId] = useState(() => restoredDraft?.activeHeldSaleId || null);
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'admin');

  // Redirect non-staff/non-admin away from the counter.
  useEffect(() => {
    if (!user?._id) return;
    const role = (user.role || '').toLowerCase();
    if (!['admin', 'staff', 'manager'].includes(role)) {
      toast.error('Sales counter is for staff use only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadHeldSales();
    if (restoredDraft?.cart?.length) {
      toast.success(`Restored your in-progress sale (${restoredDraft.cart.length} item${restoredDraft.cart.length === 1 ? '' : 's'}).`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snapshot the in-progress sale on every change so a refresh/crash can
  // recover it. Cleared explicitly by resetSale() once the sale is held,
  // completed, or the cashier abandons it.
  useEffect(() => {
    if (cart.length === 0) {
      clearDraft();
      return;
    }
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        cart,
        fulfillmentType,
        saleSource,
        deliveryDetails,
        paymentMethod,
        amountTendered,
        splitCashAmount,
        equityProofUrl,
        equityApproved,
        forwardedText,
        forwardedTextApproved,
        customerName,
        customerPhone,
        saleNote,
        deliveryNote,
        activeHeldSaleId,
      }));
    } catch {
      // sessionStorage unavailable (private browsing quota, etc.) — draft
      // recovery just won't be available this session, sale flow still works.
    }
  }, [cart, fulfillmentType, saleSource, deliveryDetails, paymentMethod, amountTendered, splitCashAmount, equityProofUrl, equityApproved, forwardedText, forwardedTextApproved, customerName, customerPhone, saleNote, deliveryNote, activeHeldSaleId]);

  // Reset pagination whenever the filter changes so "Load more" starts fresh.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedCategory]);

  // Measure the fixed mobile header/footer so the scrolling grid can pad around them exactly.
  useEffect(() => {
    if (!isMobile) return undefined;
    const headerEl = mobileHeaderRef.current;
    const footerEl = mobileFooterRef.current;
    if (!headerEl || !footerEl) return undefined;

    const measure = () => {
      setMobileHeaderHeight(headerEl.offsetHeight);
      setMobileFooterHeight(footerEl.offsetHeight);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(headerEl);
    observer.observe(footerEl);
    return () => observer.disconnect();
  }, [isMobile, cart.length, categories.length]);

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

  const loadCategories = async () => {
    try {
      const res = await Axios({ ...SummaryApi.getCategory });
      if (res.data.success) setCategories(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    }
  };

  const loadHeldSales = async () => {
    try {
      const res = await Axios({ url: '/api/pos/held-sales', method: 'GET' });
      if (res.data.success) setHeldSales(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    }
  };

  const holdSale = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one product before holding this sale.');
      return;
    }
    try {
      setHolding(true);
      const res = await Axios({
        url: '/api/pos/held-sales',
        method: 'POST',
        data: {
          cart,
          customerName,
          customerPhone,
          saleNote,
          deliveryNote,
          fulfillmentType,
          saleSource,
          deliveryDetails,
          paymentMethod,
          amountTendered,
          splitCashAmount,
          equityProofUrl,
          equityApproved,
          forwardedText,
          forwardedTextApproved,
        },
      });
      if (res.data.success) {
        // If this sale was itself a resumed hold, drop the original record
        // instead of leaving a stale duplicate behind.
        if (activeHeldSaleId) {
          await Axios({ url: `/api/pos/held-sales/${activeHeldSaleId}`, method: 'DELETE' }).catch(() => {});
        }
        toast.success('Sale held. Resume it anytime from Held Sales.');
        resetSale();
        loadHeldSales();
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setHolding(false);
    }
  };

  const resumeHeldSale = async (heldSale) => {
    if (cart.length > 0) {
      toast.error('Finish, hold, or clear the current sale before resuming another.');
      return;
    }
    try {
      setResumingId(heldSale._id);
      setCart(heldSale.cart || []);
      setCustomerName(heldSale.customerName || '');
      setCustomerPhone(heldSale.customerPhone || '');
      setSaleNote(heldSale.saleNote || '');
      setDeliveryNote(heldSale.deliveryNote || '');
      setFulfillmentType(heldSale.fulfillmentType || 'in_store');
      setSaleSource(heldSale.saleSource || 'walkin');
      setDeliveryDetails(heldSale.deliveryDetails || { mode: 'standard', zoneId: '', saccoOperatorId: '', saccoDestinationTown: '' });
      setPaymentMethod(heldSale.paymentMethod || 'cash');
      setAmountTendered(heldSale.amountTendered || '');
      setSplitCashAmount(heldSale.splitCashAmount || '');
      setEquityProofUrl(heldSale.equityProofUrl || '');
      setEquityApproved(Boolean(heldSale.equityApproved));
      setForwardedText(heldSale.forwardedText || '');
      setForwardedTextApproved(Boolean(heldSale.forwardedTextApproved));
      setActiveHeldSaleId(heldSale._id);
      setShowHeldSales(false);
      setShowCart(true);
      toast.success(`Resumed ${heldSale.label || 'held sale'}`);
    } finally {
      setResumingId(null);
    }
  };

  const discardHeldSale = async (heldSaleToDiscard) => {
    if (!window.confirm(`Discard "${heldSaleToDiscard.label || 'this held sale'}"? This can't be undone.`)) {
      return;
    }
    try {
      await Axios({ url: `/api/pos/held-sales/${heldSaleToDiscard._id}`, method: 'DELETE' });
      setHeldSales((prev) => prev.filter((h) => h._id !== heldSaleToDiscard._id));
      toast.success('Held sale discarded');
    } catch (err) {
      AxiosToastError(err);
    }
  };

  const filteredProducts = useMemo(() => {
    // Split into words so "hair extension" matches a product named
    // "Extension Hair 20 inch" — every word must appear somewhere in the
    // searchable text, in any order, instead of requiring one exact phrase.
    const searchWords = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (!p.price || p.price <= 0) return false; // skip products without a price
      const haystack = [p.name, p.sku, p.barcode].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = searchWords.every((word) => haystack.includes(word));

      const categoryIds = Array.isArray(p.category)
        ? p.category.map((c) => (typeof c === 'string' ? c : c?._id)).filter(Boolean)
        : [typeof p.category === 'string' ? p.category : p.category?._id, p.categoryId].filter(Boolean);
      const matchesCategory =
        selectedCategory === 'all' || categoryIds.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const isBrowsingUnfiltered = !search.trim() && selectedCategory === 'all';

  const quickPicks = useMemo(() => {
    if (!isBrowsingUnfiltered) return [];
    return filteredProducts.slice(0, QUICK_PICKS_COUNT);
  }, [filteredProducts, isBrowsingUnfiltered]);

  // When Quick picks is showing (unfiltered browse), "All products" below it
  // should pick up where Quick picks left off — otherwise the same first
  // QUICK_PICKS_COUNT items appear twice, once in each section.
  const allProductsSource = isBrowsingUnfiltered
    ? filteredProducts.slice(QUICK_PICKS_COUNT)
    : filteredProducts;
  const visibleProducts = allProductsSource.slice(0, visibleCount);
  const hasMoreProducts = visibleCount < allProductsSource.length;

  const addToCart = (product) => {
    if (!product.price || product.price <= 0) {
      toast.error(`${product.name} has no price set.`);
      return;
    }
    // stock === null/undefined means untracked inventory — always allowed.
    if (product.stock != null && product.stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
        if (product.stock != null && existing.quantity + 1 > product.stock) {
          toast.error(`Only ${product.stock} of ${product.name} left in stock.`);
          return prev;
        }
        return prev.map((i) =>
          i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} added`);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i._id !== id) return i;
          const nextQty = i.quantity + delta;
          if (delta > 0 && i.stock != null && nextQty > i.stock) {
            toast.error(`Only ${i.stock} of ${i.name} left in stock.`);
            return i;
          }
          return { ...i, quantity: nextQty };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  const itemTotals = useMemo(() => {
    return calculateSalesCounterTotals(cart, amountTendered);
  }, [cart, amountTendered]);

  // deliveryFeePreview is 0 unless the Delivery fulfillment tab is active —
  // DeliveryModeSelector only reports a fee while it's mounted.
  const deliveryCharge = fulfillmentType === 'delivery' ? deliveryFeePreview : 0;

  const totals = useMemo(() => {
    const total = itemTotals.total + deliveryCharge;
    const tendered = Number(amountTendered) || 0;
    return { ...itemTotals, total, change: Math.max(0, tendered - total) };
  }, [itemTotals, deliveryCharge, amountTendered]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // For a split sale, the cash portion is whatever the cashier enters; the
  // remainder is assumed to be covered by Equity.
  const splitEquityAmount = Math.max(0, totals.total - (Number(splitCashAmount) || 0));

  const resetSale = () => {
    clearDraft();
    setCart([]);
    setShowCart(false);
    setFulfillmentType('in_store');
    setSaleSource('walkin');
    setDeliveryDetails({ mode: 'standard', zoneId: '', saccoOperatorId: '', saccoDestinationTown: '' });
    setDeliveryFeePreview(0);
    setPaymentMethod('cash');
    setAmountTendered('');
    setSplitCashAmount('');
    setEquityProofUrl('');
    setEquityApproved(false);
    setForwardedText('');
    setForwardedTextApproved(false);
    setCustomerName('');
    setCustomerPhone('');
    setSaleNote('');
    setDeliveryNote('');
    setCompletedSale(null);
    setQrCodeDataUrl('');
    setShowFullReceipt(false);
    setActiveHeldSaleId(null);
  };

  const generateReceiptQrCode = async (sale) => {
    try {
      const verificationUrl = `${nawiriBrand.websiteUrl}/verify?txn=${sale.saleNumber}&date=${new Date(sale.saleDate).toISOString().slice(0, 10)}&amount=${sale.total}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (err) {
      console.error('Error generating receipt QR code:', err);
    }
  };

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

  const removeEquityProof = () => {
    setEquityProofUrl('');
    setEquityApproved(false);
  };

  // Lets the admin (who received the confirmation SMS on their own phone)
  // copy it back out — e.g. to forward on to whichever staff member needs
  // to hand it to, or to paste into a WhatsApp message for the record.
  const copyForwardedText = async () => {
    if (!forwardedText.trim()) return;
    try {
      await navigator.clipboard.writeText(forwardedText);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy — copy it manually instead.');
    }
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one product to the basket.');
      return;
    }
    if (paymentMethod === 'cash' && Number(amountTendered) < totals.total) {
      toast.error('Amount tendered is less than the total.');
      return;
    }
    if ((paymentMethod === 'equity' || paymentMethod === 'split') && (!equityProofUrl || !equityApproved)) {
      toast.error('Attach and approve the Equity confirmation photo before charging.');
      return;
    }
    if (paymentMethod === 'text_forwarded' && (!forwardedText.trim() || !forwardedTextApproved)) {
      toast.error('Paste and approve the forwarded confirmation message before charging.');
      return;
    }
    if (paymentMethod === 'split' && (Number(splitCashAmount) || 0) <= 0) {
      toast.error('Enter the cash portion of a split payment.');
      return;
    }
    if (fulfillmentType === 'delivery') {
      if (deliveryDetails.mode === 'bike' && !deliveryDetails.zoneId) {
        toast.error('Select a delivery zone.');
        return;
      }
      if (deliveryDetails.mode === 'sacco' && (!deliveryDetails.saccoOperatorId || !deliveryDetails.saccoDestinationTown.trim())) {
        toast.error('Select a SACCO/coach operator and destination town.');
        return;
      }
    }

    const payments = [];
    if (paymentMethod === 'cash') {
      payments.push({ method: 'cash', amount: totals.total });
    } else if (paymentMethod === 'equity') {
      payments.push({ method: 'equity', amount: totals.total, proofImageUrl: equityProofUrl, approved: true });
    } else if (paymentMethod === 'text_forwarded') {
      payments.push({ method: 'text_forwarded', amount: totals.total, forwardedText, approved: true });
    } else if (paymentMethod === 'split') {
      payments.push({ method: 'cash', amount: Number(splitCashAmount) || 0 });
      payments.push({ method: 'equity', amount: splitEquityAmount, proofImageUrl: equityProofUrl, approved: true });
    }

    const amountTenderedTotal =
      paymentMethod === 'cash' ? Number(amountTendered) || totals.total : totals.total;
    const changeTotal = paymentMethod === 'cash' ? totals.change : 0;

    try {
      setSubmitting(true);
      const saleData = {
        items: cart.map((i) => ({
          product: i._id,
          sku: i.sku || '',
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          total: i.price * i.quantity,
        })),
        customer: null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        saleSource,
        fulfillment_type: fulfillmentType,
        delivery_mode: fulfillmentType === 'delivery' ? deliveryDetails.mode : undefined,
        deliveryZoneId: fulfillmentType === 'delivery' && deliveryDetails.mode === 'bike' ? deliveryDetails.zoneId : undefined,
        saccoOperatorId: fulfillmentType === 'delivery' && deliveryDetails.mode === 'sacco' ? deliveryDetails.saccoOperatorId : undefined,
        saccoDestinationTown: fulfillmentType === 'delivery' && deliveryDetails.mode === 'sacco' ? deliveryDetails.saccoDestinationTown.trim() : undefined,
        deliveryNote: fulfillmentType === 'delivery' ? deliveryNote.trim() : undefined,
        subtotal: totals.subtotal,
        discount: 0,
        tax: totals.tax,
        total: totals.total,
        deliveryCharge,
        paymentMethod,
        payments,
        amountTendered: amountTenderedTotal,
        change: changeTotal,
        cashier: user._id,
        cashierName: user.name,
        saleDate: new Date(),
        note: saleNote.trim() || undefined,
      };

      const res = await Axios({
        url: '/api/pos/sale',
        method: 'POST',
        data: saleData,
      });

      if (res.data.success) {
        const finishedSale = { ...saleData, saleNumber: res.data.saleNumber };
        setCompletedSale(finishedSale);
        generateReceiptQrCode(finishedSale);
        toast.success(`Sale ${res.data.saleNumber} completed`);
        if (activeHeldSaleId) {
          Axios({ url: `/api/pos/held-sales/${activeHeldSaleId}`, method: 'DELETE' }).catch(() => {});
          setActiveHeldSaleId(null);
          loadHeldSales();
        }
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-dm-surface">
        <LoadingSpinner />
      </div>
    );
  }

  const fulfillmentLabel =
    FULFILLMENT_TYPES.find((f) => f.id === (completedSale?.fulfillment_type || 'in_store'))?.label ||
    'In-Store';

  const renderProductCard = (p) => {
    const inCartQty = cart.find((i) => i._id === p._id)?.quantity || 0;
    // stock === null/undefined means untracked inventory — no badge shown for those.
    const hasStockInfo = p.stock != null;
    const isOutOfStock = hasStockInfo && p.stock <= 0;
    const isLowStock = hasStockInfo && p.stock > 0 && p.stock <= 5;
    return (
      <div
        key={p._id}
        className="relative bg-white dark:bg-dm-card rounded-lg border border-brown-100 dark:border-dm-border overflow-hidden"
      >
        {inCartQty > 0 && (
          <span className="absolute left-1.5 top-1.5 z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-plum-700 px-1 text-[11px] font-bold text-white shadow-sm">
            {inCartQty}
          </span>
        )}
        {hasStockInfo && (
          <span
            className={`absolute right-1.5 top-1.5 z-10 inline-flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm ${
              isOutOfStock
                ? 'bg-red-600 text-white'
                : isLowStock
                  ? 'bg-gold-500 text-white'
                  : 'bg-white/90 text-charcoal dark:bg-dm-card-2/90 dark:text-white'
            }`}
          >
            {isOutOfStock ? 'Out of stock' : `${p.stock} in stock`}
          </span>
        )}
        <button
          type="button"
          onClick={() => addToCart(p)}
          className="block w-full text-left active:scale-[0.97] transition-transform"
        >
          <div className={`aspect-square bg-plum-50 dark:bg-dm-card-2 flex items-center justify-center ${isOutOfStock ? 'opacity-50' : ''}`}>
            {p.image?.[0] ? (
              <img
                src={p.image[0]}
                alt={p.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl">🛍️</span>
            )}
          </div>
          <div className="px-2 pt-1.5">
            <p className="text-xs font-semibold leading-snug line-clamp-2 min-h-[2rem]">{p.name}</p>
            <p className="mt-0.5 text-plum-700 dark:text-plum-300 font-bold text-sm">
              {DisplayPriceInShillings(p.price)}
            </p>
          </div>
        </button>
        {inCartQty > 0 ? (
          <div className="mt-1.5 flex min-h-[36px] items-center justify-between bg-plum-50 dark:bg-dm-card-2">
            <button
              type="button"
              onClick={() => updateQty(p._id, -1)}
              className="flex h-full min-h-[36px] flex-1 items-center justify-center text-plum-700 transition-colors hover:bg-plum-100 active:bg-plum-200 dark:text-plum-300 dark:hover:bg-dm-border"
              aria-label={`Decrease ${p.name} quantity`}
            >
              <FaMinus size={11} />
            </button>
            <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-plum-700 dark:text-plum-300">
              {inCartQty}
            </span>
            <button
              type="button"
              onClick={() => addToCart(p)}
              className="flex h-full min-h-[36px] flex-1 items-center justify-center text-plum-700 transition-colors hover:bg-plum-100 active:bg-plum-200 dark:text-plum-300 dark:hover:bg-dm-border"
              aria-label={`Increase ${p.name} quantity`}
            >
              <FaPlus size={11} />
            </button>
          </div>
        ) : isOutOfStock ? (
          <div className="mt-1.5 flex min-h-[36px] w-full items-center justify-center bg-brown-100 dark:bg-dm-card-2 text-xs font-semibold text-brown-400 dark:text-white/40">
            Out of stock
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToCart(p)}
            className="mt-1.5 flex min-h-[36px] w-full items-center justify-center gap-1.5 bg-green-600 text-xs font-semibold text-white transition-colors hover:bg-green-700 active:bg-green-800"
          >
            <FaPlus size={10} /> Add
          </button>
        )}
      </div>
    );
  };

  const categoryPills = (
    <>
      <button
        onClick={() => setSelectedCategory('all')}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
          selectedCategory === 'all'
            ? 'bg-plum-700 text-white'
            : 'bg-brown-100 dark:bg-dm-border text-brown-700 dark:text-white/70'
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c._id}
          onClick={() => setSelectedCategory(c._id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
            selectedCategory === c._id
              ? 'bg-plum-700 text-white'
              : 'bg-brown-100 dark:bg-dm-border text-brown-700 dark:text-white/70'
          }`}
        >
          {c.name}
        </button>
      ))}
    </>
  );

  const orderPanelContent = (
    <>
      {/* Walk-in vs Online — is the customer here in person, or is this a
          website/WhatsApp order being recorded/paid for at the counter? */}
      <div className="grid grid-cols-2 gap-1.5 border-b border-brown-100 p-3 dark:border-dm-border">
        <button
          type="button"
          onClick={() => setSaleSource('walkin')}
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors active:scale-[0.97] ${
            saleSource === 'walkin'
              ? 'bg-gold-500 text-white'
              : 'bg-brown-100 text-brown-700 dark:bg-dm-border dark:text-white/70'
          }`}
        >
          Walk-in
        </button>
        <button
          type="button"
          onClick={() => setSaleSource('online')}
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors active:scale-[0.97] ${
            saleSource === 'online'
              ? 'bg-plum-700 text-white'
              : 'bg-brown-100 text-brown-700 dark:bg-dm-border dark:text-white/70'
          }`}
        >
          Online
        </button>
      </div>

      {/* Order type */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-brown-100 p-3 dark:border-dm-border">
        {FULFILLMENT_TYPES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFulfillmentType(f.id)}
            className={`min-h-[44px] rounded-full px-2 text-xs font-semibold transition-colors active:scale-[0.97] ${
              fulfillmentType === f.id
                ? 'bg-plum-700 text-white'
                : 'bg-brown-100 text-brown-700 dark:bg-dm-border dark:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {fulfillmentType === 'delivery' && (
          <div className="rounded-xl border border-brown-100 p-3 dark:border-dm-border">
            <DeliveryModeSelector
              value={deliveryDetails}
              onChange={setDeliveryDetails}
              onFeeChange={setDeliveryFeePreview}
            />
            <div className="mt-3">
              <label className="text-sm font-medium">Delivery arrangement note</label>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="e.g. Customer wants it delivered tomorrow afternoon, call before arriving…"
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
              />
              <p className="mt-1 text-xs text-brown-400 dark:text-white/40">
                Shown to whoever dispatches this on Sales Counter Deliveries.
              </p>
            </div>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brown-200 px-4 py-10 text-center text-sm text-brown-500 dark:border-dm-border dark:text-white/50">
            Your basket is empty. Add products from the counter to begin a sale.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item._id}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-xl border border-brown-100 bg-plum-50/40 p-3 shadow-sm dark:border-dm-border dark:bg-dm-card-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-dm-border">
                {item.image?.[0] ? (
                  <img
                    src={item.image[0]}
                    alt={item.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <span>🛍️</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-brown-500 dark:text-white/50">
                      {DisplayPriceInShillings(item.price)} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label={`Remove ${item.name} from basket`}
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold tabular-nums text-plum-700 dark:text-gold-300">
                    {DisplayPriceInShillings(item.price * item.quantity)}
                  </p>
                  <div className="flex items-center rounded-lg border border-brown-200 bg-white p-0.5 dark:border-dm-border dark:bg-dm-card">
                    <button
                      onClick={() => updateQty(item._id, -1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-brown-700 transition-colors hover:bg-brown-100 dark:text-white/70 dark:hover:bg-dm-border"
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      <FaMinus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums" aria-label={`${item.quantity} ${item.name}`}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item._id, 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold-500 text-white transition-colors hover:bg-gold-600"
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <FaPlus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {cart.length > 0 && (
          <>
            {/* Customer details */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-brown-700 dark:text-white/70">
                <FaUser /> Walk-in customer (optional)
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="w-full px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm"
              />
              <textarea
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                placeholder="Note (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm resize-none"
              />
            </div>

            {/* Payment method */}
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id);
                      setAmountTendered(m.id === 'cash' ? '' : totals.total.toFixed(2));
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
            </div>

            {/* Cash tendered */}
            {paymentMethod === 'cash' && (
              <div className="pt-2">
                <label className="text-sm font-medium">Amount tendered</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm"
                />
                {totals.change > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: {DisplayPriceInShillings(totals.change)}
                  </p>
                )}
              </div>
            )}

            {/* Split: cash portion, remainder assumed Equity */}
            {paymentMethod === 'split' && (
              <div className="pt-2">
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

            {/* Equity proof photo + cashier approval */}
            {(paymentMethod === 'equity' || paymentMethod === 'split') && (
              <div className="pt-2">
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
                      <img src={equityProofUrl} alt="Equity payment confirmation" className="max-h-40 w-full object-contain bg-white" />
                      <button
                        type="button"
                        onClick={removeEquityProof}
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

            {/* Text Forwarded: paste the confirmation SMS text (e.g. relayed
                by the admin from their own phone) + cashier approval */}
            {paymentMethod === 'text_forwarded' && (
              <div className="pt-2">
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
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 text-sm resize-none"
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
          </>
        )}
      </div>

      {/* Totals + checkout */}
      <div className="p-4 border-t border-brown-100 dark:border-dm-border bg-plum-50/30 dark:bg-dm-card-2">
        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-brown-500 dark:text-white/60">Subtotal</span>
            <span>{DisplayPriceInShillings(totals.subtotal)}</span>
          </div>
          {deliveryCharge > 0 && (
            <div className="flex justify-between">
              <span className="text-brown-500 dark:text-white/60">Delivery fee</span>
              <span>{DisplayPriceInShillings(deliveryCharge)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-brown-200 dark:border-dm-border">
            <span>Total</span>
            <span className="text-plum-700 dark:text-plum-300">
              {DisplayPriceInShillings(totals.total)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={holdSale}
            disabled={cart.length === 0 || holding || submitting}
            title="Park this sale to serve another customer, and resume it later"
            className="shrink-0 min-h-[48px] bg-white border border-brown-300 hover:bg-brown-50 active:scale-[0.97] disabled:opacity-50 disabled:hover:bg-white disabled:active:scale-100 text-brown-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all dark:bg-dm-card dark:border-dm-border dark:text-white/80 dark:hover:bg-dm-card-2"
          >
            <FaPause size={13} />
            {holding ? '…' : 'Hold'}
          </button>
          <button
            onClick={completeSale}
            disabled={
              cart.length === 0 ||
              submitting ||
              ((paymentMethod === 'equity' || paymentMethod === 'split') && (!equityProofUrl || !equityApproved)) ||
              (paymentMethod === 'text_forwarded' && (!forwardedText.trim() || !forwardedTextApproved))
            }
            className="flex-1 min-h-[48px] bg-gold-500 hover:bg-gold-600 active:scale-[0.98] disabled:bg-brown-300 disabled:active:scale-100 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? 'Processing…' : `Charge ${DisplayPriceInShillings(totals.total)}`}
          </button>
        </div>
      </div>
    </>
  );

  const productGrid = (
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
      {visibleProducts.length === 0 ? (
        <div className="col-span-full text-center py-12 text-brown-500 dark:text-white/50">
          No products found.
        </div>
      ) : (
        visibleProducts.map(renderProductCard)
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface text-charcoal dark:text-white lg:flex">
      {isMobile ? (
        <div className="flex-1">
          {/* Fixed top chrome: back/title, search, categories — stays pinned regardless of scroll depth */}
          <div ref={mobileHeaderRef} className="fixed inset-x-0 top-0 z-40 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/pos-dashboard')}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors active:scale-[0.95] hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
                  aria-label="Back to Sales Hub"
                >
                  <FaArrowLeft size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-bold leading-tight text-charcoal dark:text-white">Sales Counter</h1>
                  <p className="truncate text-[11px] text-brown-500 dark:text-white/50">
                    {itemCount} item{itemCount === 1 ? '' : 's'} · {DisplayPriceInShillings(totals.total)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldSales(true)}
                className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors active:scale-[0.95] hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
                aria-label={`Held sales${heldSales.length > 0 ? ` (${heldSales.length})` : ''}`}
              >
                <FaClock size={16} />
                {heldSales.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-dm-card">
                    {heldSales.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search */}
            <div className="relative px-3 pt-1">
              <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, SKU or barcode..."
                className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-plum-50/50 dark:bg-dm-card-2 text-sm focus:outline-none focus:border-plum-500"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-2 scrollbar-hide">
              {categoryPills}
            </div>
          </div>

          {/* Scrolling content, padded to clear the fixed header/footer exactly.
              The pt-[180px]/pb-[96px] fallback classes matter on first paint:
              mobileHeaderHeight/mobileFooterHeight start at 0 and are only set
              once the measuring effect runs after mount, so without a static
              fallback the top row of products renders flush under the fixed
              header for a frame (visible as "hidden beneath the header" on
              slower loads). JS still overrides with the exact measured height
              once available. */}
          <div
            className="pt-[180px] pb-[96px]"
            style={{
              paddingTop: mobileHeaderHeight ? `${mobileHeaderHeight}px` : undefined,
              paddingBottom: mobileFooterHeight ? `${mobileFooterHeight + 16}px` : undefined,
            }}
          >
            {isBrowsingUnfiltered && quickPicks.length > 0 && (
              <div className="px-2 pt-2">
                <h2 className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                  Quick picks
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {quickPicks.map(renderProductCard)}
                </div>
                <h2 className="px-1 pb-1.5 pt-4 text-xs font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                  All products
                </h2>
              </div>
            )}
            {productGrid}
            {hasMoreProducts && (
              <div className="px-2 pb-4 pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="w-full min-h-[44px] rounded-lg border border-brown-200 bg-white py-2.5 text-sm font-semibold text-plum-700 transition-colors hover:bg-plum-50 dark:border-dm-border dark:bg-dm-card dark:text-plum-300 dark:hover:bg-dm-card-2"
                >
                  Load more ({allProductsSource.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>

          {/* Fixed bottom bar: always-reachable order summary + View Order button */}
          <div
            ref={mobileFooterRef}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-brown-100 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.14)] backdrop-blur-sm dark:border-dm-border dark:bg-dm-card/95"
          >
            <button
              type="button"
              onClick={() => setShowCart(true)}
              className="flex w-full min-h-[48px] items-center justify-between gap-3 rounded-xl bg-plum-700 px-4 py-3 text-white shadow-sm transition-colors hover:bg-plum-800"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FaShoppingBasket size={16} />
                {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'View Order'}
              </span>
              <span className="text-sm font-bold tabular-nums">
                {DisplayPriceInShillings(totals.total)}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:h-screen lg:overflow-y-auto">
          {/* Header (desktop) */}
          <header className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/pos-dashboard')}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brown-200 px-2.5 py-2 text-xs font-semibold text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2 sm:px-3"
                  aria-label="Back to Sales Hub"
                >
                  <FaArrowLeft size={12} />
                  <span className="hidden sm:inline">Back to Sales Hub</span>
                  <span className="sm:hidden">Back</span>
                </button>
                <div className="hidden h-7 w-px bg-brown-200 dark:bg-dm-border sm:block" />
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-sm">
                    <FaShoppingBasket size={16} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold leading-tight text-charcoal dark:text-white">Sales Counter</h1>
                    <p className="text-[11px] text-brown-500 dark:text-white/50">Walk-in customers</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldSales(true)}
                className="relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brown-200 px-3 py-2 text-xs font-semibold text-brown-700 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
              >
                <FaClock size={12} />
                <span>Held Sales</span>
                {heldSales.length > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">
                    {heldSales.length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-brown-100 px-3 py-2 text-xs dark:border-dm-border sm:px-4">
              <span className="font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Current sale</span>
              <span className="font-bold tabular-nums text-plum-700 dark:text-gold-300">{itemCount} items · {DisplayPriceInShillings(totals.total)}</span>
            </div>

            {/* Search */}
            <div className="relative px-3 pt-2 sm:px-4">
              <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, SKU or barcode..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-plum-50/50 dark:bg-dm-card-2 text-sm focus:outline-none focus:border-plum-500"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-2 scrollbar-hide sm:px-4">
              {categoryPills}
            </div>
          </header>

          {isBrowsingUnfiltered && quickPicks.length > 0 && (
            <div className="px-2 pt-2">
              <h2 className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                Quick picks
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {quickPicks.map(renderProductCard)}
              </div>
              <h2 className="px-1 pb-1.5 pt-4 text-xs font-bold uppercase tracking-wide text-brown-500 dark:text-white/50">
                All products
              </h2>
            </div>
          )}
          {productGrid}
          {hasMoreProducts && (
            <div className="px-2 pb-8 pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="w-full rounded-lg border border-brown-200 bg-white py-2.5 text-sm font-semibold text-plum-700 transition-colors hover:bg-plum-50 dark:border-dm-border dark:bg-dm-card dark:text-plum-300 dark:hover:bg-dm-card-2"
              >
                Load more ({allProductsSource.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Docked order panel (desktop) */}
      {!isMobile && (
        <div className="flex w-[380px] shrink-0 flex-col border-l border-brown-100 bg-white dark:border-dm-border dark:bg-dm-card lg:h-screen lg:sticky lg:top-0">
          <div className="flex items-center justify-between border-b border-brown-100 p-4 dark:border-dm-border">
            <div>
              <h2 id="sales-counter-basket-title" className="flex items-center gap-2 text-lg font-bold">
                <FaShoppingBasket /> My Order
              </h2>
              <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                {itemCount} item{itemCount === 1 ? '' : 's'} · {cart.length} product{cart.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {orderPanelContent}
        </div>
      )}

      {/* Basket drawer (mobile) */}
      {isMobile && showCart && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-counter-basket-title"
        >
          <div
            className="flex-1"
            onClick={() => setShowCart(false)}
          />
          <div className="flex w-full max-h-[86dvh] flex-col rounded-t-2xl bg-white shadow-2xl animate-slide-up dark:bg-dm-card">
            <div className="flex items-center justify-between border-b border-brown-100 p-4 dark:border-dm-border">
              <div>
                <h2 id="sales-counter-basket-title" className="flex items-center gap-2 text-lg font-bold">
                  <FaShoppingBasket /> My Order
                </h2>
                <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                  {itemCount} item{itemCount === 1 ? '' : 's'} · {cart.length} product{cart.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-brown-600 transition-colors hover:bg-brown-100 dark:text-white/70 dark:hover:bg-dm-border"
                aria-label="Close basket"
              >
                ✕
              </button>
            </div>
            {orderPanelContent}
          </div>
        </div>
      )}

      {/* Completed sale receipt overlay */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dm-card w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              ✅
            </div>
            <h2 className="text-xl font-bold mb-1">Sale Complete</h2>
            <p className="text-brown-500 dark:text-white/50 text-sm mb-4">
              Receipt {completedSale.saleNumber}
            </p>
            <div className="text-left bg-plum-50/50 dark:bg-dm-card-2 rounded-lg p-4 mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Items</span>
                <span>{completedSale.items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">
                  {DisplayPriceInShillings(completedSale.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Order type</span>
                <span className="capitalize">{fulfillmentLabel}</span>
              </div>
              {completedSale.fulfillment_type === 'pickup' && completedSale.pickupCode && (
                <div className="flex justify-between">
                  <span>Pickup code</span>
                  <span className="font-mono font-bold text-plum-700 dark:text-plum-300">{completedSale.pickupCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Paid via</span>
                <span>{paymentMethodLabel(completedSale.paymentMethod)}</span>
              </div>
              {completedSale.change > 0 && (
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{DisplayPriceInShillings(completedSale.change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFullReceipt(true)}
                className="flex-1 flex items-center justify-center gap-2 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white/80 font-semibold py-3 rounded-xl transition-colors hover:bg-brown-50 dark:hover:bg-dm-card-2"
              >
                <FaPrint size={14} /> Print Receipt
              </button>
              <button
                onClick={resetSale}
                className="flex-1 bg-plum-700 text-white font-bold py-3 rounded-xl"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full printable receipt (thermal 80mm) */}
      {completedSale && showFullReceipt && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <style>{`
            @page { size: 80mm auto; margin: 0; }
            @media print {
              html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
              body * { visibility: hidden !important; }
              #sales-counter-receipt-print, #sales-counter-receipt-print * { visibility: visible !important; }
              #sales-counter-receipt-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm !important;
                font-family: 'Poppins', sans-serif !important;
                background: white !important;
                color: black !important;
              }
              .no-print { display: none !important; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .sc-receipt-header { background: #8b5cf6 !important; color: white !important; }
              .sc-thank-you { background: #8b5cf6 !important; color: white !important; }
              .sc-policies-box { background: #f8fafc !important; border-color: #e2e8f0 !important; }
              .sc-transaction-id { background: #f7fafc !important; border-color: #cbd5e0 !important; }
              .sc-qr-code { background: white !important; border-color: #e2e8f0 !important; }
            }
            .sc-receipt-container { font-family: 'Poppins', sans-serif; line-height: 1.4; color: #2d3748; }
            .sc-receipt-header {
              text-align: center; padding: 8px 0;
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%);
              color: white; margin-bottom: 8px; border-radius: 4px;
            }
            .sc-receipt-section { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
            .sc-receipt-section:last-child { border-bottom: none; }
            .sc-section-title {
              font-weight: 600; font-size: 11px; color: #8b5cf6; margin-bottom: 4px;
              text-transform: uppercase; letter-spacing: 0.5px;
            }
            .sc-store-info { text-align: center; font-size: 9px; color: #4a5568; }
            .sc-logo-container { text-align: center; margin-bottom: 6px; }
            .sc-brand-tagline { font-size: 8px; color: #f59e0b; font-weight: 300; font-style: italic; }
            .sc-item-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
            .sc-totals-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
            .sc-total-final {
              font-weight: 700; font-size: 11px; color: #8b5cf6;
              border-top: 2px solid #8b5cf6; padding-top: 4px; margin-top: 4px;
            }
            .sc-footer-info { text-align: center; font-size: 8px; color: #718096; margin-top: 8px; }
            .sc-divider {
              height: 1px; background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%); margin: 6px 0;
            }
            .sc-transaction-id {
              text-align: center; font-family: 'Courier New', monospace; font-size: 8px;
              background: #f7fafc; border: 1px dashed #cbd5e0; padding: 4px; margin: 6px 0; border-radius: 2px;
            }
            .sc-thank-you {
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white;
              padding: 8px; border-radius: 6px; text-align: center; font-size: 9px; margin: 8px 0;
            }
            .sc-qr-code {
              width: 60px; height: 60px; margin: 6px auto; border-radius: 4px; border: 1px solid #e2e8f0;
              background: white; display: flex; align-items: center; justify-content: center;
            }
            .sc-qr-code img { width: 100%; height: 100%; object-fit: contain; }
            .sc-policies-box {
              background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; margin: 6px 0;
              font-size: 8px; color: #4a5568;
            }
            .sc-policy-item { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px; }
            .sc-policy-item:last-child { margin-bottom: 0; }
          `}</style>
          <div className="bg-white dark:bg-dm-card w-full max-w-sm rounded-2xl p-4 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 no-print">
              <h3 className="text-base font-semibold text-charcoal dark:text-white">Receipt</h3>
              <button
                onClick={() => setShowFullReceipt(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
                aria-label="Close receipt"
              >
                <FaTimes />
              </button>
            </div>

            <div id="sales-counter-receipt-print" className="sc-receipt-container">
              <div className="sc-logo-container">
                <img
                  src={nawiriBrand.logo}
                  alt="Nawiri Hair"
                  style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                <div className="sc-receipt-header">
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>NAWIRI HAIR</div>
                  <div className="sc-brand-tagline">Your Beauty, Our Pride</div>
                </div>
              </div>

              <div className="sc-receipt-section">
                <div className="sc-section-title">Store Information</div>
                <div className="sc-store-info">
                  <div>{user?.staff_branch || 'Main Store'}, {nawiriBrand.locationShort}</div>
                  <div>Tel: {nawiriBrand.phoneDisplay}</div>
                  <div>Receipt No: {completedSale.saleNumber}</div>
                  <div>{new Date(completedSale.saleDate).toLocaleString('en-KE', { hour12: true })}</div>
                  <div>Cashier: {completedSale.cashierName}</div>
                </div>
              </div>

              <div className="sc-receipt-section">
                <div className="sc-section-title">Customer Information</div>
                <div className="sc-store-info">
                  <div style={{ fontWeight: '500' }}>{completedSale.customerName || 'Valued Customer'}</div>
                  {completedSale.customerPhone && (
                    <div>Contact: {completedSale.customerPhone}</div>
                  )}
                </div>
              </div>

              <div className="sc-divider" />

              <div className="sc-receipt-section">
                <div className="sc-section-title">Purchase Details</div>
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="sc-item-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{item.quantity} x {item.name}</div>
                      <div style={{ fontSize: '8px', color: '#718096' }}>@ {DisplayPriceInShillings(item.price)} each</div>
                      {item.sku && (
                        <div style={{ fontSize: '8px', color: '#718096' }}>Barcode: {item.sku}</div>
                      )}
                    </div>
                    <div style={{ fontWeight: '600' }}>{DisplayPriceInShillings(item.total)}</div>
                  </div>
                ))}
              </div>

              <div className="sc-divider" />

              <div className="sc-receipt-section">
                <div className="sc-section-title">Summary</div>
                <div className="sc-totals-row">
                  <span>Subtotal:</span>
                  <span>{DisplayPriceInShillings(completedSale.subtotal)}</span>
                </div>
                {completedSale.deliveryCharge > 0 && (
                  <div className="sc-totals-row">
                    <span>Delivery fee:</span>
                    <span>{DisplayPriceInShillings(completedSale.deliveryCharge)}</span>
                  </div>
                )}
                <div className="sc-totals-row sc-total-final">
                  <span>TOTAL:</span>
                  <span>{DisplayPriceInShillings(completedSale.total)}</span>
                </div>
              </div>

              <div className="sc-divider" />

              <div className="sc-receipt-section">
                <div className="sc-section-title">Payment Details</div>
                <div className="sc-totals-row">
                  <span>Method:</span>
                  <span>{paymentMethodLabel(completedSale.paymentMethod)}</span>
                </div>
                {completedSale.paymentMethod === 'split' && Array.isArray(completedSale.payments) &&
                  completedSale.payments.map((payment, idx) => (
                    <div key={idx} className="sc-totals-row" style={{ fontSize: '8px', marginLeft: '8px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{payment.method}:</span>
                      <span>{DisplayPriceInShillings(payment.amount)}</span>
                    </div>
                  ))
                }
                {completedSale.change > 0 && (
                  <div className="sc-totals-row" style={{ color: '#10b981' }}>
                    <span>Change Given:</span>
                    <span>{DisplayPriceInShillings(completedSale.change)}</span>
                  </div>
                )}
              </div>

              {completedSale.fulfillment_type === 'pickup' && completedSale.pickupCode && (
                <div className="sc-receipt-section">
                  <div className="sc-section-title">Pickup Code</div>
                  <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px', padding: '4px 0' }}>
                    {completedSale.pickupCode}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '7px', color: '#718096' }}>
                    Bring this code when you come to collect your order
                  </div>
                </div>
              )}

              <div className="sc-receipt-section">
                <div className="sc-section-title">Transaction Verification</div>
                <div className="sc-transaction-id">
                  <div>Transaction ID: NWR-{completedSale.saleNumber}</div>
                  <div style={{ fontSize: '7px', color: '#718096', marginTop: '2px' }}>
                    {new Date(completedSale.saleDate).toISOString().slice(0, 19)}Z
                  </div>
                </div>
                <div className="sc-qr-code">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Verification QR Code" />
                  ) : (
                    <div style={{ fontSize: '8px', color: '#718096' }}>Loading QR...</div>
                  )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '7px', color: '#718096' }}>
                  Scan to verify transaction or visit {nawiriBrand.websiteUrl.replace(/^https?:\/\//, '')}
                </div>
              </div>

              {completedSale.note && (
                <div className="sc-receipt-section">
                  <div className="sc-section-title">Order Note</div>
                  <div style={{ fontSize: '8px', color: '#4a5568', fontStyle: 'italic' }}>{completedSale.note}</div>
                </div>
              )}

              <div className="sc-divider" />

              <div className="sc-policies-box">
                <div className="sc-policy-item">
                  <span>•</span>
                  <span>
                    <strong>Exchanges only, no cash refunds.</strong> Wrong colour/type? Bring the hair back unused
                    and we will exchange it. Same-type swaps are free; upgrading to a pricier item means paying the
                    difference. Your replacement is dispatched only once we receive the original hair back.
                  </span>
                </div>
                <div className="sc-policy-item">
                  <span>•</span>
                  <span>Please keep this receipt — it is required for any exchange.</span>
                </div>
                <div className="sc-policy-item">
                  <span>•</span>
                  <span>Customer Support: {nawiriBrand.phoneDisplay}</span>
                </div>
              </div>

              <div className="sc-thank-you">
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Thank you, {completedSale.customerName || 'valued customer'}!
                </div>
                <div style={{ fontSize: '8px' }}>
                  We appreciate your trust in Nawiri Hair. Your beauty is our pride, and we look forward to serving you again.
                </div>
              </div>

              <div className="sc-footer-info">
                <div style={{ marginBottom: '4px' }}>
                  <div>{nawiriBrand.email}</div>
                  <div>{nawiriBrand.websiteUrl.replace(/^https?:\/\//, '')}</div>
                </div>
                <div style={{ fontSize: '7px', color: '#a0aec0', marginTop: '4px' }}>
                  Receipt generated on {new Date().toLocaleDateString('en-KE')}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 border border-brown-200 dark:border-dm-border rounded-pill text-charcoal dark:text-white/70 hover:bg-blush-50 dark:hover:bg-dm-card-2 flex items-center justify-center gap-2 transition-colors"
              >
                <FaPrint size={14} /> Print
              </button>
              <button
                onClick={() => setShowFullReceipt(false)}
                className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held sales panel — admins see everyone's; staff only see their own */}
      {showHeldSales && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="held-sales-title"
        >
          <div className="flex-1" onClick={() => setShowHeldSales(false)} />
          <div className="flex max-h-[86dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-dm-card sm:mx-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-2xl sm:my-auto">
            <div className="border-b border-brown-100 p-4 dark:border-dm-border">
              <div className="flex items-center justify-between">
                <h2 id="held-sales-title" className="flex items-center gap-2 text-lg font-bold">
                  <FaClock /> Held Sales
                </h2>
                <button
                  onClick={() => setShowHeldSales(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-brown-600 transition-colors hover:bg-brown-100 dark:text-white/70 dark:hover:bg-dm-border"
                  aria-label="Close held sales"
                >
                  ✕
                </button>
              </div>
              <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                {isAdmin ? 'Every held sale across the counter.' : 'Sales you’ve personally held.'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldSales.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brown-200 px-4 py-10 text-center text-sm text-brown-500 dark:border-dm-border dark:text-white/50">
                  {isAdmin
                    ? "No held sales right now. Use the Hold button on a sale to park it here while you serve someone else."
                    : "You haven't held any sales. Use the Hold button on a sale to park it here while you serve someone else."}
                </div>
              ) : (
                heldSales.map((held) => {
                  const heldItemCount = (held.cart || []).reduce((sum, i) => sum + i.quantity, 0);
                  const heldTotal = (held.cart || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
                  return (
                    <div
                      key={held._id}
                      className="rounded-xl border border-brown-100 bg-plum-50/40 p-3 dark:border-dm-border dark:bg-dm-card-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{held.label || 'Held sale'}</p>
                          <p className="text-xs text-brown-500 dark:text-white/50">
                            {heldItemCount} item{heldItemCount === 1 ? '' : 's'} · {DisplayPriceInShillings(heldTotal)} · held by {held.heldByName}
                          </p>
                          <p className="text-[11px] text-brown-400 dark:text-white/40">
                            {new Date(held.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => resumeHeldSale(held)}
                          disabled={resumingId === held._id}
                          className="flex-1 min-h-[44px] rounded-lg bg-plum-700 text-xs font-semibold text-white transition-colors active:scale-[0.98] hover:bg-plum-800 disabled:opacity-60"
                        >
                          {resumingId === held._id ? 'Resuming…' : 'Resume'}
                        </button>
                        <button
                          onClick={() => discardHeldSale(held)}
                          aria-label={`Discard ${held.label || 'held sale'}`}
                          className="min-h-[44px] min-w-[44px] rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors active:scale-[0.97] hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCounter;
