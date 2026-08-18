import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  FaCalendarAlt,
  FaChartBar,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaDownload,
  FaReceipt,
  FaShoppingCart,
  FaStore,
  FaThLarge,
  FaThList,
  FaTimes,
  FaTruck,
  FaUndo,
  FaUser,
  FaWhatsapp
} from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { downloadEndOfDayReport } from '../utils/eodReceipt';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import isAdmin from '../utils/isAdmin';
import isStaff from '../utils/isStaff';

const RECENT_SALES_PAGE_SIZE = 12;
const PAYMENT_CHART_COLORS = { cash: '#4b1e3e', equity: '#c9943a', split: '#7d4e40', text_forwarded: '#2563eb' };
const SOURCE_CHART_COLORS = { walkin: '#c9943a', online: '#4b1e3e' };

const getSaleSubtotal = (sale) => Number(
  sale?.subtotal ??
  (sale?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
);

const getSaleItemTotal = (item) => Number(item?.total ?? Number(item?.price || 0) * Number(item?.quantity || 0));

const downloadSaleReceipt = (sale) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;
  const plum = [75, 30, 62];
  const gold = [201, 148, 58];
  const muted = [125, 78, 64];
  const subtotal = getSaleSubtotal(sale);
  const discount = Number(sale.discount || 0);
  const tax = Number(sale.tax || 0);
  const total = Number(sale.total || 0);
  const customer = sale.customer?.name || sale.customerName || 'Walk-in customer';
  const date = new Date(sale.saleDate).toLocaleString('en-KE');
  let y = 20;

  doc.setFillColor(...plum);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('NAWIRI HAIR', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(240, 214, 232);
  doc.text('Beauty, confidence, delivered.', left, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('SALES RECEIPT', right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`#${sale.saleNumber || 'N/A'}`, right, y + 7, { align: 'right' });

  y = 56;
  doc.setTextColor(...plum);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SALE DETAILS', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(date, left, y + 7);
  doc.text(`Cashier: ${sale.cashierName || 'N/A'}`, left, y + 13);
  doc.text(`Customer: ${customer}`, right, y + 7, { align: 'right' });
  if (sale.customerPhone) doc.text(`Phone: ${sale.customerPhone}`, right, y + 13, { align: 'right' });

  y += 27;
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(left, y - 5, right - left, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text('ITEM', left + 4, y + 1);
  doc.text('QTY', right - 45, y + 1, { align: 'right' });
  doc.text('AMOUNT', right - 4, y + 1, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  (sale.items || []).forEach((item) => {
    const name = String(item.name || 'Item');
    const lines = doc.splitTextToSize(name, 95);
    doc.setTextColor(26, 15, 20);
    doc.text(lines, left + 4, y);
    doc.setTextColor(...muted);
    doc.text(String(item.quantity || 0), right - 45, y, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(getSaleItemTotal(item)), right - 4, y, { align: 'right' });
    y += Math.max(7, lines.length * 5);
    if (item.sku) {
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(`SKU: ${item.sku}`, left + 4, y - 2);
      doc.setFontSize(9);
      y += 3;
    }
    doc.setDrawColor(240, 232, 229);
    doc.line(left + 4, y, right - 4, y);
    y += 7;
  });

  y += 3;
  const summaryRows = [
    ['Subtotal', subtotal],
    ...(discount > 0 ? [['Discount', -discount]] : []),
    ['Tax', tax]
  ];
  doc.setFontSize(9);
  summaryRows.forEach(([label, value]) => {
    doc.setTextColor(...muted);
    doc.text(label, right - 65, y, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(value), right - 4, y, { align: 'right' });
    y += 7;
  });

  doc.setFillColor(...plum);
  doc.roundedRect(right - 92, y, 92, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', right - 65, y + 9, { align: 'right' });
  doc.text(DisplayPriceInShillings(total), right - 4, y + 9, { align: 'right' });
  y += 27;

  doc.setFillColor(253, 245, 228);
  doc.roundedRect(left, y - 5, right - left, 25, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...plum);
  doc.text('PAYMENT', left + 5, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(`Method: ${String(sale.paymentMethod || 'N/A').toUpperCase()}`, left + 5, y + 11);
  if (sale.change > 0) doc.text(`Change: ${DisplayPriceInShillings(sale.change)}`, right - 5, y + 11, { align: 'right' });
  y += 34;

  if (sale.note) {
    doc.setTextColor(...muted);
    doc.setFontSize(8.5);
    doc.text(`Note: ${sale.note}`, left, y);
    y += 10;
  }

  doc.setDrawColor(...gold);
  doc.line(left, y, right, y);
  doc.setTextColor(...muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Thank you for choosing Nawiri Hair.', pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Keep this receipt for your records.', pageWidth / 2, y + 15, { align: 'center' });
  doc.save(`nawiri-hair-receipt-${sale.saleNumber || 'sale'}.pdf`);
};

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
  const canResetEndOfDay = isAdmin(user);
  // Closing EOD is its own opt-in permission, separate from counter access —
  // no staff member can do it until an admin explicitly grants pos.close_eod.
  const canCloseEndOfDay = isAdmin(user) || (user?.staffPermissions || []).includes('pos.close_eod');

  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsAccessDenied, setAnalyticsAccessDenied] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('today');
  const [eodStatus, setEodStatus] = useState(null);
  const [eodLoading, setEodLoading] = useState(false);
  const [showResetEodModal, setShowResetEodModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [recentSalesView, setRecentSalesView] = useState('list'); // 'list' | 'grid'
  const [recentSalesPage, setRecentSalesPage] = useState(1);

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

  useEffect(() => {
    setRecentSalesPage(1);
  }, [selectedDate, recentSalesView]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDailySummary(),
        loadAnalytics(),
        loadRecentSales(),
        loadEodStatus()
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

  const loadEodStatus = async () => {
    try {
      const response = await Axios({
        url: `/api/pos/eod/${selectedDate}`,
        method: 'GET'
      });
      if (response.data.success) {
        setEodStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error loading end-of-day status:', error);
    }
  };

  const closeEndOfDay = async () => {
    try {
      setEodLoading(true);
      let eod = eodStatus;
      if (!eod) {
        const response = await Axios({
          url: '/api/pos/eod/close',
          method: 'POST',
          data: { date: selectedDate }
        });
        eod = response.data.data;
        setEodStatus(eod);
        toast.success(`End of day closed for ${selectedDate}`);
      } else {
        toast('This day has already been closed — downloading the existing report.', { icon: 'ℹ️' });
      }
      await downloadEndOfDayReport(eod);
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setEodLoading(false);
    }
  };

  const resetEndOfDay = async () => {
    if (!resetReason.trim()) {
      toast.error('Enter a reason for the reset.');
      return;
    }
    try {
      setEodLoading(true);
      await Axios({
        url: `/api/pos/eod/${selectedDate}/reset`,
        method: 'PUT',
        data: { reason: resetReason.trim() }
      });
      toast.success('End-of-day close reset. It can be closed again.');
      setEodStatus(null);
      setShowResetEodModal(false);
      setResetReason('');
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setEodLoading(false);
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
      // Scoped to the selected day (not just "the last 10 ever") — the
      // server already restricts non-view_all_sales staff to their own
      // sales, so this ends up being "everything I sold on this day."
      const startDate = `${selectedDate}T00:00:00.000Z`;
      const endDate = `${selectedDate}T23:59:59.999Z`;
      const response = await Axios({
        url: `/api/pos/sales?limit=500&includeItems=true&startDate=${startDate}&endDate=${endDate}`,
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
    today: 'today',
    '24h': 'last 24 hours',
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '90d': 'last 90 days'
  }[analyticsPeriod] || 'selected period';

  const sourceChartData = useMemo(() => {
    if (!dailySummary) return [];
    return [
      { key: 'walkin', name: 'Walk-in', value: dailySummary.summary.walkinSales || 0 },
      { key: 'online', name: 'Online', value: dailySummary.summary.onlineSales || 0 }
    ].filter((d) => d.value > 0);
  }, [dailySummary]);

  const paymentChartData = useMemo(() => {
    if (!dailySummary) return [];
    return [
      { key: 'cash', name: 'Cash', value: dailySummary.summary.cashSales || 0 },
      { key: 'equity', name: 'Equity', value: dailySummary.summary.equitySales || 0 },
      { key: 'split', name: 'Split', value: dailySummary.summary.splitSales || 0 },
      { key: 'text_forwarded', name: 'Text Fwd', value: dailySummary.summary.textForwardedSales || 0 }
    ].filter((d) => d.value > 0);
  }, [dailySummary]);

  const hourlyChartData = useMemo(() => {
    if (!dailySummary?.hourlyTrend) return [];
    // Trim leading/trailing all-zero hours so the chart isn't mostly empty
    // axis for a shop that only trades roughly 8am-8pm.
    const firstActive = dailySummary.hourlyTrend.findIndex((h) => h.total > 0 || h.count > 0);
    const lastActive = dailySummary.hourlyTrend.length - 1 - [...dailySummary.hourlyTrend].reverse().findIndex((h) => h.total > 0 || h.count > 0);
    if (firstActive === -1) return [];
    return dailySummary.hourlyTrend
      .slice(firstActive, lastActive + 1)
      .map((h) => ({ ...h, label: `${String(h.hour).padStart(2, '0')}:00` }));
  }, [dailySummary]);

  const totalRecentSalesPages = Math.max(1, Math.ceil(recentSales.length / RECENT_SALES_PAGE_SIZE));
  const paginatedRecentSales = useMemo(() => {
    const start = (recentSalesPage - 1) * RECENT_SALES_PAGE_SIZE;
    return recentSales.slice(start, start + RECENT_SALES_PAGE_SIZE);
  }, [recentSales, recentSalesPage]);

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
              onClick={() => navigate('/dashboard/whatsapp-order')}
              className="px-5 py-2.5 bg-green-600 text-white rounded-pill hover:bg-green-700 transition-colors flex items-center justify-center font-semibold shadow-sm"
            >
              <FaWhatsapp className="mr-2" />
              New WhatsApp Order
            </button>
            <button
              onClick={() => navigate('/dashboard/sales-counter')}
              className="px-5 py-2.5 bg-plum-700 text-white rounded-pill hover:bg-plum-800 transition-colors flex items-center justify-center font-semibold shadow-sm"
            >
              <FaShoppingCart className="mr-2" />
              Open Sales Counter
            </button>
            <button
              onClick={() => navigate('/dashboard/returns-exchanges')}
              className="px-5 py-2.5 bg-white text-plum-700 border border-plum-200 rounded-pill hover:bg-plum-50 transition-colors flex items-center justify-center font-semibold shadow-sm dark:bg-dm-card dark:border-dm-border dark:text-plum-300 dark:hover:bg-dm-card-2"
            >
              <FaUndo className="mr-2" />
              Returns & Exchanges
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-brown-200 bg-ivory px-3 py-2 dark:border-dm-border dark:bg-dm-card-2">
                <FaCalendarAlt className="text-brown-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-charcoal outline-none dark:text-white"
                />
              </div>
              {canCloseEndOfDay ? (
                <button
                  type="button"
                  onClick={closeEndOfDay}
                  disabled={eodLoading}
                  className="flex items-center gap-2 rounded-xl bg-plum-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-plum-800 disabled:opacity-60"
                >
                  <FaFileInvoiceDollar />
                  {eodLoading ? 'Working…' : eodStatus ? 'Download EOD report' : 'Close & download EOD'}
                </button>
              ) : (
                <span
                  title="Ask an admin to grant the 'Close and download end-of-day reports' permission"
                  className="flex items-center gap-2 rounded-xl bg-brown-100 px-3 py-2 text-sm font-medium text-brown-400 dark:bg-dm-card-2 dark:text-white/40"
                >
                  <FaFileInvoiceDollar />
                  Admin only
                </span>
              )}
              {eodStatus && canResetEndOfDay && (
                <button
                  type="button"
                  onClick={() => setShowResetEodModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                >
                  <FaUndo /> Reset EOD
                </button>
              )}
            </div>
          </div>
          {eodStatus && (
            <p className="mb-4 text-xs text-brown-500 dark:text-white/45">
              {selectedDate} was already closed by {eodStatus.closedByName || eodStatus.closedBy?.name || 'a staff member'}.
            </p>
          )}

          {dailySummary ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300 sm:mb-3 sm:h-11 sm:w-11">
                  <FaMoneyBillWave size={16} />
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
              {['today', '24h', '7d', '30d', '90d'].map(period => (
                <button
                  key={period}
                  onClick={() => setAnalyticsPeriod(period)}
                  className={`px-3 py-1.5 rounded-pill text-sm font-semibold transition-all ${
                    analyticsPeriod === period
                      ? 'bg-plum-700 text-white shadow-sm'
                      : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white/55 hover:bg-brown-200 dark:hover:bg-dm-border'
                  }`}
                >
                  {period === 'today' ? 'Today' :
                   period === '24h' ? '24 Hours' :
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Cash</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.cashSales)}
                </p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Equity</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.equitySales)}
                </p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Split</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.splitSales)}
                </p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">Text Fwd</p>
                <p className="mt-1 text-base font-black text-charcoal dark:text-white sm:mt-2 sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.textForwardedSales)}
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

      {dailySummary && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">
                Walk-in vs Online
              </h3>
              <span className="text-xs text-brown-500 dark:text-white/45">{selectedDate}</span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">
                  <FaStore size={11} style={{ color: SOURCE_CHART_COLORS.walkin }} /> Walk-in
                </div>
                <p className="text-base font-black text-charcoal dark:text-white sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.walkinSales)}
                </p>
                <p className="text-xs text-brown-400 dark:text-white/40">{dailySummary.summary.walkinCount || 0} sale{dailySummary.summary.walkinCount === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-ivory p-3 dark:border-dm-border dark:bg-dm-card-2 sm:p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40 sm:text-xs">
                  <FaTruck size={11} style={{ color: SOURCE_CHART_COLORS.online }} /> Online
                </div>
                <p className="text-base font-black text-charcoal dark:text-white sm:text-lg">
                  {DisplayPriceInShillings(dailySummary.summary.onlineSales)}
                </p>
                <p className="text-xs text-brown-400 dark:text-white/40">{dailySummary.summary.onlineCount || 0} sale{dailySummary.summary.onlineCount === 1 ? '' : 's'}</p>
              </div>
            </div>
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sourceChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {sourceChartData.map((d) => (
                      <Cell key={d.key} fill={SOURCE_CHART_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No sales yet to chart.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">
                Payment Method Split
              </h3>
              <span className="text-xs text-brown-500 dark:text-white/45">{selectedDate}</span>
            </div>
            {paymentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={252}>
                <PieChart>
                  <Pie data={paymentChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {paymentChartData.map((d) => (
                      <Cell key={d.key} fill={PAYMENT_CHART_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No sales yet to chart.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-dm-card sm:p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-charcoal dark:text-white">
                Hourly Sales Trend
              </h3>
              <span className="text-xs text-brown-500 dark:text-white/45">{selectedDate}</span>
            </div>
            {hourlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                  <Bar dataKey="total" name="Sales" fill="#4b1e3e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No sales yet to chart.</p>
            )}
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
      <div className="bg-white dark:bg-dm-card rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal dark:text-white tracking-tight">
              Recent Sales
            </h3>
            <span className="text-xs text-brown-500 dark:text-white/45">
              {recentSales.length} sale{recentSales.length === 1 ? '' : 's'} on {selectedDate}
            </span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setRecentSalesView('list')}
              className={`p-2 rounded-md ${recentSalesView === 'list' ? 'bg-plum-700 text-white' : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white'}`}
              aria-label="List view"
            >
              <FaThList />
            </button>
            <button
              onClick={() => setRecentSalesView('grid')}
              className={`p-2 rounded-md ${recentSalesView === 'grid' ? 'bg-plum-700 text-white' : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white'}`}
              aria-label="Grid view"
            >
              <FaThLarge />
            </button>
          </div>
        </div>

        {paginatedRecentSales.length === 0 ? (
          <div className="text-center py-8 text-brown-400 dark:text-white/40">
            No sales found
          </div>
        ) : recentSalesView === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedRecentSales.map((sale) => (
              <div key={sale._id} className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        title={sale.saleSource === 'online' ? 'Online' : 'Walk-in'}
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          sale.saleSource === 'online'
                            ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                            : 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300'
                        }`}
                      >
                        {sale.saleSource === 'online' ? 'O' : 'W'}
                      </span>
                      <div className="text-base font-semibold text-charcoal dark:text-white">
                        #{sale.saleNumber}
                      </div>
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
                    sale.paymentMethod === 'equity' ? 'bg-gold-100 text-gold-600 dark:bg-gold-900/20 dark:text-gold-300' :
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
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {paginatedRecentSales.map((sale) => (
                <div key={sale._id} className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          title={sale.saleSource === 'online' ? 'Online' : 'Walk-in'}
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            sale.saleSource === 'online'
                              ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                              : 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300'
                          }`}
                        >
                          {sale.saleSource === 'online' ? 'O' : 'W'}
                        </span>
                        <div className="text-base font-semibold text-charcoal dark:text-white">
                          #{sale.saleNumber}
                        </div>
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
                      sale.paymentMethod === 'equity' ? 'bg-gold-100 text-gold-600 dark:bg-gold-900/20 dark:text-gold-300' :
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
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                <thead className="bg-ivory dark:bg-dm-card-2">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                      Sale #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                      Source
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
                  {paginatedRecentSales.map(sale => (
                    <tr key={sale._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal dark:text-white">
                        #{sale.saleNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                            sale.saleSource === 'online'
                              ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                              : 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300'
                          }`}
                        >
                          {sale.saleSource === 'online' ? 'O' : 'W'}
                        </span>
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
                          sale.paymentMethod === 'equity' ? 'bg-gold-100 text-gold-800 dark:bg-gold-900/25 dark:text-gold-300' :
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
            </div>
          </>
        )}

        {recentSales.length > RECENT_SALES_PAGE_SIZE && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={recentSalesPage}
              totalPages={totalRecentSalesPages}
              onPageChange={setRecentSalesPage}
            />
          </div>
        )}
      </div>

      {/* Reset End-of-Day Modal (admin only) */}
      {showResetEodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowResetEodModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-eod-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 id="reset-eod-title" className="text-lg font-bold text-charcoal dark:text-white">
              Reset end-of-day for {selectedDate}?
            </h4>
            <p className="mt-2 text-sm text-brown-500 dark:text-white/50">
              This allows the day to be closed again. The original close stays on record for audit purposes.
            </p>
            <label className="mt-4 block text-sm font-medium text-charcoal dark:text-white">
              Reason for reset
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                rows={3}
                placeholder="e.g. Closed before the last two sales were entered"
                className="mt-1 w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowResetEodModal(false); setResetReason(''); }}
                className="rounded-lg border border-brown-200 px-4 py-2 text-sm font-semibold text-brown-700 hover:bg-brown-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetEndOfDay}
                disabled={eodLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {eodLoading ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between bg-plum-700 px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-gold-300">
                  <FaReceipt size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-plum-100">Nawiri Hair</p>
                  <h4 id="receipt-title" className="mt-1 text-xl font-bold tracking-tight">Sales receipt</h4>
                  <p className="mt-1 text-xs text-plum-100">#{selectedSale.saleNumber || 'N/A'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-full p-2 text-plum-100 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close receipt"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-3 rounded-xl border border-brown-100 bg-ivory p-4 dark:border-dm-border dark:bg-dm-card-2 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <FaCalendarAlt className="mt-0.5 text-gold-600" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Date and time</p>
                    <p className="mt-1 text-sm font-medium text-charcoal dark:text-white">{new Date(selectedSale.saleDate).toLocaleString('en-KE')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FaUser className="mt-0.5 text-gold-600" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Customer</p>
                    <p className="mt-1 text-sm font-medium text-charcoal dark:text-white">{selectedSale.customer?.name || selectedSale.customerName || 'Walk-in customer'}</p>
                    {selectedSale.customerPhone && <p className="mt-0.5 text-xs text-brown-500 dark:text-white/45">{selectedSale.customerPhone}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <FaCreditCard className="mt-0.5 text-gold-600" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Cashier and payment</p>
                    <p className="mt-1 text-sm font-medium capitalize text-charcoal dark:text-white">
                      {selectedSale.cashierName || 'N/A'} · {selectedSale.paymentMethod || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="text-sm font-bold uppercase tracking-wide text-charcoal dark:text-white">Items purchased</h5>
                  <span className="text-xs text-brown-400 dark:text-white/40">{(selectedSale.items || []).length} line items</span>
                </div>
                <div className="divide-y divide-brown-100 overflow-hidden rounded-xl border border-brown-100 dark:divide-dm-border dark:border-dm-border">
                  {(selectedSale.items || []).map((item, index) => (
                    <div key={`${item.sku || item.name || 'item'}-${index}`} className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal dark:text-white">{item.name || 'Item'}</p>
                        <p className="mt-1 text-xs text-brown-500 dark:text-white/45">
                          {item.quantity || 0} × {DisplayPriceInShillings(item.price || 0)}
                        </p>
                        {item.sku && <p className="mt-1 text-[11px] text-brown-400 dark:text-white/35">SKU: {item.sku}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-charcoal dark:text-white">{DisplayPriceInShillings(getSaleItemTotal(item))}</p>
                    </div>
                  ))}
                  {(selectedSale.items || []).length === 0 && (
                    <p className="p-5 text-center text-sm text-brown-400 dark:text-white/40">No item details available.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
                <div className="rounded-xl bg-gold-100 p-4 dark:bg-gold-900/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-plum-800 dark:text-gold-200">
                    <FaMoneyBillWave /> Payment received in Kenyan shillings
                  </div>
                  {selectedSale.paymentMethod === 'split' && Array.isArray(selectedSale.payments) && (
                    <div className="mt-3 space-y-1 text-xs text-brown-600 dark:text-white/55">
                      {selectedSale.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between gap-3">
                          <span className="capitalize">{payment.method === 'equity' ? 'Equity' : payment.method}</span>
                          <span>{DisplayPriceInShillings(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedSale.change > 0 && (
                    <div className="mt-3 flex justify-between border-t border-gold-200 pt-2 text-xs font-semibold text-green-700 dark:border-gold-700/40 dark:text-green-300">
                      <span>Change</span>
                      <span>{DisplayPriceInShillings(selectedSale.change)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-brown-500 dark:text-white/45">
                    <span>Subtotal</span>
                    <span>{DisplayPriceInShillings(getSaleSubtotal(selectedSale))}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-plum-600 dark:text-plum-300">
                      <span>Discount</span>
                      <span>-{DisplayPriceInShillings(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-brown-500 dark:text-white/45">
                    <span>Tax</span>
                    <span>{DisplayPriceInShillings(selectedSale.tax || 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-brown-200 pt-3 dark:border-dm-border">
                    <span className="font-bold text-charcoal dark:text-white">Total</span>
                    <span className="text-lg font-black text-plum-700 dark:text-gold-300">{DisplayPriceInShillings(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

              {selectedSale.note && (
                <div className="mt-5 rounded-xl border border-brown-100 bg-brown-50 p-3 text-xs italic text-brown-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/45">
                  Note: {selectedSale.note}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-brown-100 bg-ivory px-5 py-4 dark:border-dm-border dark:bg-dm-card-2 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-brown-200 px-4 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-white dark:border-dm-border dark:text-white dark:hover:bg-dm-card"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    downloadSaleReceipt(selectedSale);
                    toast.success('Receipt downloaded as PDF.');
                  } catch (error) {
                    console.error('Receipt download failed:', error);
                    toast.error('Unable to download receipt.');
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-plum-800"
              >
                <FaDownload /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSDashboard;
