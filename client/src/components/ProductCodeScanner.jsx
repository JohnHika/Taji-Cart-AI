/* eslint-disable react/prop-types */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaBolt, FaCamera, FaChevronDown, FaChevronUp, FaShoppingBasket, FaTimes } from 'react-icons/fa';
import CartItemRow from './CartItemRow';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

// Short tactile confirmation so a cashier doesn't have to watch the screen
// for every single scan — standard on native scanner apps. No-ops silently
// where the Vibration API isn't available (iOS Safari has none at all).
//
// Chrome's sticky-activation rule: navigator.vibrate() only fires within a
// window after a real user gesture (a tap). The scanner's decode callback is
// asynchronous, so by the time a barcode is recognized the original tap can
// be stale and Chrome silently drops the vibration — which is exactly the
// "vibration never works" report from the field. Fix: stamp a freshness
// window on the tap that opens the scanner (and refresh it on every touch
// inside the scanner via a capture listener), then vibrate inside it. The
// camera-preview touches (torch, basket) keep that window warm during a
// scanning session.
const VIBRATION_WINDOW_MS = 5000;
let lastGestureAt = 0;
export const unlockScannerFeedback = () => {
  lastGestureAt = Date.now();
  unlockScanAudio();
  return true;
};
const vibrate = (pattern) => {
  try {
    if (Date.now() - lastGestureAt > VIBRATION_WINDOW_MS) return;
    navigator.vibrate?.(pattern);
  } catch {
    // Best-effort only.
  }
};

// Scan confirmation beep, synthesized with WebAudio — no audio file to load,
// works offline, and plays instantly (a fetched <audio> clip can lag behind
// the scan by a frame or two on slow shop Wi-Fi). This is the PRIMARY
// confirmation channel: iPhones cannot vibrate from websites at all (iOS
// exposes no Vibration API to browsers), so the cashier's reliable signal
// on every device is the beep — it's loud enough to hear over shop chatter.
// Android additionally vibrates. Browsers require a user gesture before
// audio can start; the scan button tap that opens this overlay is that
// gesture, and we also re-unlock on the first touch inside the scanner.
let scanBeepContext = null;
const unlockScanAudio = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!scanBeepContext) scanBeepContext = new Ctx();
    if (scanBeepContext.state === 'suspended') {
      scanBeepContext.resume().catch(() => {});
      return false;
    }
    return scanBeepContext.state === 'running';
  } catch {
    return false;
  }
};
// (unlockScannerFeedback is exported above with the vibration-window stamp.)
const playScanBeep = (mode = 'success') => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!scanBeepContext) scanBeepContext = new Ctx();
    if (scanBeepContext.state === 'suspended') scanBeepContext.resume().catch(() => {});

    const ctx = scanBeepContext;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    // Classic retail-scanner "beep": a sharp two-tone chirp with an octave
    // harmonic so it cuts through shop noise. Distinct patterns per outcome
    // so the cashier can tell them apart without looking up:
    //   success    — single high "beep" (the sound of "yes, added")
    //   duplicate  — two quick identical beeps ("already in the basket")
    //   error      — low double-buzz (clearly not a confirmation)
    const tone = (freq, start, duration, level) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(level, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(g).connect(gain);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    if (mode === 'success') {
      tone(1318, now, 0.09, 0.28);        // E6 — crisp, unmistakable
      tone(1975, now + 0.07, 0.10, 0.16); // octave-up tail for sharpness
    } else if (mode === 'duplicate') {
      tone(1046, now, 0.07, 0.24);
      tone(1046, now + 0.11, 0.07, 0.24);
    } else {
      tone(320, now, 0.11, 0.22);
      tone(260, now + 0.14, 0.13, 0.22);
    }
  } catch {
    // Audio is a bonus, never a blocker.
  }
};

