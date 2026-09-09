import React, { useEffect, useState } from 'react';
import { FaArrowRight, FaBus, FaStore, FaTimes, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const FulfillmentModal = ({ isOpen, onClose, pickupLocations = [] }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [saccoOperators, setSaccoOperators] = useState([]);
  const [saccoOperatorsLoading, setSaccoOperatorsLoading] = useState(false);
  const [selectedSaccoOperatorId, setSelectedSaccoOperatorId] = useState('');
  const [saccoDestinationTown, setSaccoDestinationTown] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || saccoOperators.length > 0) return;

    const fetchSaccoOperators = async () => {
      setSaccoOperatorsLoading(true);
      try {
        const response = await Axios(SummaryApi.getSaccoOperators);
        if (response.data?.success) {
          setSaccoOperators(response.data.data || []);
        }
      } catch {
        // Non-fatal — the SACCO option simply shows no operators to pick from.
      } finally {
        setSaccoOperatorsLoading(false);
      }
    };

    fetchSaccoOperators();
  }, [isOpen, saccoOperators.length]);

  if (!isOpen) return null;

  const selectedSaccoOperator = saccoOperators.find((op) => op._id === selectedSaccoOperatorId);

  const handleSelect = () => {
    if (!selectedMethod) return;

    const fulfillmentData = {
      fulfillmentMethod: selectedMethod,
      pickupLocation: selectedMethod === 'pickup' ? selectedLocation : '',
      pickupInstructions: selectedMethod === 'pickup' ? pickupInstructions : '',
      saccoOperatorId: selectedMethod === 'sacco_pickup' ? selectedSaccoOperatorId : '',
      saccoOperatorName: selectedMethod === 'sacco_pickup' ? selectedSaccoOperator?.name || '' : '',
      saccoDestinationTown: selectedMethod === 'sacco_pickup' ? saccoDestinationTown : '',
    };

    navigate('/dashboard/checkout', { state: fulfillmentData });
    onClose();
  };

  const isContinueDisabled =
    !selectedMethod ||
    (selectedMethod === 'pickup' && !selectedLocation) ||
    (selectedMethod === 'sacco_pickup' && (!selectedSaccoOperatorId || !saccoDestinationTown.trim()));

  return (
    <div className="fixed inset-0 bg-plum-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-dm-card p-6 rounded-card max-w-md w-full border border-brown-100 dark:border-dm-border shadow-hover transition-colors duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-charcoal dark:text-white">How should we fulfill this order?</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-brown-400 hover:text-charcoal dark:text-white/50 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedMethod('delivery')}
            className={`p-3 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'delivery'
                ? 'border-plum-600 bg-plum-50 dark:bg-plum-900/40 dark:border-plum-400'
                : 'border-brown-100 dark:border-dm-border hover:bg-plum-50/50 dark:hover:bg-plum-900/20'
            }`}
          >
            <FaTruck className={`text-xl mb-2 ${selectedMethod === 'delivery' ? 'text-plum-700 dark:text-plum-300' : 'text-brown-400 dark:text-white/45'}`} />
            <span className={`text-xs font-medium text-center ${selectedMethod === 'delivery' ? 'text-plum-800 dark:text-plum-200' : 'text-charcoal dark:text-white/75'}`}>
              Delivery
            </span>
            <p className="text-[10px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
              To your address
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('pickup')}
            className={`p-3 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'pickup'
                ? 'border-gold-500 bg-gold-50 dark:bg-gold-600/15 dark:border-gold-400'
                : 'border-brown-100 dark:border-dm-border hover:bg-gold-50/40 dark:hover:bg-gold-900/10'
            }`}
          >
            <FaStore className={`text-xl mb-2 ${selectedMethod === 'pickup' ? 'text-gold-600 dark:text-gold-300' : 'text-brown-400 dark:text-white/45'}`} />
            <span className={`text-xs font-medium text-center ${selectedMethod === 'pickup' ? 'text-charcoal dark:text-gold-200' : 'text-charcoal dark:text-white/75'}`}>
              Pickup
            </span>
            <p className="text-[10px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
              From our store
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('sacco_pickup')}
            className={`p-3 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'sacco_pickup'
                ? 'border-brown-600 bg-brown-50 dark:bg-brown-600/15 dark:border-brown-400'
                : 'border-brown-100 dark:border-dm-border hover:bg-brown-50/40 dark:hover:bg-brown-900/10'
            }`}
          >
            <FaBus className={`text-xl mb-2 ${selectedMethod === 'sacco_pickup' ? 'text-brown-700 dark:text-brown-300' : 'text-brown-400 dark:text-white/45'}`} />
            <span className={`text-xs font-medium text-center ${selectedMethod === 'sacco_pickup' ? 'text-charcoal dark:text-brown-200' : 'text-charcoal dark:text-white/75'}`}>
              SACCO / Bus
            </span>
            <p className="text-[10px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
              Send upcountry
            </p>
          </button>
        </div>

        {selectedMethod === 'pickup' && (
          <div className="mb-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
              Pickup location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm"
              required
            >
              <option value="">Select a location</option>
              {pickupLocations.map((location, index) => (
                <option key={index} value={location.address}>
                  {location.name} — {location.address}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45 mt-2">
              Instructions (optional)
            </label>
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="Any special instructions…"
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm placeholder:text-brown-300 dark:placeholder:text-white/30"
              rows={3}
            />
          </div>
        )}

        {selectedMethod === 'sacco_pickup' && (
          <div className="mb-6 space-y-3">
            <div className="text-xs text-plum-700 dark:text-plum-300 bg-plum-50 dark:bg-plum-900/20 border border-plum-200 dark:border-plum-700/40 rounded-lg p-3 space-y-1.5 leading-relaxed">
              <p>
                <span className="font-semibold">KES 100</span> covers our rider taking your order to the
                operator&apos;s Nairobi terminal — included in this order.
              </p>
              <p>
                They&apos;ll <span className="font-semibold">call you</span> once there to confirm drop-off. The
                SACCO/bus charges its own separate fee to carry your parcel onward — you or your receiver pay
                that directly to them.
              </p>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
              SACCO / bus operator
            </label>
            <select
              value={selectedSaccoOperatorId}
              onChange={(e) => setSelectedSaccoOperatorId(e.target.value)}
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm"
              required
              disabled={saccoOperatorsLoading}
            >
              <option value="">
                {saccoOperatorsLoading ? 'Loading operators…' : 'Select an operator'}
              </option>
              {saccoOperators.map((operator) => (
                <option key={operator._id} value={operator._id}>
                  {operator.name}{operator.isCrossBorder ? ' (cross-border)' : ''}
                </option>
              ))}
            </select>

            {selectedSaccoOperator && (
              <div className="text-[11px] text-brown-500 dark:text-white/50 bg-brown-50 dark:bg-dm-surface rounded-lg p-2 space-y-0.5">
                {selectedSaccoOperator.nairobiTerminal && (
                  <p><span className="font-semibold">Terminal:</span> {selectedSaccoOperator.nairobiTerminal}</p>
                )}
                {selectedSaccoOperator.contactPhone && (
                  <p><span className="font-semibold">Contact:</span> {selectedSaccoOperator.contactPhone}</p>
                )}
                {selectedSaccoOperator.destinationsServed?.length > 0 && (
                  <p><span className="font-semibold">Serves:</span> {selectedSaccoOperator.destinationsServed.join(', ')}</p>
                )}
              </div>
            )}

            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45 mt-2">
              Destination town
            </label>
            <input
              type="text"
              value={saccoDestinationTown}
              onChange={(e) => setSaccoDestinationTown(e.target.value)}
              placeholder="e.g. Nyeri, Kisumu, Dar es Salaam"
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm placeholder:text-brown-300 dark:placeholder:text-white/30"
              required
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSelect}
          disabled={isContinueDisabled}
          className={`w-full py-3 px-4 rounded-pill font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            !isContinueDisabled
              ? 'bg-gold-500 hover:bg-gold-400 text-charcoal press shadow-sm hover:shadow-gold'
              : 'bg-brown-100 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
          }`}
        >
          Continue to checkout <FaArrowRight className="text-sm" />
        </button>
      </div>
    </div>
  );
};

export default FulfillmentModal;
