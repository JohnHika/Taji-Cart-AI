import React from 'react';
import DisplayCartItem from '../components/DisplayCartItem';

/**
 * Cart inside the dashboard shell (sidebar + panel). Uses embedded DisplayCartItem
 * so /mobile/cart and header drawer keep the full-screen drawer behavior.
 */
const DashboardCart = () => {
  return (
    <div className="w-full max-w-full px-3 py-4 sm:px-5 sm:py-6">
      <h1 className="mb-4 text-xl font-bold text-charcoal dark:text-white sm:text-2xl">Cart</h1>
      <DisplayCartItem variant="embedded" close={() => {}} />
    </div>
  );
};

export default DashboardCart;
