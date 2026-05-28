import React from 'react';
import { FaTruck, FaUser, FaUserShield, FaUserTie } from 'react-icons/fa';

export const getEffectiveRole = (user = {}) => {
  const normalizedRole = (user?.role || '').toString().trim().toLowerCase();

  // Role string is source of truth when present.
  if (normalizedRole === 'admin' || normalizedRole === 'staff' || normalizedRole === 'delivery' || normalizedRole === 'user') {
    return normalizedRole;
  }

  // Fallbacks for legacy records.
  if (user?.isAdmin === true) return 'admin';
  if (user?.isStaff === true) return 'staff';
  if (user?.isDelivery === true) return 'delivery';
  return 'user';
};

export const getAccountTypeMeta = (user = {}) => {
  const effectiveRole = getEffectiveRole(user);

  if (effectiveRole === 'admin') {
    return {
      role: 'admin',
      type: 'Administrator',
      color: 'text-red-600 dark:text-red-400',
      chipClass: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      icon: React.createElement(FaUserShield, { className: 'mr-1' }),
    };
  }

  if (effectiveRole === 'staff') {
    return {
      role: 'staff',
      type: 'Staff',
      color: 'text-purple-600 dark:text-purple-400',
      chipClass: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      icon: React.createElement(FaUserTie, { className: 'mr-1' }),
    };
  }

  if (effectiveRole === 'delivery') {
    return {
      role: 'delivery',
      type: 'Delivery Personnel',
      color: 'text-green-600 dark:text-green-400',
      chipClass: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      icon: React.createElement(FaTruck, { className: 'mr-1' }),
    };
  }

  return {
    role: 'user',
    type: 'Customer',
    color: 'text-plum-600 dark:text-plum-300',
    chipClass: 'bg-plum-100 dark:bg-plum-900 text-plum-800 dark:text-plum-200',
    icon: React.createElement(FaUser, { className: 'mr-1' }),
  };
};
