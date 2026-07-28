import React, { useEffect, useMemo, useState } from 'react';
import { FaCrosshairs, FaMapMarkerAlt, FaSpinner, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import LocationPickerEnhanced from './LocationPickerEnhanced';
import { formatDistanceKm, getFootDeliveryEligibility, NAIROBI_CBD_RADIUS_KM } from '../utils/cbdDelivery';

/**
 * DeliveryLocationModal
 *
 * Mobile-first bottom sheet that auto-detects the user's location, drops a pin
 * on a large map, checks Nairobi CBD eligibility for foot delivery, and requires
 * free-text delivery instructions so the rider knows exactly where to go.
 */
const DeliveryLocationModal = ({
  isOpen,
  onClose,
  onSave,
  initialLocation = null,
  initialInstructions = '',
  mode = 'foot',
}) => {
  const [position, setPosition] = useState(initialLocation);
  const [instructions, setInstructions] = useState(initialInstructions || '');
  const [detecting, setDetecting] = useState(false);

  const eligibility = useMemo(() => getFootDeliveryEligibility(position), [position]);

  // Auto-detect location when the modal opens if we don't already have one.
  useEffect(() => {
    if (!isOpen) return;

    if (initialLocation) {
      setPosition(initialLocation);
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (geo) => {
        const next = {
          lat: Number(geo.coords.latitude),
          lng: Number(geo.coords.longitude),
        };
        setPosition(next);
        setDetecting(false);

        const status = getFootDeliveryEligibility(next);
        if (mode === 'foot') {
          if (status.eligible) {
            toast.success('Location found inside Nairobi CBD.');
          } else {
            toast.error(
              `You are ${formatDistanceKm(status.distanceKm)} from CBD center. Foot delivery is limited to ${status.radiusKm}km.`
            );
          }
        } else {
          toast.success('Location detected for standard delivery.');
        }
      },
      () => {
        setDetecting(false);
        toast.error('Could not access your location. Please allow location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isOpen, initialLocation, mode]);

  const handleDetectAgain = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (geo) => {
        const next = {
          lat: Number(geo.coords.latitude),
          lng: Number(geo.coords.longitude),
        };
        setPosition(next);
        setDetecting(false);
      },
      () => {
        setDetecting(false);
        toast.error('Unable to detect location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationSelect = (loc) => {
    setPosition(loc);
  };

  const handleSave = () => {
    if (!position) {
      toast.error('Please allow location access or select a location on the map.');
      return;
    }

    if (mode === 'foot' && !eligibility.eligible) {
      toast.error(`Foot delivery is only available within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).`);
      return;
    }

    const trimmed = instructions.trim();
    if (!trimmed) {
      toast.error('Please enter exact delivery instructions (building, floor, landmark).');
      return;
    }

    onSave({
      ...position,
      deliveryInstructions: trimmed,
    });
    onClose();
  };

  if (!isOpen) return null;

  const canSave =
    position &&
    (mode !== 'foot' || eligibility.eligible) &&
    instructions.trim().length > 0 &&
    !detecting;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/60 backdrop-blur-[2px]">
      {/* Backdrop click to close on desktop; on mobile the sheet covers most of the screen */}
      <div className="flex-1 min-h-[15%]" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="w-full max-w-xl mx-auto bg-white dark:bg-dm-card rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] animate-slide-up">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-brown-100 dark:border-dm-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-charcoal dark:text-white flex items-center gap-2">
              <FaMapMarkerAlt className="text-plum-600 flex-shrink-0" />
              Confirm delivery location
            </h2>
            <p className="text-xs text-brown-500 dark:text-white/50 mt-1 leading-snug">
              Drag the pin or search to adjust. Add exact directions so the rider can find you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-brown-100 dark:bg-dm-border text-brown-500 dark:text-white/60 active:scale-95 transition-transform"
            aria-label="Close"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Status + locate me */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  !position
                    ? 'bg-brown-100 dark:bg-dm-border text-brown-500 dark:text-white/60'
                    : mode === 'foot' && !eligibility.eligible
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : mode === 'foot'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}
              >
                {!position ? (
                  'Detecting your location…'
                ) : mode === 'foot' ? (
                  eligibility.eligible ? (
                    <span>Inside Nairobi CBD — {formatDistanceKm(eligibility.distanceKm)} from center</span>
                  ) : (
                    <span>Outside CBD — {formatDistanceKm(eligibility.distanceKm)} (max {eligibility.radiusKm}km for foot)</span>
                  )
                ) : (
                  <span>Standard delivery — {formatDistanceKm(eligibility.distanceKm)} from CBD center</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleDetectAgain}
                disabled={detecting}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-plum-700 text-white text-sm font-semibold active:scale-95 disabled:opacity-60 transition-transform whitespace-nowrap"
              >
                {detecting ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
                <span className="hidden sm:inline">{detecting ? 'Detecting…' : 'My location'}</span>
                <span className="sm:hidden">{detecting ? '…' : 'GPS'}</span>
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="px-4 py-3">
            <div className="rounded-xl overflow-hidden border border-brown-100 dark:border-dm-border">
              <LocationPickerEnhanced
                onLocationSelect={handleLocationSelect}
                initialPosition={position || undefined}
                showCoordinates={true}
                showKeyboardShortcuts={false}
                enableContextMenu={false}
                className="w-full"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="px-4 pb-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-brown-500 dark:text-white/50 mb-2">
              Exact delivery instructions *
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Building name, floor, apartment, door number, nearby shop/landmark..."
              rows={3}
              className="w-full p-3.5 rounded-xl border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-base placeholder:text-brown-300 dark:placeholder:text-white/30 focus:ring-2 focus:ring-plum-500 focus:border-plum-500"
            />
            <p className="text-xs text-brown-400 dark:text-white/40 mt-2">
              Required so the rider knows exactly where to stop.
            </p>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="px-4 py-4 border-t border-brown-100 dark:border-dm-border bg-plum-50/40 dark:bg-dm-card-2 rounded-t-2xl">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${
              canSave
                ? 'bg-gold-500 hover:bg-gold-600 text-charcoal shadow-sm'
                : 'bg-brown-200 dark:bg-dm-border text-brown-400 dark:text-white/40 cursor-not-allowed'
            }`}
          >
            {mode === 'foot' ? 'Confirm foot delivery location' : 'Confirm standard delivery location'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl font-semibold text-sm text-brown-500 dark:text-white/60 active:bg-brown-100 dark:active:bg-dm-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationModal;
