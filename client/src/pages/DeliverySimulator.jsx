import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'react-toastify';
import { socketBaseUrl } from '../common/apiBaseUrl';
import Axios from '../utils/Axios';
import io from 'socket.io-client';

const NAIROBI = [36.817223, -1.286389]; // [lng, lat]
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const DeliverySimulator = () => {
  const [socket, setSocket] = useState(null);
  const [position, setPosition] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('driver_assigned');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // ── Connect socket ──────────────────────────────────────────────────────
  useEffect(() => {
    const newSocket = io(socketBaseUrl, { withCredentials: true });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // ── Fetch assignable orders ─────────────────────────────────────────────
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await Axios({ url: '/api/order/delivery-assigned', method: 'GET' });
        if (response.data.success) setOrders(response.data.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();
  }, []);

  // ── Join socket room when order is selected ─────────────────────────────
  useEffect(() => {
    if (socket && orderId) socket.emit('joinOrderRoom', orderId);
  }, [socket, orderId]);

  // ── Initialise MapLibre (once) ──────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: NAIROBI,
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-register click handler when socket/orderId change ───────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e) => {
      const { lng, lat } = e.lngLat;
      setPosition({ lat, lng });

      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: '#3b82f6' })
        .setLngLat([lng, lat])
        .addTo(map);

      if (socket && orderId) {
        socket.emit('updateLocation', { orderId, location: { lat, lng } });
        toast.info('Location updated');
      }
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [socket, orderId]);
  
  // ── Update status via REST ──────────────────────────────────────────────
  const updateStatus = async () => {
    if (!orderId || !position) {
      toast.error('Please select an order and mark your location');
      return;
    }
    try {
      const response = await Axios({
        url: '/api/order/update-location',
        method: 'POST',
        data: { orderId, location: { lat: position.lat, lng: position.lng }, status },
      });
      if (response.data.success) {
        toast.success(`Status updated to: ${status}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status');
    }
  };

  const handleOrderSelect = (e) => {
    setOrderId(e.target.value);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Delivery Simulator</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-2">
          Select Order to Deliver
        </label>
        <select 
          value={orderId} 
          onChange={handleOrderSelect}
          className="w-full p-2 border border-brown-200 rounded-md"
        >
          <option value="">-- Select an order --</option>
          {orders.map(order => (
            <option key={order._id} value={order._id}>
              Order #{order.orderId || order._id.substring(0, 8)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-2">
          Update Order Status
        </label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 border border-brown-200 rounded-md"
        >
          <option value="driver_assigned">Driver Assigned</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="nearby">Nearby</option>
          <option value="delivered">Delivered</option>
        </select>
        <button 
          onClick={updateStatus}
          className="mt-2 bg-primary-100 text-white px-4 py-2 rounded-md"
        >
          Update Status
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm font-medium text-charcoal mb-2">Click on the map to update your location</p>
      </div>
      
      <div className="h-96 border rounded-lg overflow-hidden">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium">Instructions</h3>
        <ol className="list-decimal ml-5 mt-2">
          <li>Select an order to simulate delivery</li>
          <li>Click on the map to update your location</li>
          <li>Update the order status as the delivery progresses</li>
          <li>Open the customer tracking page in another tab to see updates</li>
        </ol>
      </div>
    </div>
  );
};

export default DeliverySimulator;

