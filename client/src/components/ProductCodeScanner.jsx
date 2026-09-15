/* eslint-disable react/prop-types */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaCamera, FaShoppingBasket, FaTimes } from 'react-icons/fa';
import CartItemRow from './CartItemRow';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

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
  const [status, setStatus] = useState('Opening the rear camera…');
  const [error, setError] = useState('');
  // Shown in small print under the friendly message — console.error isn't
  // reachable on a phone with no attached devtools, so surface the raw
  // failure on-screen too (a cashier can screenshot it for support).
  const [errorDetail, setErrorDetail] = useState('');

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
            setStatus('That label is already in this basket. Move to another hair piece, or use + for another identical piece.');
            resumeAfterFeedback();
            return;
          }

          setStatus('Code found — adding it to the order…');
          try {
            const result = await onDetectedRef.current(decodedText);
            if (result?.added) lastAddedCodeRef.current = normalizedCode;
            setStatus(result?.message || 'Added. Point at the next item.');
          } catch {
            setStatus('That code could not be added. Try again or use the code field.');
          } finally {
            resumeAfterFeedback();
          }
        };

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          aspectRatio: 1.7778,
          disableFlip: false,
        };

        // `cameraIdOrConfig` must be either a device id string, or an object
        // with EXACTLY one key ({facingMode: ...} or {deviceId: ...}) — an
        // empty {} is rejected outright, which was silently breaking every
        // "just use whatever camera is available" fallback since this
        // feature shipped. `{facingMode: 'environment'}` is the valid form
        // of that same intent.
        const attempts = [
          { useBarCodeDetectorIfSupported: true, cameraIdOrConfig: { facingMode: 'environment' }, label: 'native-detector/facingMode=environment' },
          { useBarCodeDetectorIfSupported: false, cameraIdOrConfig: { facingMode: 'environment' }, label: 'js-decoder/facingMode=environment' },
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
            attempts.push(
              { useBarCodeDetectorIfSupported: true, cameraIdOrConfig: cameraId, label: `native-detector/device:${cameraId}` },
              { useBarCodeDetectorIfSupported: false, cameraIdOrConfig: cameraId, label: `js-decoder/device:${cameraId}` },
            );
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
            useBarCodeDetectorIfSupported: attempt.useBarCodeDetectorIfSupported,
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
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-code-scanner-title">
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-dm-card sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
        <div className="shrink-0 p-4 pb-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 id="product-code-scanner-title" className="flex items-center gap-2 text-lg font-bold text-charcoal dark:text-white">
                <FaCamera className="text-plum-700 dark:text-gold-300" /> Scan hair label
              </h2>
              <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                Add each scanned hair piece directly to this order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors hover:bg-brown-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
              aria-label="Close camera scanner"
            >
              <FaTimes />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-plum-200 bg-black dark:border-dm-border">
            <div id={scannerIdRef.current} className="min-h-[190px] [&_video]:h-[190px] [&_video]:w-full [&_video]:object-cover" />
          </div>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              {errorDetail && (
                <p className="mt-1 select-all break-words font-mono text-[10px] leading-snug text-red-500/80 dark:text-red-400/70">
                  {errorDetail}
                </p>
              )}
            </div>
          ) : (
            <p aria-live="polite" className="mt-3 rounded-lg bg-plum-50 px-3 py-2 text-sm text-plum-800 dark:bg-dm-card-2 dark:text-plum-200">
              {status}
            </p>
          )}
        </div>

        {/* Live basket — grows as labels are scanned, quantity adjustable
            right here without closing the camera. */}
        <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-brown-100 dark:border-dm-border">
          <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
            <p className="text-sm font-bold text-charcoal dark:text-white">
              This order · {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
            <p className="text-sm font-bold tabular-nums text-plum-700 dark:text-gold-300">
              {DisplayPriceInShillings(cartTotal)}
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brown-200 px-4 py-8 text-center text-sm text-brown-500 dark:border-dm-border dark:text-white/50">
                Nothing scanned yet — point the camera at a hair label to add it here.
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

        <p className="shrink-0 px-4 pb-3 text-xs leading-relaxed text-brown-500 dark:text-white/50">
          Keep the label inside the frame and hold steady. If the label has no code, close this and search or enter its SKU manually.
        </p>
      </div>
    </div>
  );
};

export default ProductCodeScanner;
