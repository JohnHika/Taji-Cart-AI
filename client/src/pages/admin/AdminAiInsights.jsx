import { useCallback, useEffect, useState } from 'react';
import {
  FaArrowLeft, FaArrowDown, FaArrowUp, FaBoxes, FaBrain, FaChartLine,
  FaCheck, FaClipboardList, FaExclamationTriangle, FaGlobeAfrica,
  FaRoute, FaSearch, FaShoppingBag, FaStore, FaSync,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import AiMarkdown from '../../components/AiMarkdown';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const scopes = [
  { id: 'counter', label: 'Sales counter', hint: 'Walk-in & cashier sales', icon: FaStore },
  { id: 'online', label: 'Online orders', hint: 'Website & order flow', icon: FaShoppingBag },
  { id: 'inventory', label: 'Inventory', hint: 'Low and negative stock', icon: FaBoxes },
  { id: 'delivery', label: 'Delivery', hint: 'Open dispatch & riders', icon: FaRoute },
];

const ranges = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

const quickQuestions = [
  'What happened today across counter and online sales?',
  'Which products should I restock first, and why?',
  'Where is revenue coming from and what should I investigate next?',
  'Compare the selected period with the previous one in plain language.',
];

const toneFor = (level) => ({
  urgent: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
  attention: 'border-gold-200 bg-gold-50 text-brown-800 dark:border-gold-700/50 dark:bg-gold-900/20 dark:text-gold-100',
  good: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200',
}[level] || 'border-brown-200 bg-white text-charcoal dark:border-dm-border dark:bg-dm-card dark:text-white');

const sectionShell = 'rounded-3xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card';
const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-brown-400 dark:text-white/40';
const skeletonBlock = 'rounded-full bg-brown-100 dark:bg-dm-card-2';

const MetricSkeleton = () => (
  <div className={`${sectionShell} animate-pulse p-4`}>
    <div className="flex items-center justify-between gap-3">
      <div className={`${skeletonBlock} h-2.5 w-16`} />
      <div className={`${skeletonBlock} h-4 w-4`} />
    </div>
    <div className={`${skeletonBlock} mt-3 h-6 w-20 rounded-lg`} />
    <div className={`${skeletonBlock} mt-2 h-2.5 w-24`} />
  </div>
);

const AdminAiInsights = () => {
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [range, setRange] = useState('today');
  const [sources, setSources] = useState(scopes.map((scope) => scope.id));
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [answer, setAnswer] = useState(null);
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadBrief = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await Axios({
        method: 'GET',
        url: '/api/admin/ai/brief',
        params: { range, sources: sources.join(',') },
      });
      setBrief(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load admin AI brief:', error);
      const message = error.response?.status === 401 || error.response?.status === 403
        ? 'Your admin session has expired. Sign in again to load the operations copilot.'
        : (error.response?.data?.message || 'Could not load the operations copilot.');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [range, sources]);

  useEffect(() => { loadBrief(); }, [loadBrief]);

  const toggleSource = (source) => {
    setSources((current) => current.includes(source)
      ? (current.length === 1 ? current : current.filter((item) => item !== source))
      : [...current, source]);
  };

  const askCopilot = async (event) => {
    event.preventDefault();
    if (question.trim().length < 3) {
      toast.error('Type a business question first.');
      return;
    }
    setAsking(true);
    try {
      const response = await Axios({
        method: 'POST',
        url: '/api/admin/ai/ask',
        data: { question: question.trim(), range, sources, webSearch },
      });
      const data = response.data?.data;
      setAnswer(data?.answer || null);
      if (data?.brief) setBrief((current) => ({ ...data.brief, narrative: current?.narrative }));
    } catch (error) {
      console.error('Failed to ask admin AI:', error);
      toast.error(error.response?.data?.message || 'Could not answer that question right now.');
    } finally {
      setAsking(false);
    }
  };

  const metrics = brief?.metrics || {};
  const trend = metrics.revenueChangePercent;
  const metricCards = [
    {
      icon: FaChartLine,
      label: 'Combined revenue',
      value: formatKes(metrics.revenue),
      hint: trend === null
        ? `${brief?.period || 'Selected period'} · no prior comparison`
        : `${trend >= 0 ? '+' : ''}${trend}% vs previous period`,
      trend,
    },
    {
      icon: FaStore,
      label: 'Counter sales',
      value: formatKes(metrics.counterRevenue),
      hint: `${metrics.counterSaleCount || 0} transactions · ${metrics.counterItemsSold || 0} items`,
      active: sources.includes('counter'),
    },
    {
      icon: FaShoppingBag,
      label: 'Online sales',
      value: formatKes(metrics.onlineRevenue),
      hint: `${metrics.onlineOrderCount || 0} orders · ${metrics.openOrderCount || 0} open`,
      active: sources.includes('online'),
    },
    {
      icon: FaBoxes,
      label: 'Stock at risk',
      value: metrics.lowStockCount ?? 0,
      hint: sources.includes('inventory') ? 'Products at or below threshold' : 'Inventory source not selected',
      active: sources.includes('inventory'),
    },
    {
      icon: FaClipboardList,
      label: 'Active deliveries',
      value: metrics.activeDeliveryCount ?? 0,
      hint: metrics.availableDriverCount === null
        ? 'Delivery source not selected'
        : `${metrics.availableDriverCount || 0} verified drivers available`,
      active: sources.includes('delivery'),
    },
  ];

  const generatedAt = brief?.generatedAt
    ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(brief.generatedAt))
    : '';

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
      <header className="sticky top-0 z-30 border-b border-brown-100 bg-white/95 backdrop-blur dark:border-dm-border dark:bg-dm-card/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to dashboard"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FaBrain className="shrink-0 text-plum-700 dark:text-plum-300" />
              <h1 className="truncate text-base font-bold text-charcoal dark:text-white">Nawiri Operations Copilot</h1>
              <span className="rounded-full bg-brown-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brown-500 dark:bg-dm-card-2 dark:text-white/50">
                Read-only
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-brown-500 dark:text-white/50">
              {brief
                ? `${brief.period || 'Selected period'} · Updated ${generatedAt || 'just now'}`
                : 'Counter-first, owner-controlled data — nothing is written back.'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadBrief}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-plum-200 bg-white px-3 py-2 text-sm font-semibold text-plum-700 hover:bg-plum-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-plum-800 dark:bg-dm-card dark:text-plum-200"
          >
            <FaSync className={loading ? 'animate-spin' : ''} size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-5 sm:p-6">
        <section className={`${sectionShell} p-3 sm:p-4`} title="The copilot only sees the sources you select.">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>Analysis scope</span>
            <span className="rounded-full bg-plum-50 px-2.5 py-1 text-[11px] font-semibold text-plum-700 dark:bg-plum-900/30 dark:text-plum-200">
              {sources.length} of {scopes.length} sources
            </span>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-[auto_1fr]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Time range</p>
              <div className="flex flex-wrap gap-2">
                {ranges.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRange(item.id)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      range === item.id
                        ? 'bg-plum-700 text-white shadow-sm'
                        : 'bg-ivory text-brown-600 hover:bg-plum-50 dark:bg-dm-card-2 dark:text-white/70'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">Include business data</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {scopes.map((scope) => {
                  const Icon = scope.icon;
                  const selected = sources.includes(scope.id);
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => toggleSource(scope.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                        selected
                          ? 'border-plum-300 bg-plum-50 text-plum-800 dark:border-plum-700 dark:bg-plum-900/20 dark:text-plum-100'
                          : 'border-brown-100 text-brown-500 hover:bg-ivory dark:border-dm-border dark:text-white/50 dark:hover:bg-dm-card-2'
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${selected ? 'bg-plum-700 text-white' : 'bg-brown-100 text-brown-500 dark:bg-dm-card-2'}`}>
                        {selected ? <FaCheck size={11} /> : <Icon size={12} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold">{scope.label}</span>
                        <span className="block truncate text-[11px] opacity-70">{scope.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {loading && !brief ? (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => <MetricSkeleton key={index} />)}
            </section>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div className={`${sectionShell} animate-pulse p-5`}>
                <div className={`${skeletonBlock} h-2.5 w-32`} />
                <div className="mt-4 space-y-2">
                  <div className={`${skeletonBlock} h-3 w-full`} />
                  <div className={`${skeletonBlock} h-3 w-5/6`} />
                  <div className={`${skeletonBlock} h-3 w-2/3`} />
                </div>
              </div>
              <div className={`${sectionShell} animate-pulse p-5`}>
                <div className={`${skeletonBlock} h-2.5 w-24`} />
                <div className="mt-4 space-y-2">
                  <div className={`${skeletonBlock} h-12 rounded-2xl`} />
                  <div className={`${skeletonBlock} h-12 rounded-2xl`} />
                </div>
              </div>
            </section>
          </>
        ) : !brief ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <p>{loadError || 'The operations copilot could not be loaded. Refresh to try again.'}</p>
            {loadError?.includes('session') && (
              <Link to="/login" className="mt-3 inline-block font-semibold underline">Sign in again</Link>
            )}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {metricCards.map((metric) => {
                const Icon = metric.icon;
                const TrendIcon = metric.trend >= 0 ? FaArrowUp : FaArrowDown;
                return (
                  <div key={metric.label} className={`${sectionShell} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`${labelClass} min-w-0`}>{metric.label}</p>
                      <Icon className={`shrink-0 ${metric.active === false ? 'text-brown-200 dark:text-white/25' : 'text-plum-600 dark:text-plum-300'}`} size={15} />
                    </div>
                    <p className="mt-2 text-xl font-black tracking-tight text-charcoal dark:text-white sm:text-2xl">{metric.value}</p>
                    {metric.trend !== undefined && metric.trend !== null ? (
                      <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${metric.trend >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        <TrendIcon size={11} /> {metric.hint}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-brown-500 dark:text-white/50">{metric.hint}</p>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div className={`${sectionShell} border-plum-100 p-5 dark:border-plum-900/50`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                    <FaBrain />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-plum-600 dark:text-plum-300">Automatic pulse</p>
                    <h2 className="mt-0.5 font-bold text-charcoal dark:text-white">What the selected data says</h2>
                  </div>
                </div>
                {brief.narrative?.available ? (
                  <AiMarkdown className="mt-4" text={brief.narrative.text} />
                ) : (
                  <p className="mt-4 text-sm leading-6 text-brown-700 dark:text-white/70">
                    {`Live data is ready. ${brief.narrative?.reason || 'Ask a question above for an owner-focused analysis.'}`}
                  </p>
                )}
              </div>

              <div className={`${sectionShell} p-5`}>
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="text-gold-600" />
                  <h2 className="font-bold text-charcoal dark:text-white">Review queue</h2>
                </div>
                {brief.actions?.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {brief.actions.map((action, index) => (
                      <Link
                        key={`${action.title}-${index}`}
                        to={action.href}
                        className={`block rounded-2xl border p-3 transition-transform hover:-translate-y-0.5 ${toneFor(action.level)}`}
                      >
                        <p className="text-sm font-bold">{action.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">{action.detail}</p>
                        <p className="mt-2 text-xs font-semibold underline">Open review</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-brown-200 p-3 text-xs text-brown-500 dark:border-dm-border dark:text-white/50">
                    <FaCheck className="shrink-0 text-green-600 dark:text-green-400" size={12} />
                    Nothing needs review right now — the shop is running clean.
                  </div>
                )}
              </div>
            </section>

            {(brief.counterTopProducts?.length > 0 || brief.lowStockProducts?.length > 0) && (
              <section className="grid gap-5 lg:grid-cols-2">
                {brief.counterTopProducts?.length > 0 && (
                  <div className={`${sectionShell} p-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-charcoal dark:text-white">Counter best movers</h2>
                        <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">From valid, non-voided counter transactions.</p>
                      </div>
                      <Link to="/dashboard/sales-hub" className="text-xs font-bold text-plum-700 underline dark:text-plum-300">Sales Hub</Link>
                    </div>
                    <div className="mt-3 divide-y divide-brown-100 dark:divide-dm-border">
                      {brief.counterTopProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-charcoal dark:text-white">{index + 1}. {product.name}</p>
                            <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">{product.quantity} units · {product.sku || 'No SKU'}</p>
                          </div>
                          <p className="shrink-0 font-bold text-plum-700 dark:text-plum-300">{formatKes(product.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {brief.lowStockProducts?.length > 0 && (
                  <div className={`${sectionShell} p-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-charcoal dark:text-white">Stock needing review</h2>
                        <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">Shown only because Inventory is selected.</p>
                      </div>
                      <Link to="/dashboard/catalog-quality" className="text-xs font-bold text-plum-700 underline dark:text-plum-300">Catalog quality</Link>
                    </div>
                    <div className="mt-3 divide-y divide-brown-100 dark:divide-dm-border">
                      {brief.lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-charcoal dark:text-white">{product.name}</p>
                            <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">{product.sku || 'No SKU'}</p>
                          </div>
                          <span className="shrink-0 rounded-pill bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            {product.stock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <section className={`${sectionShell} border-plum-100 p-4 dark:border-plum-900/50 sm:p-5`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
              <FaSearch />
            </div>
            <div>
              <h2 className="font-bold text-charcoal dark:text-white">Ask the copilot</h2>
              <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                Ask about the selected business data, or opt into outside market research.
              </p>
            </div>
          </div>

          <form className="mt-4" onSubmit={askCopilot}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              maxLength={1200}
              className="w-full resize-y rounded-2xl border border-brown-200 bg-ivory p-3 text-sm text-charcoal outline-none transition placeholder:text-brown-400 focus:border-plum-500 focus:ring-2 focus:ring-plum-100 dark:border-dm-border dark:bg-dm-card-2 dark:text-white dark:focus:ring-plum-900/40"
              placeholder="For example: What should I do before opening tomorrow?"
            />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestion(item)}
                    className="rounded-pill bg-ivory px-3 py-1.5 text-xs font-semibold text-brown-600 hover:bg-plum-50 hover:text-plum-700 dark:bg-dm-card-2 dark:text-white/60"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-brown-600 dark:text-white/65">
                  <input
                    type="checkbox"
                    checked={webSearch}
                    onChange={(event) => setWebSearch(event.target.checked)}
                    className="h-4 w-4 rounded border-brown-300 text-plum-700 focus:ring-plum-500"
                  />
                  <FaGlobeAfrica className="text-plum-600" /> Include web research
                </label>
                <button
                  type="submit"
                  disabled={asking}
                  className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {asking ? <FaSync className="animate-spin" size={13} /> : <FaBrain size={13} />}
                  {asking ? 'Thinking…' : 'Ask'}
                </button>
              </div>
            </div>
            {webSearch && (
              <p className="mt-3 rounded-xl bg-gold-50 px-3 py-2 text-xs leading-5 text-brown-700 dark:bg-gold-900/20 dark:text-gold-100">
                Web research is owner-initiated. The copilot receives only the selected, aggregated shop snapshot—not customer names, contacts, or payments.
              </p>
            )}
          </form>

          {answer && (
            <div className="mt-5 rounded-2xl border border-plum-100 bg-plum-50/50 p-4 dark:border-plum-900/50 dark:bg-plum-900/10">
              <div className="flex items-center gap-2">
                <FaBrain className="text-plum-700 dark:text-plum-300" size={14} />
                <h3 className="text-sm font-bold text-charcoal dark:text-white">Copilot answer</h3>
                {answer.webSearch && (
                  <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-plum-700 dark:bg-dm-card-2 dark:text-plum-200">
                    Web researched
                  </span>
                )}
              </div>
              {answer.available ? (
                <AiMarkdown className="mt-3" text={answer.text} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-brown-700 dark:text-white/70">{answer.reason}</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminAiInsights;
