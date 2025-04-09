import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AddressSelector from '../components/AddressSelector';
import FulfillmentSelector from '../components/FulfillmentSelector';
import OrderSummary from '../components/OrderSummary';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import PickupLocationSelector from '../components/PickupLocationSelector';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Checkout = () => {
  const { cartItems, totalAmount, subTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [pickupLocation, setPickupLocation] = useState('main-store');
  const [pickupInstructions, setPickupInstructions] = useState('');

  useEffect(() => {
    if (orderSuccess) {
      clearCart();
    }
  }, [orderSuccess, clearCart]);

  const placeOrder = async () => {
    if (fulfillmentType === 'delivery' && !selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (fulfillmentType === 'pickup' && !pickupLocation) {
      toast.error('Please select a pickup location');
      return;
    }

    setLoading(true);
    try {
      if (paymentMode === 'cod') {
        const response = await axios.post(
          '/api/order/cash-on-delivery',
          {
            list_items: cartItems,
            totalAmt: Number(totalAmount),
            subTotalAmt: Number(subTotal),
            addressId: fulfillmentType === 'delivery' ? selectedAddress : null,
            fulfillment_type: fulfillmentType,
            pickup_location: fulfillmentType === 'pickup' ? pickupLocation : null,
            pickup_instructions: fulfillmentType === 'pickup' ? pickupInstructions : null
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (response.data.success) {
          setOrderSuccess(true);
          setOrderData(response.data);
          navigate('/order-success', { 
            state: { 
              orderData: response.data,
              fulfillmentType: fulfillmentType,
              pickupLocation: fulfillmentType === 'pickup' ? pickupLocation : null,
              verificationCode: response.data?.data?.[0]?.pickupVerificationCode || ''
            } 
          });
        }
      } else {
        const response = await axios.post(
          '/api/order/payment',
          {
            list_items: cartItems,
            totalAmt: Number(totalAmount),
            subTotalAmt: Number(subTotal),
            addressId: fulfillmentType === 'delivery' ? selectedAddress : null,
            fulfillment_type: fulfillmentType,
            pickup_location: fulfillmentType === 'pickup' ? pickupLocation : null,
            pickup_instructions: fulfillmentType === 'pickup' ? pickupInstructions : null
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        // ...rest of existing online payment code...
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <FulfillmentSelector 
                fulfillmentType={fulfillmentType} 
                setFulfillmentType={setFulfillmentType} 
              />
              {fulfillmentType === 'delivery' ? (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Delivery Address
                  </h2>
                  <AddressSelector 
                    selectedAddress={selectedAddress} 
                    setSelectedAddress={setSelectedAddress} 
                  />
                </div>
              ) : (
                <PickupLocationSelector
                  selectedLocation={pickupLocation}
                  setSelectedLocation={setPickupLocation}
                  pickupInstructions={pickupInstructions}
                  setPickupInstructions={setPickupInstructions}
                />
              )}
            </div>
            <PaymentMethodSelector 
              paymentMode={paymentMode} 
              setPaymentMode={setPaymentMode} 
            />
          </div>
          <OrderSummary 
            totalAmount={totalAmount} 
            subTotal={subTotal} 
            placeOrder={placeOrder} 
            loading={loading} 
          />
        </div>
      </div>
    </div>
  );
};

export default Checkout;