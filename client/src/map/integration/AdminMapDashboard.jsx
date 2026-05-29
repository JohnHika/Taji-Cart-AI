/**
 * AdminMapDashboard - Admin dashboard with live delivery map
 * Phase 7: Integration
 * 
 * Overview of all active deliveries, drivers, and zones.
 * Used in admin panel for fleet management.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Core
import MapContainer, { useMap } from '../core/MapContainer';
import { DEFAULT_CENTER } from '../core/constants';

// UI
import CoordinatesPanel from '../ui/CoordinatesPanel';
import { useKeyboardShortcuts } from '../ui/useKeyboardShortcuts';

// Styles
import { StyleSwitcherControl } from '../styles/StyleSwitcher';

// Drawing
import { DrawingToolbar, DRAWING_TOOLS } from '../drawing/DrawingToolbar';
import { MeasurementTools } from '../drawing/MeasurementTools';
import { useMeasurement } from '../drawing/useMeasurement';

// PWA
import { OfflineIndicator } from '../pwa/OfflineTileManager';

/**
 * Driver status colors
 */
const DRIVER_COLORS = {
  active: '#22c55e', // green
  idle: '#eab308', // yellow
  offline: '#6b7280', // gray
  delivering: '#3b82f6', // blue
};

/**
 * Order status colors
 */
const ORDER_COLORS = {
  pending: '#f59e0b', // amber
  preparing: '#8b5cf6', // purple
  ready: '#22c55e', // green
  delivering: '#3b82f6', // blue
  delivered: '#10b981', // emerald
  cancelled: '#ef4444', // red
};

/**
 * Driver marker on map
 */
