import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaTrash,
  FaUser,
  FaWhatsapp,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { nawiriBrand } from '../config/brand';
import {
  buildWhatsAppOrderMessage,
  createWhatsAppOrderUrl,
  formatWhatsAppOrderAmount,
} from '../utils/whatsappOrder';

const TAX_RATE = 0.16;
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', color: 'bg-green-600' },
  { id: 'mpesa', label: 'M-Pesa', color: 'bg-green-700' },
  { id: 'card', label: 'Card', color: 'bg-blue-600' },
];

const SalesCounter = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const [whatsAppItems, setWhatsAppItems] = useState([]);
  const [showWhatsAppOrder, setShowWhatsAppOrder] = useState(false);
  const [whatsAppCustomerName, setWhatsAppCustomerName] = useState('');
  const [whatsAppCustomerPhone, setWhatsAppCustomerPhone] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [whatsAppNote, setWhatsAppNote] = useState('');

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
  }, []);

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

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.price || p.price <= 0) return false; // skip products without a price
      const matchesSearch =
        !s ||
        p.name?.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s);
      const catId =
        typeof p.category === 'string'
          ? p.category
          : p.category?._id || p.categoryId;
      const matchesCategory =
        selectedCategory === 'all' || catId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product) => {
    if (!product.price || product.price <= 0) {
      toast.error(`${product.name} has no price set.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
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
        .map((i) => (i._id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  const addToWhatsAppOrder = (product) => {
    if (!product.price || product.price <= 0) {
      toast.error(`${product.name} has no price set.`);
      return;
    }

    setWhatsAppItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} added to WhatsApp order`);
  };

  const updateWhatsAppQty = (id, delta) => {
    setWhatsAppItems((prev) =>
      prev
        .map((item) =>
          item._id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeWhatsAppItem = (id) => {
    setWhatsAppItems((prev) => prev.filter((item) => item._id !== id));
  };

  const whatsAppOrderTotal = useMemo(
    () => whatsAppItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [whatsAppItems]
  );

  const whatsAppItemCount = useMemo(
    () => whatsAppItems.reduce((sum, item) => sum + item.quantity, 0),
    [whatsAppItems]
  );

  const openWhatsAppOrder = () => {
    if (whatsAppItems.length === 0) {
      toast.error('Add at least one product to the WhatsApp order.');
      return;
    }
    if (!whatsAppCustomerName.trim() || !whatsAppCustomerPhone.trim()) {
      toast.error('Enter the customer name and phone number.');
      return;
    }
    if (fulfillmentMethod === 'delivery' && !deliveryLocation.trim()) {
      toast.error('Enter the delivery location.');
      return;
    }

    try {
      const message = buildWhatsAppOrderMessage({
        items: whatsAppItems,
        customerName: whatsAppCustomerName,
        customerPhone: whatsAppCustomerPhone,
        fulfillmentMethod,
        deliveryLocation,
        note: whatsAppNote,
      });
      const url = createWhatsAppOrderUrl(nawiriBrand.whatsappUrl, message);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp order draft opened. Review and tap Send.');
    } catch (error) {
      toast.error(error.message || 'Unable to prepare the WhatsApp order.');
    }
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const tendered = Number(amountTendered) || 0;
    return { subtotal, tax, total, change: Math.max(0, tendered - total) };
  }, [cart, amountTendered]);

  const resetSale = () => {
    setCart([]);
    setShowCart(false);
    setPaymentMethod('cash');
    setAmountTendered('');
    setCustomerName('');
    setCustomerPhone('');
    setSaleNote('');
    setCompletedSale(null);
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
        subtotal: totals.subtotal,
        discount: 0,
        tax: totals.tax,
        total: totals.total,
        paymentMethod,
        amountTendered: Number(amountTendered) || totals.total,
        change: totals.change,
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
        setCompletedSale({ ...saleData, saleNumber: res.data.saleNumber });
        toast.success(`Sale ${res.data.saleNumber} completed`);
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

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface text-charcoal dark:text-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {/* Header */}
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWhatsAppOrder(true)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-green-600 bg-white px-3 py-2 text-sm font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-50 dark:border-green-500 dark:bg-dm-card dark:text-green-300 dark:hover:bg-green-950/30"
              aria-label="Open Buy via WhatsApp order"
            >
              <FaWhatsapp size={16} />
              <span className="hidden lg:inline">WhatsApp</span>
              {whatsAppItemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-green-600 px-1 text-[10px] font-bold text-white dark:border-dm-card">
                  {whatsAppItemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-plum-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-plum-800"
            >
              <FaShoppingBasket size={15} />
              <span className="hidden sm:inline">Basket</span>
              {cart.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-gold-500 px-1 text-[10px] font-bold text-charcoal dark:border-dm-card">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-brown-100 px-3 py-2 text-xs dark:border-dm-border sm:px-4">
          <span className="font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Current sale</span>
          <span className="font-bold tabular-nums text-plum-700 dark:text-gold-300">{cart.reduce((sum, item) => sum + item.quantity, 0)} items · {DisplayPriceInShillings(totals.total)}</span>
        </div>

        {/* Search */}
        <div className="relative px-3 pt-2 sm:px-4">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU or barcode..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border bg-plum-50/50 dark:bg-dm-card-2 text-sm focus:outline-none focus:border-plum-500"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-2 scrollbar-hide sm:px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === c._id
                  ? 'bg-plum-700 text-white'
                  : 'bg-brown-100 dark:bg-dm-border text-brown-700 dark:text-white/70'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Product grid */}
      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-8">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-brown-500 dark:text-white/50">
            No products found.
          </div>
        ) : (
          filteredProducts.map((p) => (
            <article
              key={p._id}
              className="overflow-hidden rounded-xl border border-brown-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md dark:border-dm-border dark:bg-dm-card"
            >
              <div className="aspect-[4/3] bg-plum-50 dark:bg-dm-card-2 flex items-center justify-center">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-2xl">🛍️</span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold line-clamp-2 min-h-[2rem]">{p.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-plum-700 dark:text-plum-300 font-bold text-xs">
                    {DisplayPriceInShillings(p.price)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addToWhatsAppOrder(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-green-600 text-green-700 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-300"
                      aria-label={`Buy ${p.name} via WhatsApp`}
                      title="Buy via WhatsApp"
                    >
                      <FaWhatsapp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white transition-colors hover:bg-gold-600"
                      aria-label={`Add ${p.name} to basket`}
                      title="Add to basket"
                    >
                      <FaPlus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Buy via WhatsApp drawer */}
      {showWhatsAppOrder && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/50">
          <div className="flex-1" onClick={() => setShowWhatsAppOrder(false)} />
          <section
            className="flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-white dark:bg-dm-card"
            aria-label="Buy via WhatsApp order"
          >
            <div className="flex items-center justify-between border-b border-brown-100 p-4 dark:border-dm-border">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-charcoal dark:text-white">
                  <FaWhatsapp className="text-green-600" /> Buy via WhatsApp
                </h2>
                <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                  Review the order before opening WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppOrder(false)}
                className="rounded-full p-2 hover:bg-brown-100 dark:hover:bg-dm-border"
                aria-label="Close WhatsApp order"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {whatsAppItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brown-300 px-4 py-10 text-center dark:border-dm-border">
                  <FaWhatsapp className="mx-auto mb-3 text-3xl text-green-600" />
                  <p className="font-semibold">No WhatsApp order items yet.</p>
                  <p className="mt-1 text-sm text-brown-500 dark:text-white/50">
                    Use the green WhatsApp button beside a product to add it here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {whatsAppItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center gap-3 rounded-xl bg-green-50/70 p-3 dark:bg-green-950/20"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-dm-border">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">🛍️</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-brown-500 dark:text-white/50">
                            {item.sku || item.barcode || item._id || 'Product code unavailable'}
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-green-700 dark:text-green-300">
                            {formatWhatsAppOrderAmount(item.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateWhatsAppQty(item._id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card-2"
                            aria-label={`Reduce ${item.name} quantity`}
                          >
                            <FaMinus size={11} />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateWhatsAppQty(item._id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            <FaPlus size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeWhatsAppItem(item._id)}
                            className="p-2 text-red-500"
                            aria-label={`Remove ${item.name} from WhatsApp order`}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-brown-100 bg-plum-50/40 p-3 dark:border-dm-border dark:bg-dm-card-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brown-600 dark:text-white/60">Order estimate ({whatsAppItemCount} items)</span>
                      <span className="font-bold text-plum-700 dark:text-gold-300">
                        {formatWhatsAppOrderAmount(whatsAppOrderTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brown-700 dark:text-white/70">
                      <FaUser /> Customer details
                    </div>
                    <input
                      type="text"
                      value={whatsAppCustomerName}
                      onChange={(event) => setWhatsAppCustomerName(event.target.value)}
                      placeholder="Customer name *"
                      className="w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                    />
                    <input
                      type="tel"
                      value={whatsAppCustomerPhone}
                      onChange={(event) => setWhatsAppCustomerPhone(event.target.value)}
                      placeholder="Phone number *"
                      className="w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentMethod('pickup')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                          fulfillmentMethod === 'pickup'
                            ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                            : 'border-brown-200 dark:border-dm-border'
                        }`}
                      >
                        Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfillmentMethod('delivery')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                          fulfillmentMethod === 'delivery'
                            ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                            : 'border-brown-200 dark:border-dm-border'
                        }`}
                      >
                        Delivery
                      </button>
                    </div>
                    {fulfillmentMethod === 'delivery' && (
                      <textarea
                        value={deliveryLocation}
                        onChange={(event) => setDeliveryLocation(event.target.value)}
                        placeholder="Delivery location *"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                      />
                    )}
                    <textarea
                      value={whatsAppNote}
                      onChange={(event) => setWhatsAppNote(event.target.value)}
                      placeholder="Colour, length, or special instructions (optional)"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                    />
                  </div>
                </>
              )}
            </div>

            {whatsAppItems.length > 0 && (
              <div className="border-t border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
                <button
                  type="button"
                  onClick={openWhatsAppOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white transition-colors hover:bg-green-700"
                >
                  <FaWhatsapp size={18} /> Continue to WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsAppItems([])}
                  className="mt-2 w-full py-2 text-sm font-semibold text-brown-500 hover:text-red-600 dark:text-white/50"
                >
                  Clear WhatsApp order
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/50">
          <div
            className="flex-1"
            onClick={() => setShowCart(false)}
          />
          <div className="bg-white dark:bg-dm-card w-full max-h-[85vh] rounded-t-2xl flex flex-col animate-slide-up">
            <div className="p-4 border-b border-brown-100 dark:border-dm-border flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FaShoppingBasket /> Basket ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 rounded-full hover:bg-brown-100 dark:hover:bg-dm-border"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-brown-500 dark:text-white/50 py-8">
                  Your basket is empty.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 bg-plum-50/50 dark:bg-dm-card-2 rounded-lg p-3"
                  >
                    <div className="w-12 h-12 rounded bg-white dark:bg-dm-border flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span>🛍️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-brown-500 dark:text-white/50">
                        {DisplayPriceInShillings(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item._id, -1)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-dm-border border border-brown-200 dark:border-dm-border flex items-center justify-center"
                      >
                        <FaMinus size={12} />
                      </button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item._id, 1)}
                        className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center"
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-red-500 p-2"
                    >
                      <FaTrash size={14} />
                    </button>
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
                            if (m.id !== 'cash') setAmountTendered(totals.total.toFixed(2));
                          }}
                          className={`py-2 rounded-lg text-sm font-medium text-white transition-opacity ${m.color} ${
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
                <div className="flex justify-between">
                  <span className="text-brown-500 dark:text-white/60">Tax (16%)</span>
                  <span>{DisplayPriceInShillings(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-brown-200 dark:border-dm-border">
                  <span>Total</span>
                  <span className="text-plum-700 dark:text-plum-300">
                    {DisplayPriceInShillings(totals.total)}
                  </span>
                </div>
              </div>
              <button
                onClick={completeSale}
                disabled={cart.length === 0 || submitting}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-brown-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? 'Processing…' : `Charge ${DisplayPriceInShillings(totals.total)}`}
              </button>
            </div>
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
                <span>Paid via</span>
                <span className="capitalize">{completedSale.paymentMethod}</span>
              </div>
              {completedSale.change > 0 && (
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{DisplayPriceInShillings(completedSale.change)}</span>
                </div>
              )}
            </div>
            <button
              onClick={resetSale}
              className="w-full bg-plum-700 text-white font-bold py-3 rounded-xl"
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCounter;
