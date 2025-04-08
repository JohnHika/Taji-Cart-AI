import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Success = () => {
  const location = useLocation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');
        
        console.log("URL params:", location.search);
        console.log("Session ID:", sessionId);
        
        if (sessionId) {
          // Use the correct endpoint path
          const response = await axios.get(`/api/order/details?session_id=${sessionId}`);
          console.log("Order details response:", response.data);
          setOrderDetails(response.data.order);
        } else {
          // Use existing order-list endpoint as fallback
          const response = await axios.get('/api/order/order-list');
          console.log("Order list response:", response.data);
          // Get the most recent order
          if (response.data.data && response.data.data.length > 0) {
            setOrderDetails(response.data.data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [location]);

  return (
    <div className='m-2 w-full max-w-md bg-green-200 p-4 py-5 rounded mx-auto flex flex-col justify-center items-center gap-5'>
      <p className='text-green-800 font-bold text-lg text-center'>
        Payment Successfully
      </p>
      <h3 className='text-lg font-semibold'>Receipt Details:</h3>
      {loading ? (
        <p>Loading order details...</p>
      ) : orderDetails ? (
        <ul className='list-disc'>
          <li className='text-green-700'>Order ID: {orderDetails.orderId}</li>
          <li className='text-green-700'>Amount: ${orderDetails.totalAmount}</li>
          <li className='text-green-700'>Items: {orderDetails.items?.length || 0}</li>
          <li className='text-green-700'>Date: {new Date(orderDetails.createdAt).toLocaleDateString()}</li>
        </ul>
      ) : (
        <p>No order details found.</p>
      )}
      <Link to="/" className="border border-green-900 text-green-900 hover:bg-green-900 hover:text-white transition-all px-4 py-1">Go To Home</Link>
    </div>
  );
}

export default Success;