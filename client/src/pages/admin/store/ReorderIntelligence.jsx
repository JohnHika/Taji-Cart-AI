import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaCheck, FaTruckFast } from 'react-icons/fa6';
import Axios from '../../../utils/Axios';
import { useReplenishmentQueue, useSupplierScorecards } from './hooks/useStoreIntelligence';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const urgencyChip = (urgency) => {
  if (urgency === 'critical') return <span className="si-chip si-chip--critical"><span className="si-dot" />Out of stock</span>;
  if (urgency === 'high') return <span className="si-chip si-chip--warn"><span className="si-dot" />Reorder now</span>;
  return <span className="si-chip si-chip--neutral"><span className="si-dot" />Below reorder point</span>;
};

const ReorderIntelligence = () => {
  const { data: queue, loading, reload } = useReplenishmentQueue();
  const { data: suppliers } = useSupplierScorecards();
  const [supplierChoice, setSupplierChoice] = useState({});
  const [creatingId, setCreatingId] = useState('');

  const createDraftPO = async (item) => {
    const supplierId = item.supplierId || supplierChoice[item.productId];
    if (!supplierId) return toast.error('Choose a supplier for this product first.');
    // This product has no costPrice on record -- refuse rather than silently
    // draft a real purchase order at KES 0 per unit. Set the product's cost
    // price (Inventory/Upload Product) first, then draft the PO.
    if (!(item.costPrice > 0)) return toast.error(`${item.name} has no cost price set. Add one before drafting a purchase order.`);
    setCreatingId(item.productId);
    try {
      await Axios({
        method: 'POST',
        url: '/api/admin/procurement/purchase-orders',
        data: {
          supplierId,
          lines: [{ productId: item.productId, quantity: item.suggestedOrderQuantity, unitCost: item.costPrice || 0 }],
        },
      });
      toast.success(`Draft purchase order created for ${item.name}.`);
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create the draft purchase order.');
    } finally {
      setCreatingId('');
    }
  };

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-card" data-tour="replenishment-method">
        <p className="si-eyebrow">Computed, not guessed</p>
        <p className="si-title" style={{ fontSize: '0.9375rem' }}>Reorder point = (sales velocity × supplier lead time) + safety stock</p>
        <p className="si-stat__detail" style={{ marginTop: '0.35rem', maxWidth: '46rem' }}>
          Every row below is at or below its computed reorder point. Velocity blends the last 30/60/90 days of
          non-voided sales; lead time comes from that supplier&apos;s actual delivery history. Safety stock is
          statistical (sized to a 95% service level from that product&apos;s own day-to-day demand variability) once
          there&apos;s enough sale-day history to trust — marked <span className="si-mono" style={{ color: 'var(--si-accent-strong)' }}>stat</span> below.
          Everything else falls back to a conservative flat buffer rather than being silently skipped.
        </p>
      </section>

      {/* Below sm, this 10-column table would collapse to Product + one
          metric, scrolling the actual Draft PO action and supplier picker
          off-screen with no hint they exist. A dedicated card list keeps
          every field and the primary action visible; the table (unchanged)
          still carries desktop and up. */}
      <section className="si-table-wrap hidden sm:block">
        <table className="si-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="si-align-right">Shop stock</th>
              <th className="si-align-right">Backroom</th>
              <th className="si-align-right">Velocity / day</th>
              <th className="si-align-right">Lead time</th>
              <th className="si-align-right">Reorder point</th>
              <th className="si-align-right">Days of cover</th>
              <th>Supplier</th>
              <th className="si-align-right">Suggested order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(queue || []).map((item) => (
              <tr key={item.productId}>
                <td>
                  <div>{item.name}</div>
                  <div className="si-mono" style={{ fontSize: '0.6875rem', color: 'var(--si-text-faint)' }}>{item.sku}</div>
                  <div style={{ marginTop: '0.25rem' }}>{urgencyChip(item.urgency)}</div>
                </td>
                <td className="si-align-right si-mono">{item.currentStock}</td>
                <td className="si-align-right si-mono si-muted">{item.warehouseStock}</td>
                <td className="si-align-right si-mono">{item.velocityPerDay}</td>
                <td className="si-align-right si-mono">{item.leadTimeDays}d</td>
                <td className="si-align-right si-mono">
                  {item.reorderPoint}
                  {item.isManualOverride && <span title="Manual override" style={{ color: 'var(--si-accent)' }}> *</span>}
                  {!item.isManualOverride && item.safetyStockMethod === 'statistical' && <span title={`Statistical safety stock at a ${Math.round((item.serviceLevel || 0.95) * 100)}% service level`} style={{ marginLeft: '0.3rem', fontSize: '0.625rem', color: 'var(--si-accent-strong)' }}>stat</span>}
                </td>
                <td className="si-align-right si-mono">{item.daysOfCover ?? '—'}</td>
                <td>
                  {item.supplierName || (
                    <select
                      className="si-mono"
                      style={{ background: 'var(--si-surface-2)', color: 'var(--si-text)', border: '1px solid var(--si-hairline-strong)', borderRadius: '0.4rem', padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                      value={supplierChoice[item.productId] || ''}
                      onChange={(event) => setSupplierChoice((current) => ({ ...current, [item.productId]: event.target.value }))}
                    >
                      <option value="">Choose supplier</option>
                      {(suppliers || []).map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.name}</option>)}
                    </select>
                  )}
                </td>
                <td className="si-align-right si-mono">
                  {item.suggestedOrderQuantity} · {item.costPrice > 0 ? formatKes(item.suggestedOrderQuantity * item.costPrice) : <span style={{ color: 'var(--si-warn)' }}>no cost set</span>}
                </td>
                <td>
                  <button
                    type="button"
                    className="si-btn si-btn--primary"
                    disabled={creatingId === item.productId || !(item.costPrice > 0)}
                    title={item.costPrice > 0 ? undefined : 'Set a cost price for this product first'}
                    onClick={() => createDraftPO(item)}
                  >
                    {creatingId === item.productId ? '…' : <><FaTruckFast size={11} /> Draft PO</>}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !(queue || []).length && (
              <tr><td colSpan="10" className="si-table-empty"><FaCheck style={{ marginRight: '0.35rem', color: 'var(--si-good)' }} />Every product is above its reorder point.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="si-grid sm:hidden" style={{ gap: '0.75rem' }}>
        {(queue || []).map((item) => (
          <div key={item.productId} className="si-card">
            <div className="si-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--si-text)' }}>{item.name}</p>
                <p className="si-mono" style={{ fontSize: '0.6875rem', color: 'var(--si-text-faint)' }}>{item.sku}</p>
              </div>
              {urgencyChip(item.urgency)}
            </div>
            <div className="si-grid" style={{ marginTop: '0.75rem', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div><p className="si-stat__label">Shop</p><p className="si-mono" style={{ fontWeight: 600 }}>{item.currentStock}</p></div>
              <div><p className="si-stat__label">Backroom</p><p className="si-mono si-muted" style={{ fontWeight: 600 }}>{item.warehouseStock}</p></div>
              <div><p className="si-stat__label">Cover</p><p className="si-mono" style={{ fontWeight: 600 }}>{item.daysOfCover ?? '—'}</p></div>
              <div><p className="si-stat__label">Velocity/day</p><p className="si-mono" style={{ fontWeight: 600 }}>{item.velocityPerDay}</p></div>
              <div><p className="si-stat__label">Lead time</p><p className="si-mono" style={{ fontWeight: 600 }}>{item.leadTimeDays}d</p></div>
              <div>
                <p className="si-stat__label">Reorder pt</p>
                <p className="si-mono" style={{ fontWeight: 600 }}>
                  {item.reorderPoint}
                  {item.isManualOverride && <span title="Manual override" style={{ color: 'var(--si-accent)' }}> *</span>}
                  {!item.isManualOverride && item.safetyStockMethod === 'statistical' && <span title={`Statistical safety stock at a ${Math.round((item.serviceLevel || 0.95) * 100)}% service level`} style={{ marginLeft: '0.2rem', fontSize: '0.625rem', color: 'var(--si-accent-strong)' }}>stat</span>}
                </p>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <p className="si-stat__label">Supplier</p>
              {item.supplierName ? <p className="si-mono" style={{ marginTop: '0.3rem', fontWeight: 600 }}>{item.supplierName}</p> : (
                <select
                  className="si-mono"
                  style={{ marginTop: '0.4rem', width: '100%', background: 'var(--si-surface-2)', color: 'var(--si-text)', border: '1px solid var(--si-hairline-strong)', borderRadius: '0.5rem', padding: '0.5rem 0.6rem', fontSize: '0.8125rem' }}
                  value={supplierChoice[item.productId] || ''}
                  onChange={(event) => setSupplierChoice((current) => ({ ...current, [item.productId]: event.target.value }))}
                >
                  <option value="">Choose supplier</option>
                  {(suppliers || []).map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.name}</option>)}
                </select>
              )}
            </div>
            <p className="si-mono" style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
              Suggested order: {item.suggestedOrderQuantity} · {item.costPrice > 0 ? formatKes(item.suggestedOrderQuantity * item.costPrice) : <span style={{ color: 'var(--si-warn)' }}>no cost set</span>}
            </p>
            <button
              type="button"
              className="si-btn si-btn--primary"
              style={{ marginTop: '0.85rem', width: '100%', justifyContent: 'center' }}
              disabled={creatingId === item.productId || !(item.costPrice > 0)}
              title={item.costPrice > 0 ? undefined : 'Set a cost price for this product first'}
              onClick={() => createDraftPO(item)}
            >
              {creatingId === item.productId ? '…' : <><FaTruckFast size={11} /> Draft PO</>}
            </button>
          </div>
        ))}
        {!loading && !(queue || []).length && (
          <div className="si-table-empty"><FaCheck style={{ marginRight: '0.35rem', color: 'var(--si-good)' }} />Every product is above its reorder point.</div>
        )}
      </section>
    </div>
  );
};

export default ReorderIntelligence;
