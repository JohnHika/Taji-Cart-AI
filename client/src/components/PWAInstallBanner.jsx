import { useEffect, useState } from 'react';
import { FaApple, FaChrome, FaDownload, FaMobileAlt, FaShareSquare, FaTimes } from 'react-icons/fa';

const DISMISS_KEY = 'nawiri_pwa_install_dismissed_v2';

/** Detect iOS — `beforeinstallprompt` is not supported there */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator.standalone);
}

/**
 * PWAInstallBanner
 * – Always visible on mobile / md screens (hidden lg+) unless dismissed
 * – When `beforeinstallprompt` fires → native one-tap install
 * – On iOS → show "Share → Add to Home Screen" instructions
 * – Without prompt (dev, Firefox, etc.) → show generic install guidance
 * – Dismissal persisted in localStorage so it doesn't reappear
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    // Already dismissed by user
    if (localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    // Capture the native install prompt (Chrome / Edge / Android)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide once app is installed
    window.addEventListener('appinstalled', () => setAlreadyInstalled(true));

    // Already running as standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setAlreadyInstalled(true);
    }

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
      setAlreadyInstalled(true);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  // Don't render if dismissed or already installed
  if (dismissed || alreadyInstalled) return null;

  return (
    /* Hidden on lg+ (desktop) — only shows on mobile/md */
    <div className="lg:hidden mx-2 sm:mx-4 mt-3 mb-1">
      <div className="relative rounded-2xl border border-plum-200/60 bg-gradient-to-r from-plum-50 to-blush-50 dark:from-plum-900/30 dark:to-dm-card dark:border-plum-700/40 px-4 py-3 shadow-sm">

        {/* Dismiss button — top-right */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-brown-400 dark:text-white/30 hover:text-brown-600 dark:hover:text-white/60 hover:bg-blush-100 dark:hover:bg-dm-card-2 transition-colors"
        >
          <FaTimes size={9} />
        </button>

        <div className="flex items-start gap-3 pr-5">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-plum-100 dark:bg-plum-800/50 flex items-center justify-center mt-0.5">
            <FaMobileAlt className="text-plum-600 dark:text-plum-300" size={16} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-charcoal dark:text-white leading-tight">
              Install the Nawiri Hair app
            </p>
            <p className="text-xs text-brown-500 dark:text-white/50 mt-0.5 leading-snug">
              Shop faster, get order updates &amp; access offline
            </p>

            <div className="mt-2.5">
              {/* Chrome / Android — native prompt available */}
              {deferredPrompt && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-plum-700 hover:bg-plum-800 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm"
                >
                  <FaDownload size={10} />
                  {installing ? 'Installing…' : 'Install App'}
                </button>
              )}

              {/* iOS — native prompt not available */}
              {ios && !deferredPrompt && (
                <p className="text-xs text-plum-700 dark:text-plum-300 flex items-center gap-1.5 font-medium">
                  <FaApple size={12} />
                  Tap
                  <FaShareSquare size={11} className="text-plum-500" />
                  then &ldquo;Add to Home Screen&rdquo;
                </p>
              )}

              {/* Other browsers — generic guidance */}
              {!ios && !deferredPrompt && (
                <p className="text-xs text-plum-700 dark:text-plum-300 flex items-center gap-1.5 font-medium">
                  <FaChrome size={12} />
                  Open in Chrome for the best experience
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
