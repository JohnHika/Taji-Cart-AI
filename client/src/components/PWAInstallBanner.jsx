import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FaDownload, FaMobileAlt, FaTimes } from 'react-icons/fa';

const DISMISS_KEY = 'nawiri_pwa_install_dismissed_v2';

/**
 * PWAInstallBanner
 * – Only renders when the browser offers a real `beforeinstallprompt` event.
 * – Dismissal persisted in localStorage so it doesn't reappear.
 */
export default function PWAInstallBanner({ context = 'footer' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setAlreadyInstalled(true));

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

  if (dismissed || alreadyInstalled) return null;
  if (!deferredPrompt) return null;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      <div className="relative rounded-lg border border-brown-200 bg-white px-4 py-3 shadow-sm dark:border-dm-border dark:bg-dm-card">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-brown-400 transition-colors hover:bg-brown-100 hover:text-brown-600 dark:text-white/30 dark:hover:bg-dm-card-2 dark:hover:text-white/60"
        >
          <FaTimes size={10} />
        </button>

        <div className="flex items-start gap-3 pr-5">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-600 dark:bg-plum-800/50 dark:text-plum-300">
            <FaMobileAlt size={15} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-charcoal dark:text-white">
              Install the Nawiri Hair app
            </p>
            <p className="mt-0.5 text-xs leading-snug text-brown-500 dark:text-white/50">
              {context === 'footer'
                ? 'Shop faster and get order updates from your home screen.'
                : 'Shop faster and get order updates.'}
            </p>

            <div className="mt-2">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-plum-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-plum-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:opacity-60"
              >
                <FaDownload size={10} />
                {installing ? 'Installing…' : 'Install App'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

PWAInstallBanner.propTypes = {
  context: PropTypes.string,
};
