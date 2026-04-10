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
          className="text-charcoal hover:bg-brown-50 px-4 py-2 flex items-center dark:text-white/70 dark:hover:bg-dm-card-2"
        >
          <FaTruck className="mr-2" /> Delivery Dashboard
        </Link>
      )}
      
      {/* ...existing code... */}
    </nav>
  );
};

export default Navigation;