// Mirrors the html5-qrcode `qrbox` size below in real px so the on-screen
// reticle is a true representation of the region actually being decoded,
// not just decoration.
// Adaptive sizing: the box is computed from the live video band (see
// scanBoxFor), so it scales with the device — big and comfortable on
// phones, proportionally capped on desktop.
const SCAN_BOX_WIDTH = 220;
const SCAN_BOX_HEIGHT = 90;
// The scan box takes this fraction of the video band's width, clamped to a
// decoder-friendly range (very large boxes slow the JS decoder; very small
// ones miss the label).
const SCAN_BOX_WIDTH_RATIO = 0.78;
const SCAN_BOX_WIDTH_MIN = 180;
const SCAN_BOX_WIDTH_MAX = 560;
// Barcode strips are wide and short — height follows width, not the viewport.
const SCAN_BOX_HEIGHT_RATIO = 0.42;
// Computes the box for a given band size. Used in TWO places that must agree
// exactly: the decoder config (qrbox function — the lib calls it with the
// live viewfinder size) and the reticle overlay (measured via the band ref).
const computeScanBox = (bandWidth, bandHeight) => {
  const w = Math.max(
    SCAN_BOX_WIDTH_MIN,
    Math.min(SCAN_BOX_WIDTH_MAX, Math.round(bandWidth * SCAN_BOX_WIDTH_RATIO))
  );
  const h = Math.max(60, Math.round(w * SCAN_BOX_HEIGHT_RATIO));
  return { width: Math.min(w, Math.round(bandWidth)), height: Math.min(h, Math.round(bandHeight)) };
};