const DriverMarkerAdmin = ({ map, driver }) => {
  useEffect(() => {
    if (!map || !driver.location) return;
    
    const el = document.createElement('div');
    el.className = 'admin-driver-marker';
    el.innerHTML = `
      <div class="driver-icon" style="background: ${DRIVER_COLORS[driver.status] || DRIVER_COLORS.idle}">
        <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
      <div class="driver-label">${driver.name}</div>
    `;
    
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([driver.location.lng, driver.location.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <strong>${driver.name}</strong><br/>
            <span class="text-sm text-gray-500">Status: ${driver.status}</span><br/>
            <span class="text-sm text-gray-500">Orders: ${driver.activeOrders || 0}</span><br/>
            <button onclick="window.dispatchEvent(new CustomEvent('driver-select', {detail: '${driver.id}'}))" 
                    class="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded">
              View Details
            </button>
          </div>
        `)
      )
      .addTo(map);
    
    return () => marker.remove();
  }, [map, driver]);
  
  return null;
};

/**
 * Order destination marker
 */
const OrderMarkerAdmin = ({ map, order }) => {
  useEffect(() => {
    if (!map || !order.destination) return;
    
    const el = document.createElement('div');
    el.className = 'admin-order-marker';
    el.innerHTML = `
      <div class="order-icon" style="background: ${ORDER_COLORS[order.status] || ORDER_COLORS.pending}">
        <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;
    
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([order.destination.lng, order.destination.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <strong>Order #${order.id.slice(-6)}</strong><br/>
            <span class="text-sm">Status: ${order.status}</span><br/>
            <span class="text-sm text-gray-500">${order.address || 'No address'}</span>
          </div>
        `)
      )
      .addTo(map);
    
    return () => marker.remove();
  }, [map, order]);
  
  return null;
};

/**
 * Stats panel
 */
const StatsPanel = ({ drivers, orders }) => {
  const stats = useMemo(() => {
    const activeDrivers = drivers.filter(d => d.status === 'active' || d.status === 'delivering').length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
    const deliveringOrders = orders.filter(o => o.status === 'delivering').length;
    const completedToday = orders.filter(o => o.status === 'delivered').length;
    
    return { activeDrivers, pendingOrders, deliveringOrders, completedToday };
  }, [drivers, orders]);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 dark:text-white">Overview</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="text-2xl font-bold text-green-600">{stats.activeDrivers}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Drivers</div>
        </div>
        
        <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
          <div className="text-2xl font-bold text-amber-600">{stats.pendingOrders}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Pending Orders</div>
        </div>
        
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-2xl font-bold text-blue-600">{stats.deliveringOrders}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">In Delivery</div>
        </div>
        
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
          <div className="text-2xl font-bold text-emerald-600">{stats.completedToday}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Delivered Today</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Filter panel
 */
const FilterPanel = ({ filters, onFilterChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 dark:text-white">Filters</h3>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showDrivers}
            onChange={(e) => onFilterChange({ ...filters, showDrivers: e.target.checked })}
            className="rounded text-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Show Drivers</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showOrders}
            onChange={(e) => onFilterChange({ ...filters, showOrders: e.target.checked })}
            className="rounded text-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Show Orders</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showZones}
            onChange={(e) => onFilterChange({ ...filters, showZones: e.target.checked })}
            className="rounded text-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Show Zones</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showHeatmap}
            onChange={(e) => onFilterChange({ ...filters, showHeatmap: e.target.checked })}
            className="rounded text-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Order Heatmap</span>
        </label>
      </div>
      
      <div className="pt-2 border-t dark:border-gray-700">
        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
          Order Status
        </label>
        <select
          value={filters.orderStatus}
          onChange={(e) => onFilterChange({ ...filters, orderStatus: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="delivering">Delivering</option>
        </select>
      </div>
    </div>
  );
};

/**
 * Driver list sidebar
 */
const DriverList = ({ drivers, selectedDriver, onSelectDriver }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
        Drivers ({drivers.length})
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {drivers.map(driver => (
          <button
            key={driver.id}
            onClick={() => onSelectDriver(driver)}
            className={`
              w-full text-left p-2 rounded transition-colors
              ${selectedDriver?.id === driver.id 
                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ background: DRIVER_COLORS[driver.status] }}
              />
              <span className="font-medium text-gray-800 dark:text-white">
                {driver.name}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {driver.activeOrders || 0} active orders • {driver.status}
            </div>
          </button>
        ))}
        
        {drivers.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No drivers online
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Map content
 */
const AdminMapContent = ({
  drivers = [],
  orders = [],
  zones = [],
  filters,
  onFilterChange,
  onDriverSelect,
  onOrderSelect,
  selectedDriver,
}) => {
  const { map } = useMap();
  const [showDrawing, setShowDrawing] = useState(false);
  const measurement = useMeasurement();
  
  // Keyboard shortcuts
  useKeyboardShortcuts(map, {
    'r': () => map?.resetNorth(),
    'd': () => setShowDrawing(s => !s),
    'Escape': () => setShowDrawing(false),
  });

  useEffect(() => {
    if (!showDrawing && measurement.isActive) {
      measurement.stopMeasuring();
    }
  }, [showDrawing, measurement.isActive, measurement.stopMeasuring]);

  const handleDrawingToolChange = useCallback((tool) => {
    if (tool === DRAWING_TOOLS.SELECT) {
      measurement.stopMeasuring();
      return;
    }

    if ([DRAWING_TOOLS.DISTANCE, DRAWING_TOOLS.AREA, DRAWING_TOOLS.RADIUS].includes(tool)) {
      measurement.startMeasuring(tool);
    }
  }, [measurement.startMeasuring, measurement.stopMeasuring]);
  
  // Center on driver
  const centerOnDriver = useCallback((driver) => {
    if (!map || !driver.location) return;
    
    map.flyTo({
      center: [driver.location.lng, driver.location.lat],
      zoom: 15,
      duration: 1000,
    });
    
    onDriverSelect?.(driver);
  }, [map, onDriverSelect]);
  
  // Fit all markers in view
  const fitAllMarkers = useCallback(() => {
    if (!map) return;
    
    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;
    
    drivers.forEach(d => {
      if (d.location) {
        bounds.extend([d.location.lng, d.location.lat]);
        hasPoints = true;
      }
    });
    
    orders.forEach(o => {
      if (o.destination) {
        bounds.extend([o.destination.lng, o.destination.lat]);
        hasPoints = true;
      }
    });
    
    if (hasPoints) {
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 350, right: 50 },
        maxZoom: 14,
      });
    }
  }, [map, drivers, orders]);
  
  // Listen for driver select events from popups
  useEffect(() => {
    const handler = (e) => {
      const driver = drivers.find(d => d.id === e.detail);
      if (driver) centerOnDriver(driver);
    };
    
    window.addEventListener('driver-select', handler);
    return () => window.removeEventListener('driver-select', handler);
  }, [drivers, centerOnDriver]);
  
  // Filtered data
  const visibleDrivers = filters.showDrivers ? drivers : [];
  const visibleOrders = filters.showOrders 
    ? (filters.orderStatus === 'all' ? orders : orders.filter(o => o.status === filters.orderStatus))
    : [];
  
  return (
    <>
      {/* Driver markers */}
      {visibleDrivers.map(driver => (
        <DriverMarkerAdmin key={driver.id} map={map} driver={driver} />
      ))}
      
      {/* Order markers */}
      {visibleOrders.map(order => (
        <OrderMarkerAdmin key={order.id} map={map} order={order} />
      ))}
      
      {/* Drawing tools */}
      {showDrawing && (
        <MeasurementTools measurement={measurement} />
      )}
      
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <StyleSwitcherControl />
        
        <button
          onClick={() => setShowDrawing(s => !s)}
          className={`
            p-2 rounded-lg shadow-lg transition-colors
            ${showDrawing 
              ? 'bg-blue-500 text-white' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }
          `}
          title="Measurement tools (D)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21.71 3.29a1 1 0 0 0-1.42 0l-18 18a1 1 0 1 0 1.42 1.42l18-18a1 1 0 0 0 0-1.42zM3 9l2 2m4-4l2 2m4-4l2 2" />
          </svg>
        </button>
        
        <button
          onClick={fitAllMarkers}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Fit all markers"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
          </svg>
        </button>
        
        <OfflineIndicator />
      </div>
      
      {/* Coordinates */}
      <div className="absolute bottom-4 right-4 z-10">
        <CoordinatesPanel map={map} />
      </div>
      
      {/* Drawing toolbar */}
      {showDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <DrawingToolbar
            activeTool={measurement.isActive ? measurement.measurementType : DRAWING_TOOLS.SELECT}
            onToolChange={handleDrawingToolChange}
            onClear={measurement.clearPoints}
          />
        </div>
      )}
      
      {/* Left sidebar */}
      <div className="absolute top-4 left-4 bottom-4 w-80 flex flex-col gap-4 z-10 overflow-y-auto">
        <StatsPanel drivers={drivers} orders={orders} />
        <FilterPanel filters={filters} onFilterChange={onFilterChange} />
        <DriverList 
          drivers={drivers} 
          selectedDriver={selectedDriver}
          onSelectDriver={centerOnDriver}
        />
      </div>
    </>
  );
};

