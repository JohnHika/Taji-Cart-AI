import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeatureFlags } from '../store/featureFlagSlice';
import isAdmin from '../utils/isAdmin';

// Visibility rules — mirrors server/controllers/featureFlag.controller.js
// (getVisibleFeatureFlags). The server already filters the list per requester,
// so a non-admin never *receives* admin-only flags at all; this check is the
// client-side half and treats a missing/disabled flag as hidden for everyone.
export const isFlagVisibleToUser = (flag, user) => {
  if (!flag || flag.enabled === false) return false;
  if (flag.status === 'released') return true;
  // admin-only preview stage
  return Boolean(isAdmin(user));
};

/**
 * Feature release gate hook.
 *
 *   const { visible, loading, flag } = useFeatureFlag('ai-style-finder');
 *
 * - flag not registered → visible: false for everyone
 * - status "admin-only"  → admins see it, nobody else
 * - status "released"    → everyone sees it
 * - enabled false        → hidden from everyone (kill switch)
 *
 * Triggers a fetch when the cached list is empty/stale (see featureFlagSlice).
 */
const useFeatureFlag = (flagKey) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const { flags, loading } = useSelector((state) => state.featureFlags);

  useEffect(() => {
    if (typeof flagKey !== 'string' || !flagKey) return;
    dispatch(fetchFeatureFlags());
  }, [dispatch, flagKey]);

  const flag = useMemo(
    () => flags.find((f) => f.key === flagKey) || null,
    [flags, flagKey]
  );

  return {
    visible: isFlagVisibleToUser(flag, user),
    loading: loading && !flag,
    flag,
  };
};

export default useFeatureFlag;
