import { useState } from 'react';
import { FaRobot, FaUser } from 'react-icons/fa6';
import { useAuditTrail } from './hooks/useStoreIntelligence';

const timeLabel = (isoDate) => new Date(isoDate).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

const InventoryAuditTrail = () => {
  const [actorType, setActorType] = useState('');
  const { data: entries, loading } = useAuditTrail({ actorType: actorType || undefined });

  return (
    <div className="si-grid" style={{ gap: '1.25rem' }}>
      <section className="si-card">
        <div className="si-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p className="si-eyebrow">Every stock change and every write, in one place</p>
            <p className="si-title" style={{ fontSize: '0.9375rem' }}>Audit trail</p>
          </div>
          <div className="si-row">
            {[['', 'All'], ['ai', 'Ask Nawiri'], ['admin', 'Staff']].map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                className="si-btn si-btn--ghost"
                style={actorType === value ? { borderColor: 'var(--si-accent)', color: 'var(--si-accent-strong)' } : undefined}
                onClick={() => setActorType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="si-stat__detail" style={{ marginTop: '0.5rem' }}>
          Merges the inventory movement ledger (every warehouse receipt, transfer, and stocktake adjustment) with
          the admin action log (every other write, including the AI copilot's capped, audited actions) — neither
          had a browsing view before this.
        </p>
      </section>

      <section className="si-table-wrap">
        <table className="si-table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th><th>Reason</th></tr></thead>
          <tbody>
            {(entries || []).map((entry) => (
              <tr key={`${entry.kind}-${entry.id}`}>
                <td className="si-mono si-muted" style={{ whiteSpace: 'nowrap' }}>{timeLabel(entry.createdAt)}</td>
                <td>
                  <span className="si-row" style={{ fontSize: '0.8125rem' }}>
                    {entry.actor === 'Ask Nawiri' ? <FaRobot size={12} style={{ color: 'var(--si-accent)' }} /> : <FaUser size={11} style={{ color: 'var(--si-text-faint)' }} />}
                    {entry.actor}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{entry.summary}</td>
                <td className="si-muted">{entry.detail}</td>
                <td className="si-muted">{entry.reason}</td>
              </tr>
            ))}
            {!loading && !(entries || []).length && <tr><td colSpan="5" className="si-table-empty">No activity recorded yet for this filter.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default InventoryAuditTrail;
