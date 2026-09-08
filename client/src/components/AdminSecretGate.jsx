import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import isAdmin from '../utils/isAdmin';
import { launchStorePortal } from '../utils/storePortalAccess';

// Typing this sequence anywhere on the public site (not the address bar)
// opens the standalone Store Management application for an already
// authenticated admin. The listener intentionally never attaches to an input
// or to non-admin accounts. The server then creates a short-lived, one-time
// handoff; this shortcut grants no authority by itself.
const TRIGGER_SEQUENCE = 'n.store123';
export const STORE_GATE_SESSION_KEY = 'storeGateUnlocked';

const AdminSecretGate = () => {
  const user = useSelector((state) => state.user);
  const bufferRef = useRef('');

  useEffect(() => {
    if (!isAdmin(user)) return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const isInputFocused = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isInputFocused || event.key.length !== 1) return;

      bufferRef.current = (bufferRef.current + event.key).slice(-TRIGGER_SEQUENCE.length);
      if (bufferRef.current === TRIGGER_SEQUENCE) {
        bufferRef.current = '';
        launchStorePortal().catch((error) => {
          console.error('Could not launch Store Management:', error);
          toast.error(error.response?.data?.message || error.message || 'Could not open Store Management.');
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  return null;
};

export default AdminSecretGate;
