import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import {
  FaArrowRight, FaBoxes, FaChartLine, FaCheckCircle, FaClipboardList, FaPlus,
  FaGlobeAfrica, FaLock, FaSignOutAlt, FaStore,
  FaSync, FaTruck, FaUsers, FaWarehouse,
} from 'react-icons/fa';
import {
  FaBoxArchive, FaCircleQuestion, FaClockRotateLeft, FaHandshake, FaLayerGroup, FaWandMagicSparkles,
} from 'react-icons/fa6';
import Axios from '../../utils/Axios';
import AiMarkdown from '../../components/AiMarkdown';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import {
  consumeStorePortalHandoff, hasStorePortalAccess, hasStorePortalHandoff, leaveStorePortal,
} from '../../utils/storePortalAccess';
import StoreCommandCenter from './store/StoreCommandCenter';
import InventoryControl from './store/InventoryControl';
import ReorderIntelligence from './store/ReorderIntelligence';
import SupplierScorecards from './store/SupplierScorecards';
import InventoryAuditTrail from './store/InventoryAuditTrail';
import DeadStockReport from './store/DeadStockReport';
import AbcClassification from './store/AbcClassification';
import CommandPalette from './store/CommandPalette';
import GuideOverlay from './store/GuideOverlay';
import '../../styles/store-intelligence.css';

// Bumping this key forces the guide to auto-open again for every admin even
// if they've dismissed an older version -- only do that when the content
// changes enough to be worth resurfacing, not on every unrelated deploy.
const GUIDE_SEEN_KEY = 'si_guide_seen_v1';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;
const shell = 'rounded-[26px] border border-white/80 bg-white/95 shadow-[0_22px_55px_-34px_rgba(52,13,48,0.48)] backdrop-blur dark:border-dm-border dark:bg-dm-card';
const label = 'text-[10px] font-black uppercase tracking-[0.16em] text-brown-400 dark:text-white/40';

