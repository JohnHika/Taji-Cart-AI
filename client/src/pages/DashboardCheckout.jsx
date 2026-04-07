import React from 'react';
import CheckoutPage from './CheckoutPage';

/**
 * Checkout inside the dashboard shell. Standalone /checkout redirect still uses full CheckoutPage.
 */
const DashboardCheckout = () => {
  return (
    <div className="w-full max-w-full overflow-x-hidden px-2 py-3 sm:px-4 sm:py-5">
      <CheckoutPage embedded />
    </div>
  );
};

export default DashboardCheckout;
