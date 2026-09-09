import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft, FaArrowRight, FaBoxes, FaBoxOpen, FaBrain, FaBullhorn,
  FaChartLine, FaChevronDown, FaCrown, FaEyeSlash,
  FaGift, FaIdCard, FaLayerGroup, FaListAlt, FaRocket, FaRoute,
  FaShoppingBag, FaStore, FaSync, FaUpload, FaUsers, FaWarehouse,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Axios from '../../utils/Axios';
import isAdmin from '../../utils/isAdmin';
import '../../styles/AdminWorkspace.css';

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
    <div className="admin-workspace">
      <header className="admin-workspace__header">
        <div className="admin-workspace__header-inner">
          <button type="button" onClick={() => navigate('/dashboard')} className="admin-workspace__back" aria-label="Back to dashboard"><FaArrowLeft size={14} /></button>
          <div className="admin-workspace__title-group"><p className="admin-workspace__eyebrow">Nawiri owner workspace</p><h1 className="admin-workspace__title">Command Center</h1><p className="admin-workspace__subline">A focused operating view for the store.</p></div>
          <button type="button" onClick={loadPulse} disabled={loading} className="admin-workspace__refresh"><FaSync className={loading ? 'animate-spin' : ''} size={12} /><span>Refresh pulse</span></button>
        </div>
      </header>

      <main className="admin-workspace__content">
        <section className="admin-hero">
          <div className="admin-hero__copy"><p className="admin-hero__eyebrow">Main Store · Today</p><h2 className="admin-hero__title">Good {user?.name?.split(' ')[0] || 'morning'}, run the store with clarity.</h2><p className="admin-hero__description">See today’s commercial health, work through what needs attention, and move directly into the task at hand.</p></div>
          <div className="admin-hero__actions"><Link to="/dashboard/sales-counter" className="admin-hero__action admin-hero__action--primary"><FaStore size={13} />Open counter</Link><Link to="/dashboard/admin-ai-insights" className="admin-hero__action"><FaBrain size={13} />Ask copilot</Link></div>
        </section>

        <section className="admin-stats" aria-label="Today’s store metrics">
          {metricCards.map((card) => { const Icon = card.icon; return <div key={card.label} className="admin-stat"><div className="admin-stat__head"><span className="admin-stat__label">{card.label}</span><Icon size={14} /></div><p className="admin-stat__value">{loading ? '—' : card.value}</p><p className="admin-stat__detail">{loading ? 'Loading today’s pulse…' : card.detail}</p></div>; })}
        </section>

        <section className="admin-work-grid">
          <div className="admin-surface admin-surface--accent"><div className="admin-surface__head"><div><p className="admin-surface__eyebrow">Do this next</p><h2 className="admin-surface__title">Priority queue</h2></div><Link to="/dashboard/admin-ai-insights" className="admin-surface__link">Full analysis</Link></div><div className="admin-queue">{priorityActions.length > 0 ? priorityActions.map((action, index) => <Link key={`${action.title}-${index}`} to={action.href} className="admin-queue__item"><span className={`admin-queue__number admin-queue__number--${action.level === 'urgent' ? 'urgent' : action.level === 'attention' ? 'attention' : 'good'}`}>{index + 1}</span><span className="admin-queue__copy"><span className="admin-queue__title">{action.title}</span><span className="admin-queue__detail">{action.detail}</span></span><FaArrowRight className="admin-queue__arrow" size={13} /></Link>) : <div className="admin-queue__item"><span className="admin-queue__number admin-queue__number--good">✓</span><span className="admin-queue__copy"><span className="admin-queue__title">{loading ? 'Checking the shop…' : 'No urgent review is waiting.'}</span><span className="admin-queue__detail">The live operational pulse will appear here.</span></span></div>}</div></div>
          <div className="admin-surface"><div className="admin-surface__head"><div><p className="admin-surface__eyebrow">Run the shop</p><h2 className="admin-surface__title">Daily shortcuts</h2></div></div><div className="admin-shortcuts">{coreWorkflows.map((workflow) => { const Icon = workflow.icon; return <Link key={workflow.to} to={workflow.to} className={`admin-shortcut ${workflow.tone}`}><span className="admin-shortcut__icon"><Icon size={14} /></span><span><span className="admin-shortcut__title">{workflow.title}</span><span className="admin-shortcut__text">{workflow.text}</span></span></Link>; })}</div></div>
        </section>

        <details className="admin-toolbox"><summary className="admin-toolbox__summary"><span><p className="admin-surface__eyebrow">Administration</p><h2 className="admin-surface__title">More admin tools</h2></span><FaChevronDown className="text-brown-400 transition group-open:rotate-180" size={14} /></summary><div className="admin-toolbox__body"><div className="admin-toolbox__groups">{adminSections.map((section) => <section key={section.title}><h3 className="admin-toolbox__group-title">{section.title}</h3><div className="admin-toolbox__grid">{section.links.map((link) => { const Icon = link.icon; return <Link key={link.to} to={link.to} className="admin-tool"><span className="admin-tool__icon"><Icon size={13} /></span><span className="admin-tool__copy"><span className="admin-tool__title">{link.label}</span><span className="admin-tool__description">{link.description}</span></span></Link>; })}</div></section>)}</div></div></details>
      </main>
    </div>
  );
};

export default AdminControlCenter;
