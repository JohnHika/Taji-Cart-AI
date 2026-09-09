import React, { useEffect, useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCalendarWeek, FaChartLine, FaDownload, FaExclamationTriangle, FaMoneyBillWave } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../../utils/DisplayPriceInShillings';
import { downloadRangeReport } from '../../utils/rangeReportPdf';
import isAdmin from '../../utils/isAdmin';

const PAYMENT_CHART_COLORS = { cash: '#4b1e3e', equity: '#c9943a', split: '#7d4e40', text_forwarded: '#2563eb' };
const SOURCE_CHART_COLORS = { walkin: '#c9943a', online: '#4b1e3e' };
const ymd = (date) => format(date, 'yyyy-MM-dd');

const EodReports = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [scope, setScope] = useState('week'); // 'week' | 'month'
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week...
  const [monthOffset, setMonthOffset] = useState(0);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin(user)) {
      toast.error('Weekly/monthly reports are admin-only.');
      navigate('/dashboard/pos-dashboard');
    }
  }, [user, navigate]);

  const range = useMemo(() => {
    const now = new Date();
    if (scope === 'week') {
      // weekOffset is 0 (this week) or negative (N weeks back)
      const anchor = weekOffset === 0 ? now : subWeeks(now, -weekOffset);
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      return { startDate: ymd(start), endDate: ymd(end), label: `Week of ${format(start, 'PPP')}` };
    }
    const anchor = monthOffset === 0 ? now : subMonths(now, -monthOffset);
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return { startDate: ymd(start), endDate: ymd(end), label: format(start, 'LLLL yyyy') };
  }, [scope, weekOffset, monthOffset]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await Axios({
        url: '/api/pos/eod/range-summary',
        method: 'GET',
        params: { startDate: range.startDate, endDate: range.endDate },
      });
      if (res.data.success) setReport(res.data.data);
    } catch (err) {
      AxiosToastError(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate]);

  const sourceChartData = useMemo(() => {
    if (!report) return [];
    return [
      { key: 'walkin', name: 'Walk-in', value: report.totals.walkinSales || 0 },
      { key: 'online', name: 'Online', value: report.totals.onlineSales || 0 },
    ].filter((d) => d.value > 0);
  }, [report]);

  const paymentChartData = useMemo(() => {
    if (!report) return [];
    return [
      { key: 'cash', name: 'Cash', value: report.paymentTotalsByMethod.cash || 0 },
      { key: 'equity', name: 'Equity', value: report.paymentTotalsByMethod.equity || 0 },
      { key: 'split', name: 'Split', value: report.paymentTotalsByMethod.split || 0 },
      { key: 'text_forwarded', name: 'Text Fwd', value: report.paymentTotalsByMethod.text_forwarded || 0 },
    ].filter((d) => d.value > 0);
  }, [report]);

  const trendChartData = useMemo(() => {
    if (!report?.dailyTrend) return [];
    return report.dailyTrend.map((d) => ({ ...d, label: format(new Date(`${d.date}T00:00:00`), scope === 'week' ? 'EEE' : 'd MMM') }));
  }, [report, scope]);

  const handleDownload = () => {
    if (!report) return;
    downloadRangeReport(report, { label: scope === 'week' ? 'Weekly' : 'Monthly' });
  };

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
              <FaChartLine size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Weekly &amp; Monthly Reports</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">Rolled up from closed daily EOD reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4 space-y-5">
        <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[{ key: 'week', label: 'Weekly' }, { key: 'month', label: 'Monthly' }].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setScope(opt.key); setWeekOffset(0); setMonthOffset(0); }}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                    scope === opt.key ? 'bg-plum-700 text-white shadow-sm' : 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/55'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scope === 'week' ? setWeekOffset((p) => p - 1) : setMonthOffset((p) => p - 1)}
                className="rounded-lg border border-brown-200 px-3 py-2 text-sm font-semibold text-brown-600 hover:bg-brown-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
              >
                ← Previous
              </button>
              <span className="text-sm font-semibold text-charcoal dark:text-white">{range.label}</span>
              <button
                onClick={() => scope === 'week' ? setWeekOffset((p) => Math.min(0, p + 1)) : setMonthOffset((p) => Math.min(0, p + 1))}
                disabled={scope === 'week' ? weekOffset === 0 : monthOffset === 0}
                className="rounded-lg border border-brown-200 px-3 py-2 text-sm font-semibold text-brown-600 hover:bg-brown-50 disabled:opacity-40 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
              >
                Next →
              </button>
            </div>
            <button
              onClick={handleDownload}
              disabled={!report}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-600 disabled:opacity-50"
            >
              <FaDownload size={12} /> Download PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !report ? (
          <div className="rounded-2xl border border-brown-100 bg-white p-10 text-center text-brown-400 dark:border-dm-border dark:bg-dm-card dark:text-white/40">
            No data available for this period.
          </div>
        ) : (
          <>
            {report.missingDates.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-gold-300 bg-gold-50 p-3 text-sm text-gold-800 dark:border-gold-900/40 dark:bg-gold-900/10 dark:text-gold-200">
                <FaExclamationTriangle className="mt-0.5 shrink-0" size={14} />
                <span>
                  {report.daysClosed} of {report.daysInRange} days closed. Not yet closed (excluded from totals): {report.missingDates.join(', ')}.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                  <FaMoneyBillWave size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Sales</p>
                <p className="mt-1 text-lg font-black tracking-tight">{DisplayPriceInShillings(report.totals.totalSales)}</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
                  <FaCalendarWeek size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Transactions</p>
                <p className="mt-1 text-lg font-black tracking-tight">{report.totals.transactionCount}</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Walk-in</p>
                <p className="mt-1 text-lg font-black tracking-tight">{DisplayPriceInShillings(report.totals.walkinSales)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">{report.totals.walkinCount} sales</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Online</p>
                <p className="mt-1 text-lg font-black tracking-tight">{DisplayPriceInShillings(report.totals.onlineSales)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">{report.totals.onlineCount} sales</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Product Sales</p>
                <p className="mt-1 text-lg font-black tracking-tight">{DisplayPriceInShillings(report.totals.productRevenue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Shop revenue, delivery excluded</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-brown-100 bg-white p-3 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Delivery Charges</p>
                <p className="mt-1 text-lg font-black tracking-tight">{DisplayPriceInShillings(report.totals.deliveryRevenue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Collected on behalf of contracted riders</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
              <h3 className="mb-4 text-base font-bold tracking-tight">Daily Trend</h3>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="walkinSales" name="Walk-in" stroke={SOURCE_CHART_COLORS.walkin} strokeWidth={2} />
                    <Line type="monotone" dataKey="onlineSales" name="Online" stroke={SOURCE_CHART_COLORS.online} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No closed days in this period yet.</p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <h3 className="mb-4 text-base font-bold tracking-tight">Walk-in vs Online</h3>
                {sourceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sourceChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {sourceChartData.map((d) => <Cell key={d.key} fill={SOURCE_CHART_COLORS[d.key]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No data yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <h3 className="mb-4 text-base font-bold tracking-tight">Payment Method Split</h3>
                {paymentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {paymentChartData.map((d) => <Cell key={d.key} fill={PAYMENT_CHART_COLORS[d.key]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => DisplayPriceInShillings(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No data yet.</p>
                )}
              </div>
            </div>

            {report.cashierBreakdown.length > 0 && (
              <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <h3 className="mb-4 text-base font-bold tracking-tight">Sales by Cashier</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Cashier</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Sales</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
                      {report.cashierBreakdown.map((row) => (
                        <tr key={row.cashierName}>
                          <td className="px-3 py-2 text-sm text-charcoal dark:text-white">{row.cashierName || 'Unknown'}</td>
                          <td className="px-3 py-2 text-right text-sm text-brown-500 dark:text-white/55">{row.saleCount}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-charcoal dark:text-white">{DisplayPriceInShillings(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EodReports;
