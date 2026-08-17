import React, { useEffect, useMemo, useState } from 'react';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DEFAULT_DELIVERY_CHARGE, SACCO_TERMINAL_DROPOFF_CHARGE } from '../utils/cbdDelivery';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

// Shared delivery-mode + fee picker for staff-facing order entry (Sales
// Counter, WhatsApp order form). Covers Standard / Bike (zone-fare) / SACCO
// parcel — "foot" delivery is checkout-only since it depends on the
// customer's own live GPS location, which doesn't apply when staff enter an
// order on someone else's behalf.
//
// value: { mode: 'standard'|'bike'|'sacco', zoneId, saccoOperatorId, saccoDestinationTown }
// onChange(nextValue)
// onFeeChange(fee) — called whenever the computed preview fee changes, so the
//   parent can fold it into its own totals. This is a PREVIEW ONLY; the
//   server always recomputes the authoritative charge on submit.
const DeliveryModeSelector = ({ value, onChange, onFeeChange }) => {
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [saccoOperators, setSaccoOperators] = useState([]);
  const [saccoLoading, setSaccoLoading] = useState(false);

  useEffect(() => {
    if (value.mode !== 'bike' || zones.length > 0) return;
    (async () => {
      try {
        setZonesLoading(true);
        const res = await Axios({ ...SummaryApi.getDeliveryZones });
        if (res.data.success) setZones((res.data.data || []).filter((z) => z.isActive));
      } catch (err) {
        AxiosToastError(err);
      } finally {
        setZonesLoading(false);
      }
    })();
  }, [value.mode, zones.length]);

  useEffect(() => {
    if (value.mode !== 'sacco' || saccoOperators.length > 0) return;
    (async () => {
      try {
        setSaccoLoading(true);
        const res = await Axios({ ...SummaryApi.getSaccoOperators });
        if (res.data.success) setSaccoOperators((res.data.data || []).filter((s) => s.isActive));
      } catch (err) {
        AxiosToastError(err);
      } finally {
        setSaccoLoading(false);
      }
    })();
  }, [value.mode, saccoOperators.length]);

  const zonesByCorridor = useMemo(() => {
    const groups = new Map();
    zones.forEach((zone) => {
      if (!groups.has(zone.corridor)) groups.set(zone.corridor, []);
      groups.get(zone.corridor).push(zone);
    });
    return Array.from(groups.entries());
  }, [zones]);

  const selectedZone = useMemo(
    () => zones.find((z) => z._id === value.zoneId) || null,
    [zones, value.zoneId]
  );
  const selectedSaccoOperator = useMemo(
    () => saccoOperators.find((s) => s._id === value.saccoOperatorId) || null,
    [saccoOperators, value.saccoOperatorId]
  );

  const previewFee = useMemo(() => {
    if (value.mode === 'bike') return selectedZone ? selectedZone.fare : DEFAULT_DELIVERY_CHARGE;
    if (value.mode === 'sacco') return SACCO_TERMINAL_DROPOFF_CHARGE;
    return DEFAULT_DELIVERY_CHARGE;
  }, [value.mode, selectedZone]);

  useEffect(() => {
    onFeeChange?.(previewFee);
  }, [previewFee, onFeeChange]);

  const setMode = (mode) => onChange({ ...value, mode });

  const MODES = [
    { id: 'standard', label: 'Standard Delivery', hint: `Flat fee, KSh ${DEFAULT_DELIVERY_CHARGE}` },
    { id: 'bike', label: 'Bike Delivery', hint: 'Zone-fare, wider coverage' },
    { id: 'sacco', label: 'SACCO / Bus Parcel', hint: `Shop-to-terminal, KSh ${SACCO_TERMINAL_DROPOFF_CHARGE}` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg border-2 p-3 text-left transition-colors ${
              value.mode === m.id
                ? 'border-plum-600 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                : 'border-brown-100 dark:border-dm-border'
            }`}
          >
            <p className="text-sm font-semibold text-charcoal dark:text-white">{m.label}</p>
            <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">{m.hint}</p>
          </button>
        ))}
      </div>

      {value.mode === 'bike' && (
        <div>
          <label className="text-sm font-medium text-charcoal dark:text-white">Delivery zone</label>
          <select
            value={value.zoneId || ''}
            onChange={(e) => onChange({ ...value, zoneId: e.target.value })}
            disabled={zonesLoading}
            className="mt-1 w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
          >
            <option value="">{zonesLoading ? 'Loading zones…' : 'Select a zone'}</option>
            {zonesByCorridor.map(([corridor, corridorZones]) => (
              <optgroup key={corridor} label={corridor}>
                {corridorZones.map((zone) => (
                  <option key={zone._id} value={zone._id}>
                    {zone.name} — {DisplayPriceInShillings(zone.fare)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedZone && (
            <p className="mt-1 text-xs text-brown-500 dark:text-white/50">
              Fare for {selectedZone.name}: {DisplayPriceInShillings(selectedZone.fare)}
            </p>
          )}
        </div>
      )}

      {value.mode === 'sacco' && (
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium text-charcoal dark:text-white">SACCO / coach operator</label>
            <select
              value={value.saccoOperatorId || ''}
              onChange={(e) => onChange({ ...value, saccoOperatorId: e.target.value })}
              disabled={saccoLoading}
              className="mt-1 w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            >
              <option value="">{saccoLoading ? 'Loading operators…' : 'Select an operator'}</option>
              {saccoOperators.map((op) => (
                <option key={op._id} value={op._id}>{op.name}</option>
              ))}
            </select>
            {selectedSaccoOperator?.destinationsServed?.length > 0 && (
              <p className="mt-1 text-xs text-brown-500 dark:text-white/50">
                Serves: {selectedSaccoOperator.destinationsServed.join(', ')}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-charcoal dark:text-white">Destination town</label>
            <input
              type="text"
              value={value.saccoDestinationTown || ''}
              onChange={(e) => onChange({ ...value, saccoDestinationTown: e.target.value })}
              placeholder="e.g. Kisumu"
              className="mt-1 w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            />
          </div>
          <p className="text-xs text-brown-500 dark:text-white/50">
            We only collect the {DisplayPriceInShillings(SACCO_TERMINAL_DROPOFF_CHARGE)} shop-to-terminal fee. The
            operator&apos;s own terminal-to-destination fee is paid separately, directly to them.
          </p>
        </div>
      )}

      <p className="text-sm font-semibold text-plum-700 dark:text-plum-300">
        Delivery fee: {DisplayPriceInShillings(previewFee)}
      </p>
    </div>
  );
};

export default DeliveryModeSelector;
