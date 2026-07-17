import React, { useEffect, useMemo, useState } from 'react';
import { FaCrosshairs, FaMapMarkerAlt, FaSpinner, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import LocationPickerEnhanced from './LocationPickerEnhanced';
import { formatDistanceKm, getFootDeliveryEligibility, NAIROBI_CBD_RADIUS_KM } from '../utils/cbdDelivery';

/**
 * DeliveryLocationModal
 *
 * Auto-detects the user's location, drops a pin on the map, checks Nairobi CBD
 * eligibility, and requires free-text delivery instructions so the rider knows
 * exactly where to find the customer.
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
  const [placeName, setPlaceName] = useState('');

  const eligibility = useMemo(
    () => getFootDeliveryEligibility(position),
    [position]
  );

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
  }, [isOpen, initialLocation]);

  const handleLocationSelect = (loc, name) => {
    setPosition(loc);
    if (name) setPlaceName(name);
  };

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
      placeName: placeName || '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-plum-900/60 z-[60] flex items-center justify-center p-3 backdrop-blur-[2px] overflow-y-auto">
      <div className="bg-white dark:bg-dm-card w-full max-w-lg rounded-card border border-brown-100 dark:border-dm-border shadow-hover p-4 sm:p-5 my-4 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal dark:text-white flex items-center gap-2">
              <FaMapMarkerAlt className="text-plum-600" />
              Confirm delivery location
            </h2>
            <p className="text-xs text-brown-500 dark:text-white/50 mt-1">
              We detected your location. Drag the pin or search to adjust it, then tell the rider exactly where to find you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-brown-400 hover:text-charcoal dark:text-white/50 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Eligibility banner */}
        {position && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              eligibility.eligible
                ? 'bg-green-100 text-green-700 dark:bg-green-600/15 dark:text-green-300'
                : mode === 'foot'
                  ? 'bg-red-100 text-red-700 dark:bg-red-600/15 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-600/15 dark:text-blue-300'
            }`}
          >
            <span>
              {mode === 'foot'
                ? (eligibility.eligible
                  ? `Inside Nairobi CBD — ${formatDistanceKm(eligibility.distanceKm)} from center`
                  : `Outside CBD — ${formatDistanceKm(eligibility.distanceKm)} from center (max ${eligibility.radiusKm}km)`)
                : `Standard delivery — ${formatDistanceKm(eligibility.distanceKm)} from CBD center`}
            </span>
            <button
              type="button"
              onClick={handleDetectAgain}
              disabled={detecting}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 transition-colors disabled:opacity-60"
            >
              {detecting ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
              <span className="hidden sm:inline">{detecting ? 'Detecting…' : 'Re-detect'}</span>
            </button>
          </div>
        )}

        {/* Map picker */}
        <div className="mb-3">
          <LocationPickerEnhanced
            onLocationSelect={handleLocationSelect}
            initialPosition={position || undefined}
            showCoordinates={true}
            showKeyboardShortcuts={false}
            enableContextMenu={false}
            className="w-full"
          />
        </div>

        {/* Delivery instructions */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45 mb-1.5">
            Exact delivery instructions *
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Maziwa House, 3rd floor, apartment 12B. Landmark: next to the blue petrol station."
            rows={3}
            className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm placeholder:text-brown-300 dark:placeholder:text-white/30 focus:ring-2 focus:ring-plum-500 focus:border-plum-500"
          />
          <p className="text-[11px] text-brown-400 dark:text-white/40 mt-1">
            Required: building name, floor, door number, nearby landmark or shop name.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-pill font-semibold text-sm border border-brown-200 dark:border-dm-border text-charcoal dark:text-white hover:bg-brown-50 dark:hover:bg-dm-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!position || !eligibility.eligible || !instructions.trim() || detecting}
            className={`flex-1 py-3 rounded-pill font-semibold text-sm transition-colors ${
              position && eligibility.eligible && instructions.trim()
                ? 'bg-gold-500 hover:bg-gold-400 text-charcoal press shadow-sm hover:shadow-gold'
                : 'bg-brown-100 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
            }`}
          >
            Confirm delivery location
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationModal;
