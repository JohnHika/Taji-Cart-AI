import React, { useEffect, useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import logoLight from '../assets/hair-logo-light.png';
import logoDark from '../assets/hair-logo-dark.png';
import { useTheme } from '../context/ThemeContext';
import isadmin from '../utils/isAdmin';
import AdminMenu from './AdminMenu';
import UserMenu from './UserMenu';

/**
 * Mobile-only chrome for /dashboard/* when the store Header is hidden.
 * Desktop navigation stays in Dashboard sidebar (lg+).
 */
const DashboardMobileHeader = () => {
  const [open, setOpen] = useState(false);
  const user = useSelector((s) => s.user);
  const isAdmin = isadmin(user.role);
  const { darkMode } = useTheme();
  const currentLogo = darkMode ? logoDark : logoLight;

  const handleLogoError = (e) => {
    if (e.target.dataset.fallback) return;
    e.target.dataset.fallback = 'true';
    e.target.src = darkMode ? logoLight : logoDark;
  };

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 border-b border-brown-100 dark:border-dm-border bg-ivory dark:bg-dm-surface shadow-sm">
        <Link
          to="/"
          className="text-sm font-semibold text-plum-700 dark:text-plum-200 hover:text-plum-600 dark:hover:text-plum-100 shrink-0"
        >
          ← Shop
        </Link>
        <Link to="/" className="flex-1 flex justify-center min-w-0" onClick={closeMenu}>
          <img
            src={currentLogo}
            alt="Nawiri Hair"
            className="h-9 w-auto max-w-[140px] object-contain object-center"
            onError={handleLogoError}
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors shrink-0"
          aria-label="Open dashboard menu"
        >
          <FiMenu size={22} />
        </button>
      </header>

      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-plum-900/50 z-40"
            aria-hidden
            onClick={closeMenu}
          />
          <div className="lg:hidden fixed top-0 right-0 h-full w-[min(100%,20rem)] z-50 bg-white dark:bg-dm-card border-l border-brown-100 dark:border-dm-border shadow-hover flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-brown-100 dark:border-dm-border">
              <span className="font-semibold text-charcoal dark:text-white text-sm">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 rounded-lg text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/30"
                aria-label="Close menu"
              >
                <FiX size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {isAdmin ? (
                <AdminMenu close={closeMenu} forLightPanel />
              ) : (
                <UserMenu close={closeMenu} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DashboardMobileHeader;
