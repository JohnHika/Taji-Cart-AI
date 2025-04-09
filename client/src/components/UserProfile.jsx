import React from 'react';
import { FaTruck, FaUser, FaUserShield, FaUserTie } from 'react-icons/fa';

const UserProfile = ({ user }) => {
    console.log("UserProfile component rendering with user:", user);
    
    // Case-insensitive role check helper function
    const hasRole = (user, roleName) => {
        // Check the role property (case-insensitive)
        if (typeof user.role === 'string' && user.role.toLowerCase() === roleName.toLowerCase()) {
            return true;
        }
        
        // Check boolean flags
        const flagMap = {
            'staff': 'isStaff',
            'admin': 'isAdmin',
            'delivery': 'isDelivery'
        };
        
        const flag = flagMap[roleName.toLowerCase()];
        if (flag && user[flag] === true) {
            return true;
        }
        
        // Check other potential properties
        if (user.accountType && user.accountType.toLowerCase() === roleName.toLowerCase()) {
            return true;
        }
        
        if (user.userType && user.userType.toLowerCase() === roleName.toLowerCase()) {
            return true;
        }
        
        return false;
    };

    // Enhanced helper function to determine account type
    const getAccountType = (user) => {
        console.log("UserProfile - Determining account type with detailed checking");
        
        // STAFF DETECTION - with extensive checks
        if (hasRole(user, 'staff')) {
            console.log("STAFF ROLE MATCHED in UserProfile");
            return { 
                type: 'Staff', 
                color: 'text-purple-600 dark:text-purple-400', 
                icon: <FaUserTie className="mr-1" /> 
            };
        }

        // Admin detection
        if (hasRole(user, 'admin')) {
            return { 
                type: 'Admin', 
                color: 'text-red-600 dark:text-red-400', 
                icon: <FaUserShield className="mr-1" /> 
            };
        }

        // Delivery personnel detection
        if (hasRole(user, 'delivery')) {
            return { 
                type: 'Delivery Personnel', 
                color: 'text-blue-600 dark:text-blue-400', 
                icon: <FaTruck className="mr-1" /> 
            };
        }

        // Detailed logging for debugging
        console.log("Role detection details:", {
            role: user.role,
            roleLowerCase: (user.role || '').toLowerCase(),
            isStaff: user.isStaff,
            isAdmin: user.isAdmin,
            isDelivery: user.isDelivery,
            accountType: user.accountType,
            userType: user.userType,
        });

        // Default to customer
        return { 
            type: 'Customer', 
            color: 'text-green-600 dark:text-green-400', 
            icon: <FaUser className="mr-1" /> 
        };
    };

    // Get the account type info
    const accountInfo = getAccountType(user);

    return (
        <div className="user-info-container">
            {/* Existing user info */}
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>

            {/* Add account type */}
            <div className="account-type-container mt-2">
                <span className={`flex items-center font-medium ${accountInfo.color}`}>
                    {accountInfo.icon}
                    {accountInfo.type}
                </span>
            </div>
            
            {/* Debug info - always visible for now to help troubleshoot */}
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                <div className="font-bold">Role properties:</div>
                <div>- role: "{user.role || 'undefined'}"</div>
                <div>- isStaff: {String(user.isStaff)}</div>
                <div>- accountType: "{user.accountType || 'undefined'}"</div>
                <div>- userType: "{user.userType || 'undefined'}"</div>
            </div>
        </div>
    );
};

export default UserProfile;