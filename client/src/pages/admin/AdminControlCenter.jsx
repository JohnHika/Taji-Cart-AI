import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft, FaArrowRight, FaBoxes, FaBoxOpen, FaBrain, FaBullhorn,
  FaChartLine, FaChevronDown, FaClipboardList, FaCrown, FaEyeSlash,
  FaGift, FaIdCard, FaLayerGroup, FaListAlt, FaRocket, FaRoute,
  FaShoppingBag, FaStore, FaSync, FaUpload, FaUsers, FaWarehouse,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Axios from '../../utils/Axios';
import isAdmin from '../../utils/isAdmin';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const coreWorkflows = [
  { to: '/dashboard/sales-hub', icon: FaStore, title: 'Run the counter', text: 'Live transactions, receipts, payments and EOD', tone: 'bg-plum-700 text-white hover:bg-plum-600' },
  { to: '/dashboard/admin-ai-insights', icon: FaBrain, title: 'Ask Nawiri AI', text: 'Understand today and decide the next move', tone: 'bg-gold-100 text-brown-900 hover:bg-gold-200 dark:bg-gold-900/30 dark:text-gold-100' },
  { to: '/dashboard/allorders', icon: FaShoppingBag, title: 'Manage orders', text: 'Online orders, pickup and delivery readiness', tone: 'bg-white text-charcoal ring-1 ring-brown-100 hover:bg-ivory dark:bg-dm-card-2 dark:text-white dark:ring-dm-border' },
  { to: '/dashboard/catalog-quality', icon: FaEyeSlash, title: 'Fix catalog health', text: 'Stock, missing detail and storefront readiness', tone: 'bg-white text-charcoal ring-1 ring-brown-100 hover:bg-ivory dark:bg-dm-card-2 dark:text-white dark:ring-dm-border' },
];

const adminSections = [
  {
    title: 'People & permissions',
    links: [
      { to: '/dashboard/users-admin', icon: FaUsers, label: 'User management', description: 'Roles, staff permissions and accounts' },
      { to: '/dashboard/driver-verification', icon: FaIdCard, label: 'Driver verification', description: 'Approve and manage delivery riders' },
    ],
  },
  {
    title: 'Catalog & operations',
    links: [
      { to: '/dashboard/stock-value', icon: FaWarehouse, label: 'Stock value', description: 'Current cost and retail value' },
      { to: '/dashboard/upload-product', icon: FaUpload, label: 'Add products', description: 'Create catalog products' },
      { to: '/dashboard/product', icon: FaBoxOpen, label: 'Products', description: 'Edit the existing catalog' },
      { to: '/dashboard/category', icon: FaListAlt, label: 'Categories', description: 'Top-level catalog grouping' },
      { to: '/dashboard/subcategory', icon: FaLayerGroup, label: 'Subcategories', description: 'Detailed catalog grouping' },
      { to: '/dashboard/delivery-zones', icon: FaRoute, label: 'Delivery zones', description: 'Bike delivery zones and fares' },
    ],
  },
  {
    title: 'Growth & system',
    links: [
      { to: '/dashboard/loyalty-program-admin', icon: FaCrown, label: 'Loyalty program', description: 'Tiers, points and rewards' },
      { to: '/dashboard/admin-community-perks', icon: FaGift, label: 'Community perks', description: 'Create and edit perks' },
      { to: '/dashboard/active-campaigns', icon: FaBullhorn, label: 'Campaigns', description: 'Running promotions' },
      { to: '/dashboard/eod-reports', icon: FaChartLine, label: 'Reports', description: 'Closed EOD sales history' },
      { to: '/dashboard/feature-releases', icon: FaRocket, label: 'Feature releases', description: 'Preview and release features' },
    ],
  },
];

