/**
 * TrackingPanel - Order tracking UI
 * Shows delivery status, ETA, driver info, and live updates
 */

import React, { useState, useCallback, useEffect } from 'react';
import { STATUS_CONFIG, DRIVER_STATUS } from './useDeliveryTracking';

/**
 * Status timeline component
 */
export const StatusTimeline = ({ currentStatus }) => {
  const statuses = [
    DRIVER_STATUS.ASSIGNED,
    DRIVER_STATUS.HEADING_TO_PICKUP,
    DRIVER_STATUS.AT_PICKUP,
    DRIVER_STATUS.HEADING_TO_DELIVERY,
    DRIVER_STATUS.ARRIVING,
    DRIVER_STATUS.DELIVERED,
  ];
  
  const currentIndex = statuses.indexOf(currentStatus);
  
  return (
    <div className="flex items-center justify-between w-full px-2">
      {statuses.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <React.Fragment key={status}>
            {/* Status dot */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-lg
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-100' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isCompleted ? '✓' : config.icon}
              </div>
              <span 
                className={`
                  text-xs mt-1 text-center max-w-[60px] leading-tight
                  ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'}
                `}
              >
                {config.label.split(' ')[0]}
              </span>
            </div>
            
            {/* Connector line */}
            {index < statuses.length - 1 && (
              <div 
                className={`
                  flex-1 h-1 mx-1 rounded
                  ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * ETA display component
 */
export const ETADisplay = ({ eta, isArriving = false }) => {
  if (!eta) return null;
  
  return (
    <div 
      className={`
        text-center py-4 px-6 rounded-xl
        ${isArriving ? 'bg-green-50' : 'bg-blue-50'}
      `}
    >
      <p className={`text-sm ${isArriving ? 'text-green-600' : 'text-blue-600'}`}>
        {isArriving ? 'Arriving in' : 'Estimated arrival'}
      </p>
      <p className={`text-3xl font-bold ${isArriving ? 'text-green-700' : 'text-blue-700'}`}>
        {eta.durationFormatted || `${Math.round(eta.duration)} min`}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {eta.etaFormatted || eta.eta?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      {eta.distanceFormatted && (
        <p className="text-xs text-gray-400 mt-1">
          {eta.distanceFormatted} away
        </p>
      )}
    </div>
  );
};

/**
 * Driver info card component
 */
export const DriverCard = ({ driver, onCall, onMessage }) => {
  if (!driver) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-4">
        {/* Driver avatar */}
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
          {driver.avatar ? (
            <img 
              src={driver.avatar} 
              alt={driver.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            '🧑‍✈️'
          )}
        </div>
        
        {/* Driver details */}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{driver.name || 'Your Driver'}</h4>
          {driver.rating && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm text-gray-600">{driver.rating.toFixed(1)}</span>
            </div>
          )}
          {driver.vehiclePlate && (
            <p className="text-sm text-gray-500 mt-1">
              {driver.vehicleType === 'motorcycle' ? '🏍️' : '🚗'} {driver.vehiclePlate}
            </p>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          {driver.phone && (
            <button
              onClick={() => onCall?.(driver.phone)}
              className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition"
              title="Call driver"
            >
              📞
            </button>
          )}
          {onMessage && (
            <button
              onClick={() => onMessage?.(driver)}
              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition"
              title="Message driver"
            >
              💬
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Delivery address display
 */
export const DeliveryAddress = ({ address, label = 'Delivery Address' }) => {
  if (!address) return null;
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900">
        {typeof address === 'string' ? address : address.address || address.fullAddress}
      </p>
    </div>
  );
};

/**
 * Live tracking indicator
 */
export const LiveIndicator = ({ isConnected }) => (
  <div className="flex items-center gap-2">
    <span 
      className={`
        w-2 h-2 rounded-full
        ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
      `}
    />
    <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
      {isConnected ? 'Live tracking' : 'Reconnecting...'}
    </span>
  </div>
);

/**
 * Main TrackingPanel component
 */
export const TrackingPanel = ({
  orderId,
  status,
  eta,
  driverInfo,
  deliveryAddress,
  pickupAddress,
  isConnected = true,
  onCallDriver,
  onMessageDriver,
  onShareLocation,
  onClose,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const isArriving = status === DRIVER_STATUS.ARRIVING;
  const isDelivered = status === DRIVER_STATUS.DELIVERED;
  
  // Call driver
  const handleCallDriver = useCallback(() => {
    if (driverInfo?.phone) {
      window.open(`tel:${driverInfo.phone}`, '_self');
      onCallDriver?.(driverInfo.phone);
    }
  }, [driverInfo, onCallDriver]);
  
  return (
    <div 
      className={`
        bg-white rounded-t-2xl shadow-2xl border border-gray-200
        transition-all duration-300
        ${className}
      `}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span 
            className="text-2xl"
            style={{ filter: isDelivered ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          >
            {statusConfig?.icon || '📦'}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {statusConfig?.label || 'Tracking Order'}
            </h3>
            <p className="text-sm text-gray-500">
              {statusConfig?.description || `Order #${orderId?.slice(-8)}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <LiveIndicator isConnected={isConnected} />
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          {onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Status timeline */}
          {!isDelivered && (
            <StatusTimeline currentStatus={status} />
          )}
          
          {/* ETA */}
          {eta && !isDelivered && (
            <ETADisplay eta={eta} isArriving={isArriving} />
          )}
          
          {/* Delivered message */}
          {isDelivered && (
            <div className="bg-green-50 text-center py-6 rounded-xl">
              <span className="text-5xl">🎉</span>
              <p className="text-lg font-semibold text-green-700 mt-2">
                Your order has been delivered!
              </p>
              <p className="text-sm text-green-600 mt-1">
                Thank you for ordering with us
              </p>
            </div>
          )}
          
          {/* Driver card */}
          {driverInfo && !isDelivered && (
            <DriverCard 
              driver={driverInfo}
              onCall={handleCallDriver}
              onMessage={onMessageDriver}
            />
          )}
          
          {/* Addresses */}
          <div className="space-y-2">
            {pickupAddress && (
              <DeliveryAddress address={pickupAddress} label="Pickup" />
            )}
            {deliveryAddress && (
              <DeliveryAddress address={deliveryAddress} label="Delivery Address" />
            )}
          </div>
          
          {/* Actions */}
          {!isDelivered && (
            <div className="flex gap-2 pt-2">
              {onShareLocation && (
                <button
                  onClick={onShareLocation}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <span>📤</span> Share Location
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact tracking bar for mobile
 */
export const TrackingBar = ({
  status,
  eta,
  driverInfo,
  onClick,
}) => {
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-white shadow-lg border border-gray-200 rounded-xl p-3 flex items-center gap-3 hover:bg-gray-50 transition"
    >
      <span className="text-2xl">{statusConfig?.icon || '📦'}</span>
      
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900 text-sm">
          {statusConfig?.label || 'Tracking...'}
        </p>
        <p className="text-xs text-gray-500">
          {eta?.durationFormatted ? `${eta.durationFormatted} away` : 'Calculating...'}
        </p>
      </div>
      
      {driverInfo && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          {driverInfo.avatar ? (
            <img 
              src={driverInfo.avatar} 
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            '🧑‍✈️'
          )}
        </div>
      )}
      
      <span className="text-gray-400">›</span>
    </button>
  );
};

/**
 * Floating tracking widget
 */
export const TrackingWidget = ({
  orderId,
  status,
  eta,
  driverInfo,
  isConnected,
  onExpand,
  position = 'bottom-right',
}) => {
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const isDelivered = status === DRIVER_STATUS.DELIVERED;
  
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  if (isDelivered) return null;
  
  return (
    <button
      onClick={onExpand}
      className={`
        fixed ${positionClasses[position]}
        bg-white shadow-xl rounded-full px-4 py-3
        flex items-center gap-3
        hover:shadow-2xl transition-all
        border border-gray-200
        z-50
      `}
    >
      <div className="relative">
        <span className="text-2xl">{statusConfig?.icon || '📦'}</span>
        {isConnected && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
      
      <div className="text-left">
        <p className="text-sm font-medium text-gray-900">
          {eta?.durationFormatted || 'Tracking...'}
        </p>
        <p className="text-xs text-gray-500">{statusConfig?.label}</p>
      </div>
    </button>
  );
};

export default TrackingPanel;
