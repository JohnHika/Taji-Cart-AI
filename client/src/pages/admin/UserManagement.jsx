import React from 'react';
import { FaTruck, FaUser, FaUserShield, FaUserTie } from 'react-icons/fa';

const UserProfile = ({ user, currentUser, handleRoleChange, selectedRole }) => {
    // Helper function to determine account type
    const getAccountType = (user) => {
        console.log("UserProfile - Determining account type for user:", user);

        // Check for staff role
        if (user.isStaff || user.role === 'staff') {
            return { type: 'Staff', color: 'text-purple-600 dark:text-purple-400', icon: <FaUserTie className="mr-1" /> };
        }

        // Check for admin role
        if (user.isAdmin || user.role === 'admin') {
            return { type: 'Admin', color: 'text-red-600 dark:text-red-400', icon: <FaUserShield className="mr-1" /> };
        }

        // Check for delivery personnel
        if (user.isDelivery || user.role === 'delivery') {
            return { type: 'Delivery Personnel', color: 'text-blue-600 dark:text-blue-400', icon: <FaTruck className="mr-1" /> };
        }

        // Default to customer
        return { type: 'Customer', color: 'text-green-600 dark:text-green-400', icon: <FaUser className="mr-1" /> };
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdating(true);
            
            console.log(`Changing user ${userId} role to: ${newRole}`);
            
            const response = await Axios({
                url: '/api/admin/users/update-role',
                method: 'PUT',
                data: {
                    userId,
                    role: newRole
                }
            });
            
            if (response.data.success) {
                toast.success('User role updated successfully');
                
                // Update local user data with new role information
                setUsers(prevUsers => 
                    prevUsers.map(user => {
                        if (user._id === userId) {
                            console.log(`Updating local user ${userId} with new role:`, newRole);
                            
                            // Create a new user object with updated role
                            const updatedUser = {
                                ...user,
                                role: newRole,
                                // Set boolean flags based on role
                                isAdmin: newRole === 'admin',
                                isStaff: newRole === 'staff',
                                isDelivery: newRole === 'delivery',
                                // Set accountType to match role
                                accountType: newRole
                            };
                            
                            console.log("Updated user object:", updatedUser);
                            return updatedUser;
                        }
                        return user;
                    })
                );
                
                // Force refresh user data if changing the current user
                if (currentUser._id === userId) {
                    console.log("Changed role for current user - forcing refresh");
                    fetchUserDetails().then(userDetails => {
                        if (userDetails.success) {
                            dispatch(setUserDetails(userDetails.data));
                        }
                    });
                }
            } else {
                toast.error(response.data.message || 'Failed to update user role');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            toast.error('Error updating user role');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="user-info-container">
            {/* Existing user info */}
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>

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
                <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">
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