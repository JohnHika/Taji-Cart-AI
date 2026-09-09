import { useState } from 'react';
import { useAbcClassification } from './hooks/useStoreIntelligence';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const classChip = (classification) => {
  if (classification === 'A') return <span className="si-chip si-chip--critical"><span className="si-dot" />A</span>;
  if (classification === 'B') return <span className="si-chip si-chip--warn"><span className="si-dot" />B</span>;
  return <span className="si-chip si-chip--neutral"><span className="si-dot" />C</span>;
};

const FILTERS = [
  ['', 'All'],
  ['A', 'A — top ~80% of value'],
  ['B', 'B — next ~15%'],
  ['C', 'C — trailing ~5%'],
];

const AbcClassification = () => {
  const { data: result, loading } = useAbcClassification();
  const [filter, setFilter] = useState('');
  const items = (result?.items || []).filter((item) => !filter || item.classification === filter);

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))' }}>
        <div className="si-card">
          <p className="si-stat__label">Class A</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (result?.counts.A ?? 0)}</p>
          <p className="si-stat__detail">Deserve tight control — frequent counts, no stockouts</p>
        </div>
        <div className="si-card">
          <p className="si-stat__label">Class B</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (result?.counts.B ?? 0)}</p>
          <p className="si-stat__detail">Moderate attention</p>
        </div>
        <div className="si-card">
          <p className="si-stat__label">Class C</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (result?.counts.C ?? 0)}</p>
          <p className="si-stat__detail">Fine with loose control — low value at stake</p>
        </div>
      </section>

      <section className="si-card">
        <div className="si-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p className="si-eyebrow">Ranked by cost, not retail price</p>
            <p className="si-title" style={{ fontSize: '0.9375rem' }}>Which products actually matter to the business</p>
          </div>
          <div className="si-row">
            {FILTERS.map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                className="si-btn si-btn--ghost"
                style={filter === value ? { borderColor: 'var(--si-accent)', color: 'var(--si-accent-strong)' } : undefined}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="si-stat__detail" style={{ marginTop: '0.5rem', maxWidth: '46rem' }}>
          Annual consumption value = sales velocity × cost price × 365, not retail revenue — ranking by revenue
          overweights high-margin items and hides how much capital is actually tied up in bulk low-margin stock.
          A is the ~20% of SKUs making up ~80% of that value; give those the tightest stock control.
        </p>
        {!loading && result?.totalAnnualConsumptionValue === 0 && (
          <p className="si-chip si-chip--warn" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
            <span className="si-dot" />Every product is falling into C because no product in the catalogue has a cost price set yet — add cost prices to get a real A/B/C split.
          </p>
        )}
      </section>

      <section className="si-table-wrap">
        <table className="si-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="si-align-right">Velocity / day</th>
              <th className="si-align-right">Cost price</th>
              <th className="si-align-right">Annual consumption value</th>
              <th className="si-align-right">Cumulative share</th>
              <th>Class</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}<div className="si-mono" style={{ fontSize: '0.6875rem', color: 'var(--si-text-faint)' }}>{item.sku}</div></td>
                <td className="si-align-right si-mono">{item.velocityPerDay}</td>
                <td className="si-align-right si-mono">{item.costPrice > 0 ? formatKes(item.costPrice) : <span style={{ color: 'var(--si-warn)' }}>no cost set</span>}</td>
                <td className="si-align-right si-mono" style={{ fontWeight: 600 }}>{item.costPrice > 0 ? formatKes(item.annualConsumptionValue) : '—'}</td>
                <td className="si-align-right si-mono">{Math.round(item.cumulativeShare * 100)}%</td>
                <td>{classChip(item.classification)}</td>
              </tr>
            ))}
            {!loading && !items.length && <tr><td colSpan="6" className="si-table-empty">No products match this filter.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AbcClassification;
