import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import useFeatureFlag from '../hooks/useFeatureFlag';
import isAdmin from '../utils/isAdmin';

/**
 * Declarative gate for staged feature releases:
 *
 *   <FeatureGate flagKey="ai-style-finder">
 *     <AIStyleFinder />
 *   </FeatureGate>
 *
 * - Not created in the Feature Releases panel → hidden for everyone
 * - status "admin-only"  → admins see it (with a preview badge), nobody else
 * - status "released"    → everyone sees it
 * - enabled false        → hidden from everyone (kill switch)
 * - unknown key          → hidden for everyone (safe default: gates stay
 *   closed until the feature is registered server-side)
 *
 * See hooks/useFeatureFlag.js for the hook form and visibility rules.
 */
const FeatureGate = ({
  flagKey,
  fallback = null,
  showPreviewBadge = true,
  badgeClassName = '',
  children,
}) => {
  const user = useSelector((state) => state.user);
  const { visible, flag } = useFeatureFlag(flagKey);

  if (!visible) return fallback;

  // Admin previewing an unreleased feature — remind them it's not public yet.
  const isPreview = flag?.status === 'admin-only' && Boolean(isAdmin(user));

  if (isPreview && showPreviewBadge) {
    return (
      <div>
        <span
          className={`mb-2 inline-flex items-center gap-1.5 rounded-pill border border-plum-200 bg-plum-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-plum-700 dark:border-plum-700 dark:bg-plum-900/40 dark:text-plum-200 ${badgeClassName}`}
        >
          🔒 Preview — admin-only until released
        </span>
        {children}
      </div>
    );
  }

  return children;
};

FeatureGate.propTypes = {
  flagKey: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  showPreviewBadge: PropTypes.bool,
  badgeClassName: PropTypes.string,
  children: PropTypes.node,
};

export default FeatureGate;
