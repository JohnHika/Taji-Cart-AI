/* eslint-disable react/prop-types */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaBolt, FaCamera, FaChevronDown, FaChevronUp, FaShoppingBasket, FaTimes } from 'react-icons/fa';
import CartItemRow from './CartItemRow';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

// Short tactile confirmation so a cashier doesn't have to watch the screen
// for every single scan — standard on native scanner apps. No-ops silently
// where the Vibration API isn't available (iOS Safari, some browsers).
const vibrate = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Best-effort only.
  }
};

// Mirrors the html5-qrcode `qrbox` size below in real px so the on-screen
// reticle is a true representation of the region actually being decoded,
// not just decoration.
const SCAN_BOX_WIDTH = 220;
const SCAN_BOX_HEIGHT = 90;

const SCAN_FORMAT_NAMES = [
  'QR_CODE',
  'CODE_128',
  'CODE_39',
  'CODE_93',
  'CODABAR',
  'ITF',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
];

// How long we'll wait for the opened camera to actually paint a frame
// before treating it as failed. html5-qrcode's start() can resolve
// successfully (permission granted, stream attached) while the <video>
// element never renders anything — a silent "blank camera" failure mode
// that's otherwise indistinguishable from "still loading".
const VIDEO_FRAME_TIMEOUT_MS = 4000;

// html5-qrcode doesn't always reject with a proper DOMException — it often
// rejects with a plain string, or with a generic Error/TypeError from its
// own internal code (e.g. constructing the native BarcodeDetector with a
// format it doesn't support). Matching only `.name` silently dumps all of
// those into the unhelpful generic message below, which is what cashiers
// were actually hitting — so match on the stringified error too.
const getCameraErrorMessage = (error) => {
  const name = error?.name || '';
  const attemptLogText = Array.isArray(error?.__attemptLog) ? error.__attemptLog.join(' ') : '';
  const text = `${name} ${error?.message || ''} ${typeof error === 'string' ? error : ''} ${attemptLogText}`.toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || text.includes('permission')) {
    return 'Camera permission was denied. Allow camera access in your browser, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || text.includes('no camera') || text.includes('not found')) {
    return 'No usable rear camera was found. Use the code field or a Bluetooth scanner instead.';
  }
  if (name === 'NotReadableError' || text.includes('could not start video source') || text.includes('already in use') || text.includes('trackstart')) {
    return 'Another app is using the camera. Close it, then try again.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera scanning needs a secure https:// connection — open this page over https and try again.';
  }
  return 'The camera could not start. You can still type, paste, or use a hardware scanner.';
};

const describeError = (err) => {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  const name = err.name || err.constructor?.name || 'Error';
  const message = err.message || (() => { try { return JSON.stringify(err); } catch { return String(err); } })();
  return `${name}: ${message}`;
};

