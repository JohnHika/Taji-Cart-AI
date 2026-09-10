import { useEffect, useState } from 'react';
import { useDeadStockReport } from './hooks/useStoreIntelligence';

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;
const PAGE_SIZE = 25;

const bucketChip = (bucket) => {
  if (bucket === 'dead') return <span className="si-chip si-chip--critical"><span className="si-dot" />Dead (180+ days)</span>;
  if (bucket === 'slow') return <span className="si-chip si-chip--warn"><span className="si-dot" />Slow (90+ days)</span>;
  return <span className="si-chip si-chip--neutral"><span className="si-dot" />Never sold</span>;
};

const dateLabel = (isoDate) => new Date(isoDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

const DeadStockReport = () => {
  const { data: report, loading } = useDeadStockReport();
  const items = report?.items || [];
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [items.length]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))' }}>
        <div className="si-card">
          <p className="si-stat__label">Trapped in unsold stock</p>
          <p className="si-stat__value si-mono">{loading ? '—' : formatKes(report?.totalTrappedValue)}</p>
          <p className="si-stat__detail">Cost-price value of {items.length} product{items.length === 1 ? '' : 's'}</p>
        </div>
        <div className="si-card">
          <p className="si-stat__label">Slow (90–179 days)</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (report?.counts.slow ?? 0)}</p>
          <p className="si-stat__detail">Still selling, just slowly</p>
        </div>
        <div className="si-card">
          <p className="si-stat__label">Dead (180+ days)</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (report?.counts.dead ?? 0)}</p>
          <p className="si-stat__detail">No realistic near-term demand</p>
        </div>
        <div className="si-card">
          <p className="si-stat__label">Never sold</p>
          <p className="si-stat__value si-mono">{loading ? '—' : (report?.counts.neverSold ?? 0)}</p>
          <p className="si-stat__detail">In the catalogue 30+ days, zero sales</p>
        </div>
      </section>

      <section className="si-card">
        <p className="si-eyebrow">Computed from sale history, not a guess</p>
        <p className="si-title" style={{ fontSize: '0.9375rem' }}>What&apos;s not moving, and what it&apos;s costing you</p>
        <p className="si-stat__detail" style={{ marginTop: '0.35rem', maxWidth: '46rem' }}>
          Ranked by KES value trapped — cost price × units still on the shop floor — not just by how long a product
          has sat. A cheap item sitting for a year matters less than an expensive one sitting for three months.
          Only in-stock products are listed; anything already at zero has nothing trapped to report.
        </p>
      </section>

      <section className="si-table-wrap">
        <table className="si-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="si-align-right">Stock</th>
              <th className="si-align-right">Cost price</th>
              <th className="si-align-right">Value trapped</th>
              <th>Last sold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}<div className="si-mono" style={{ fontSize: '0.6875rem', color: 'var(--si-text-faint)' }}>{item.sku}</div></td>
                <td className="si-align-right si-mono">{item.stock}</td>
                <td className="si-align-right si-mono">{item.costPrice > 0 ? formatKes(item.costPrice) : <span style={{ color: 'var(--si-warn)' }}>no cost set</span>}</td>
                <td className="si-align-right si-mono" style={{ fontWeight: 600 }}>{item.costPrice > 0 ? formatKes(item.trappedValue) : '—'}</td>
                <td className="si-muted">{item.lastSoldAt ? dateLabel(item.lastSoldAt) : 'Never'}</td>
                <td>{bucketChip(item.bucket)}</td>
              </tr>
            ))}
            {!loading && !items.length && <tr><td colSpan="6" className="si-table-empty">Nothing is sitting unsold right now.</td></tr>}
          </tbody>
        </table>
      </section>

      {items.length > PAGE_SIZE && (
        <div className="si-row" style={{ justifyContent: 'space-between' }}>
          <span className="si-stat__detail">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, items.length)} of {items.length}</span>
          <div className="si-row">
            <button type="button" className="si-btn si-btn--ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span className="si-stat__detail">Page {page} of {totalPages}</span>
            <button type="button" className="si-btn si-btn--ghost" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadStockReport;
