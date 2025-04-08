import React from 'react';
import { FaTruck } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const user = useSelector(state => state.user);
  const isDelivery = user.isDelivery || user.role === 'delivery';

  return (
    <nav>
      {/* ...existing code... */}
      
      {isDelivery && (
        <Link 
          to="/delivery/dashboard" 
          className="text-gray-700 hover:bg-gray-100 px-4 py-2 flex items-center dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <FaTruck className="mr-2" /> Delivery Dashboard
        </Link>
      )}
      
      {/* ...existing code... */}
    </nav>
  );
};

export default Navigation;