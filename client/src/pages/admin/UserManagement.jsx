import React from 'react';
import { FaTruck, FaUser, FaUserShield, FaUserTie } from 'react-icons/fa';

const UserProfile = ({ user, currentUser, handleRoleChange, selectedRole }) => {
    // Helper function to determine account type
    const getAccountType = (user) => {
        console.log("UserProfile - Determining account type for user:", user);

        // Check for staff role
        if (user.isStaff || user.role === 'staff') {
            return { type: 'Staff', color: 'text-plum-600 dark:text-plum-400', icon: <FaUserTie className="mr-1" /> };
        }

        // Check for admin role
        if (user.isAdmin || user.role === 'admin') {
            return { type: 'Admin', color: 'text-blush-600 dark:text-blush-400', icon: <FaUserShield className="mr-1" /> };
        }

        // Check for delivery personnel
        if (user.isDelivery || user.role === 'delivery') {
            return { type: 'Delivery Personnel', color: 'text-plum-600 dark:text-plum-300', icon: <FaTruck className="mr-1" /> };
        }

        // Default to customer
        return { type: 'Customer', color: 'text-brown-600 dark:text-brown-400', icon: <FaUser className="mr-1" /> };
    };

    return (
        <div className="user-info-container">
            {/* Existing user info */}
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-brown-500 dark:text-white/55">{user.email}</p>

            {/* Add account type */}
            <div className="account-type-container mt-2">
                {(() => {
                    const accountInfo = getAccountType(user);
                    return (
                        <span className={`flex items-center font-medium ${accountInfo.color}`}>
                            {accountInfo.icon}
                            {accountInfo.type}
                        </span>
                    );
                })()}
            </div>

            {/* User role management dropdown */}
            <div className="role-management-container mt-4">
                <label htmlFor="role-select" className="block text-sm font-medium text-charcoal dark:text-white">
                    Manage Role:
                </label>
                <select
                    id="role-select"
                    value={selectedRole || user.role || "regular"}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className="border rounded p-1 text-sm"
                >
                    <option value="regular">Regular User</option>
                    <option value="staff">Staff</option>
                    <option value="delivery">Delivery Personnel</option>
                    {currentUser.isAdmin && <option value="admin">Admin</option>}
                </select>
            </div>
        </div>
    );
};

export default UserProfile;
