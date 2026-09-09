/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react';
import {
  FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp, FaBoxes, FaBrain,
  FaChartLine, FaCheck, FaChevronDown, FaClipboardList, FaClock,
  FaExclamationTriangle, FaGlobeAfrica, FaLightbulb, FaRoute, FaSearch,
  FaShoppingBag, FaStore, FaSync, FaTimes, FaUser,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import AiMarkdown from '../../components/AiMarkdown';
import '../../styles/AdminWorkspace.css';
import '../../styles/AdminAiInsights.css';

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

const reviewTone = (level) => (level === 'urgent' ? 'urgent' : level === 'attention' ? 'attention' : 'good');

const MetricCard = ({ metric }) => {
  const Icon = metric.icon;
  const TrendIcon = metric.trend >= 0 ? FaArrowUp : FaArrowDown;
  return (
    <article className={`ai-metric ${metric.active === false ? 'ai-metric--muted' : ''} ${metric.highlight ? 'ai-metric--highlight' : ''}`}>
      <div className="ai-metric__head"><span className="ai-metric__label">{metric.label}</span><Icon size={14} /></div>
      <p className="ai-metric__value">{metric.value}</p>
      <div className="ai-metric__footer">
        {metric.trend !== undefined && metric.trend !== null
          ? <span className={`ai-metric__trend ai-metric__trend--${metric.trend >= 0 ? 'up' : 'down'}`}><TrendIcon size={10} />{metric.hint}</span>
          : <span className="ai-metric__hint">{metric.hint}</span>}
      </div>
    </article>
  );
};

const ProductPanel = ({ title, description, to, linkLabel, products, type }) => (
  <article className="ai-product-panel">
    <div className="ai-product-panel__head">
      <div><h2 className="ai-product-panel__title">{title}</h2><p className="ai-product-panel__description">{description}</p></div>
      <Link to={to} className="ai-panel__link">{linkLabel}</Link>
    </div>
    <div className="ai-product-list">
      {products.map((product, index) => (
        <div key={product.id} className="ai-product-row">
          <span className="ai-product-row__rank">{type === 'stock' ? <FaBoxes size={11} /> : index + 1}</span>
          <span className="ai-product-row__copy"><span className="ai-product-row__name">{product.name}</span><span className="ai-product-row__meta">{type === 'stock' ? product.sku || 'No SKU' : `${product.quantity} units · ${product.sku || 'No SKU'}`}</span></span>
          {type === 'stock' ? <span className="ai-stock-pill">{product.stock} left</span> : <span className="ai-product-row__value">{formatKes(product.revenue)}</span>}
        </div>
      ))}
    </div>
  </article>
);

const AdminAiInsights = () => {
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [range, setRange] = useState('today');
  const [sources, setSources] = useState(scopes.map((scope) => scope.id));
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showContext, setShowContext] = useState(false);

  const loadBrief = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await Axios({ method: 'GET', url: '/api/admin/ai/brief', params: { range, sources: sources.join(',') } });
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
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 3) return toast.error('Type a business question first.');
    const history = turns.flatMap((turn) => [
      { role: 'user', content: turn.question },
      ...(turn.answer?.available ? [{ role: 'assistant', content: turn.answer.text }] : []),
    ]);
    setAsking(true);
    try {
      const response = await Axios({ method: 'POST', url: '/api/admin/ai/ask', data: { question: trimmedQuestion, range, sources, webSearch, history } });
      const data = response.data?.data;
      setTurns((current) => [...current, { question: trimmedQuestion, answer: data?.answer || null }]);
      setQuestion('');
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
  const selectedRange = ranges.find((item) => item.id === range)?.label || 'Today';
  const sourceSummary = sources.length === scopes.length ? 'All business data' : `${sources.length} selected source${sources.length === 1 ? '' : 's'}`;
  const generatedAt = brief?.generatedAt ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(brief.generatedAt)) : '';
  const metricCards = [
    { icon: FaChartLine, label: 'Combined revenue', value: formatKes(metrics.revenue), hint: trend === null ? `${brief?.period || selectedRange} · no prior comparison` : `${trend >= 0 ? '+' : ''}${trend}% vs previous period`, trend, highlight: true },
    { icon: FaStore, label: 'Counter sales', value: formatKes(metrics.counterRevenue), hint: `${metrics.counterSaleCount || 0} transactions · ${metrics.counterItemsSold || 0} items`, active: sources.includes('counter') },
    { icon: FaShoppingBag, label: 'Online sales', value: formatKes(metrics.onlineRevenue), hint: `${metrics.onlineOrderCount || 0} orders · ${metrics.openOrderCount || 0} open`, active: sources.includes('online') },
    { icon: FaBoxes, label: 'Stock at risk', value: metrics.lowStockCount ?? 0, hint: sources.includes('inventory') ? 'Products at or below threshold' : 'Inventory source not selected', active: sources.includes('inventory') },
    { icon: FaClipboardList, label: 'Active deliveries', value: metrics.activeDeliveryCount ?? 0, hint: metrics.availableDriverCount === null ? 'Delivery source not selected' : `${metrics.availableDriverCount || 0} verified drivers available`, active: sources.includes('delivery') },
  ];

  return (
    <div className="admin-workspace">
      <header className="admin-workspace__header">
        <div className="admin-workspace__header-inner">
          <button type="button" onClick={() => navigate('/dashboard')} className="admin-workspace__back" aria-label="Back to dashboard"><FaArrowLeft size={14} /></button>
          <div className="admin-workspace__title-group"><p className="admin-workspace__eyebrow">Nawiri owner workspace</p><h1 className="admin-workspace__title">Operations Copilot</h1><p className="admin-workspace__subline">Private, owner-controlled analysis for every store decision.</p></div>
          <button type="button" onClick={loadBrief} disabled={loading} className="admin-workspace__refresh"><FaSync className={loading ? 'animate-spin' : ''} size={13} /><span>Refresh intelligence</span></button>
        </div>
      </header>

      <main className="admin-workspace__content"><div className="ai-command">
        <section className="ai-command__hero">
          <div className="ai-command__hero-copy"><p className="ai-command__eyebrow"><FaLightbulb size={11} />Your decision workspace</p><h2 className="ai-command__hero-title">Turn today’s operations into the next best move.</h2><p>Bring the live counter, online orders, inventory, and delivery into one decision-ready view. The copilot stays read-only until you choose an action.</p></div>
          <div className="ai-command__hero-meta"><span className="ai-command__hero-pill ai-command__hero-pill--live">Live business context</span><span className="ai-command__hero-pill"><FaClock size={11} />{brief ? `Updated ${generatedAt || 'just now'}` : 'Loading current pulse'}</span><span className="ai-command__hero-pill"><FaCheck size={10} />{sourceSummary}</span></div>
          <div className="ai-command__hero-actions"><button type="button" onClick={() => setShowContext((current) => !current)} className="ai-command__hero-action"><FaSearch size={12} />Adjust context</button><button type="button" onClick={() => document.getElementById('copilot-question')?.focus()} className="ai-command__hero-action ai-command__hero-action--solid"><FaBrain size={12} />Ask Nawiri AI</button></div>
        </section>

        <div className="ai-command__workspace"><div className="ai-command__main">
          <section className="ai-filter-deck" aria-label="Analysis context">
            <button type="button" onClick={() => setShowContext((current) => !current)} className="ai-filter-deck__summary" aria-expanded={showContext}><span className="ai-filter-deck__summary-copy"><span className="ai-filter-deck__label">Analysis context</span><span className="ai-filter-deck__value">{selectedRange} · {sourceSummary}</span></span><span className="ai-filter-deck__control">{showContext ? 'Done' : 'Configure'} <FaChevronDown className={showContext ? 'rotate-180 transition-transform' : 'transition-transform'} size={12} /></span></button>
            {showContext && <div className="ai-filter-deck__body"><div><span className="ai-filter-deck__group-title">Decision window</span><div className="ai-filter-deck__ranges">{ranges.map((item) => <button key={item.id} type="button" onClick={() => setRange(item.id)} className={`ai-filter-deck__range ${range === item.id ? 'bg-plum-700 text-white shadow-sm' : 'bg-ivory text-brown-600 hover:bg-plum-50 dark:bg-dm-card-2 dark:text-white/70'}`}>{item.label}</button>)}</div></div><div><span className="ai-filter-deck__group-title">Included live sources</span><div className="ai-source-grid">{scopes.map((scope) => { const Icon = scope.icon; const selected = sources.includes(scope.id); return <button key={scope.id} type="button" onClick={() => toggleSource(scope.id)} className={`ai-source ${selected ? 'ai-source--selected' : ''}`}><span className="ai-source__icon">{selected ? <FaCheck size={10} /> : <Icon size={11} />}</span><span className="ai-source__copy"><span className="ai-source__label">{scope.label}</span><span className="ai-source__hint">{scope.hint}</span></span></button>; })}</div></div></div>}
          </section>

          {loading && !brief ? <><section className="ai-loading-grid" aria-label="Loading business metrics">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="ai-loading-card" />)}</section><section className="ai-insight-grid"><div className="ai-loading-card" /><div className="ai-loading-card" /></section></> : !brief ? <section className="ai-panel"><div className="ai-panel__head"><div className="ai-panel__identity"><span className="ai-panel__icon"><FaExclamationTriangle /></span><div><p className="ai-panel__overline">Connection needed</p><h2 className="ai-panel__title">The operations pulse could not load</h2></div></div></div><div className="ai-panel__content"><p className="ai-narrative">{loadError || 'Refresh to reconnect the operations copilot.'}</p>{loadError?.includes('session') && <Link to="/login" className="ai-panel__link">Sign in again</Link>}</div></section> : <>
            <section className="ai-metric-grid" aria-label="Selected business metrics">{metricCards.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>
            <section className="ai-insight-grid">
              <article className="ai-panel ai-panel--narrative"><div className="ai-panel__head"><div className="ai-panel__identity"><span className="ai-panel__icon"><FaBrain size={16} /></span><div><p className="ai-panel__overline">Automatic pulse</p><h2 className="ai-panel__title">What the selected data says</h2></div></div></div><div className="ai-panel__content">{brief.narrative?.available ? <AiMarkdown className="ai-narrative" text={brief.narrative.text} /> : <p className="ai-narrative">{`Live data is ready. ${brief.narrative?.reason || 'Ask a question for an owner-focused analysis of the selected period.'}`}</p>}</div></article>
              <article className="ai-panel"><div className="ai-panel__head"><div className="ai-panel__identity"><span className="ai-panel__icon"><FaExclamationTriangle size={15} /></span><div><p className="ai-panel__overline">Action desk</p><h2 className="ai-panel__title">Review queue</h2></div></div></div><div className="ai-panel__content">{brief.actions?.length > 0 ? <div className="ai-review-list">{brief.actions.map((action, index) => <Link key={`${action.title}-${index}`} to={action.href} className={`ai-review ai-review--${reviewTone(action.level)}`}><span className="ai-review__marker">{index + 1}</span><span className="ai-review__copy"><span className="ai-review__title">{action.title}</span><span className="ai-review__detail">{action.detail}</span></span><FaArrowRight className="ai-review__arrow" size={11} /></Link>)}</div> : <div className="ai-empty-review"><FaCheck className="shrink-0 text-green-600" size={12} />Nothing needs review right now—the shop is running clean.</div>}</div></article>
            </section>
            {(brief.counterTopProducts?.length > 0 || brief.lowStockProducts?.length > 0) && <section className="ai-product-grid">{brief.counterTopProducts?.length > 0 && <ProductPanel title="Counter best movers" description="Validated, non-voided counter transactions in the selected period." to="/dashboard/sales-hub" linkLabel="Sales Hub" products={brief.counterTopProducts} type="sales" />}{brief.lowStockProducts?.length > 0 && <ProductPanel title="Stock needing review" description="Shown because Inventory is included in the current context." to="/dashboard/catalog-quality" linkLabel="Catalog" products={brief.lowStockProducts} type="stock" />}</section>}
          </>}
        </div>

        <aside className="ai-command__rail"><section className="ai-copilot">
          <div className="ai-copilot__head"><span className="ai-copilot__badge"><FaSearch size={15} /></span><div><h2 className="ai-copilot__title">Ask the copilot</h2><p className="ai-copilot__description">Ask a plain-language question using only the data you selected above.</p><span className="ai-copilot__signal">Read-only analysis</span></div></div>
          <form className="ai-composer" onSubmit={askCopilot}><textarea id="copilot-question" value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} maxLength={1200} className="ai-composer__textarea" placeholder="For example: What should I do before opening tomorrow?" /><div className="ai-composer__prompts">{quickQuestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="ai-composer__prompt"><span>{item}</span><FaArrowRight size={10} /></button>)}</div><div className="ai-composer__footer"><label className="ai-composer__research"><input type="checkbox" checked={webSearch} onChange={(event) => setWebSearch(event.target.checked)} /><FaGlobeAfrica className="text-plum-600" size={12} />Include outside market research</label><button type="submit" disabled={asking} className="ai-composer__submit">{asking ? <FaSync className="animate-spin" size={12} /> : <FaBrain size={12} />}{asking ? 'Thinking…' : 'Ask copilot'}</button></div>{webSearch && <p className="ai-composer__notice">Web research is owner-initiated. The copilot receives only the selected, aggregated shop snapshot—not customer names, contacts, or payments.</p>}</form>
          {turns.length > 0 && <div className="ai-conversation">{turns.map((turn, index) => <article key={`${turn.question}-${index}`} className="ai-turn"><div className="ai-turn__question"><FaUser className="mt-0.5 shrink-0 text-brown-400" size={10} /><span>{turn.question}</span></div><div className="ai-turn__answer"><div className="ai-turn__answer-head"><FaBrain size={12} /><h3 className="ai-turn__answer-title">Copilot response</h3>{turn.answer?.webSearch && <span className="ai-turn__web">Web researched</span>}</div>{turn.answer?.available ? <AiMarkdown className="ai-narrative" text={turn.answer.text} /> : <p className="ai-narrative">{turn.answer?.reason || 'No answer is available right now.'}</p>}{turn.answer?.actions?.length > 0 && <div className="ai-turn__actions">{turn.answer.actions.map((action, actionIndex) => <div key={`${action.tool}-${actionIndex}`} className="ai-turn__action">{action.ok ? <FaCheck className="mt-0.5 shrink-0 text-green-600" size={9} /> : <FaTimes className="mt-0.5 shrink-0 text-red-600" size={9} />}<span>{action.summary}</span></div>)}</div>}</div></article>)}</div>}
        </section></aside>
        </div>
      </div></main>
    </div>
  );
};

export default AdminAiInsights;
