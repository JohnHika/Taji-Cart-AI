import { useState } from 'react';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { submitJengaHostedCheckout } from '../utils/jengaHostedCheckout';

// Collects a Pay on Delivery order's payment at the door: opens Jenga's
// secure M-Pesa page for the order total on the rider's phone, where the
// rider enters the customer's M-Pesa number and the customer approves the
// prompt on theirs. Jenga sends the rider back to /delivery/active, and the
// order turns paid once Jenga confirms.
const useDeliveryCollection = () => {
  const [collectingOrderId, setCollectingOrderId] = useState('');

  const collect = async (orderId) => {
    if (!orderId || collectingOrderId) return;
    setCollectingOrderId(orderId);
    try {
      const response = await Axios({ ...SummaryApi.jengaDeliveryCollection, data: { orderId } });
      const { checkoutUrl, fields } = response.data?.data || {};
      if (!response.data?.success || !checkoutUrl) {
        toast.error(response.data?.message || 'Could not start the M-Pesa payment');
        setCollectingOrderId('');
        return;
      }
      // Navigates away to Jenga; the button stays busy until then.
      submitJengaHostedCheckout(checkoutUrl, fields);
    } catch (error) {
      AxiosToastError(error);
      setCollectingOrderId('');
    }
  };

  return { collect, collectingOrderId };
};

export default useDeliveryCollection;
