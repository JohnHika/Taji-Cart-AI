import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaHourglassHalf,
  FaMapMarkerAlt,
  FaStore,
  FaTimes,
  FaTruck,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../../utils/DisplayPriceInShillings';

const TABS = [
  { key: 'pickup', label: 'Awaiting pickup', icon: FaStore },
  { key: 'delivery', label: 'Awaiting delivery', icon: FaTruck },
  { key: 'history', label: 'History', icon: FaClock },
];

const deliveryModeLabel = (sale) => {
  if (sale.delivery_mode === 'bike') return `Bike — ${sale.delivery_zone_name || 'zone'}`;
  if (sale.delivery_mode === 'sacco') return `SACCO — ${sale.sacco_operator_name || ''} to ${sale.sacco_destination_town || ''}`;
  return 'Standard delivery';
};

// A customer can buy today and ask for delivery tomorrow (or later) — this
// turns the raw scheduled date into "Due today"/"Due tomorrow"/a plain date
// so staff can spot what's urgent without doing date math in their head.
const dueLabel = (dateValue) => {
  if (!dateValue) return null;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((dueDay - todayDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return { text: 'Due today', urgent: true };
  if (diffDays === 1) return { text: 'Due tomorrow', urgent: false };
  if (diffDays < 0) return { text: `Overdue — was due ${due.toLocaleDateString()}`, urgent: true };
  return { text: `Due ${due.toLocaleDateString()}`, urgent: false };
};

const SalesCounterFulfillment = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('pickup');
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOnId, setActingOnId] = useState(null);
  const [pickupCodeDraft, setPickupCodeDraft] = useState({});

  useEffect(() => {
    if (!user?._id) return;
    const role = (user.role || '').toLowerCase();
    if (!['admin', 'staff', 'manager'].includes(role)) {
      toast.error('This page is for staff use only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await Axios({ url: '/api/pos/pending-fulfillment', method: 'GET' });
      if (res.data.success) setPending(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await Axios({ url: '/api/pos/fulfillment-history', method: 'GET' });
      if (res.data.success) setHistory(res.data.data || []);
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else {
      loadPending();
    }
  }, [activeTab]);

  const pickupSales = useMemo(
    () => pending.filter((s) => s.fulfillment_type === 'pickup'),
    [pending]
  );
  const deliverySales = useMemo(
    () => pending.filter((s) => s.fulfillment_type === 'delivery'),
    [pending]
  );

  const completePickup = async (sale) => {
    const code = (pickupCodeDraft[sale._id] || '').trim();
    if (!code) {
      toast.error('Enter the pickup code from the customer\'s receipt.');
      return;
    }
    try {
      setActingOnId(sale._id);
      const res = await Axios({
        url: `/api/pos/sale/${sale._id}/complete-pickup`,
        method: 'PUT',
        data: { pickupCode: code },
      });
      if (res.data.success) {
        toast.success(`${sale.saleNumber} marked picked up.`);
        setPending((prev) => prev.filter((s) => s._id !== sale._id));
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const dispatchSale = async (sale) => {
    try {
      setActingOnId(sale._id);
      const res = await Axios({ url: `/api/pos/sale/${sale._id}/dispatch`, method: 'PUT' });
      if (res.data.success) {
        toast.success(`${sale.saleNumber} marked dispatched.`);
        setPending((prev) => prev.map((s) => (s._id === sale._id ? res.data.data : s)));
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const markDelivered = async (sale) => {
    try {
      setActingOnId(sale._id);
      const res = await Axios({ url: `/api/pos/sale/${sale._id}/deliver`, method: 'PUT' });
      if (res.data.success) {
        toast.success(`${sale.saleNumber} marked delivered.`);
        setPending((prev) => prev.filter((s) => s._id !== sale._id));
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const cancelFulfillment = async (sale) => {
    if (!window.confirm(`Cancel the pending ${sale.fulfillment_type} for ${sale.saleNumber}? This can't be undone.`)) return;
    const reason = window.prompt('Reason (optional):') || '';
    try {
      setActingOnId(sale._id);
      const res = await Axios({
        url: `/api/pos/sale/${sale._id}/cancel-fulfillment`,
        method: 'PUT',
        data: { reason },
      });
      if (res.data.success) {
        toast.success(`${sale.saleNumber} cancelled.`);
        setPending((prev) => prev.filter((s) => s._id !== sale._id));
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setActingOnId(null);
    }
  };

  const activeList = activeTab === 'pickup' ? pickupSales : activeTab === 'delivery' ? deliverySales : history;

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface pb-16">
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-plum-600 to-plum-700 text-white shadow-sm">
              <FaTruck size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Sales Counter Deliveries</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">Counter sales paid now, handed over later</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
              <FaStore size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Awaiting pickup</p>
            <p className="mt-1 text-xl font-black tracking-tight">{pickupSales.length}</p>
          </div>
          <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
              <FaTruck size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Awaiting delivery</p>
            <p className="mt-1 text-xl font-black tracking-tight">{deliverySales.length}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:col-span-1 sm:p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <FaHourglassHalf size={15} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total pending</p>
            <p className="mt-1 text-xl font-black tracking-tight">{pending.length}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-plum-700 text-white shadow-sm'
                    : 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/55'
                }`}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : activeList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-brown-400 dark:text-white/40">
                <FaBoxOpen size={26} />
                <p className="text-sm">
                  {activeTab === 'history' ? 'No completed handovers yet.' : `Nothing ${activeTab === 'pickup' ? 'awaiting pickup' : 'awaiting delivery'} right now.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTab !== 'history' && activeList.map((sale) => (
                  <div key={sale._id} className="overflow-hidden rounded-xl border border-brown-100 dark:border-dm-border">
                    <div className="flex items-start justify-between gap-2 bg-ivory p-3 dark:bg-dm-card-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{sale.saleNumber}</p>
                        <p className="text-xs text-brown-500 dark:text-white/50">
                          {sale.customerName || (sale.saleSource === 'online' ? 'Online customer' : 'Walk-in customer')} {sale.customerPhone ? `· ${sale.customerPhone}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-plum-700 dark:text-gold-300">
                        {DisplayPriceInShillings(sale.total)}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-brown-600 dark:text-white/60">
                        {(sale.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>

                      {sale.fulfillment_type === 'pickup' && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gold-700 dark:text-gold-300">
                          <FaClipboardList size={11} /> Pickup code: <span className="font-mono">{sale.pickupCode}</span>
                        </p>
                      )}

                      {sale.fulfillment_type === 'delivery' && (
                        <>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-plum-700 dark:text-plum-300">
                              <FaMapMarkerAlt size={11} /> {deliveryModeLabel(sale)}
                            </p>
                            {dueLabel(sale.deliveryScheduledDate) && (
                              <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-bold ${
                                dueLabel(sale.deliveryScheduledDate).urgent
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300'
                              }`}>
                                <FaClock size={9} /> {dueLabel(sale.deliveryScheduledDate).text}
                              </span>
                            )}
                          </div>
                          {sale.deliveryNote && (
                            <p className="mt-1 text-xs italic text-brown-500 dark:text-white/50">&quot;{sale.deliveryNote}&quot;</p>
                          )}
                          {sale.fulfillmentStatus === 'dispatched' && (
                            <span className="mt-2 inline-flex rounded-pill bg-plum-100 px-2.5 py-1 text-[11px] font-bold text-plum-700 dark:bg-plum-900/30 dark:text-plum-200">
                              Dispatched — on the way
                            </span>
                          )}
                        </>
                      )}

                      <p className="mt-2 text-[11px] text-brown-400 dark:text-white/40">
                        Sold by {sale.cashierName} · {new Date(sale.saleDate).toLocaleString()}
                      </p>

                      {sale.fulfillment_type === 'pickup' ? (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={pickupCodeDraft[sale._id] || ''}
                            onChange={(e) => setPickupCodeDraft((prev) => ({ ...prev, [sale._id]: e.target.value }))}
                            placeholder="Enter pickup code"
                            className="min-h-[40px] flex-1 rounded-lg border border-brown-200 bg-ivory px-3 text-sm font-mono uppercase outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"
                          />
                          <button
                            onClick={() => completePickup(sale)}
                            disabled={actingOnId === sale._id}
                            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            <FaCheckCircle size={12} /> Confirm
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          {sale.fulfillmentStatus === 'awaiting_delivery' && (
                            <button
                              onClick={() => dispatchSale(sale)}
                              disabled={actingOnId === sale._id}
                              className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-plum-700 text-xs font-semibold text-white transition-colors hover:bg-plum-800 disabled:opacity-60"
                            >
                              <FaTruck size={12} /> Mark Dispatched
                            </button>
                          )}
                          <button
                            onClick={() => markDelivered(sale)}
                            disabled={actingOnId === sale._id}
                            className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            <FaCheckCircle size={12} /> Mark Delivered
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => cancelFulfillment(sale)}
                        disabled={actingOnId === sale._id}
                        className="mt-2 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:hover:bg-red-950/30"
                      >
                        <FaTimes size={11} /> Cancel this {sale.fulfillment_type}
                      </button>
                    </div>
                  </div>
                ))}

                {activeTab === 'history' && activeList.map((sale) => (
                  <div key={sale._id} className="flex items-center justify-between gap-3 rounded-xl border border-brown-100 p-3 dark:border-dm-border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{sale.saleNumber}</p>
                      <p className="text-xs text-brown-500 dark:text-white/50">
                        {sale.customerName || (sale.saleSource === 'online' ? 'Online customer' : 'Walk-in customer')} · {sale.fulfillment_type}
                      </p>
                      <p className="text-[11px] text-brown-400 dark:text-white/40">
                        {sale.fulfilledByName ? `By ${sale.fulfilledByName} · ` : ''}
                        {sale.fulfilledAt ? new Date(sale.fulfilledAt).toLocaleString() : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11px] font-bold ${
                        sale.fulfillmentStatus === 'cancelled'
                          ? 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/60'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      }`}>
                        {sale.fulfillmentStatus.replace('_', ' ')}
                      </span>
                      <p className="mt-1 text-sm font-bold">{DisplayPriceInShillings(sale.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesCounterFulfillment;
