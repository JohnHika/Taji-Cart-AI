import { useSupplierScorecards } from './hooks/useStoreIntelligence';

const rateChip = (rate, goodAt = 80, warnAt = 50) => {
  if (rate === null) return <span className="si-chip si-chip--neutral">No history yet</span>;
  if (rate >= goodAt) return <span className="si-chip si-chip--good"><span className="si-dot" />{rate}%</span>;
  if (rate >= warnAt) return <span className="si-chip si-chip--warn"><span className="si-dot" />{rate}%</span>;
  return <span className="si-chip si-chip--critical"><span className="si-dot" />{rate}%</span>;
};

const SupplierScorecards = () => {
  const { data: suppliers, loading } = useSupplierScorecards();
  const ranked = [...(suppliers || [])].sort((left, right) => (right.onTimeRate ?? -1) - (left.onTimeRate ?? -1));

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-card">
        <p className="si-eyebrow">Computed from purchase order history</p>
        <p className="si-title" style={{ fontSize: '0.9375rem' }}>Who actually delivers on time</p>
        <p className="si-stat__detail" style={{ marginTop: '0.35rem', maxWidth: '46rem' }}>
          On-time rate compares each order's actual receipt date against the expected date you set when it was
          placed. Order accuracy compares units received against units ordered across every line. Nothing here is
          self-reported — it's read straight from the receiving history.
        </p>
      </section>

      <section className="si-table-wrap">
        <table className="si-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th className="si-align-right">Orders placed</th>
              <th className="si-align-right">Avg. lead time</th>
              <th className="si-align-right">On-time rate</th>
              <th className="si-align-right">Order accuracy</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((supplier) => (
              <tr key={supplier.supplierId}>
                <td>{supplier.name}{!supplier.active && <span className="si-chip si-chip--neutral" style={{ marginLeft: '0.5rem' }}>Inactive</span>}</td>
                <td className="si-align-right si-mono">{supplier.totalOrders}</td>
                <td className="si-align-right si-mono">{supplier.averageLeadTimeDays ?? '—'}{supplier.averageLeadTimeDays !== null ? 'd' : ''}</td>
                <td className="si-align-right">{rateChip(supplier.onTimeRate)}</td>
                <td className="si-align-right">{rateChip(supplier.orderAccuracyRate, 95, 85)}</td>
              </tr>
            ))}
            {!loading && !ranked.length && <tr><td colSpan="5" className="si-table-empty">No suppliers recorded yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default SupplierScorecards;