const SCAN_FORMAT_NAMES = [
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
  // scannerSession increments on a lens switch so the start effect re-runs
  // and the lib container remounts cleanly with the newly-pinned camera.
  const [scannerSession, setScannerSession] = useState(0);
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
  // True while the decoder is paused for the success/error feedback beat —
  // the sweep line freezes and the reticle dims slightly, so a cashier who
  // glances back mid-rhythm knows the scanner is processing, not frozen.
  const [feedbackPause, setFeedbackPause] = useState(false);
  // The basket starts tucked away as a peek bar so the camera owns the
  // screen; tapping it slides the full itemised list up over the feed.
  const [basketExpanded, setBasketExpanded] = useState(false);
  // Torch/flashlight — only some devices + browsers expose this (checked
  // via getRunningTrackCapabilities() once the camera is live), so the
  // button only renders once we know it'll actually do something.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  // Multi-lens support (S25 Ultra and friends expose wide + ultrawide +
  // telephoto rear cameras to the browser): 'auto' picks the best sensor
  // automatically; a specific lens pins that device. Devices list is
  // populated once permission is granted (labels are empty before that).
  const [cameraDevices, setCameraDevices] = useState([]);
  const [cameraChoice, setCameraChoice] = useState('auto'); // 'auto' | deviceId
  const cameraChoiceRef = useRef('auto');
  const [switchingCamera, setSwitchingCamera] = useState(false);
  // Adaptive scan box: the reticle and the decoder must agree on the box
  // size for the CURRENT video band. The band is measured live (it changes
  // with device size and orientation), and the box is recomputed from it.
  const videoBandRef = useRef(null);
  const [scanBox, setScanBox] = useState({ width: SCAN_BOX_WIDTH, height: SCAN_BOX_HEIGHT });
  // The band's aspect ratio is set from the camera's DELIVERED frame ratio
  // (videoWidth/videoHeight — Android Chrome rotates portrait frames, so the
  // real ratio differs from the requested one). Matching element to frame =
  // zero cropping and exact pixel mapping, with the band as large as the
  // screen allows. Defaults to 16/9 until the first frame arrives.
  const [bandAspectRatio, setBandAspectRatio] = useState('16 / 9');
  // Back-gesture / Escape closes the scanner — phones default to closing
  // overlays via the system back button, and blocking it (as a plain fixed
  // overlay does) makes the scanner feel inescapable. We push a history
  // entry on mount and treat popstate as "close", exactly like native sheets.
  useEffect(() => {
    window.history.pushState({ scannerOpen: true }, '');
    const handlePopState = () => onCloseRef.current?.();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the scanner is closed via the X (not back), consume our history
      // entry so the next back-press doesn't land on a stale scanner state.
      if (window.history.state?.scannerOpen) window.history.back();
    };
  }, []);

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

  // Keep the vibration gesture-window warm: every touch inside the scanner
  // (torch, basket peek, drawer) re-stamps the freshness window Chrome
  // requires before honoring navigator.vibrate(). Capture-phase so it fires
  // even on elements that stopPropagation.
  useEffect(() => {
    const refreshGestureWindow = () => { lastGestureAt = Date.now(); };
    window.addEventListener('pointerdown', refreshGestureWindow, { capture: true });
    return () => window.removeEventListener('pointerdown', refreshGestureWindow, { capture: true });
  }, []);

  // Adaptive scan-box measurement: recompute whenever the band's on-screen
  // size changes (device rotation, window resize, soft keyboard, different
  // phone). Uses ResizeObserver on the band element — fires for all of those
  // without listening to half-a-dozen separate events.
  useEffect(() => {
    const band = videoBandRef.current;
    if (!band) return undefined;
    const measure = () => {
      const rect = band.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        setScanBox(computeScanBox(rect.width, rect.height));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(band);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [scannerSession]);

  const handleUndoLastScan = () => {
    if (!lastAdded) return;
    onDecrementRef.current?.(lastAdded.productId);
    // Release the duplicate-lock for that code too — the whole point of Undo
    // is "I scanned the wrong label", so the cashier must be able to
    // immediately re-scan the CORRECT one, and often the same label again
    // after fixing their aim. Without this, re-scanning it reports
    // "already in this basket" until some other product is scanned.
    lastAddedCodeRef.current = '';
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

  // Live lens switch: stop the current instance (releases its camera track),
  // flip the choice, and let the start effect re-run with the new camera —
  // without closing the scanner overlay.
  const handleSwitchCamera = async (choice) => {
    if (choice === cameraChoice || switchingCamera) return;
    try {
      setSwitchingCamera(true);
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance?.isScanning) {
        try { await instance.stop(); } catch { /* already stopping */ }
        try { instance.clear(); } catch { /* nothing rendered yet */ }
      }
      cameraChoiceRef.current = choice;
      setCameraChoice(choice);
      setTorchOn(false);
      setTorchSupported(false);
      // The start effect's deps include cameraChoice — it re-runs and opens
      // the newly-pinned sensor. Keying a fresh session id remounts the lib
      // container cleanly (the lib caches element children between runs).
      setScannerSession((n) => n + 1);
    } finally {
      setSwitchingCamera(false);
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
            setFeedbackPause(false);
          }, 850);
        };

        const handleDecoded = async (decodedText) => {
          if (detectingRef.current || cancelled) return;
          detectingRef.current = true;
          setFeedbackPause(true);
          scannerRef.current?.pause(true);

          const normalizedCode = String(decodedText || '').trim();
          if (normalizedCode && normalizedCode === lastAddedCodeRef.current) {
            vibrate(30);
            playScanBeep('duplicate');
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
              // Beep + buzz on EVERY successful product scan — the cashier
              // hears/confirms without watching the screen (standard retail
              // scanner feedback). The beep is the reliable channel on all
              // phones; Android additionally buzzes in a double-tap pattern.
              playScanBeep('success');
              vibrate([60, 40, 60]);
            } else {
              setStatusTone('warning');
              setLastAdded(null);
              playScanBeep('error');
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
          // Function form: the lib calls this with the LIVE viewfinder size,
          // so the decode region always matches the on-screen reticle
          // (scanBox state) — same computeScanBox, same inputs, same result.
          qrbox: (vfWidth, vfHeight) => computeScanBox(vfWidth, vfHeight),
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

        // Multi-lens phones (S25 Ultra etc.) expose several rear sensors.
        // AUTO picks the best scanning sensor by label heuristics — prefer
        // the main wide camera (largest sensor, fastest focus, handles low
        // light), never the ultrawide (distortion at the frame edge bends
        // 1D barcodes), and telephoto only as a last resort (tight FOV makes
        // aiming harder even though it resolves fine detail). Labels are
        // only populated AFTER permission is granted, which is why this
        // runs after the first successful start.
        const pickAutoCamera = (devices) => {
          const rear = devices.filter((d) => /back|rear|environment/i.test(d.label || ''));
          const pool = rear.length ? rear : devices;
          const main = pool.find((d) => /wide|main|camera ?1|rear.*wide/i.test(d.label || ''))
            || pool.find((d) => !/ultra|tele|macro|depth|portrait|zoom/i.test(d.label || ''));
          return (main || pool[0])?.id || null;
        };

        const requestedId = cameraChoiceRef.current;
        const attempts = requestedId !== 'auto'
          ? [{ cameraIdOrConfig: requestedId, label: `pinned:${requestedId}` }]
          : [{ cameraIdOrConfig: { facingMode: 'environment' }, label: 'js-decoder/facingMode=environment' }];

        // If facingMode isn't honoured/supported on this device, fall back
        // to enumerating actual cameras (html5-qrcode's own supported way to
        // get an unambiguous, always-valid cameraIdOrConfig) and picking
        // whichever looks rear-facing, else the first one available.
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (Array.isArray(cameras) && cameras.length > 0) {
            setCameraDevices(cameras);
            if (requestedId === 'auto') {
              const autoId = pickAutoCamera(cameras);
              if (autoId) attempts.push({ cameraIdOrConfig: autoId, label: `auto-pick:${autoId}` });
              const rearCamera = cameras.find((c) => /back|rear|environment/i.test(c.label || ''));
              const cameraId = (rearCamera || cameras[0]).id;
              attempts.push({ cameraIdOrConfig: cameraId, label: `js-decoder/device:${cameraId}` });
            }
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
        setStatus('Point the camera at a hair label barcode.');

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
          // Adaptive band: once the first real frame arrives, read the frame's
          // TRUE aspect ratio (Android Chrome delivers rotated portrait frames
          // — e.g. 720x1280 — regardless of the requested aspectRatio) and size
          // the video band to exactly that ratio. The band then fills as much
          // of the phone as possible with zero cropping, and the library's
          // element→frame pixel mapping stays exact.
          const adaptBandToFrame = () => {
            if (cancelled || !videoEl.videoWidth || !videoEl.videoHeight) return;
            const ratio = videoEl.videoWidth / videoEl.videoHeight;
            if (Number.isFinite(ratio) && ratio > 0) {
              setBandAspectRatio(`${videoEl.videoWidth} / ${videoEl.videoHeight}`);
            }
          };
          if (videoEl.videoWidth > 0) adaptBandToFrame();
          else videoEl.addEventListener('loadeddata', adaptBandToFrame, { once: true });

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
      // Reset torch UI state — the camera track (and its light) dies with the
      // unmount, so reopening must not show the torch as still-on.
      setTorchOn(false);
      setTorchSupported(false);
      // Allow the same label to be re-scanned after a session ends.
      lastAddedCodeRef.current = '';
      stopAndClear(instance);
    };
  }, [cameraChoice, scannerSession]);

  return (
    <div
      className="fixed inset-0 z-[70] touch-manipulation overflow-hidden overscroll-contain bg-charcoal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-code-scanner-title"
    >
      {/* This root is opaque from the very first frame, with no entrance
          animation — it's the layer solely responsible for hiding the real
          page underneath. The entrance polish lives on the foreground UI
          wrapper below instead; putting it here previously meant the whole
          dialog (background included) faded in from opacity 0, letting the
          page underneath show through for the first ~350ms. */}
      {/* Full-bleed camera feed — this screen IS the camera, not a card
          floating over one. The video element is forced to a 16:9 box that
          fills the width and is vertically centered — NO object-cover crop.
          html5-qrcode maps displayed pixels onto camera-frame pixels with a
          plain ratio (videoWidth/clientWidth), which is only correct when the
          whole frame is visible. Cropping (object-cover) makes it sample a
          wider, shifted strip of the frame than the on-screen box shows — the
          long-standing "box is off from what it scans" bug. Uncropped video
          + a reticle pinned to the same geometry (see below) makes displayed
          box == decoded box on every device, by construction. */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-charcoal">
        <div
          ref={videoBandRef}
          id={scannerIdRef.current}
          className="w-full max-h-[72dvh] [&_video]:!block [&_video]:!h-auto [&_video]:!w-full [&_div#qr-shaded-region]:!hidden"
          style={{ aspectRatio: bandAspectRatio }}
        />
      </div>

      {/* Nothing to show behind an error — a quiet brand gradient instead
          of a dead black rectangle. */}
      {error && (
        <div className="absolute inset-0 bg-gradient-to-b from-plum-900 via-charcoal to-charcoal" />
      )}

      {/* Foreground UI — top bar and bottom stack are flex siblings; the
          reticle is NOT part of this flow anymore (it's a full-viewport
          overlay pinned to the library's decode geometry, positioned after
          this block). The old design centered the reticle in the leftover
          flex space, which shoved it upward whenever the bottom stack grew —
          away from the library's actual decode region. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col motion-reduce:animate-none animate-scanner-open [&_button]:pointer-events-auto">
        {/* Top bar */}
        <div className="safe-area-top flex items-center justify-between gap-3 p-4">
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

        {/* Lens switcher — multi-lens phones (S25 Ultra etc.) expose wide /
            ultrawide / telephoto rear sensors to the browser. AUTO picks the
            main wide camera (largest sensor, fastest focus, best low light);
            ultrawide is never auto-chosen (edge distortion bends 1D bars) and
            telephoto stays manual (tight FOV is hard to aim). Shows only once
            permission has revealed the device list. */}
        {!error && cameraDevices.length > 1 && (
          <div className="pointer-events-auto mx-auto flex max-w-full items-center gap-1.5 overflow-x-auto px-4 py-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => handleSwitchCamera('auto')}
              className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                cameraChoice === 'auto' ? 'bg-gold-400 text-charcoal' : 'glass-dark text-white/85'
              }`}
              aria-pressed={cameraChoice === 'auto'}
            >
              Auto
            </button>
            {cameraDevices
              .filter((d) => /back|rear|environment/i.test(d.label || ''))
              .map((device, index, arr) => {
                const label = device.label || '';
                const name = /ultra/i.test(label) ? 'Ultra-wide'
                  : /tele/i.test(label) ? 'Telephoto'
                  : arr.length > 1 ? `Main ${index === 0 ? '' : index + 1}`.trim()
                  : 'Main';
                const active = cameraChoice === device.id;
                return (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => handleSwitchCamera(device.id)}
                    className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      active ? 'bg-gold-400 text-charcoal' : 'glass-dark text-white/85'
                    }`}
                    aria-pressed={active}
                  >
                    {name}
                  </button>
                );
              })}
          </div>
        )}

        {/* Animated scan reticle — absolutely pinned to the EXACT geometry of
            html5-qrcode's decode region. The library centers its qrbox in the
            video element ((element - qrbox) / 2, both axes), and the video
            element here is the full-screen 16:9 band centered in the viewport.
            This overlay therefore positions the gold frame at the viewport
            center too — the same point the library decodes — so the "two
            boxes" offset is structurally impossible on every device. As a
            full-viewport overlay it's also independent of the top bar / bottom
            stack heights, which is what used to shove it upward. */}
        {!error && (
          <div
            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
              basketExpanded ? 'opacity-0' : 'opacity-100'
            }`}
          >
          <div
            className="relative rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-[width,height] duration-200"
            style={{ width: scanBox.width, height: scanBox.height }}
          >
            <span className="absolute -left-1 -top-1 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-gold-300" />
            <span className="absolute -right-1 -top-1 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-gold-300" />
            <span className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-gold-300" />
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-gold-300" />
            {/* A deliberately different colour from the gold frame (moving
                indicator vs. static corners is a standard scanner-app
                convention), with a light glow instead of the previous heavy
                one — that glow was blowing out to a washed-out haze in a
                real phone photo, reading as mismatched rather than intentional. */}
            <div className={`motion-reduce:hidden absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_6px_1px_rgba(255,255,255,0.5)] animate-scan-sweep ${
              feedbackPause ? 'opacity-30 [animation-play-state:paused]' : ''
            }`} />
            {/* inset-0/rounded-xl — exactly the box's own bounds, not a
                larger ring floating 8px outside it. */}
            {scanFlashKey > 0 && (
              <div key={scanFlashKey} className="absolute inset-0 rounded-xl border-4 border-transparent animate-scan-success" />
            )}
          </div>
          {/* No caption crowding the box anymore — a text pill sitting this
              close under it kept reading as a second, disconnected box
              rather than a single clean frame. The status pill at the
              bottom is where any messaging belongs now. */}
        </div>
      )}

        {/* Status/error, and the basket — pinned to the bottom edge. The
            reticle is a full-viewport overlay, so this stack must anchor
            itself to the bottom (absolute) instead of flowing after the
            top bar; flex spacing would otherwise leave it floating just
            under the pills. */}
        <div className="safe-area-bottom absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 px-3 pb-3">
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
    </div>
  );
};

export default ProductCodeScanner;
