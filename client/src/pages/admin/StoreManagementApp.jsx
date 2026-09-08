import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  FaArrowRight, FaBoxes, FaBrain, FaChartLine, FaCheckCircle, FaClipboardList,
  FaExclamationTriangle, FaGlobeAfrica, FaLock, FaSearch, FaSignOutAlt, FaStore,
  FaSync, FaTruck, FaUsers, FaWarehouse,
} from 'react-icons/fa';
import Axios from '../../utils/Axios';
import AiMarkdown from '../../components/AiMarkdown';
import {
  consumeStorePortalHandoff, hasStorePortalAccess, hasStorePortalHandoff, leaveStorePortal,
} from '../../utils/storePortalAccess';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;
const shell = 'rounded-2xl border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card';
const label = 'text-[11px] font-bold uppercase tracking-[0.12em] text-brown-400 dark:text-white/40';

const areas = [
  { id: 'overview', label: 'Overview', icon: FaStore },
  { id: 'inventory', label: 'Inventory', icon: FaWarehouse },
  { id: 'replenishment', label: 'Replenishment', icon: FaBoxes },
  { id: 'sales', label: 'Sales intelligence', icon: FaChartLine },
  { id: 'fulfillment', label: 'Fulfillment', icon: FaTruck },
  { id: 'team', label: 'Team & controls', icon: FaUsers },
  { id: 'assistant', label: 'Ask Nawiri', icon: FaBrain },
];

const aiSources = [
  { id: 'counter', label: 'Counter' },
  { id: 'online', label: 'Online' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'delivery', label: 'Delivery' },
];

const aiRanges = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

const mainAppUrl = (path) => `https://nawirihairke.com${path}`;

const StorePortalGate = () => {
  const [state, setState] = useState(() => hasStorePortalAccess() ? 'ready' : (hasStorePortalHandoff() ? 'exchanging' : 'blocked'));
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (state !== 'exchanging') return undefined;
    let active = true;
    consumeStorePortalHandoff().then((result) => {
      if (!active) return;
      if (result.ok) {
        // Rehydrate the normal API session from the session-only access token.
        window.location.reload();
      } else {
        setMessage(result.message);
        setState('blocked');
      }
    }).catch(() => {
      if (active) {
        setMessage('Store access could not be verified. Please start again from Nawiri Hair.');
        setState('blocked');
      }
    });
    return () => { active = false; };
  }, [state]);

  if (state === 'ready') return <StoreManagementWorkspace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#210c22] p-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-7 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400 text-plum-950">
          {state === 'exchanging' ? <FaSync className="animate-spin" /> : <FaLock />}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Nawiri Hair</p>
        <h1 className="mt-2 text-2xl font-black">Store Management</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          {state === 'exchanging'
            ? 'Verifying your admin hand-off…'
            : (message || 'This workspace opens only from a signed-in admin session on Nawiri Hair.')}
        </p>
        {state === 'blocked' && (
          <a href="https://nawirihairke.com/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-plum-950 hover:bg-gold-300">
            Return to Nawiri Hair <FaArrowRight size={12} />
          </a>
        )}
      </section>
    </main>
  );
};