const areas = [
  { id: 'overview', label: 'Overview', icon: FaStore },
  { id: 'inventory', label: 'Inventory', icon: FaWarehouse },
  { id: 'replenishment', label: 'Reorder intelligence', icon: FaBoxes, keywords: 'restock reorder replenishment low stock safety stock' },
  { id: 'dead-stock', label: 'Dead stock', icon: FaBoxArchive, keywords: 'aging slow moving unsold clearance discount' },
  { id: 'abc-classification', label: 'ABC classification', icon: FaLayerGroup, keywords: 'value ranking pareto class a b c' },
  { id: 'purchasing', label: 'Purchasing', icon: FaClipboardList },
  { id: 'suppliers', label: 'Supplier scorecards', icon: FaHandshake, keywords: 'suppliers on-time lead time' },
  { id: 'stock-counts', label: 'Stock counts', icon: FaCheckCircle },
  { id: 'sales', label: 'Sales intelligence', icon: FaChartLine },
  { id: 'fulfillment', label: 'Fulfillment', icon: FaTruck },
  { id: 'audit-trail', label: 'Audit trail', icon: FaClockRotateLeft, keywords: 'history log movements actions' },
  { id: 'team', label: 'Team & controls', icon: FaUsers },
  { id: 'assistant', label: 'Ask Nawiri', icon: FaWandMagicSparkles },
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

const PurchasingDesk = ({ procurement, inventory, supplierDraft, setSupplierDraft, purchaseDraft, setPurchaseDraft, createSupplier, createPurchaseOrder, advancePurchaseOrder, busy, loading }) => {
  const [composer, setComposer] = useState(null);
  const purchaseOrders = procurement.purchaseOrders || [];
  const selectedProduct = inventory.find((product) => product._id === purchaseDraft.productId);

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] bg-[#260c28] px-5 py-6 text-white shadow-[0_28px_60px_-32px_rgba(40,8,41,0.9)] sm:px-7">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-24 h-24 w-24 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-300">Procurement desk</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Buy with visibility, receive with confidence.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Every supplier commitment becomes a traceable stock movement—not another forgotten WhatsApp note.</p></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Suppliers</p><p className="mt-1 text-xl font-black">{procurement.suppliers || 0}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Open POs</p><p className="mt-1 text-xl font-black">{procurement.openOrders || 0}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Inbound</p><p className="mt-1 text-xl font-black">{procurement.inboundUnits || 0}</p></div></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button type="button" onClick={() => setComposer(composer === 'supplier' ? null : 'supplier')} className="group rounded-[24px] border border-plum-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-plum-300 hover:shadow-md dark:border-dm-border dark:bg-dm-card"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-100"><FaUsers size={15}/></span><FaPlus className="text-plum-500 transition group-hover:rotate-90" size={13}/></div><h3 className="mt-5 text-base font-black text-charcoal dark:text-white">Add a supplier</h3><p className="mt-1 text-sm leading-5 text-brown-500 dark:text-white/55">Keep supplier contacts, ordering history, and stock commitments in one place.</p></button>
        <button type="button" onClick={() => setComposer(composer === 'purchase' ? null : 'purchase')} className="group rounded-[24px] border border-gold-200 bg-gold-50/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-gold-800/50 dark:bg-gold-900/10"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-200 text-plum-800 dark:bg-gold-900/40 dark:text-gold-200"><FaClipboardList size={15}/></span><FaPlus className="text-gold-700 transition group-hover:rotate-90" size={13}/></div><h3 className="mt-5 text-base font-black text-charcoal dark:text-white">Create purchase order</h3><p className="mt-1 text-sm leading-5 text-brown-600 dark:text-white/55">Start a draft first. Stock changes only after the delivery is received and checked.</p></button>
      </div>

      {composer === 'supplier' && <form onSubmit={createSupplier} className={`${shell} animate-in fade-in slide-in-from-top-2 p-5`}><div className="flex items-start justify-between gap-3"><div><p className={label}>New supplier</p><h3 className="mt-1 text-lg font-black text-charcoal dark:text-white">Who supplies this stock?</h3></div><button type="button" onClick={() => setComposer(null)} className="text-xs font-bold text-brown-500">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><input required value={supplierDraft.name} onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Business name" className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"/><input value={supplierDraft.contactName} onChange={(event) => setSupplierDraft((current) => ({ ...current, contactName: event.target.value }))} placeholder="Contact person" className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"/><input value={supplierDraft.phone} onChange={(event) => setSupplierDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"/></div><button type="submit" disabled={busy} className="mt-4 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save supplier</button></form>}

      {composer === 'purchase' && <form onSubmit={createPurchaseOrder} className={`${shell} animate-in fade-in slide-in-from-top-2 p-5`}><div className="flex items-start justify-between gap-3"><div><p className={label}>New purchase order</p><h3 className="mt-1 text-lg font-black text-charcoal dark:text-white">Draft the supplier commitment</h3></div><button type="button" onClick={() => setComposer(null)} className="text-xs font-bold text-brown-500">Close</button></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><select required value={purchaseDraft.supplierId} onChange={(event) => setPurchaseDraft((current) => ({ ...current, supplierId: event.target.value }))} className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none dark:border-dm-border dark:bg-dm-card-2"><option value="">Select supplier</option>{(procurement.supplierList || []).map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select><select required value={purchaseDraft.productId} onChange={(event) => { const product = inventory.find((item) => item._id === event.target.value); setPurchaseDraft((current) => ({ ...current, productId: event.target.value, unitCost: product?.costPrice || current.unitCost })); }} className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none dark:border-dm-border dark:bg-dm-card-2"><option value="">Select product</option>{inventory.map((product) => <option key={product._id} value={product._id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}</select><input required type="number" min="1" value={purchaseDraft.quantity} onChange={(event) => setPurchaseDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="Units ordered" className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none dark:border-dm-border dark:bg-dm-card-2"/><input required type="number" min="0" value={purchaseDraft.unitCost} onChange={(event) => setPurchaseDraft((current) => ({ ...current, unitCost: event.target.value }))} placeholder="Unit cost (KES)" className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none dark:border-dm-border dark:bg-dm-card-2"/><input type="date" value={purchaseDraft.expectedDate} onChange={(event) => setPurchaseDraft((current) => ({ ...current, expectedDate: event.target.value }))} className="rounded-xl border border-brown-200 bg-ivory px-3 py-3 text-sm outline-none dark:border-dm-border dark:bg-dm-card-2"/><div className="rounded-xl bg-plum-50 px-3 py-3 text-xs leading-5 text-plum-800 dark:bg-plum-900/20 dark:text-plum-100">{selectedProduct ? `${selectedProduct.name} · current cost ${formatKes(selectedProduct.costPrice)}` : 'Choose a product to see its current unit cost.'}</div></div><button type="submit" disabled={busy} className="mt-4 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save draft purchase order</button></form>}

      <section className={`${shell} overflow-hidden`}><div className="flex flex-wrap items-end justify-between gap-3 border-b border-brown-100 px-5 py-5 dark:border-dm-border"><div><p className={label}>Live commitments</p><h3 className="mt-1 text-lg font-black text-charcoal dark:text-white">Purchase order timeline</h3></div><p className="text-xs text-brown-500">Draft → Ordered → Received</p></div><div className="divide-y divide-brown-100 dark:divide-dm-border">{purchaseOrders.slice(0, 8).map((order) => { const total = order.lines.reduce((sum, line) => sum + (line.orderedQuantity * line.unitCost), 0); const received = order.lines.reduce((sum, line) => sum + line.receivedQuantity, 0); const ordered = order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0); return <div key={order._id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-black text-charcoal dark:text-white">{order.number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${order.status === 'received' ? 'bg-emerald-50 text-emerald-700' : order.status === 'draft' ? 'bg-brown-100 text-brown-600' : 'bg-gold-50 text-gold-800'}`}>{order.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-brown-500">{order.supplier?.name || 'Supplier'} · {ordered} units · {formatKes(total)}</p><div className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-brown-100 dark:bg-dm-card-2"><div className="h-full rounded-full bg-plum-600" style={{ width: `${ordered ? Math.round((received / ordered) * 100) : 0}%` }} /></div></div><div className="flex shrink-0 gap-2">{order.status === 'draft' && <button type="button" disabled={busy} onClick={() => advancePurchaseOrder(order, 'order')} className="rounded-xl border border-plum-200 px-3 py-2 text-xs font-bold text-plum-700">Mark ordered</button>}{['ordered', 'partially_received'].includes(order.status) && <button type="button" disabled={busy} onClick={() => advancePurchaseOrder(order, 'receive')} className="rounded-xl bg-plum-700 px-3 py-2 text-xs font-bold text-white">Receive {ordered - received} units</button>}</div></div>; })}{!loading && !purchaseOrders.length && <div className="px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-plum-50 text-plum-600"><FaClipboardList/></div><p className="mt-3 font-bold text-charcoal dark:text-white">No purchase orders yet</p><p className="mt-1 text-sm text-brown-500">Add your first supplier, then create a draft above.</p></div>}</div>{purchaseOrders.length > 8 && <p className="border-t border-brown-100 px-5 py-2 text-xs text-brown-500 dark:border-dm-border">Showing 8 of {purchaseOrders.length}.</p>}</section>
    </section>
  );
};

PurchasingDesk.propTypes = {
  procurement: PropTypes.object.isRequired,
  inventory: PropTypes.array.isRequired,
  supplierDraft: PropTypes.object.isRequired,
  setSupplierDraft: PropTypes.func.isRequired,
  purchaseDraft: PropTypes.object.isRequired,
  setPurchaseDraft: PropTypes.func.isRequired,
  createSupplier: PropTypes.func.isRequired,
  createPurchaseOrder: PropTypes.func.isRequired,
  advancePurchaseOrder: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
};

const StockCountDesk = ({ stockControl, startCount, finalizeCount, busy, loading }) => {
  const activeCount = (stockControl.counts || []).find((count) => count.status === 'in_progress');
  const [enteredCounts, setEnteredCounts] = useState({});
  const valueFor = (line) => enteredCounts[String(line.product)] ?? line.countedQuantity ?? line.expectedQuantity;
  return <section className="space-y-5"><div className="relative overflow-hidden rounded-[30px] bg-[#12302c] px-5 py-6 text-white shadow-[0_28px_60px_-32px_rgba(10,45,39,0.9)] sm:px-7"><div className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl"/><div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Inventory accuracy</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Count the shelf. Reconcile the system.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">A count locks the expected quantity at the start, then records every confirmed variance in the audit ledger.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || Boolean(activeCount)} onClick={() => startCount('shop')} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#12302c] disabled:opacity-50">Start shop count</button><button type="button" disabled={busy || Boolean(activeCount)} onClick={() => startCount('warehouse')} className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Start backroom count</button></div></div></div>{activeCount ? <section className={`${shell} overflow-hidden`}><div className="flex flex-wrap items-end justify-between gap-3 border-b border-brown-100 px-5 py-5 dark:border-dm-border"><div><p className={label}>{activeCount.location} count · {activeCount.number}</p><h3 className="mt-1 text-lg font-black text-charcoal dark:text-white">Enter physical quantities</h3></div><button type="button" disabled={busy} onClick={() => finalizeCount(activeCount, activeCount.lines.map((line) => ({ productId: line.product, countedQuantity: valueFor(line) })))} className="rounded-xl bg-[#12302c] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Finalize and post variances</button></div><div className="max-h-[34rem] overflow-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="sticky top-0 bg-ivory text-[10px] font-black uppercase tracking-wide text-brown-400 dark:bg-dm-card-2"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3 text-right">System</th><th className="px-5 py-3 text-right">Physical</th></tr></thead><tbody>{activeCount.lines.map((line) => <tr key={String(line.product)} className="border-t border-brown-100 dark:border-dm-border"><td className="px-5 py-3"><p className="font-bold text-charcoal dark:text-white">{line.productName}</p><p className="text-xs text-brown-500">{line.sku || 'No SKU'}</p></td><td className="px-5 py-3 text-right font-bold text-brown-600">{line.expectedQuantity}</td><td className="px-5 py-3 text-right"><input type="number" min="0" value={valueFor(line)} onChange={(event) => setEnteredCounts((current) => ({ ...current, [String(line.product)]: event.target.value }))} className="w-20 rounded-lg border border-brown-200 bg-ivory px-2 py-1.5 text-right font-bold outline-none focus:border-emerald-600 dark:border-dm-border dark:bg-dm-card-2"/></td></tr>)}</tbody></table></div></section> : <section className={`${shell} p-8 text-center`}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><FaCheckCircle/></div><p className="mt-3 font-black text-charcoal dark:text-white">No count in progress</p><p className="mt-1 text-sm text-brown-500">Start a shop-floor or backroom count when the team is ready to verify physical stock.</p></section>}<section className={`${shell} overflow-hidden`}><div className="border-b border-brown-100 px-5 py-5 dark:border-dm-border"><p className={label}>Recent ledger</p><h3 className="mt-1 text-lg font-black text-charcoal dark:text-white">Stock activity with a reason</h3></div><div className="divide-y divide-brown-100 dark:divide-dm-border">{(stockControl.movements || []).slice(0, 8).map((movement) => <div key={movement._id} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="block text-sm font-bold text-charcoal dark:text-white">{movement.product?.name || 'Product'}</span><span className="mt-0.5 block text-xs capitalize text-brown-500">{movement.type.replaceAll('_', ' ')}</span></span><span className={`text-sm font-black ${(movement.warehouseDelta || movement.shopDelta) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{movement.warehouseDelta ? `${movement.warehouseDelta > 0 ? '+' : ''}${movement.warehouseDelta} backroom` : `${movement.shopDelta > 0 ? '+' : ''}${movement.shopDelta} shop`}</span></div>)}{!loading && !(stockControl.movements || []).length && <p className="px-5 py-10 text-center text-sm text-brown-500">New receipts, transfers, and stocktake variances will appear here.</p>}</div>{(stockControl.movements || []).length > 8 && <p className="border-t border-brown-100 px-5 py-2 text-xs text-brown-500 dark:border-dm-border">Showing 8 of {stockControl.movements.length}.</p>}</section></section>;
};

StockCountDesk.propTypes = { stockControl: PropTypes.object.isRequired, startCount: PropTypes.func.isRequired, finalizeCount: PropTypes.func.isRequired, busy: PropTypes.bool.isRequired, loading: PropTypes.bool.isRequired };

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
        <h1 className="mt-2 text-2xl font-black text-white">Store Management</h1>
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
  // Same theme state the rest of the admin app uses (ThemeContext, toggled
  // via ThemeToggle) -- Store Intelligence follows the admin's own choice
  // rather than forcing one, same as every other screen.
  const { darkMode } = useTheme();
  const themeClass = darkMode ? 'dark' : '';
  const [area, setArea] = useState(() => areas.some((item) => item.id === window.location.pathname.slice(1)) ? window.location.pathname.slice(1) : 'overview');
  const [brief, setBrief] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [people, setPeople] = useState([]);
  const [procurement, setProcurement] = useState({ suppliers: 0, supplierList: [], purchaseOrders: [], openOrders: 0, inboundUnits: 0 });
  const [stockControl, setStockControl] = useState({ counts: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [asking, setAsking] = useState(false);
  const [aiRange, setAiRange] = useState('today');
  const [aiSourcesSelected, setAiSourcesSelected] = useState(aiSources.map((source) => source.id));
  const [webResearch, setWebResearch] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState({ name: '', contactName: '', phone: '' });
  const [purchaseDraft, setPurchaseDraft] = useState({ supplierId: '', productId: '', quantity: '', unitCost: '', expectedDate: '' });
  const [procurementBusy, setProcurementBusy] = useState(false);
  const [guideSeen, setGuideSeen] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.localStorage.getItem(GUIDE_SEEN_KEY))
  ));
  const [guideOpen, setGuideOpen] = useState(false);

  // Auto-opens once per browser for a new admin so the guide is discovered,
  // not just available -- every visit after that, it only opens on request.
  useEffect(() => { if (!guideSeen) setGuideOpen(true); }, [guideSeen]);
  const closeGuide = () => {
    setGuideOpen(false);
    if (!guideSeen) { window.localStorage.setItem(GUIDE_SEEN_KEY, '1'); setGuideSeen(true); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [briefResult, inventoryResult, ordersResult, peopleResult, procurementResult, stockControlResult] = await Promise.allSettled([
        Axios({ method: 'GET', url: '/api/admin/ai/brief', params: { range: 'today', sources: 'counter,online,inventory,delivery' } }),
        Axios({ method: 'GET', url: '/api/admin/warehouse/inventory', params: { limit: 100 } }),
        Axios({ method: 'GET', url: '/api/order/admin/all' }),
        Axios({ method: 'GET', url: '/api/user/admin/users' }),
        Axios({ method: 'GET', url: '/api/admin/procurement/dashboard' }),
        Axios({ method: 'GET', url: '/api/admin/stock-control/dashboard' }),
      ]);

      if (briefResult.status === 'fulfilled') setBrief(briefResult.value.data?.data || null);
      if (inventoryResult.status === 'fulfilled') setInventory(inventoryResult.value.data?.data?.products || []);
      if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value.data?.data || []);
      if (peopleResult.status === 'fulfilled') setPeople(peopleResult.value.data?.data || []);
      if (procurementResult.status === 'fulfilled') setProcurement(procurementResult.value.data?.data || { suppliers: 0, supplierList: [], purchaseOrders: [], openOrders: 0, inboundUnits: 0 });
      if (stockControlResult.status === 'fulfilled') setStockControl(stockControlResult.value.data?.data || { counts: [], movements: [] });

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

  const activeOrders = useMemo(() => orders.filter((order) => !['delivered', 'cancelled', 'pos'].includes(String(order.status || '').toLowerCase())), [orders]);
  // "Delivery" specifically, not pickup/sacco_pickup -- the "Active deliveries"
  // tile should count orders actually out for delivery, not every open order.
  const activeDeliveryOrders = useMemo(() => activeOrders.filter((order) => String(order.fulfillment_type || '').toLowerCase() === 'delivery'), [activeOrders]);
  const storeStaff = useMemo(() => people.filter((person) => person.isAdmin || person.isStaff || person.isDelivery || person.role === 'admin' || person.role === 'staff'), [people]);

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
  const createSupplier = async (event) => {
    event.preventDefault();
    if (!supplierDraft.name.trim()) return toast.error('Enter the supplier name.');
    setProcurementBusy(true);
    try {
      await Axios({ method: 'POST', url: '/api/admin/procurement/suppliers', data: supplierDraft });
      toast.success('Supplier added.');
      setSupplierDraft({ name: '', contactName: '', phone: '' });
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Supplier could not be added.');
    } finally { setProcurementBusy(false); }
  };
  const createPurchaseOrder = async (event) => {
    event.preventDefault();
    const selected = inventory.find((product) => product._id === purchaseDraft.productId);
    if (!purchaseDraft.supplierId || !selected || !Number(purchaseDraft.quantity)) return toast.error('Choose supplier, product, and quantity.');
    setProcurementBusy(true);
    try {
      await Axios({ method: 'POST', url: '/api/admin/procurement/purchase-orders', data: { supplierId: purchaseDraft.supplierId, expectedDate: purchaseDraft.expectedDate || undefined, lines: [{ productId: selected._id, quantity: Number(purchaseDraft.quantity), unitCost: Number(purchaseDraft.unitCost || selected.costPrice || 0) }] } });
      toast.success('Purchase order saved as a draft.');
      setPurchaseDraft({ supplierId: '', productId: '', quantity: '', unitCost: '', expectedDate: '' });
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase order could not be created.');
    } finally { setProcurementBusy(false); }
  };
  const advancePurchaseOrder = async (purchaseOrder, action) => {
    setProcurementBusy(true);
    try {
      const endpoint = action === 'order' ? `/api/admin/procurement/purchase-orders/${purchaseOrder._id}/order` : `/api/admin/procurement/purchase-orders/${purchaseOrder._id}/receive`;
      const data = action === 'receive' ? { lines: purchaseOrder.lines.filter((line) => line.receivedQuantity < line.orderedQuantity).map((line) => ({ productId: line.product, quantity: line.orderedQuantity - line.receivedQuantity })) } : undefined;
      await Axios({ method: 'POST', url: endpoint, data });
      toast.success(action === 'order' ? 'Purchase order marked ordered.' : 'Stock received into the backroom.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase order could not be updated.');
    } finally { setProcurementBusy(false); }
  };
  const startCount = async (location) => {
    setProcurementBusy(true);
    try {
      await Axios({ method: 'POST', url: '/api/admin/stock-control/counts', data: { location } });
      toast.success(`${location === 'warehouse' ? 'Backroom' : 'Shop'} count started.`);
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Stock count could not be started.'); } finally { setProcurementBusy(false); }
  };
  const finalizeCount = async (count, lines) => {
    setProcurementBusy(true);
    try {
      await Axios({ method: 'POST', url: `/api/admin/stock-control/counts/${count._id}/finalize`, data: { lines } });
      toast.success('Stock count finalized and variances recorded.');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Stock count could not be finalized.'); } finally { setProcurementBusy(false); }
  };

  const areaContent = {
    overview: <StoreCommandCenter onOpenArea={selectArea} />,
    inventory: <InventoryControl />,
    replenishment: <ReorderIntelligence />,
    'dead-stock': <DeadStockReport />,
    'abc-classification': <AbcClassification />,
    suppliers: <SupplierScorecards />,
    'audit-trail': <InventoryAuditTrail />,
    sales: <section className="grid gap-4 lg:grid-cols-2"><div className={`${shell} p-5`}><p className={label}>Trade desk</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Today’s channel mix</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-plum-50 p-4 dark:bg-plum-900/20"><p className={label}>Counter</p><p className="mt-2 text-xl font-black text-plum-800 dark:text-plum-200">{formatKes(metrics.counterRevenue)}</p><p className="mt-1 text-xs text-brown-500">{metrics.counterSaleCount || 0} transactions</p></div><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Online</p><p className="mt-2 text-xl font-black text-charcoal dark:text-white">{formatKes(metrics.onlineRevenue)}</p><p className="mt-1 text-xs text-brown-500">{metrics.onlineOrderCount || 0} orders</p></div></div><button type="button" onClick={() => openMain('/dashboard/sales-hub')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open full sales hub <FaArrowRight size={12}/></button></div><div className={`${shell} p-5`}><p className={label}>Decision support</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Make the next move clear</h2><p className="mt-3 text-sm leading-6 text-brown-500 dark:text-white/55">Use the assistant to compare counter and online trends, identify products worth featuring, or turn a revenue dip into a practical investigation.</p><button type="button" onClick={() => setQuestionAndOpen('Compare today’s counter and online sales. What should I investigate first, and what one decision do you need from me?')} className="mt-5 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white">Ask about sales</button></div></section>,
    fulfillment: <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><div className={`${shell} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-brown-100 p-5 dark:border-dm-border"><div><p className={label}>Orders in motion</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Fulfilment control</h2></div><span className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs font-black text-plum-700 dark:bg-plum-900/30 dark:text-plum-100">{activeOrders.length} open</span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-ivory text-[11px] uppercase tracking-wide text-brown-400 dark:bg-dm-card-2"><tr><th className="p-3 font-bold">Order</th><th className="p-3 font-bold">Customer</th><th className="p-3 font-bold">Status</th><th className="p-3 text-right font-bold">Value</th></tr></thead><tbody>{activeOrders.slice(0, 6).map((order) => <tr key={order._id || order.orderId} className="border-t border-brown-100 dark:border-dm-border"><td className="p-3"><p className="font-bold text-charcoal dark:text-white">{order.orderId || 'Order'}</p><p className="text-xs text-brown-500">{order.fulfillment_type || 'Delivery'}</p></td><td className="p-3 text-brown-700 dark:text-white/70">{order.userId?.name || order.guestShipping?.name || 'Guest customer'}</td><td className="p-3"><span className="rounded-md bg-gold-50 px-2 py-1 text-xs font-bold text-brown-700 dark:bg-gold-900/15 dark:text-gold-100">{String(order.status || 'pending').replaceAll('_', ' ')}</span></td><td className="p-3 text-right font-bold text-charcoal dark:text-white">{formatKes(order.totalAmt)}</td></tr>)}{!loading && !activeOrders.length && <tr><td colSpan="4" className="p-8 text-center text-brown-500">No open online orders right now.</td></tr>}</tbody></table></div>{activeOrders.length > 6 && <p className="px-4 py-2 text-xs text-brown-500">Showing 6 of {activeOrders.length} open orders.</p>}<button type="button" onClick={() => openMain('/dashboard/allorders')} className="m-4 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open full order desk <FaArrowRight size={12}/></button></div><div className="space-y-4"><div className={`${shell} p-5`}><p className={label}>Live workload</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Open online orders</p><p className="mt-2 text-2xl font-black text-charcoal dark:text-white">{activeOrders.length}</p></div><div className="rounded-xl bg-ivory p-4 dark:bg-dm-card-2"><p className={label}>Active deliveries</p><p className="mt-2 text-2xl font-black text-charcoal dark:text-white">{activeDeliveryOrders.length}</p></div></div></div><div className="rounded-2xl bg-plum-800 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-300">Operating question</p><h2 className="mt-2 text-lg font-black text-white">What could delay a customer today?</h2><p className="mt-2 text-sm leading-6 text-white/70">Ask Nawiri to combine order volume, drivers, counter traffic, and stock risk before you assign work.</p><button type="button" onClick={() => setQuestionAndOpen('Are there any fulfilment risks today? Ask one follow-up question if a manager decision is needed.')} className="mt-5 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-plum-950">Review fulfilment</button></div></div></section>,
    team: <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><div className={`${shell} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-brown-100 p-5 dark:border-dm-border"><div><p className={label}>People and permissions</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Store team on duty</h2></div><span className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs font-black text-plum-700 dark:bg-plum-900/30 dark:text-plum-100">{storeStaff.length} operational roles</span></div><div className="divide-y divide-brown-100 dark:divide-dm-border">{storeStaff.slice(0, 7).map((person) => <div key={person._id} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="block text-sm font-bold text-charcoal dark:text-white">{person.name || 'Team member'}</span><span className="mt-0.5 block text-xs text-brown-500">{person.email || person.mobile || 'No contact recorded'}</span></span><span className="rounded-md bg-ivory px-2 py-1 text-xs font-bold capitalize text-brown-700 dark:bg-dm-card-2 dark:text-white/70">{person.isAdmin ? 'Admin' : (person.isDelivery ? 'Delivery' : (person.role || 'Staff'))}</span></div>)}{!loading && !storeStaff.length && <p className="p-8 text-center text-sm text-brown-500">No operational roles are visible.</p>}</div>{storeStaff.length > 7 && <p className="px-5 py-2 text-xs text-brown-500">Showing 7 of {storeStaff.length}.</p>}<button type="button" onClick={() => openMain('/dashboard/users-admin')} className="m-4 inline-flex items-center gap-2 text-sm font-bold text-plum-700">Open people and permissions <FaArrowRight size={12}/></button></div><div className="space-y-4"><div className={`${shell} p-5`}><p className={label}>Protected controls</p><h2 className="mt-1 text-lg font-black text-charcoal dark:text-white">Change access with care</h2><p className="mt-3 text-sm leading-6 text-brown-500 dark:text-white/55">This view gives the store lead live context. Role changes and driver approval stay in the dedicated admin controls, where they are audited.</p><button type="button" onClick={() => openMain('/dashboard/driver-verification')} className="mt-5 rounded-xl border border-plum-200 px-4 py-2.5 text-sm font-bold text-plum-700">Verify drivers</button></div><div className="rounded-2xl bg-charcoal p-5 text-white"><FaCheckCircle className="text-gold-300"/><h2 className="mt-3 text-lg font-black text-white">Admin session only</h2><p className="mt-2 text-sm leading-6 text-white/65">Store Management uses a one-time hand-off from the primary Nawiri site and expires with this browser session. Knowing the hostname does not unlock it.</p><button type="button" onClick={leaveStorePortal} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"><FaSignOutAlt size={12}/> Leave Store Management</button></div></div></section>,
    assistant: <section className="grid gap-4 xl:grid-cols-[1fr_340px]"><div className={`${shell} min-h-[36rem] p-5`}><p className={label}>Nawiri operations assistant</p><h2 className="mt-1 text-xl font-black text-charcoal dark:text-white">Ask. Then decide.</h2><p className="mt-2 text-sm text-brown-500 dark:text-white/55">It sees the current counter, online, inventory, and delivery snapshot. When your preference or missing information changes the advice, it will ask one precise follow-up question.</p><div className="mt-5 space-y-3">{turns.length === 0 && <div className="rounded-2xl bg-plum-50 p-4 text-sm leading-6 text-plum-900 dark:bg-plum-900/20 dark:text-plum-100"><FaWandMagicSparkles className="mb-2 text-plum-600"/>Before we plan tomorrow: should the priority be protecting cash, recovering online sales, or replenishing fast movers?</div>}{turns.map((turn, index) => <div key={`${turn.question}-${index}`} className="space-y-2"><div className="ml-auto max-w-[85%] rounded-2xl bg-ivory p-3 text-sm text-charcoal dark:bg-dm-card-2 dark:text-white">{turn.question}</div><div className="max-w-[92%] rounded-2xl border border-plum-100 bg-plum-50/60 p-4 dark:border-plum-900/50 dark:bg-plum-900/10">{turn.answer?.available ? <AiMarkdown text={turn.answer.text} /> : <p className="text-sm text-brown-700 dark:text-white/65">{turn.answer?.reason || 'No answer was available.'}</p>}</div></div>)}</div><form onSubmit={ask} className="mt-5 border-t border-brown-100 pt-4 dark:border-dm-border"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="3" placeholder="Ask a decision question about the store…" className="w-full rounded-2xl border border-brown-200 bg-ivory p-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2"/><button type="submit" disabled={asking} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{asking ? <FaSync className="animate-spin" size={12}/> : <FaWandMagicSparkles size={12}/>} {asking ? 'Thinking…' : 'Ask Nawiri'}</button></form></div><aside className={`${shell} h-fit p-5`}><p className={label}>Useful starting points</p><div className="mt-4 space-y-2">{['What needs my attention before opening tomorrow?', 'Which products should I replenish first, and what do you need to know from me?', 'Why is online revenue different from counter revenue?', 'What can delay an order today?'].map((item) => <button key={item} type="button" onClick={(event) => ask(event, item)} className="w-full rounded-xl bg-ivory p-3 text-left text-sm font-semibold text-brown-700 hover:bg-plum-50 hover:text-plum-800 dark:bg-dm-card-2 dark:text-white/70">{item}</button>)}</div></aside></section>,
  };

  areaContent.purchasing = <PurchasingDesk procurement={procurement} inventory={inventory} supplierDraft={supplierDraft} setSupplierDraft={setSupplierDraft} purchaseDraft={purchaseDraft} setPurchaseDraft={setPurchaseDraft} createSupplier={createSupplier} createPurchaseOrder={createPurchaseOrder} advancePurchaseOrder={advancePurchaseOrder} busy={procurementBusy} loading={loading} />;
  areaContent['stock-counts'] = <StockCountDesk stockControl={stockControl} startCount={startCount} finalizeCount={finalizeCount} busy={procurementBusy} loading={loading} />;

  const sidebar = (
    <aside className="p-3 lg:min-h-[calc(100vh-61px)]" style={{ borderRight: '1px solid var(--si-hairline)' }}>
      <p className="si-eyebrow" style={{ padding: '0 0.75rem' }}>Store operations</p>
      <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col">
        {areas.map((item) => {
          const Icon = item.icon;
          const selected = area === item.id;
          return <button key={item.id} type="button" onClick={() => selectArea(item.id)} className={`si-nav-item ${selected ? 'si-nav-item--active' : ''}`}><Icon size={14} />{item.label}</button>;
        })}
      </nav>
      <p className="si-stat__detail" style={{ padding: '0 0.75rem', marginTop: '1.25rem' }}><span className="si-kbd">⌘K</span> to jump anywhere</p>
    </aside>
  );

  const topBar = (
    <header className="si-header">
      <div className="si-header__inner">
        <div className="si-row">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--si-accent-wash)', color: 'var(--si-accent-strong)' }}><FaStore size={14} /></div>
          <div><p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--si-text)' }}>Nawiri Hair</p><p className="si-eyebrow">Store Intelligence</p></div>
        </div>
        <div className="si-row">
          <ThemeToggle />
          <button type="button" onClick={() => setGuideOpen(true)} className="si-btn si-btn--ghost si-guide-trigger" aria-label="Open store guide">
            <FaCircleQuestion size={13} />
            {!guideSeen && <span className="si-guide-trigger__dot" />}
          </button>
          <button type="button" onClick={load} disabled={loading} className="si-btn si-btn--ghost" aria-label="Refresh store data"><FaSync className={loading ? 'animate-spin' : ''} size={12} /></button>
          <button type="button" onClick={leaveStorePortal} className="si-btn si-btn--ghost">Exit</button>
        </div>
      </div>
    </header>
  );

  const paletteAreas = [...areas, { id: '__guide', label: 'Help & guide', icon: FaCircleQuestion, keywords: 'help training tutorial how to guide docs' }];
  const jumpTo = (id) => { if (id === '__guide') { setGuideOpen(true); return; } selectArea(id); };
  const guide = <GuideOverlay open={guideOpen} onClose={closeGuide} areas={areas} activeArea={area} onJump={selectArea} />;

  // themeClass mirrors the admin's own light/dark choice (see useTheme()
  // above) onto this wrapper -- both store-intelligence.css's own tokens
  // and the not-yet-redesigned sections below (Purchasing, Team, Ask
  // Nawiri, etc, which still use the app's dark: variants throughout) read
  // it the same way the rest of the app already does.
  if (area === 'assistant') {
    return (
      <div className={`store-intelligence ${themeClass}`}>
        <CommandPalette areas={paletteAreas} onSelect={jumpTo} />
        {guide}
        {topBar}
        <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
          {sidebar}
          <div className="si-content">
            <div><p className="si-eyebrow">Ask Nawiri</p><h1 className="si-title" style={{ fontSize: '1.5rem' }}>Ask. Then decide.</h1></div>
            <section className="si-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div><p className="si-eyebrow">Analysis window</p><div className="mt-2 flex flex-wrap gap-2">{aiRanges.map((item) => <button key={item.id} type="button" onClick={() => setAiRange(item.id)} className="si-btn si-btn--ghost" style={aiRange === item.id ? { borderColor: 'var(--si-accent)', color: 'var(--si-accent-strong)' } : undefined}>{item.label}</button>)}</div></div>
                <div><p className="si-eyebrow">Business data</p><div className="mt-2 flex flex-wrap gap-2">{aiSources.map((source) => <button key={source.id} type="button" onClick={() => toggleAiSource(source.id)} className="si-btn si-btn--ghost" style={aiSourcesSelected.includes(source.id) ? { borderColor: 'var(--si-accent)', color: 'var(--si-accent-strong)' } : undefined}>{aiSourcesSelected.includes(source.id) && '✓ '}{source.label}</button>)}</div></div>
                <label className="si-row" style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--si-text-muted)' }}><input type="checkbox" checked={webResearch} onChange={(event) => setWebResearch(event.target.checked)} /><FaGlobeAfrica style={{ color: 'var(--si-accent)' }} /> Include web research</label>
              </div>
              {webResearch && <p className="si-stat__detail" style={{ marginTop: '0.75rem' }}>Web research is owner-initiated. Nawiri receives only the selected, aggregated store snapshot and separates outside research from your business data.</p>}
            </section>
            {areaContent.assistant}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`store-intelligence ${themeClass}`}>
      <CommandPalette areas={paletteAreas} onSelect={jumpTo} />
      {guide}
      {topBar}
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
        {sidebar}
        <div className="si-content">
          <div className="si-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div><p className="si-eyebrow">{areas.find((item) => item.id === area)?.label}</p><h1 className="si-title" style={{ fontSize: '1.5rem' }}>{area === 'overview' ? 'Run the store with a single view' : areas.find((item) => item.id === area)?.label}</h1></div>
            {area !== 'assistant' && <button type="button" onClick={() => selectArea('assistant')} className="si-btn si-btn--primary"><FaWandMagicSparkles size={12} /> Ask Nawiri</button>}
          </div>
          {areaContent[area]}
        </div>
      </div>
    </div>
  );
};

export default StorePortalGate;
