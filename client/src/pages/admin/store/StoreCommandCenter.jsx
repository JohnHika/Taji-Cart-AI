import PropTypes from 'prop-types';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FaArrowRight } from 'react-icons/fa6';
import { useOperationsBrief, useReplenishmentQueue, useSalesTrend } from './hooks/useStoreIntelligence';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;
const dayLabel = (isoDate) => new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="si-card" style={{ padding: '0.6rem 0.8rem' }}>
      <p className="si-eyebrow">{dayLabel(label)}</p>
      <p className="si-mono" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--si-accent-strong)' }}>{formatKes(payload[0].value)}</p>
    </div>
  );
};
TrendTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array, label: PropTypes.string };

const urgencyChip = (urgency) => {
  if (urgency === 'critical') return <span className="si-chip si-chip--critical"><span className="si-dot" />Out of stock</span>;
  if (urgency === 'high') return <span className="si-chip si-chip--warn"><span className="si-dot" />Reorder now</span>;
  return <span className="si-chip si-chip--neutral"><span className="si-dot" />Below reorder point</span>;
};

const StoreCommandCenter = ({ onOpenArea }) => {
  const { data: brief, loading: briefLoading } = useOperationsBrief();
  const { data: trend, loading: trendLoading } = useSalesTrend(30);
  const { data: queue, loading: queueLoading } = useReplenishmentQueue();

  const metrics = brief?.metrics || {};
  const stockHealth = (queue || []).reduce((acc, item) => {
    acc[item.urgency] = (acc[item.urgency] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))' }}>
        {[
          ['Today’s revenue', formatKes(metrics.revenue), `${(metrics.counterSaleCount || 0) + (metrics.onlineOrderCount || 0)} transactions`],
          ['Counter', formatKes(metrics.counterRevenue), `${metrics.counterItemsSold || 0} items sold`],
          ['Online', formatKes(metrics.onlineRevenue), `${metrics.onlineOrderCount || 0} orders`],
          ['Needs restocking', (queue || []).length, `${stockHealth.critical || 0} out of stock`],
        ].map(([name, value, hint]) => (
          <div key={name} className="si-card">
            <p className="si-stat__label">{name}</p>
            <p className="si-stat__value si-mono">{briefLoading && queueLoading ? '—' : value}</p>
            <p className="si-stat__detail">{hint}</p>
          </div>
        ))}
      </section>

      <section className="si-grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="si-card">
          <p className="si-eyebrow">Last 30 days</p>
          <p className="si-title" style={{ fontSize: '0.9375rem' }}>Revenue trend</p>
          <div style={{ height: '13rem', marginTop: '0.75rem' }}>
            {trendLoading ? (
              <div className="si-table-empty">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend || []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="siRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--si-accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--si-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--si-hairline)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: 'var(--si-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: 'var(--si-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} width={38} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--si-accent-strong)" strokeWidth={2} fill="url(#siRevenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="si-card">
          <p className="si-eyebrow">Stock health</p>
          <p className="si-title" style={{ fontSize: '0.9375rem' }}>{(queue || []).length} products need attention</p>
          <div className="si-grid" style={{ marginTop: '0.85rem', gap: '0.5rem' }}>
            {[
              ['critical', 'Out of stock'],
              ['high', 'Reorder now'],
              ['low', 'Below reorder point'],
            ].map(([key, name]) => (
              <div key={key} className="si-row" style={{ justifyContent: 'space-between' }}>
                <span className="si-row" style={{ fontSize: '0.8125rem', color: 'var(--si-text-muted)' }}>{urgencyChip(key)} {name}</span>
                <span className="si-mono" style={{ fontWeight: 600 }}>{stockHealth[key] || 0}</span>
              </div>
            ))}
          </div>
          <button type="button" className="si-btn si-btn--ghost" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => onOpenArea('replenishment')}>
            Open reorder intelligence <FaArrowRight size={11} />
          </button>
        </div>
      </section>

      <section className="si-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="si-row" style={{ justifyContent: 'space-between', padding: '1rem 1.125rem', borderBottom: '1px solid var(--si-hairline)' }}>
          <div>
            <p className="si-eyebrow">Most urgent</p>
            <p className="si-title" style={{ fontSize: '0.9375rem' }}>Top of the replenishment queue</p>
          </div>
          <button type="button" className="si-btn si-btn--ghost" onClick={() => onOpenArea('replenishment')}>View all <FaArrowRight size={11} /></button>
        </div>
        <div className="si-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="si-table">
            <thead><tr><th>Product</th><th className="si-align-right">Stock</th><th className="si-align-right">Days of cover</th><th>Status</th></tr></thead>
            <tbody>
              {(queue || []).slice(0, 5).map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}<div className="si-mono" style={{ fontSize: '0.6875rem', color: 'var(--si-text-faint)' }}>{item.sku}</div></td>
                  <td className="si-align-right si-mono">{item.currentStock}</td>
                  <td className="si-align-right si-mono">{item.daysOfCover ?? '—'}</td>
                  <td>{urgencyChip(item.urgency)}</td>
                </tr>
              ))}
              {!queueLoading && !(queue || []).length && <tr><td colSpan="4" className="si-table-empty">Nothing needs restocking right now.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

StoreCommandCenter.propTypes = { onOpenArea: PropTypes.func.isRequired };

export default StoreCommandCenter;