const StoreManagementWorkspace = () => {
  const user = useSelector((state) => state.user);
  const [area, setArea] = useState(() => areas.some((item) => item.id === window.location.pathname.slice(1)) ? window.location.pathname.slice(1) : 'overview');
  const [brief, setBrief] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState('');
  const [quantities, setQuantities] = useState({});
  const [busyId, setBusyId] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [asking, setAsking] = useState(false);
  const [aiRange, setAiRange] = useState('today');
  const [aiSourcesSelected, setAiSourcesSelected] = useState(aiSources.map((source) => source.id));
  const [webResearch, setWebResearch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [briefResult, inventoryResult, ordersResult, peopleResult] = await Promise.allSettled([
        Axios({ method: 'GET', url: '/api/admin/ai/brief', params: { range: 'today', sources: 'counter,online,inventory,delivery' } }),
        Axios({ method: 'GET', url: '/api/admin/warehouse/inventory', params: { limit: 100 } }),
        Axios({ method: 'GET', url: '/api/order/admin/all' }),
        Axios({ method: 'GET', url: '/api/user/admin/users' }),
      ]);

      if (briefResult.status === 'fulfilled') setBrief(briefResult.value.data?.data || null);
      if (inventoryResult.status === 'fulfilled') setInventory(inventoryResult.value.data?.data?.products || []);
      if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value.data?.data || []);
      if (peopleResult.status === 'fulfilled') setPeople(peopleResult.value.data?.data || []);

      if (briefResult.status === 'rejected' && inventoryResult.status === 'rejected') {
        throw briefResult.reason;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Store Management could not load its live data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onPopState = () => setArea(areas.some((item) => item.id === window.location.pathname.slice(1)) ? window.location.pathname.slice(1) : 'overview');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectArea = (nextArea) => {
    setArea(nextArea);
    window.history.pushState({}, '', nextArea === 'overview' ? '/' : `/${nextArea}`);
  };

  const lowStock = useMemo(() => inventory.filter((product) => Number(product.stock || 0) <= 3), [inventory]);
  const visibleInventory = useMemo(() => {
    const term = inventorySearch.trim().toLowerCase();
    return term ? inventory.filter((product) => `${product.name} ${product.sku || ''}`.toLowerCase().includes(term)) : inventory;
  }, [inventory, inventorySearch]);
  const activeOrders = useMemo(() => orders.filter((order) => !['delivered', 'cancelled', 'pos'].includes(String(order.status || '').toLowerCase())), [orders]);
  const storeStaff = useMemo(() => people.filter((person) => person.isAdmin || person.isStaff || person.isDelivery || person.role === 'admin' || person.role === 'staff'), [people]);

  const moveStock = async (product, kind) => {
    const quantity = Number(quantities[product._id]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a positive quantity first.');
      return;
    }
    setBusyId(product._id);
    try {
      await Axios({
        method: 'POST',
        url: kind === 'receive' ? '/api/admin/warehouse/receive' : '/api/admin/warehouse/dispatch',
        data: { productId: product._id, quantity, reason: kind === 'receive' ? 'Received through Store Management' : 'Dispatched to shop through Store Management' },
      });
      toast.success(kind === 'receive' ? 'Warehouse stock received.' : 'Stock dispatched to the shop.');
      setQuantities((current) => ({ ...current, [product._id]: '' }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Stock movement could not be completed.');
    } finally {
      setBusyId('');
    }
  };

  const ask = async (event, suggestedQuestion) => {
    event?.preventDefault();
    const currentQuestion = (suggestedQuestion || question).trim();
    if (currentQuestion.length < 3) return toast.error('Ask a store question first.');
    const history = turns.flatMap((turn) => [{ role: 'user', content: turn.question }, ...(turn.answer?.available ? [{ role: 'assistant', content: turn.answer.text }] : [])]);
    setAsking(true);
    try {
      const response = await Axios({
        method: 'POST', url: '/api/admin/ai/ask',
        data: { question: currentQuestion, range: aiRange, sources: aiSourcesSelected, webSearch: webResearch, history },
      });
      const data = response.data?.data;
      setTurns((current) => [...current, { question: currentQuestion, answer: data?.answer }]);
      setQuestion('');
      if (data?.brief) setBrief(data.brief);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Nawiri could not answer that right now.');
    } finally {
      setAsking(false);
    }
  };

  const metrics = brief?.metrics || {};
  const toggleAiSource = (source) => setAiSourcesSelected((current) => current.includes(source)
    ? (current.length === 1 ? current : current.filter((item) => item !== source))
    : [...current, source]);
  const setQuestionAndOpen = (text) => { setQuestion(text); selectArea('assistant'); };
  const openMain = (path) => { window.location.assign(mainAppUrl(path)); };

  const areaContent = {
    overview: <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Today’s sales', formatKes(metrics.revenue), `${metrics.counterSaleCount || 0} counter transactions`, FaChartLine],
          ['At the counter', formatKes(metrics.counterRevenue), `${metrics.counterItemsSold || 0} items sold`, FaStore],
          ['Online today', formatKes(metrics.onlineRevenue), `${metrics.onlineOrderCount || 0} orders`, FaClipboardList],
          ['Stock to review', metrics.lowStockCount ?? lowStock.length, 'At or below threshold', FaExclamationTriangle],
        ].map(([name, value, hint, Icon]) => <div key={name} className={`${shell} p-4`}><div className="flex items-center justify-between"><p className={label}>{name}</p><Icon className="text-plum-600" size={15} /></div><p className="mt-2 text-2xl font-black text-charcoal dark:text-white">{loading ? '—' : value}</p><p className="mt-1 text-xs text-brown-500 dark:text-white/50">{hint}</p></div>)}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={`${shell} p-5`}><p className={label}>Manager’s queue</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Start with what needs a decision</h2><div className="mt-4 space-y-2">{(brief?.actions || []).slice(0, 4).map((action) => <button key={action.title} type="button" onClick={() => openMain(action.href)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-brown-100 p-3 text-left hover:border-plum-200 hover:bg-plum-50/50 dark:border-dm-border dark:hover:bg-plum-900/20"><span><span className="block text-sm font-bold text-charcoal dark:text-white">{action.title}</span><span className="mt-0.5 block text-xs text-brown-500 dark:text-white/50">{action.detail}</span></span><FaArrowRight className="shrink-0 text-plum-600" size={12} /></button>)}{!loading && !(brief?.actions || []).length && <p className="text-sm text-brown-500">No priority alerts right now.</p>}</div></div>
        <div className="rounded-2xl bg-plum-800 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-300">Nawiri asks first</p><h2 className="mt-2 text-lg font-black">What should the store improve before tomorrow opens?</h2><p className="mt-2 text-sm leading-6 text-white/70">Choose a business area and the copilot will use counter, online, stock, and fulfilment data—not a generic answer.</p><button type="button" onClick={() => setQuestionAndOpen('What should I decide before opening tomorrow, based on today’s counter, online, inventory, and delivery data?')} className="mt-5 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-plum-950 hover:bg-gold-300">Start the review</button></div>
      </section>
    </>,
    inventory: <section className={`${shell} overflow-hidden`}><div className="flex flex-col gap-3 border-b border-brown-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-dm-border"><div><p className={label}>Backroom and shop floor</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Inventory control</h2></div><label className="flex items-center gap-2 rounded-xl bg-ivory px-3 py-2 text-sm dark:bg-dm-card-2"><FaSearch className="text-brown-400" size={12}/><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Find product or SKU" className="w-52 bg-transparent outline-none" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-ivory text-[11px] uppercase tracking-wide text-brown-400 dark:bg-dm-card-2"><tr><th className="p-3 font-bold">Product</th><th className="p-3 text-right">Backroom</th><th className="p-3 text-right">Shop floor</th><th className="p-3">Move stock</th></tr></thead><tbody>{visibleInventory.map((product) => <tr key={product._id} className="border-t border-brown-100 dark:border-dm-border"><td className="p-3"><p className="font-bold text-charcoal dark:text-white">{product.name}</p><p className="text-xs text-brown-500">{product.sku || 'No SKU'}</p></td><td className="p-3 text-right font-bold text-plum-700 dark:text-plum-300">{product.warehouseStock || 0}</td><td className={`p-3 text-right font-bold ${product.stock <= 3 ? 'text-red-600' : 'text-charcoal dark:text-white'}`}>{product.stock || 0}</td><td className="p-3"><div className="flex gap-2"><input type="number" min="1" value={quantities[product._id] || ''} onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))} placeholder="Qty" className="w-16 rounded-lg border border-brown-200 bg-white px-2 py-1.5 outline-none dark:border-dm-border dark:bg-dm-card-2"/><button type="button" disabled={busyId === product._id} onClick={() => moveStock(product, 'receive')} className="rounded-lg border border-plum-200 px-2 py-1.5 text-xs font-bold text-plum-700 hover:bg-plum-50">Receive</button><button type="button" disabled={busyId === product._id || !product.warehouseStock} onClick={() => moveStock(product, 'dispatch')} className="rounded-lg bg-plum-700 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">To shop</button></div></td></tr>)}{!loading && !visibleInventory.length && <tr><td colSpan="4" className="p-8 text-center text-brown-500">No inventory matches that search.</td></tr>}</tbody></table></div></section>,
    replenishment: <section className="grid gap-4 xl:grid-cols-[1fr_340px]"><div className={`${shell} p-5`}><p className={label}>Demand signals</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Replenishment queue</h2><p className="mt-2 text-sm text-brown-500 dark:text-white/55">These are live shop-floor counts. Confirm supplier availability and incoming stock before ordering.</p><div className="mt-4 space-y-2">{lowStock.map((product) => <div key={product._id} className="flex items-center justify-between gap-3 rounded-xl border border-brown-100 p-3 dark:border-dm-border"><span><span className="block font-bold text-charcoal dark:text-white">{product.name}</span><span className="text-xs text-brown-500">{product.sku || 'No SKU'} · {product.warehouseStock || 0} in backroom</span></span><span className="rounded-lg bg-red-50 px-2 py-1 text-sm font-black text-red-700 dark:bg-red-950/30 dark:text-red-300">{product.stock || 0} live</span></div>)}{!loading && !lowStock.length && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">No products are at the current low-stock threshold.</p>}</div></div><aside className="rounded-2xl border border-gold-200 bg-gold-50 p-5 dark:border-gold-800/50 dark:bg-gold-900/15"><FaBrain className="text-gold-700"/><h3 className="mt-3 font-black text-charcoal dark:text-white">Ask before you buy</h3><p className="mt-2 text-sm leading-6 text-brown-700 dark:text-white/65">Nawiri can explain which low-stock products have actual sales urgency and ask you what budget or supplier constraints apply.</p><button type="button" onClick={() => setQuestionAndOpen('Which low-stock products should I replenish first? Ask me one question if supplier budget, lead time, or stock on hand would change the recommendation.')} className="mt-4 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white">Prepare a replenishment review</button></aside></section>,
    sales: <section className="grid gap-4 lg:grid-cols-2"><div className={`${shell} p-5`}><p className={label}>Trade desk</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Today’s channel mix</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-plum-50 p-4 dark:bg-plum-900/20"><p className={label}>Counter</p><p className="mt-2 text-xl font-black text-plum-800 dark:text-plum-200">{formatKes(metrics.counterRevenue)}</p><p className="mt-1 text-xs text-brown-500">{metrics.counterSaleCount || 0} transactions</p></div><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Online</p><p className="mt-2 text-xl font-black text-charcoal dark:text-white">{formatKes(metrics.onlineRevenue)}</p><p className="mt-1 text-xs text-brown-500">{metrics.onlineOrderCount || 0} orders</p></div></div><button type="button" onClick={() => openMain('/dashboard/sales-hub')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open full sales hub <FaArrowRight size={12}/></button></div><div className={`${shell} p-5`}><p className={label}>Decision support</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Make the next move clear</h2><p className="mt-3 text-sm leading-6 text-brown-500 dark:text-white/55">Use the assistant to compare counter and online trends, identify products worth featuring, or turn a revenue dip into a practical investigation.</p><button type="button" onClick={() => setQuestionAndOpen('Compare today’s counter and online sales. What should I investigate first, and what one decision do you need from me?')} className="mt-5 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white">Ask about sales</button></div></section>,
    fulfillment: <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><div className={`${shell} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-brown-100 p-5 dark:border-dm-border"><div><p className={label}>Orders in motion</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Fulfilment control</h2></div><span className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs font-black text-plum-700 dark:bg-plum-900/30 dark:text-plum-100">{activeOrders.length} open</span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-ivory text-[11px] uppercase tracking-wide text-brown-400 dark:bg-dm-card-2"><tr><th className="p-3 font-bold">Order</th><th className="p-3 font-bold">Customer</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Value</th></tr></thead><tbody>{activeOrders.slice(0, 6).map((order) => <tr key={order._id || order.orderId} className="border-t border-brown-100 dark:border-dm-border"><td className="p-3"><p className="font-bold text-charcoal dark:text-white">{order.orderId || 'Order'}</p><p className="text-xs text-brown-500">{order.fulfillment_type || 'Delivery'}</p></td><td className="p-3 text-brown-700 dark:text-white/70">{order.userId?.name || order.guestShipping?.name || 'Guest customer'}</td><td className="p-3"><span className="rounded-md bg-gold-50 px-2 py-1 text-xs font-bold text-brown-700 dark:bg-gold-900/15 dark:text-gold-100">{String(order.status || 'pending').replaceAll('_', ' ')}</span></td><td className="p-3 text-right font-bold text-charcoal dark:text-white">{formatKes(order.totalAmt)}</td></tr>)}{!loading && !activeOrders.length && <tr><td colSpan="4" className="p-8 text-center text-brown-500">No open online orders right now.</td></tr>}</tbody></table></div><button type="button" onClick={() => openMain('/dashboard/allorders')} className="m-4 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open full order desk <FaArrowRight size={12}/></button></div><div className="space-y-4"><div className={`${shell} p-5`}><p className={label}>Live workload</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Open online orders</p><p className="mt-2 text-2xl font-black text-charcoal dark:text-white">{metrics.openOrderCount ?? activeOrders.length}</p></div><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Active deliveries</p><p className="mt-2 text-2xl font-black text-charcoal dark:text-white">{metrics.activeDeliveryCount || 0}</p></div></div></div><div className="rounded-2xl bg-plum-800 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-300">Operating question</p><h2 className="mt-2 text-lg font-black">What could delay a customer today?</h2><p className="mt-2 text-sm leading-6 text-white/70">Ask Nawiri to combine order volume, drivers, counter traffic, and stock risk before you assign work.</p><button type="button" onClick={() => setQuestionAndOpen('Are there any fulfilment risks today? Ask one follow-up question if a manager decision is needed.')} className="mt-5 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-plum-950">Review fulfilment</button></div></div></section>,
    team: <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><div className={`${shell} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-brown-100 p-5 dark:border-dm-border"><div><p className={label}>People and permissions</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Store team on duty</h2></div><span className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs font-black text-plum-700 dark:bg-plum-900/30 dark:text-plum-100">{storeStaff.length} operational roles</span></div><div className="divide-y divide-brown-100 dark:divide-dm-border">{storeStaff.slice(0, 7).map((person) => <div key={person._id} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="block text-sm font-bold text-charcoal dark:text-white">{person.name || 'Team member'}</span><span className="mt-0.5 block text-xs text-brown-500">{person.email || person.mobile || 'No contact recorded'}</span></span><span className="rounded-md bg-ivory px-2 py-1 text-xs font-bold capitalize text-brown-700 dark:bg-dm-card-2 dark:text-white/70">{person.isAdmin ? 'Admin' : (person.isDelivery ? 'Delivery' : (person.role || 'Staff'))}</span></div>)}{!loading && !storeStaff.length && <p className="p-8 text-center text-sm text-brown-500">No operational roles are visible.</p>}</div><button type="button" onClick={() => openMain('/dashboard/users-admin')} className="m-4 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open people and permissions <FaArrowRight size={12}/></button></div><div className="space-y-4"><div className={`${shell} p-5`}><p className={label}>Protected controls</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Change access with care</h2><p className="mt-3 text-sm leading-6 text-brown-500 dark:text-white/55">This view gives the store lead live context. Role changes and driver approval stay in the dedicated admin controls, where they are audited.</p><button type="button" onClick={() => openMain('/dashboard/driver-verification')} className="mt-5 rounded-xl border border-plum-200 px-4 py-2.5 text-sm font-bold text-plum-700">Verify drivers</button></div><div className="rounded-2xl bg-charcoal p-5 text-white"><FaCheckCircle className="text-gold-300"/><h2 className="mt-3 text-lg font-black">Admin session only</h2><p className="mt-2 text-sm leading-6 text-white/65">Store Management uses a one-time hand-off from the primary Nawiri site and expires with this browser session. Knowing the hostname does not unlock it.</p><button type="button" onClick={leaveStorePortal} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"><FaSignOutAlt size={12}/> Leave Store Management</button></div></div></section>,
    assistant: <section className="grid gap-4 xl:grid-cols-[1fr_340px]"><div className={`${shell} min-h-[36rem] p-5`}><p className={label}>Nawiri operations assistant</p><h2 className="mt-1 text-xl font-black text-charcoal dark:text-white">Ask. Then decide.</h2><p className="mt-2 text-sm text-brown-500 dark:text-white/55">It sees the current counter, online, inventory, and delivery snapshot. When your preference or missing information changes the advice, it will ask one precise follow-up question.</p><div className="mt-5 space-y-3">{turns.length === 0 && <div className="rounded-2xl bg-plum-50 p-4 text-sm leading-6 text-plum-900 dark:bg-plum-900/20 dark:text-plum-100"><FaBrain className="mb-2 text-plum-600"/>Before we plan tomorrow: should the priority be protecting cash, recovering online sales, or replenishing fast movers?</div>}{turns.map((turn, index) => <div key={`${turn.question}-${index}`} className="space-y-2"><div className="ml-auto max-w-[85%] rounded-2xl bg-ivory p-3 text-sm text-charcoal dark:bg-dm-card-2 dark:text-white">{turn.question}</div><div className="max-w-[92%] rounded-2xl border border-plum-100 bg-plum-50/60 p-4 dark:border-plum-900/50 dark:bg-plum-900/10">{turn.answer?.available ? <AiMarkdown text={turn.answer.text} /> : <p className="text-sm text-brown-700 dark:text-white/65">{turn.answer?.reason || 'No answer was available.'}</p>}</div></div>)}</div><form onSubmit={ask} className="mt-5 border-t border-brown-100 pt-4 dark:border-dm-border"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="3" placeholder="Ask a decision question about the store…" className="w-full rounded-2xl border border-brown-200 bg-ivory p-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"/><button type="submit" disabled={asking} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{asking ? <FaSync className="animate-spin" size={12}/> : <FaBrain size={12}/>} {asking ? 'Thinking…' : 'Ask Nawiri'}</button></form></div><aside className={`${shell} h-fit p-5`}><p className={label}>Useful starting points</p><div className="mt-4 space-y-2">{['What needs my attention before opening tomorrow?', 'Which products should I replenish first, and what do you need to know from me?', 'Why is online revenue different from counter revenue?', 'What can delay an order today?'].map((item) => <button key={item} type="button" onClick={(event) => ask(event, item)} className="w-full rounded-xl bg-ivory p-3 text-left text-sm font-semibold text-brown-700 hover:bg-plum-50 hover:text-plum-800 dark:bg-dm-card-2 dark:text-white/70">{item}</button>)}</div></aside></section>,
  };

  if (area === 'assistant') {
    return (
      <main className="min-h-screen bg-[#f7f3ef] text-charcoal dark:bg-dm-surface dark:text-white">
        <header className="border-b border-plum-900 bg-[#210c22] text-white">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-plum-950"><FaStore /></div><div><p className="text-sm font-black">Nawiri Hair</p><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">Store Management</p></div></div>
            <div className="flex items-center gap-3"><span className="hidden text-xs text-white/60 sm:block">{user?.name || 'Admin'} · Secure session</span><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-white/15 p-2 text-white/75 hover:bg-white/10" aria-label="Refresh store data"><FaSync className={loading ? 'animate-spin' : ''} size={13} /></button><button type="button" onClick={leaveStorePortal} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/10">Exit</button></div>
          </div>
        </header>
        <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-brown-100 bg-white p-3 dark:border-dm-border dark:bg-dm-card lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r"><p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brown-400">Store operations</p><nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col">{areas.map((item) => { const Icon = item.icon; const selected = area === item.id; return <button key={item.id} type="button" onClick={() => selectArea(item.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${selected ? 'bg-plum-700 text-white shadow-sm' : 'text-brown-600 hover:bg-plum-50 dark:text-white/70 dark:hover:bg-plum-900/20'}`}><Icon size={14} />{item.label}</button>; })}</nav></aside>
          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className={label}>Ask Nawiri</p><h1 className="mt-1 text-2xl font-black tracking-tight text-charcoal dark:text-white">Ask. Then decide.</h1></div></div>
            <section className={`${shell} mb-4 p-4`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div><p className={label}>Analysis window</p><div className="mt-2 flex flex-wrap gap-2">{aiRanges.map((item) => <button key={item.id} type="button" onClick={() => setAiRange(item.id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${aiRange === item.id ? 'bg-plum-700 text-white' : 'bg-ivory text-brown-600 dark:bg-dm-card-2 dark:text-white/65'}`}>{item.label}</button>)}</div></div>
                <div><p className={label}>Business data</p><div className="mt-2 flex flex-wrap gap-2">{aiSources.map((source) => <button key={source.id} type="button" onClick={() => toggleAiSource(source.id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${aiSourcesSelected.includes(source.id) ? 'bg-plum-100 text-plum-800 dark:bg-plum-900/30 dark:text-plum-100' : 'bg-ivory text-brown-500 dark:bg-dm-card-2 dark:text-white/45'}`}>{aiSourcesSelected.includes(source.id) && '✓ '}{source.label}</button>)}</div></div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2.5 text-xs font-bold text-brown-700 dark:border-gold-800/50 dark:bg-gold-900/15 dark:text-gold-100"><input type="checkbox" checked={webResearch} onChange={(event) => setWebResearch(event.target.checked)} className="h-4 w-4 rounded border-brown-300 text-plum-700" /><FaGlobeAfrica className="text-plum-600" /> Include web research</label>
              </div>
              {webResearch && <p className="mt-3 text-xs leading-5 text-brown-600 dark:text-white/60">Web research is owner-initiated. Nawiri receives only the selected, aggregated store snapshot and separates outside research from your business data.</p>}
            </section>
            {areaContent.assistant}
          </div>
        </div>
      </main>
    );
  }

  return <main className="min-h-screen bg-[#f7f3ef] text-charcoal dark:bg-dm-surface dark:text-white"><header className="border-b border-plum-900 bg-[#210c22] text-white"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-plum-950"><FaStore/></div><div><p className="text-sm font-black">Nawiri Hair</p><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">Store Management</p></div></div><div className="flex items-center gap-3"><span className="hidden text-xs text-white/60 sm:block">{user?.name || 'Admin'} · Secure session</span><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-white/15 p-2 text-white/75 hover:bg-white/10" aria-label="Refresh store data"><FaSync className={loading ? 'animate-spin' : ''} size={13}/></button><button type="button" onClick={leaveStorePortal} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/10">Exit</button></div></div></header><div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="border-b border-brown-100 bg-white p-3 dark:border-dm-border dark:bg-dm-card lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r"><p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brown-400">Store operations</p><nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col">{areas.map((item) => { const Icon = item.icon; const selected = area === item.id; return <button key={item.id} type="button" onClick={() => selectArea(item.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${selected ? 'bg-plum-700 text-white shadow-sm' : 'text-brown-600 hover:bg-plum-50 dark:text-white/70 dark:hover:bg-plum-900/20'}`}><Icon size={14}/>{item.label}</button>; })}</nav><div className="mt-6 hidden rounded-xl bg-gold-50 p-3 text-xs leading-5 text-brown-700 dark:bg-gold-900/15 dark:text-gold-100 lg:block"><span className="font-black">Live data only.</span> Inventory movements write through the existing audited warehouse controls. The assistant does not change the business on page load.</div></aside><div className="min-w-0 p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className={label}>{areas.find((item) => item.id === area)?.label}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-charcoal dark:text-white">{area === 'overview' ? 'Run the store with a single view' : areas.find((item) => item.id === area)?.label}</h1></div>{area !== 'assistant' && <button type="button" onClick={() => selectArea('assistant')} className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-plum-600"><FaBrain size={13}/> Ask Nawiri</button>}</div>{areaContent[area]}</div></div></main>;
};

export default StorePortalGate;