const ProductCodeScanner = ({ onDetected, onClose, cart = [], onIncrement, onDecrement, onRemove, onCheckout }) => {
  const generatedId = useId();
  const scannerIdRef = useRef(`sales-counter-scanner-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
  const scannerRef = useRef(null);
  const detectingRef = useRef(false);
  const lastAddedCodeRef = useRef('');
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const onDecrementRef = useRef(onDecrement);
  const [status, setStatus] = useState('Opening the rear camera…');
  const [error, setError] = useState('');
  // The most recently scanned-in item, kept only long enough to offer a
  // one-tap undo — a dense, uncut label sheet can have several barcodes
  // within the camera's view at once, so an occasional wrong pickup is
  // expected and should be cheap to correct without hunting through the cart.
  const [lastAdded, setLastAdded] = useState(null);
  // Shown in small print under the friendly message — console.error isn't
  // reachable on a phone with no attached devtools, so surface the raw
  // failure on-screen too (a cashier can screenshot it for support).
  const [errorDetail, setErrorDetail] = useState('');
  // Briefly flashes the scan frame green on a successful add — retriggering
  // the same CSS animation needs a fresh key each time, not just a boolean.
  const [scanFlashKey, setScanFlashKey] = useState(0);
  // Colors the status pill's accent edge to match what happened — a
  // glanceable outcome signal alongside the vibration pattern and reticle
  // flash, so a cashier scanning fast doesn't have to actually read the text.
  const [statusTone, setStatusTone] = useState('idle');
  // The basket starts tucked away as a peek bar so the camera owns the
  // screen; tapping it slides the full itemised list up over the feed.
  const [basketExpanded, setBasketExpanded] = useState(false);
  // Torch/flashlight — only some devices + browsers expose this (checked
  // via getRunningTrackCapabilities() once the camera is live), so the
  // button only renders once we know it'll actually do something.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0),
    [cart],
  );

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onDecrementRef.current = onDecrement;
  }, [onDecrement]);

  // This is a full-screen overlay — without this, a stray swipe can scroll
  // (or pull-to-refresh) the Sales Counter page underneath it, which would
  // silently lose the scan session. Same pattern as the mobile nav drawer.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleUndoLastScan = () => {
    if (!lastAdded) return;
    onDecrementRef.current?.(lastAdded.productId);
    setStatus(`Removed ${lastAdded.productName}. Point at the correct item.`);
    setLastAdded(null);
  };

  const handleToggleTorch = async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    const nextOn = !torchOn;
    try {
      await instance.applyVideoConstraints({ advanced: [{ torch: nextOn }] });
      setTorchOn(nextOn);
    } catch (torchError) {
      console.error('Product code scanner: failed to toggle torch:', torchError);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let scanner;
    let frameWatchdog;

    const stopAndClear = async (instance) => {
      if (!instance) return;
      try {
        if (instance.isScanning) await instance.stop();
      } catch {
        // The scanner can already be stopped when a user closes the sheet.
      }
      try {
        instance.clear();
      } catch {
        // Cleanup must never mask a checkout screen navigation.
      }
    };

    const startScanner = async () => {
      try {
        // These fail as a generic Error/TypeError with no useful .name, so
        // check them up front rather than letting scanner.start() surface
        // an unrecognisable error for something we can diagnose directly.
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          setError('Camera scanning needs a secure https:// connection — open this page over https and try again.');
          setErrorDetail('preflight: window.isSecureContext is false');
          setStatus('');
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('This browser does not support camera access here. Use the code field or a Bluetooth scanner instead.');
          setErrorDetail('preflight: navigator.mediaDevices.getUserMedia is unavailable');
          setStatus('');
          return;
        }

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;

        const supportedFormats = SCAN_FORMAT_NAMES
          .map((name) => Html5QrcodeSupportedFormats[name])
          .filter((format) => format !== undefined);

        const resumeAfterFeedback = () => {
          window.setTimeout(() => {
            const active = scannerRef.current;
            if (!cancelled && active) {
              try {
                active.resume();
              } catch {
                // Closing the scanner during this small pause is safe.
              }
            }
            detectingRef.current = false;
          }, 850);
        };

        const handleDecoded = async (decodedText) => {
          if (detectingRef.current || cancelled) return;
          detectingRef.current = true;
          scannerRef.current?.pause(true);

          const normalizedCode = String(decodedText || '').trim();
          if (normalizedCode && normalizedCode === lastAddedCodeRef.current) {
            vibrate(30);
            setStatusTone('duplicate');
            // Otherwise the Undo button lingers, still offering to undo
            // whatever was added several scans ago — confusing right below
            // a message about this (unrelated) duplicate scan.
            setLastAdded(null);
            setStatus('That label is already in this basket. Move to another hair piece, or use + for another identical piece.');
            resumeAfterFeedback();
            return;
          }

          setStatusTone('idle');
          setStatus('Code found — adding it to the order…');
          try {
            const result = await onDetectedRef.current(decodedText);
            if (result?.added) {
              lastAddedCodeRef.current = normalizedCode;
              setLastAdded(result.productId ? { productId: result.productId, productName: result.productName } : null);
              setScanFlashKey((key) => key + 1);
              setStatusTone('success');
              vibrate(45);
            } else {
              setStatusTone('warning');
              setLastAdded(null);
              vibrate([30, 70, 30]);
            }
            // Echo the code that was actually matched — on a dense, uncut
            // label sheet this is what lets a cashier catch a wrong pickup
            // immediately, by eye, against the barcode printed on the label.
            const codeSuffix = result?.added && result?.barcode ? ` (code ${result.barcode})` : '';
            setStatus(`${result?.message || 'Added. Point at the next item.'}${codeSuffix}`);
          } catch {
            setStatusTone('warning');
            setLastAdded(null);
            vibrate([30, 70, 30]);
            setStatus('That code could not be added. Try again or use the code field.');
          } finally {
            resumeAfterFeedback();
          }
        };

        const config = {
          fps: 10,
          // Tight and short (barcodes are wide, short strips) — on a dense,
          // uncut sheet of labels a loose box can straddle two adjacent
          // codes and the decoder can't tell which one the cashier meant.
          qrbox: { width: SCAN_BOX_WIDTH, height: SCAN_BOX_HEIGHT },
          aspectRatio: 1.7778,
          disableFlip: false,
        };

        // `cameraIdOrConfig` must be either a device id string, or an object
        // with EXACTLY one key ({facingMode: ...} or {deviceId: ...}) — an
        // empty {} is rejected outright, which was silently breaking every
        // "just use whatever camera is available" fallback since this
        // feature shipped. `{facingMode: 'environment'}` is the valid form
        // of that same intent.
        //
        // useBarCodeDetectorIfSupported is deliberately left off (always
        // false, the html5-qrcode default): its cropping-to-qrbox behaviour
        // for the native BarcodeDetector path is unreliable across devices,
        // which is how a scan aimed at one label on a multi-label sheet
        // could resolve to a completely different, unrelated product. The
        // pure-JS decoder is the one guaranteed to only read the boxed area.
        const attempts = [
          { cameraIdOrConfig: { facingMode: 'environment' }, label: 'js-decoder/facingMode=environment' },
        ];

        // If facingMode isn't honoured/supported on this device, fall back
        // to enumerating actual cameras (html5-qrcode's own supported way to
        // get an unambiguous, always-valid cameraIdOrConfig) and picking
        // whichever looks rear-facing, else the first one available.
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (Array.isArray(cameras) && cameras.length > 0) {
            const rearCamera = cameras.find((c) => /back|rear|environment/i.test(c.label || ''));
            const cameraId = (rearCamera || cameras[0]).id;
            attempts.push({ cameraIdOrConfig: cameraId, label: `js-decoder/device:${cameraId}` });
          }
        } catch (getCamerasError) {
          // Usually the same underlying permission/hardware problem as the
          // facingMode attempts above — logged via attemptLog below instead
          // of aborting, so those attempts still get a chance to run.
          console.error('Product code scanner: Html5Qrcode.getCameras() failed:', getCamerasError);
        }

        // A flat-out permission denial or "no camera" fails identically no
        // matter the detector/constraint combo — stop after the first such
        // result instead of replaying the same permission prompt repeatedly.
        const isTerminalError = (err) =>
          ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError'].includes(err?.name);

        let lastError = null;
        const attemptLog = [];
        for (const [index, attempt] of attempts.entries()) {
          if (cancelled) return;
          const instance = new Html5Qrcode(scannerIdRef.current, {
            formatsToSupport: supportedFormats,
            useBarCodeDetectorIfSupported: false,
            verbose: false,
          });
          try {
            await instance.start(attempt.cameraIdOrConfig, config, handleDecoded, () => {});
            scanner = instance;
            scannerRef.current = instance;
            lastError = null;
            break;
          } catch (attemptError) {
            lastError = attemptError;
            attemptLog.push(`#${index + 1} ${attempt.label} → ${describeError(attemptError)}`);
            await stopAndClear(instance);
            if (isTerminalError(attemptError)) break;
          }
        }

        if (lastError) {
          // lastError can be a bare string (html5-qrcode does this) —
          // never mutate it directly, wrap it in a real Error instead so
          // the attempt log survives to the outer catch block below.
          const wrapped = new Error(describeError(lastError));
          wrapped.name = (lastError && typeof lastError === 'object' && lastError.name) || 'ScannerStartError';
          wrapped.__attemptLog = attemptLog;
          throw wrapped;
        }

        if (cancelled) {
          await stopAndClear(scanner);
          return;
        }
        setStatus('Point the camera at a hair label. QR codes and barcodes both work.');

        // Not every device/browser exposes torch control — only show the
        // button once we know toggling it will actually do something.
        try {
          const capabilities = scanner.getRunningTrackCapabilities?.();
          if (capabilities?.torch) setTorchSupported(true);
        } catch {
          // Capability probing is best-effort; scanning still works without it.
        }

        // start() resolving isn't proof the feed is actually visible — watch
        // for a real frame to land, and surface an explicit error instead of
        // leaving a dead black box behind a cheerful "point the camera" line.
        const videoEl = document.getElementById(scannerIdRef.current)?.querySelector('video');
        if (videoEl) {
          const markFrameArrived = () => window.clearTimeout(frameWatchdog);
          videoEl.addEventListener('loadeddata', markFrameArrived, { once: true });
          frameWatchdog = window.setTimeout(() => {
            if (!cancelled && videoEl.videoWidth === 0) {
              const detail = `no frame after ${VIDEO_FRAME_TIMEOUT_MS}ms — readyState=${videoEl.readyState} networkState=${videoEl.networkState} paused=${videoEl.paused}`;
              console.error('Product code scanner: camera opened but no video frame arrived —', detail);
              setError('Camera opened but no picture is showing. Close this and try again, or use the code field below.');
              setErrorDetail(detail);
              setStatus('');
            }
          }, VIDEO_FRAME_TIMEOUT_MS);
        }
      } catch (startError) {
        // The friendly message can't include the raw error, so log it —
        // this is the only way to see *why* "camera could not start" fired.
        console.error('Product code scanner failed to start:', startError, startError?.__attemptLog);
        if (!cancelled) {
          setError(getCameraErrorMessage(startError));
          const detail = Array.isArray(startError?.__attemptLog) && startError.__attemptLog.length > 0
            ? startError.__attemptLog.join(' | ')
            : describeError(startError);
          setErrorDetail(detail);
          setStatus('');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      detectingRef.current = false;
      window.clearTimeout(frameWatchdog);
      const instance = scannerRef.current;
      scannerRef.current = null;
      stopAndClear(instance);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] touch-manipulation overflow-hidden overscroll-contain bg-charcoal motion-reduce:animate-none animate-scanner-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-code-scanner-title"
    >
      {/* Full-bleed camera feed — this screen IS the camera, not a card
          floating over one. */}
      <div className="absolute inset-0">
        <div
          id={scannerIdRef.current}
          className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
      </div>

      {/* Nothing to show behind an error — a quiet brand gradient instead
          of a dead black rectangle. */}
      {error && (
        <div className="absolute inset-0 bg-gradient-to-b from-plum-900 via-charcoal to-charcoal" />
      )}

      {/* Top bar — above the reticle's dimming spotlight (z-10) so it never
          gets muddied by it. */}
      <div className="safe-area-top absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4">
        <h2
          id="product-code-scanner-title"
          className="glass-dark flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white"
        >
          <FaCamera className="text-gold-300" /> Scan hair label
        </h2>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                torchOn ? 'bg-gold-400 text-charcoal' : 'glass-dark text-white'
              }`}
              aria-pressed={torchOn}
              aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            >
              <FaBolt />
            </button>
          )}
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
            className="glass-dark press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
            aria-label="Close camera scanner"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Animated scan reticle — sized to match the real decode region
          (SCAN_BOX_WIDTH/HEIGHT above), not just decorative. The box-shadow
          spread dims everything OUTSIDE the box (the classic scanner
          "spotlight" look — iOS Camera's QR mode, WhatsApp, Google Pay all
          do this) instead of just the top/bottom edges. */}
      {!error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div
            className="relative rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            style={{ width: SCAN_BOX_WIDTH, height: SCAN_BOX_HEIGHT }}
          >
            <span className="absolute -left-1 -top-1 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-gold-300" />
            <span className="absolute -right-1 -top-1 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-gold-300" />
            <span className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-gold-300" />
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-gold-300" />
            <div className="motion-reduce:hidden absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gold-300 shadow-[0_0_14px_3px_rgba(217,173,88,0.85)] animate-scan-sweep" />
            {scanFlashKey > 0 && (
              <div key={scanFlashKey} className="absolute -inset-2 rounded-2xl border-4 border-transparent animate-scan-success" />
            )}
          </div>
          <p className="mt-4 max-w-[220px] text-center text-[11px] leading-snug text-white/70">
            On an uncut sheet, cover neighbouring codes so only one shows.
          </p>
        </div>
      )}

      {/* Status/error, and the basket — pinned to the bottom, stacked so
          neither needs a hand-measured offset from the other. Above the
          reticle's dimming spotlight (z-10) for the same reason as the top bar. */}
      <div className="safe-area-bottom absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 px-3 pb-3">
        {error ? (
          <div className="glass-dark rounded-2xl border-l-4 border-red-400/70 px-4 py-3">
            <p className="text-sm font-medium text-red-300">{error}</p>
            {errorDetail && (
              <p className="mt-1 select-all break-words font-mono text-[10px] leading-snug text-red-200/70">
                {errorDetail}
              </p>
            )}
          </div>
        ) : (
          <div
            aria-live="polite"
            className={`glass-dark rounded-2xl border-l-4 px-4 py-3 transition-colors duration-300 ${
              {
                idle: 'border-white/15',
                success: 'border-green-400/70',
                duplicate: 'border-gold-300/70',
                warning: 'border-red-400/70',
              }[statusTone]
            }`}
          >
            <p className="text-sm font-medium text-white">{status}</p>
            {lastAdded && (
              <button
                type="button"
                onClick={handleUndoLastScan}
                className="mt-1 text-xs font-bold text-red-300 underline decoration-red-400/60 underline-offset-2"
              >
                Wrong item? Undo {lastAdded.productName}
              </button>
            )}
          </div>
        )}

        {/* Basket drawer — a peek bar by default so the camera stays the
            focus; tap to slide the full, quantity-adjustable list up. */}
        <div
          className={`overflow-hidden rounded-3xl bg-white/97 shadow-2xl backdrop-blur-md transition-[max-height] duration-300 ease-out dark:bg-dm-card/97 ${
            basketExpanded ? 'max-h-[58dvh]' : 'max-h-[68px]'
          }`}
        >
          {/* Grab-handle — the standard bottom-sheet affordance, signalling
              "tap or drag to open" beyond just the chevron icon. */}
          <div className="flex justify-center pb-1 pt-2" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-brown-200 dark:bg-dm-border" />
          </div>
          <button
            type="button"
            onClick={() => setBasketExpanded((expanded) => !expanded)}
            className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4"
            aria-expanded={basketExpanded}
            aria-label={basketExpanded ? 'Collapse basket' : 'Expand basket'}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-charcoal dark:text-white">
              <FaShoppingBasket className="text-plum-700 dark:text-gold-300" />
              <span key={scanFlashKey} className="animate-count-pop inline-block tabular-nums">
                {itemCount}
              </span>{' '}
              item{itemCount === 1 ? '' : 's'}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-sm font-bold tabular-nums text-plum-700 dark:text-gold-300">
                {DisplayPriceInShillings(cartTotal)}
              </span>
              {basketExpanded ? (
                <FaChevronDown className="text-brown-400" size={12} />
              ) : (
                <FaChevronUp className="text-brown-400" size={12} />
              )}
            </span>
          </button>

          {basketExpanded && (
            <div className="flex max-h-[calc(58dvh-68px)] flex-col border-t border-brown-100 dark:border-dm-border">
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-brown-200 px-4 py-8 text-center text-sm text-brown-500 dark:border-dm-border dark:text-white/50">
                    Nothing scanned yet. If a label has no code, close this and search or enter its SKU manually.
                  </div>
                ) : (
                  cart.map((item) => (
                    <CartItemRow
                      key={item._id}
                      item={item}
                      onIncrement={onIncrement}
                      onDecrement={onDecrement}
                      onRemove={onRemove}
                    />
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="shrink-0 border-t border-brown-100 p-3 dark:border-dm-border">
                  <button
                    type="button"
                    onClick={() => onCheckout?.()}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gold-500 text-sm font-bold text-charcoal transition-colors hover:bg-gold-400"
                  >
                    <FaShoppingBasket /> View basket & checkout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCodeScanner;
