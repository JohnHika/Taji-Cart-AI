import { useEffect, useState } from 'react';
import { FaDownload, FaMobileAlt, FaTimes } from 'react-icons/fa';

const DISMISS_KEY = 'nawiri_pwa_install_dismissed';

/**
 * PWAInstallBanner
 * – Shown only on mobile / md screens (hidden lg+)
 * – Listens for the browser's `beforeinstallprompt` event
 * – Persists dismissal in localStorage so it doesn't keep reappearing
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e) => {
      e.preventDefault(); // stop the mini-infobar from showing
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also hide if the app is already installed
    window.addEventListener('appinstalled', () => setVisible(false));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible) return null;

  return (
    /* Hidden on lg+ screens — only shows on mobile/md */
    <div className="lg:hidden mx-2 sm:mx-4 mt-3 mb-1">
      <div className="relative flex items-center gap-3 rounded-2xl border border-plum-200/60 bg-gradient-to-r from-plum-50 to-blush-50 dark:from-plum-900/30 dark:to-dm-card dark:border-plum-700/40 px-4 py-3 shadow-sm">

        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-plum-100 dark:bg-plum-800/50 flex items-center justify-center">
          <FaMobileAlt className="text-plum-600 dark:text-plum-300" size={15} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-charcoal dark:text-white leading-tight">
            Install the Nawiri Hair app
          </p>
          <p className="text-xs text-brown-500 dark:text-white/50 mt-0.5 leading-snug">
            Shop faster, get order updates &amp; access offline
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          disabled={installing}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-plum-600 hover:bg-plum-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60"
        >
          <FaDownload size={10} />
          {installing ? 'Installing…' : 'Install'}
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="flex-shrink-0 ml-1 w-6 h-6 flex items-center justify-center rounded-full text-brown-400 dark:text-white/30 hover:text-brown-600 dark:hover:text-white/60 hover:bg-blush-100 dark:hover:bg-dm-card-2 transition-colors"
        >
          <FaTimes size={10} />
        </button>
      </div>
    </div>
  );
}
