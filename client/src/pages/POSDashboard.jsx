import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  FaCalendarAlt, 
  FaChartBar, 
  FaCreditCard, 
  FaDollarSign, 
  FaShoppingCart, 
  FaTimes 
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import isStaff from '../utils/isStaff';

const POSDashboard = () => {
  const user = useSelector(state => state.user);
  const navigate = useNavigate();
  const hasStoredSession = Boolean(
    sessionStorage.getItem('accesstoken') ||
    sessionStorage.getItem('refreshToken') ||
    localStorage.getItem('accesstoken') ||
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('token')
  );
  const canAccessSalesTools = isStaff(user);

  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsAccessDenied, setAnalyticsAccessDenied] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');

  // Wait for session hydration before deciding access, and allow admins to use sales tools.
  useEffect(() => {
    if (!user?._id) {
      if (!hasStoredSession) {
        toast.error('Please log in to continue.');
        navigate('/login');
      }
      return;
    }

    if (!canAccessSalesTools) {
      toast.error('Access denied. Staff privileges required.');
      navigate('/dashboard/profile');
    }
  }, [user?._id, hasStoredSession, canAccessSalesTools, navigate]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, analyticsPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDailySummary(),
        loadAnalytics(),
        loadRecentSales()
      ]);
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailySummary = async () => {
    try {
      const response = await Axios({
        url: `/api/pos/summary/daily?date=${selectedDate}`,
        method: 'GET'
      });
      
      if (response.data.success) {
        setDailySummary(response.data.data);
      }
    } catch (error) {
      console.error('Error loading daily summary:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await Axios({
        url: `/api/pos/analytics?period=${analyticsPeriod}`,
        method: 'GET'
      });

      if (response.data.success) {
        setAnalytics(response.data.data);
        setAnalyticsAccessDenied(false);
      }
    } catch (error) {
      if (error?.response?.status === 403) {
        setAnalyticsAccessDenied(true);
      } else {
        console.error('Error loading analytics:', error);
      }
    }
  };

  const loadRecentSales = async () => {
    try {
      const response = await Axios({
        url: '/api/pos/sales?limit=10&includeItems=true',
        method: 'GET'
      });
      
      if (response.data.success) {
        setRecentSales(response.data.data);
      }
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  };

  const analyticsTotalSales = (analytics?.salesOverTime || []).reduce(
    (sum, entry) => sum + (entry.totalSales || 0),
    0
  );
  const analyticsTransactionCount = (analytics?.salesOverTime || []).reduce(
    (sum, entry) => sum + (entry.transactionCount || 0),
    0
  );
  const analyticsAverageTicket = analyticsTransactionCount > 0
    ? analyticsTotalSales / analyticsTransactionCount
    : 0;
  const maxTrendValue = Math.max(1, ...(analytics?.salesOverTime || []).map((entry) => entry.totalSales || 0));
  const maxPaymentValue = Math.max(1, ...(analytics?.paymentBreakdown || []).map((entry) => entry.total || 0));
  const busiestHours = [...(analytics?.hourlySales || [])]
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    .slice(0, 4);
  const analyticsPeriodLabel = {
    '24h': 'last 24 hours',
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '90d': 'last 90 days'
  }[analyticsPeriod] || 'selected period';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-brown-50 dark:bg-dm-surface p-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-charcoal dark:text-white tracking-tight">Sales Hub</h1>
            <p className="text-brown-500 dark:text-white/40">
              Welcome back, {user.name} | {user.staff_branch || 'Main Store'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/dashboard/sales-counter')}
              className="px-5 py-2.5 bg-plum-700 text-white rounded-pill hover:bg-plum-800 transition-colors flex items-center justify-center font-semibold shadow-sm"
            >
              <FaShoppingCart className="mr-2" />
              Open Sales Counter
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">Daily Summary</h3>
              <p className="mt-1 text-sm text-brown-500 dark:text-white/45">
                Choose a trading day and review the counter performance without leaving the hub.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-brown-200 bg-ivory px-3 py-2 dark:border-dm-border dark:bg-dm-card-2">
              <FaCalendarAlt className="text-brown-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-charcoal outline-none dark:text-white"
              />
            </div>
          </div>

          {dailySummary ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300 sm:mb-3 sm:h-11 sm:w-11">
                  <FaDollarSign size={16} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Total Sales</p>
                <p className="mt-1 text-xl font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-2xl">
                  {DisplayPriceInShillings(dailySummary.summary.totalSales)}
                </p>
              </div>

              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300 sm:mb-3 sm:h-11 sm:w-11">
                  <FaShoppingCart size={16} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Transactions</p>
                <p className="mt-1 text-xl font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-2xl">
                  {dailySummary.summary.totalTransactions}
                </p>
              </div>

              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300 sm:mb-3 sm:h-11 sm:w-11">
                  <FaChartBar size={16} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Average Ticket</p>
                <p className="mt-1 text-xl font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-2xl">
                  {DisplayPriceInShillings(dailySummary.summary.averageTransaction)}
                </p>
              </div>

              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/20 dark:text-plum-300 sm:mb-3 sm:h-11 sm:w-11">
                  <FaCreditCard size={16} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Items Sold</p>
                <p className="mt-1 text-xl font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-2xl">
                  {dailySummary.summary.totalItems}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-brown-200 bg-ivory px-4 py-10 text-center text-sm text-brown-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/50">
              No daily summary available yet.
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">Sales Analytics</h3>
              <p className="mt-1 text-sm text-brown-500 dark:text-white/45">
                Performance snapshot for the {analyticsPeriodLabel}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['24h', '7d', '30d', '90d'].map(period => (
                <button
                  key={period}
                  onClick={() => setAnalyticsPeriod(period)}
                  className={`px-3 py-1.5 rounded-pill text-sm font-semibold transition-all ${
                    analyticsPeriod === period
                      ? 'bg-plum-700 text-white shadow-sm'
                      : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white/55 hover:bg-brown-200 dark:hover:bg-dm-border'
                  }`}
                >
                  {period === '24h' ? '24 Hours' : 
                   period === '7d' ? '7 Days' :
                   period === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Period Sales</p>
              <p className="mt-1 text-base font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-xl">
                {DisplayPriceInShillings(analyticsTotalSales)}
              </p>
            </div>
            <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Transactions</p>
              <p className="mt-1 text-base font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-xl">
                {analyticsTransactionCount}
              </p>
            </div>
            <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Average Ticket</p>
              <p className="mt-1 text-base font-black tracking-tight text-charcoal dark:text-white sm:mt-2 sm:text-xl">
                {DisplayPriceInShillings(analyticsAverageTicket)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-brown-100 bg-ivory p-4 dark:border-dm-border dark:bg-dm-card-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold tracking-tight text-charcoal dark:text-white">Peak hours</h4>
              <span className="text-xs text-brown-500 dark:text-white/45">Highest selling slots</span>
            </div>

            {busiestHours.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {busiestHours.map((slot) => (
                  <span key={slot._id} className="inline-flex items-center rounded-pill bg-white px-3 py-1.5 text-xs font-semibold text-charcoal dark:bg-dm-card dark:text-white/80">
                    {String(slot._id).padStart(2, '0')}:00 · {DisplayPriceInShillings(slot.totalSales || 0)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brown-500 dark:text-white/45">Not enough data in this period yet.</p>
            )}
          </div>
        </div>
      </div>

      {dailySummary && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">
                Payment Methods Today
              </h3>
              <span className="text-xs text-brown-500 dark:text-white/45">{selectedDate}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Cash</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.cashSales)}
                </p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Card</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.cardSales)}
                </p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">M-Pesa</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.mobileSales)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">
                Top Products Today
              </h3>
              <span className="text-xs text-brown-500 dark:text-white/45">Best movers</span>
            </div>
            <div className="space-y-3">
              {dailySummary.topProducts.slice(0, 5).map((product, index) => (
                <div key={product._id} className="flex items-center justify-between gap-3 rounded-2xl border border-brown-100 bg-ivory px-4 py-3 dark:border-dm-border dark:bg-dm-card-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-charcoal dark:text-white">
                      {index + 1}. {product.productName}
                    </p>
                    <p className="text-sm text-brown-500 dark:text-white/40">
                      {product.totalQuantity} units sold
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-charcoal dark:text-white">
                    {DisplayPriceInShillings(product.totalRevenue)}
                  </span>
                </div>
              ))}
              {dailySummary.topProducts.length === 0 && (
                <p className="text-brown-400 dark:text-white/40 text-center py-4">
                  No sales today
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">Sales Trend</h3>
            <span className="text-xs text-brown-500 dark:text-white/45">{analyticsPeriodLabel}</span>
          </div>

          {analyticsAccessDenied ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-10 text-center text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
              You don't have permission to view sales analytics. Ask an admin to grant "View sales analytics" under Manage Role.
            </div>
          ) : (analytics?.salesOverTime || []).length > 0 ? (
            <div className="space-y-3">
              {analytics.salesOverTime.map((entry) => (
                <div key={entry._id} className="rounded-2xl border border-brown-100 bg-ivory p-4 dark:border-dm-border dark:bg-dm-card-2">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-charcoal dark:text-white">{entry._id}</span>
                    <span className="text-brown-500 dark:text-white/45">{entry.transactionCount} sales</span>
                  </div>
                  <div className="h-2 rounded-full bg-brown-100 dark:bg-dm-border">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-plum-500 to-gold-500"
                      style={{ width: `${Math.max(10, ((entry.totalSales || 0) / maxTrendValue) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-charcoal dark:text-white">
                    {DisplayPriceInShillings(entry.totalSales || 0)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-brown-200 bg-ivory px-4 py-10 text-center text-sm text-brown-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/50">
              No analytics trend data for this period yet.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">Payment Breakdown</h3>
              <span className="text-xs text-brown-500 dark:text-white/45">Period mix</span>
            </div>

            {(analytics?.paymentBreakdown || []).length > 0 ? (
              <div className="space-y-3">
                {analytics.paymentBreakdown.map((entry) => (
                  <div key={entry._id} className="rounded-2xl border border-brown-100 bg-ivory p-4 dark:border-dm-border dark:bg-dm-card-2">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium capitalize text-charcoal dark:text-white">{entry._id}</span>
                      <span className="text-brown-500 dark:text-white/45">{entry.count} payments</span>
                    </div>
                    <div className="h-2 rounded-full bg-brown-100 dark:bg-dm-border">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-gold-500 to-plum-500"
                        style={{ width: `${Math.max(10, ((entry.total || 0) / maxPaymentValue) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-charcoal dark:text-white">
                      {DisplayPriceInShillings(entry.total || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brown-500 dark:text-white/45">No payment data for this period yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
        <div className="bg-white dark:bg-dm-card rounded-2xl shadow-sm p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-charcoal dark:text-white tracking-tight">
            Recent Sales
            </h3>
            <span className="text-xs text-brown-500 dark:text-white/45">Latest 10 counter sales</span>
          </div>
        <div className="space-y-3 md:hidden">
          {recentSales.map((sale) => (
            <div key={sale._id} className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-charcoal dark:text-white">
                    #{sale.saleNumber}
                  </div>
                  <div className="text-sm text-brown-400 dark:text-white/40">
                    {new Date(sale.saleDate).toLocaleDateString()}
                  </div>
                  <div className="mt-1 text-sm text-charcoal dark:text-white/55 truncate">
                    {sale.customer?.name || sale.customerName || 'Walk-in'}
                  </div>
                </div>
                <span className="text-sm font-semibold text-charcoal dark:text-white">
                  {DisplayPriceInShillings(sale.total)}
                </span>
              </div>

              <div className="mt-3 text-sm text-brown-500 dark:text-white/55">
                {(sale.items && sale.items.length > 0)
                  ? (
                    <div className="line-clamp-2">
                      {(sale.items || []).slice(0, 3).map((item) => `${item.quantity} x ${item.name}`).join(', ')}
                      {sale.items.length > 3 ? ` +${sale.items.length - 3} more` : ''}
                    </div>
                  ) : (
                    <span className="italic text-brown-400">No items</span>
                  )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-pill ${
                  sale.paymentMethod === 'cash' ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' :
                  sale.paymentMethod === 'card' ? 'bg-gold-100 text-gold-600 dark:bg-gold-900/20 dark:text-gold-300' :
                  'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300'
                }`}>
                  {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
                </span>

                <button
                  onClick={() => { setSelectedSale(sale); setShowReceiptModal(true); }}
                  className="px-3 py-1.5 rounded-md border border-brown-200 dark:border-dm-border hover:bg-ivory dark:hover:bg-dm-card-2 text-charcoal dark:text-white/55 text-sm"
                >
                  View Receipt
                </button>
              </div>
            </div>
          ))}

          {recentSales.length === 0 && (
            <div className="text-center py-8 text-brown-400 dark:text-white/40">
              No sales found
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
            <thead className="bg-ivory dark:bg-dm-card-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Cashier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
              {recentSales.map(sale => (
                <tr key={sale._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal dark:text-white">
                    #{sale.saleNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-400 dark:text-white/40">
                    {new Date(sale.saleDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-400 dark:text-white/40">
                    {sale.customer?.name || sale.customerName || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 text-sm text-brown-400 dark:text-white/55 max-w-[280px]">
                    {(sale.items && sale.items.length > 0)
                      ? (
                        <div className="truncate" title={(sale.items || []).map(i => `${i.quantity} x ${i.name}`).join(', ')}>
                          {(sale.items || []).slice(0,3).map(i => `${i.quantity} x ${i.name}`).join(', ')}
                          {sale.items.length > 3 ? ` +${sale.items.length - 3} more` : ''}
                        </div>
                      ) : (
                        <span className="italic text-brown-400">No items</span>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      sale.paymentMethod === 'card' ? 'bg-gold-100 text-gold-800 dark:bg-gold-900/25 dark:text-gold-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    }`}>
                      {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal dark:text-white">
                    {DisplayPriceInShillings(sale.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-400 dark:text-white/40">
                    {sale.cashierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => { setSelectedSale(sale); setShowReceiptModal(true); }}
                      className="px-3 py-1.5 rounded-md border border-brown-200 dark:border-dm-border hover:bg-ivory dark:hover:bg-dm-card-2 text-charcoal dark:text-white/55"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentSales.length === 0 && (
            <div className="text-center py-8 text-brown-400 dark:text-white/40">
              No sales found
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-dm-card rounded-lg p-6 w-[440px] max-w-full mx-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-charcoal dark:text-white">Receipt #{selectedSale.saleNumber}</h4>
              <button onClick={() => setShowReceiptModal(false)} className="text-brown-400 hover:text-charcoal dark:text-white/40 dark:hover:text-charcoal">
                <FaTimes />
              </button>
            </div>
            <div className="text-xs text-brown-500 dark:text-white/55 mb-3">
              <div>{new Date(selectedSale.saleDate).toLocaleString()}</div>
              <div>Customer: {selectedSale.customer?.name || selectedSale.customerName || 'Walk-in'}</div>
              {selectedSale.customerPhone && <div>Phone: {selectedSale.customerPhone}</div>}
              <div>Cashier: {selectedSale.cashierName}</div>
            </div>
            <div className="border-t border-b border-brown-100 dark:border-dm-border py-2 max-h-64 overflow-y-auto">
              {(selectedSale.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <div className="pr-2">
                    <div className="font-medium text-charcoal dark:text-white">{it.quantity} x {it.name}</div>
                    <div className="text-xs text-brown-400 dark:text-white/40">@ {DisplayPriceInShillings(it.price)}</div>
                    {it.sku && (
                      <div className="text-xs text-brown-400 dark:text-white/40">Barcode: {it.sku}</div>
                    )}
                  </div>
                  <div className="font-semibold text-charcoal dark:text-white">{DisplayPriceInShillings(it.total || (it.price * it.quantity))}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-brown-500 dark:text-white/40">Subtotal</span><span className="text-charcoal dark:text-white">{DisplayPriceInShillings(selectedSale.subtotal || ((selectedSale.items||[]).reduce((s,i)=>s+(i.price*i.quantity),0)))}</span></div>
              {selectedSale.discount > 0 && <div className="flex justify-between"><span className="text-brown-500 dark:text-white/40">Discount</span><span className="text-plum-600">-{DisplayPriceInShillings(selectedSale.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-brown-500 dark:text-white/40">Tax</span><span className="text-charcoal dark:text-white">{DisplayPriceInShillings(selectedSale.tax || 0)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{DisplayPriceInShillings(selectedSale.total)}</span></div>
            </div>
            <div className="mt-3 text-xs text-brown-500 dark:text-white/40">
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="capitalize">{selectedSale.paymentMethod}</span>
              </div>
              {selectedSale.paymentMethod === 'split' && Array.isArray(selectedSale.payments) && (
                <div className="mt-1 space-y-0.5">
                  {selectedSale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-brown-400 dark:text-white/40">{p.method === 'mobile' ? `M-Pesa${p.phone ? ` (${p.phone})` : ''}` : p.method}</span>
                      <span>{DisplayPriceInShillings(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedSale.change > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 mt-1">
                  <span>Change</span>
                  <span>{DisplayPriceInShillings(selectedSale.change)}</span>
                </div>
              )}
            </div>
            {selectedSale.note && (
              <div className="mt-3 text-xs text-brown-400 italic">Note: {selectedSale.note}</div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowReceiptModal(false)} className="px-4 py-2 rounded-lg border border-brown-200 dark:border-dm-border hover:bg-ivory dark:hover:bg-dm-card-2 text-sm text-charcoal dark:text-white/55">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSDashboard;