const AdminControlCenter = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id || isAdmin(user)) return;
    toast.error('Admin control center is admin-only.');
    navigate('/dashboard/pos-dashboard');
  }, [user, navigate]);

  const loadPulse = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Axios({
        method: 'GET',
        url: '/api/admin/ai/brief',
        params: { range: 'today', sources: 'counter,online,inventory,delivery' },
      });
      setBrief(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load admin command-center pulse:', error);
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPulse(); }, [loadPulse]);

  const metrics = brief?.metrics || {};
  const priorityActions = brief?.actions?.slice(0, 3) || [];
  const metricCards = [
    { label: 'Today’s sales', value: formatKes(metrics.revenue), detail: `${metrics.counterSaleCount || 0} counter transactions`, icon: FaChartLine },
    { label: 'At the counter', value: formatKes(metrics.counterRevenue), detail: `${metrics.counterItemsSold || 0} items sold`, icon: FaStore },
    { label: 'Online today', value: formatKes(metrics.onlineRevenue), detail: `${metrics.onlineOrderCount || 0} orders`, icon: FaShoppingBag },
    { label: 'Needs attention', value: metrics.lowStockCount ?? '—', detail: 'Products at or below stock threshold', icon: FaBoxes },
  ];

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
      <header className="border-b border-brown-100 bg-white/95 backdrop-blur dark:border-dm-border dark:bg-dm-card/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2" aria-label="Back to dashboard"><FaArrowLeft size={14} /></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-plum-600 dark:text-plum-300">Nawiri owner workspace</p><h1 className="truncate text-base font-bold tracking-tight text-charcoal dark:text-white">Command Center</h1></div>
          <button type="button" onClick={loadPulse} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-plum-200 px-3 py-2 text-xs font-bold text-plum-700 hover:bg-plum-50 disabled:opacity-60 dark:border-plum-800 dark:text-plum-200"><FaSync className={loading ? 'animate-spin' : ''} size={12} />Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#351126] via-plum-800 to-[#744252] px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">Main Store · today</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Good {user?.name?.split(' ')[0] || 'morning'}, here’s the shop at a glance.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Start with the live counter, deal with the priority queue, then use the copilot only when you need an answer—not another report.</p></div><div className="flex flex-wrap gap-2"><Link to="/dashboard/sales-counter" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-plum-800 shadow-sm hover:bg-ivory"><FaStore size={13} />Open counter</Link><Link to="/dashboard/admin-ai-insights" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"><FaBrain size={13} />Ask copilot</Link></div></div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metricCards.map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">{card.label}</p><Icon className="text-plum-600 dark:text-plum-300" size={14} /></div><p className="mt-2 text-xl font-black tracking-tight text-charcoal dark:text-white sm:text-2xl">{loading ? '—' : card.value}</p><p className="mt-1 text-xs text-brown-500 dark:text-white/50">{loading ? 'Loading today’s pulse…' : card.detail}</p></div>; })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="rounded-3xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-plum-600 dark:text-plum-300">Do this next</p><h2 className="mt-1 text-lg font-black tracking-tight text-charcoal dark:text-white">Priority queue</h2></div><Link to="/dashboard/admin-ai-insights" className="text-xs font-bold text-plum-700 underline dark:text-plum-300">See full analysis</Link></div><div className="mt-4 space-y-2">{priorityActions.length > 0 ? priorityActions.map((action, index) => <Link key={`${action.title}-${index}`} to={action.href} className="group flex items-center gap-3 rounded-2xl border border-brown-100 px-3 py-3 transition hover:border-plum-200 hover:bg-plum-50 dark:border-dm-border dark:hover:bg-dm-card-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${action.level === 'urgent' ? 'bg-red-100 text-red-700' : action.level === 'attention' ? 'bg-gold-100 text-gold-800' : 'bg-green-100 text-green-700'}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-charcoal dark:text-white">{action.title}</span><span className="mt-0.5 block truncate text-xs text-brown-500 dark:text-white/50">{action.detail}</span></span><FaArrowRight className="shrink-0 text-brown-300 transition group-hover:translate-x-0.5 group-hover:text-plum-600" size={13} /></Link>) : <div className="rounded-2xl bg-ivory p-4 text-sm text-brown-500 dark:bg-dm-card-2 dark:text-white/50">{loading ? 'Checking the shop…' : 'No urgent review is waiting right now.'}</div>}</div></div>
          <div className="rounded-3xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-plum-600 dark:text-plum-300">Run the shop</p><h2 className="mt-1 text-lg font-black tracking-tight text-charcoal dark:text-white">Your daily shortcuts</h2><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{coreWorkflows.map((workflow) => { const Icon = workflow.icon; return <Link key={workflow.to} to={workflow.to} className={`group flex items-center gap-3 rounded-2xl p-3 transition ${workflow.tone}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/10"><Icon size={14} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{workflow.title}</span><span className="block truncate text-xs opacity-70">{workflow.text}</span></span><FaArrowRight className="shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" size={12} /></Link>; })}</div></div>
        </section>

        <details className="group rounded-3xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brown-400 dark:text-white/40">Administration</p><h2 className="mt-1 font-bold text-charcoal dark:text-white">More admin tools</h2></div><FaChevronDown className="text-brown-400 transition group-open:rotate-180" size={14} /></summary><div className="border-t border-brown-100 p-5 dark:border-dm-border"><div className="space-y-6">{adminSections.map((section) => <div key={section.title}><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-brown-400 dark:text-white/40">{section.title}</h3><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{section.links.map((link) => { const Icon = link.icon; return <Link key={link.to} to={link.to} className="flex items-center gap-3 rounded-2xl border border-brown-100 p-3 transition hover:border-plum-200 hover:bg-plum-50 dark:border-dm-border dark:hover:bg-dm-card-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ivory text-plum-700 dark:bg-dm-card-2 dark:text-plum-300"><Icon size={14} /></span><span className="min-w-0"><span className="block text-sm font-bold text-charcoal dark:text-white">{link.label}</span><span className="block truncate text-xs text-brown-500 dark:text-white/50">{link.description}</span></span></Link>; })}</div></div>)}</div></div></details>
      </main>
    </div>
  );
};

export default AdminControlCenter;
