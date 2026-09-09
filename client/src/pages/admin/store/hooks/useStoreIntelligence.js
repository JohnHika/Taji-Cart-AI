import { useCallback, useEffect, useState } from 'react';
import Axios from '../../../../utils/Axios';

const useFetchState = (fetcher, deps) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetcher();
      setData(response.data?.data ?? null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this data.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
};

// Reuses the existing operations brief endpoint (same one AdminAiInsights and
// the legacy overview already call) -- Store Command Center's KPI strip and
// manager's queue are not a new data source, just a new presentation of it.
export const useOperationsBrief = () => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/ai/brief', params: { range: 'today', sources: 'counter,online,inventory,delivery' } }),
  [],
);

export const useSalesTrend = (days = 30) => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/sales-trend', params: { days } }),
  [days],
);

export const useReplenishmentQueue = () => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/replenishment-queue' }),
  [],
);

export const useSupplierScorecards = () => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/supplier-scorecards' }),
  [],
);

export const useAuditTrail = (filters = {}) => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/audit-trail', params: filters }),
  [filters.productId, filters.actorType, filters.since],
);

export const useDeadStockReport = () => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/dead-stock' }),
  [],
);

export const useAbcClassification = () => useFetchState(
  () => Axios({ method: 'GET', url: '/api/admin/inventory-intelligence/abc-classification' }),
  [],
);

export const saveInventoryPolicy = (productId, payload) => Axios({
  method: 'POST', url: `/api/admin/inventory-intelligence/policy/${productId}`, data: payload,
});
