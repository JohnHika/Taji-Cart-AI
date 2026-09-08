import { useCallback, useEffect, useState } from 'react';
import { FaArrowLeft, FaBrain, FaBoxes, FaExclamationTriangle, FaRoute, FaShoppingBag, FaSync } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const toneFor = (level) => ({
  urgent: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
  attention: 'border-gold-200 bg-gold-50 text-brown-800 dark:border-gold-700/50 dark:bg-gold-900/20 dark:text-gold-100',
  good: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200',
}[level] || 'border-brown-200 bg-white text-charcoal dark:border-dm-border dark:bg-dm-card dark:text-white');

const AdminAiInsights = () => {
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBrief = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Axios({ method: 'GET', url: '/api/admin/ai/brief' });
      setBrief(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load admin AI brief:', error);
      toast.error(error.response?.data?.message || 'Could not load the operations brief.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBrief(); }, [loadBrief]);

  const metrics = brief?.metrics || {};
  const trend = metrics.revenueChangePercent;
  const metricCards = [
    { icon: FaShoppingBag, label: '7-day revenue', value: formatKes(metrics.revenue), hint: trend === null ? 'No comparison period yet' : `${trend >= 0 ? '+' : ''}${trend}% vs previous 7 days` },
    { icon: FaShoppingBag, label: 'Orders', value: metrics.orderCount || 0, hint: `${metrics.openOrderCount || 0} still open` },
    { icon: FaBoxes, label: 'Stock at risk', value: metrics.lowStockCount || 0, hint: 'At or below 3 units' },
    { icon: FaRoute, label: 'Active deliveries', value: metrics.activeDeliveryCount || 0, hint: `${metrics.availableDriverCount || 0} verified drivers available` },
  ];

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate('/dashboard/admin-control-center')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brown-200 text-brown-700 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2" aria-label="Back to Admin Control Center">
            <FaArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FaBrain className="text-plum-700 dark:text-plum-300" />
              <h1 className="truncate text-base font-bold text-charcoal dark:text-white">Admin Operations Copilot</h1>
            </div>
            <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">Read-only business brief. You approve every business action.</p>
          </div>
          <button type="button" onClick={loadBrief} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-3 py-2 text-sm font-semibold text-white hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60">
            <FaSync className={loading ? 'animate-spin' : ''} size={13} /> Refresh
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {loading && !brief ? (
          <div className="rounded-2xl border border-brown-100 bg-white p-10 text-center text-sm text-brown-500 dark:border-dm-border dark:bg-dm-card dark:text-white/60">Preparing your operational brief…</div>
        ) : !brief ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">The brief could not be loaded. Refresh to try again.</div>
        ) : <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return <div key={metric.label} className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">{metric.label}</p><Icon className="text-plum-600 dark:text-plum-300" size={16} /></div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-charcoal dark:text-white">{metric.value}</p><p className="mt-1 text-xs text-brown-500 dark:text-white/50">{metric.hint}</p>
              </div>;
            })}
          </section>

          <section className="rounded-2xl border border-plum-100 bg-white p-5 shadow-sm dark:border-plum-900/50 dark:bg-dm-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300"><FaBrain /></div>
              <div>
                <h2 className="font-bold text-charcoal dark:text-white">AI owner brief</h2>
                {brief.narrative?.available ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brown-600 dark:text-white/65">{brief.narrative.text}</p> : <p className="mt-2 text-sm leading-6 text-brown-500 dark:text-white/55">Live metrics are ready. {brief.narrative?.reason}</p>}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><FaExclamationTriangle className="text-gold-600" /><h2 className="font-bold text-charcoal dark:text-white">Recommended reviews</h2></div>
            <div className="space-y-3">
              {brief.actions?.map((action, index) => <Link key={`${action.title}-${index}`} to={action.href} className={`block rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${toneFor(action.level)}`}>
                <p className="text-sm font-bold">{action.title}</p><p className="mt-1 text-sm opacity-80">{action.detail}</p><p className="mt-3 text-xs font-semibold underline">Review now</p>
              </Link>)}
            </div>
          </section>

          {brief.lowStockProducts?.length > 0 && <section className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
            <h2 className="font-bold text-charcoal dark:text-white">Low-stock products</h2>
            <div className="mt-3 divide-y divide-brown-100 dark:divide-dm-border">{brief.lowStockProducts.map((product) => <div key={product.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-semibold text-charcoal dark:text-white">{product.name}</p><p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">{product.sku || 'No SKU'}</p></div><span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">{product.stock} left</span></div>)}</div>
          </section>}
        </>}
      </main>
    </div>
  );
};

export default AdminAiInsights;
