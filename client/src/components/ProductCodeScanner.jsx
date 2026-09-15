/* eslint-disable react/prop-types */
import { useEffect, useId, useRef, useState } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';

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

// html5-qrcode doesn't always reject with a proper DOMException — it often
// rejects with a plain string, or with a generic Error/TypeError from its
// own internal code (e.g. constructing the native BarcodeDetector with a
// format it doesn't support). Matching only `.name` silently dumps all of
// those into the unhelpful generic message below, which is what cashiers
// were actually hitting — so match on the stringified error too.
const getCameraErrorMessage = (error) => {
  const name = error?.name || '';
  const text = `${name} ${error?.message || ''} ${typeof error === 'string' ? error : ''}`.toLowerCase();

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

const ProductCodeScanner = ({ onDetected, onClose }) => {
  const generatedId = useId();
  const scannerIdRef = useRef(`sales-counter-scanner-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
  const scannerRef = useRef(null);
  const detectingRef = useRef(false);
  const lastAddedCodeRef = useRef('');
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const [status, setStatus] = useState('Opening the rear camera…');
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let scanner;

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
          setStatus('');
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('This browser does not support camera access here. Use the code field or a Bluetooth scanner instead.');
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

        // Try the native BarcodeDetector path (fast, low battery) first, in
        // both the ideal rear-camera and browser-default camera shape; if
        // both fail, fall back to a fresh instance forced onto the pure-JS
        // decoder — some desktop/older browsers throw constructing or
        // running the native detector even though a camera is available.
        const attempts = [
          { useBarCodeDetectorIfSupported: true, cameraConfig: { facingMode: { ideal: 'environment' } } },
          { useBarCodeDetectorIfSupported: true, cameraConfig: {} },
          { useBarCodeDetectorIfSupported: false, cameraConfig: { facingMode: { ideal: 'environment' } } },
          { useBarCodeDetectorIfSupported: false, cameraConfig: {} },
        ];

        // A flat-out permission denial or "no camera" fails identically no
        // matter the detector/constraint combo — stop after the first such
        // result instead of replaying the same permission prompt 4 times.
        const isTerminalError = (err) =>
          ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError'].includes(err?.name);

        let lastError = null;
        for (const attempt of attempts) {
          if (cancelled) return;
          const instance = new Html5Qrcode(scannerIdRef.current, {
            formatsToSupport: supportedFormats,
            useBarCodeDetectorIfSupported: attempt.useBarCodeDetectorIfSupported,
            verbose: false,
          });
          try {
            await instance.start(attempt.cameraConfig, config, handleDecoded, () => {});
            scanner = instance;
            scannerRef.current = instance;
            lastError = null;
            break;
          } catch (attemptError) {
            lastError = attemptError;
            await stopAndClear(instance);
            if (isTerminalError(attemptError)) break;
          }
        }

        if (lastError) throw lastError;

        if (cancelled) {
          await stopAndClear(scanner);
          return;
        }
        setStatus('Point the camera at a hair label. QR codes and barcodes both work.');
      } catch (startError) {
        // The friendly message can't include the raw error, so log it —
        // this is the only way to see *why* "camera could not start" fired.
        console.error('Product code scanner failed to start:', startError);
        if (!cancelled) {
          setError(getCameraErrorMessage(startError));
          setStatus('');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      detectingRef.current = false;
      const instance = scannerRef.current;
      scannerRef.current = null;
      stopAndClear(instance);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-code-scanner-title">
      <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-dm-card sm:max-w-md sm:rounded-2xl">
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
          <div id={scannerIdRef.current} className="min-h-[260px] [&_video]:h-[260px] [&_video]:w-full [&_video]:object-cover" />
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : (
          <p aria-live="polite" className="mt-3 rounded-lg bg-plum-50 px-3 py-2 text-sm text-plum-800 dark:bg-dm-card-2 dark:text-plum-200">
            {status}
          </p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-brown-500 dark:text-white/50">
          Keep the label inside the frame and hold steady. If the label has no code, close this and search or enter its SKU manually.
        </p>
      </div>
    </div>
  );
};

export default ProductCodeScanner;
