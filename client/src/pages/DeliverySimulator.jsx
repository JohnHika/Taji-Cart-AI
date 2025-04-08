import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import Axios from '../utils/Axios';
import L from 'leaflet';
import io from 'socket.io-client';

// Custom marker icon
const deliveryIcon = new L.Icon({
  iconUrl: '/images/delivery-marker.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

function LocationMarker({ position, setPosition, socket, orderId, setStatus }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      
      // Send location update to server via socket
      if (socket && orderId) {
        socket.emit('updateLocation', {
          orderId,
          location: {
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }
        });
        
        toast.info('Location updated');
      }
    },
  });

  return position === null ? null : (
    <Marker 
      position={position}
      icon={deliveryIcon}
    />
  );
}

const DeliverySimulator = () => {
  const [socket, setSocket] = useState(null);
  const [position, setPosition] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('driver_assigned');
  
  // Connect to socket server
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080', {
      withCredentials: true
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Load assigned orders for testing
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await Axios.get('/api/order/delivery-assigned');
        if (response.data.success) {
          setOrders(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    
    fetchOrders();
  }, []);
  
  // Join order room when order selected
  useEffect(() => {
    if (socket && orderId) {
      socket.emit('joinOrderRoom', orderId);
    }
  }, [socket, orderId]);
  
  const handleOrderSelect = (e) => {
    setOrderId(e.target.value);
  };
  
  const updateStatus = async () => {
    if (!orderId || !position) {
      toast.error('Please select an order and mark your location');
      return;
    }
    
    try {
      const response = await Axios.post('/api/order/update-location', {
        orderId,
        location: {
          lat: position.lat,
          lng: position.lng
        },
        status
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
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Delivery Simulator</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Order to Deliver
        </label>
        <select 
          value={orderId} 
          onChange={handleOrderSelect}
          className="w-full p-2 border border-gray-300 rounded-md"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Update Order Status
        </label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
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
        <p className="text-sm font-medium text-gray-700 mb-2">Click on the map to update your location</p>
      </div>
      
      <div className="h-96 border rounded-lg overflow-hidden">
        <MapContainer 
          center={[-1.286389, 36.817223]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            socket={socket} 
            orderId={orderId}
            setStatus={setStatus}
          />
        </MapContainer>
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