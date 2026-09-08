import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import isAdmin from '../utils/isAdmin';

// Typing this sequence anywhere on the public site (not the address bar)
// reveals the backroom store-inventory page for an already-authenticated
// admin. This is a discovery shortcut only, NOT a security boundary: the
// route stays behind the same PrivateRoute + server auth/admin middleware
// as every other admin page, and the session flag it sets is just what lets
// StoreInventory.jsx skip straight to rendering instead of bouncing back to
// /dashboard. A non-admin (or logged-out visitor) typing the same keys does
// nothing — the listener below never attaches for them in the first place.
const TRIGGER_SEQUENCE = 'n.store123';
export const STORE_GATE_SESSION_KEY = 'storeGateUnlocked';

const AdminSecretGate = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
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
        sessionStorage.setItem(STORE_GATE_SESSION_KEY, '1');
        navigate('/dashboard/store-inventory');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, navigate]);

  return null;
};

export default AdminSecretGate;