/**
 * AdminMapDashboard
 */
export const AdminMapDashboard = ({
  drivers = [],
  orders = [],
  zones = [],
  initialCenter = DEFAULT_CENTER,
  initialZoom = 12,
  onDriverSelect,
  onOrderSelect,
  className = '',
  style = {},
}) => {
  const [filters, setFilters] = useState({
    showDrivers: true,
    showOrders: true,
    showZones: false,
    showHeatmap: false,
    orderStatus: 'all',
  });
  
  const [selectedDriver, setSelectedDriver] = useState(null);
  
  const handleDriverSelect = useCallback((driver) => {
    setSelectedDriver(driver);
    onDriverSelect?.(driver);
  }, [onDriverSelect]);
  
  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <MapContainer
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        styleKey="bright"
        className="w-full h-full"
      >
        <AdminMapContent
          drivers={drivers}
          orders={orders}
          zones={zones}
          filters={filters}
          onFilterChange={setFilters}
          onDriverSelect={handleDriverSelect}
          onOrderSelect={onOrderSelect}
          selectedDriver={selectedDriver}
        />
      </MapContainer>
      
      {/* Inject styles */}
      <style>{`
        .admin-driver-marker .driver-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        
        .admin-driver-marker .driver-label {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 11px;
          font-weight: 500;
          color: #374151;
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          margin-top: 4px;
        }
        
        .admin-order-marker .order-icon {
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        
        .admin-order-marker .order-icon svg {
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
};

export default AdminMapDashboard;
