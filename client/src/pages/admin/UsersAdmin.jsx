import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaExclamationTriangle, FaSearch, FaSpinner, FaUsersCog } from 'react-icons/fa';
import UserTable from '../../components/UserTable';
import BlockUserModal from '../../components/modals/BlockUserModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import DeliveryRoleModal from '../../components/modals/DeliveryRoleModal';
import RoleManagementModal from '../../components/modals/RoleManagementModal';
import Axios from '../../utils/Axios';

const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selected user and modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  useEffect(() => {
    fetchUsersWithCacheBusting();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, statusFilter, users]);

  const fetchUsersWithCacheBusting = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching users with cache busting...");
      
      // Simplified request with fewer headers to avoid CORS issues
      const timestamp = new Date().getTime();
      const response = await Axios({
        url: `/api/user/admin/users?t=${timestamp}`,
        method: 'GET',
        // Removed problematic headers that trigger additional CORS checks
      });
      
      console.log("Users API response received");
      
      if (response.data && response.data.success) {
        // Process user data
        const processedUsers = (response.data.data || []).map(user => ({
          ...user,
          name: user.name || 'Unnamed User',
          email: user.email || 'No Email',
          isAdmin: Boolean(user.isAdmin),
          isDelivery: Boolean(user.isDelivery),
          role: user.role || 'user',
          status: user.status || 'Active'
        }));
        
        setUsers(processedUsers);
        setFilteredUsers(processedUsers);
      } else {
        setError(response.data?.message || 'Failed to fetch users');
        toast.error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error fetching users. Please try again.');
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Update the fetchUsers function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      console.log("Fetching users from API...");
      const response = await Axios({
        url: '/api/user/admin/users',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log("Users API response:", response.data);
      
      if (response.data.success) {
        // Ensure all required fields exist on each user
        const processedUsers = response.data.data.map(user => ({
          ...user,
          name: user.name || 'Unnamed User',
          email: user.email || 'No Email',
          isAdmin: Boolean(user.isAdmin),
          isDelivery: Boolean(user.isDelivery),
          role: user.role || 'user',
          status: user.status || 'Active'
        }));
        
        setUsers(processedUsers);
        setFilteredUsers(processedUsers);
      } else {
        setError(response.data.message || 'Failed to fetch users');
        toast.error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Error fetching users. Please try again.');
      toast.error('Error fetching users: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!users || users.length === 0) {
      setFilteredUsers([]);
      return;
    }
    
    let filtered = [...users];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.mobile && user.mobile.toString().includes(searchTerm))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Role management handlers
  const handleRoleChange = (user) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (userId, isAdmin, isDelivery) => {
    try {
      setLoading(true);
      
      // Handle admin role
      const adminResponse = await Axios({
        url: '/api/user/admin/update-role',
        method: 'PUT',
        data: { userId, isAdmin }
      });

      // Handle delivery role separately
      const deliveryResponse = await Axios({
        url: '/api/user/admin/set-delivery',
        method: 'PUT',
        data: { userId, isDelivery }
      });

      if (adminResponse.data.success && deliveryResponse.data.success) {
        // Fetch updated user list to ensure correct data
        fetchUsersWithRefresh();
        toast.success('User role updated successfully');
      } else {
        toast.error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Error updating user role: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
      setIsRoleModalOpen(false);
    }
  };

  // Add this function to fetch users with cache busting
  const fetchUsersWithRefresh = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await Axios({
        url: `/api/user/admin/users?t=${timestamp}`,
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.data.success) {
        setUsers(response.data.data);
        filterUsers(); // Apply current filters
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error fetching users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Block user handlers
  const handleBlockUser = (user) => {
    setSelectedUser(user);
    setIsBlockModalOpen(true);
  };

  const handleSaveBlock = async (userId, blockData) => {
    try {
      const response = await Axios({
        url: '/api/user/admin/block-user',
        method: 'PUT',
        data: { 
          userId, 
          reason: blockData.reason, 
          duration: blockData.duration,
          status: blockData.status
        }
      });

      if (response.data.success) {
        // Update the user in the local state
        setUsers(users.map(user => 
          user._id === userId ? { ...user, status: 'Suspended' } : user
        ));
        toast.success('User blocked successfully');
      } else {
        toast.error(response.data.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Error blocking user: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsBlockModalOpen(false);
    }
  };

  // Unblock user handler
  const handleUnblockUser = (user) => {
    setSelectedUser(user);
    setConfirmationAction('unblock');
    setIsConfirmationModalOpen(true);
  };

  const confirmUnblockUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await Axios({
        url: '/api/user/admin/unblock-user',
        method: 'PUT',
        data: { userId: selectedUser._id }
      });

      if (response.data.success) {
        // Update the user in the local state
        setUsers(users.map(user => 
          user._id === selectedUser._id ? { ...user, status: 'Active' } : user
        ));
        toast.success('User unblocked successfully');
      } else {
        toast.error(response.data.message || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Error unblocking user: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete user handlers
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setConfirmationAction('delete');
    setIsConfirmationModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await Axios({
        url: `/api/user/admin/delete-user/${selectedUser._id}`,
        method: 'DELETE'
      });

      if (response.data.success) {
        // Remove the user from the local state
        setUsers(users.filter(user => user._id !== selectedUser._id));
        toast.success('User deleted successfully');
      } else {
        toast.error(response.data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delivery role management handlers
  const handleDeliveryRoleChange = (user) => {
    setSelectedUser(user);
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDeliveryRole = async (userId, isDelivery) => {
    try {
      const response = await Axios({
        url: '/api/user/admin/set-delivery',
        method: 'PUT',
        data: { userId, isDelivery }
      });

      if (response.data.success) {
        // Update the user in the local state
        setUsers(users.map(user => 
          user._id === userId ? { ...user, isDelivery, role: isDelivery ? 'delivery' : user.isAdmin ? 'admin' : 'user' } : user
        ));
        toast.success('User delivery role updated successfully');
      } else {
        toast.error('Failed to update user delivery role');
      }
    } catch (error) {
      console.error('Error updating user delivery role:', error);
      toast.error('Error updating user delivery role: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsDeliveryModalOpen(false);
    }
  };

  // Get confirmation modal config based on action
  const getConfirmationConfig = () => {
    switch (confirmationAction) {
      case 'delete':
        return {
          title: 'Delete User',
          message: `Are you sure you want to permanently delete the user "${selectedUser?.name}"? This action cannot be undone.`,
          confirmButtonText: 'Delete',
          type: 'danger',
          onConfirm: confirmDeleteUser
        };
      case 'unblock':
        return {
          title: 'Unblock User',
          message: `Are you sure you want to unblock the user "${selectedUser?.name}"?`,
          confirmButtonText: 'Unblock',
          type: 'warning',
          onConfirm: confirmUnblockUser
        };
      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed?',
          confirmButtonText: 'Confirm',
          type: 'warning',
          onConfirm: () => {}
        };
    }
  };

  const confirmationConfig = getConfirmationConfig();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-2">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage all users in the system
          </p>
        </div>
        
        <button
          onClick={fetchUsersWithCacheBusting}
          className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300 flex items-center"
        >
          <FaUsersCog className="mr-2" /> Refresh Users
        </button>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search users by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 pr-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400 dark:text-gray-300" />
          </div>
          
          <div className="flex items-center">
            <label className="mr-2 text-gray-700 dark:text-gray-300">Status:</label>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Users</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <FaSpinner className="animate-spin text-4xl text-primary-200" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center p-8 text-red-500">
            <FaExclamationTriangle className="mr-2" /> {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-8 text-gray-600 dark:text-gray-300">
            No users found matching your search criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <UserTable 
              users={filteredUsers} 
              onDelete={handleDeleteUser}
              onChangeRole={handleRoleChange}
              onBlockUser={handleBlockUser}
              onUnblockUser={handleUnblockUser}
              onSetDelivery={handleDeliveryRoleChange}
            />
          </div>
        )}
      </div>
      
      {/* User Count Summary */}
      {!loading && !error && (
        <div className="mt-4 text-gray-600 dark:text-gray-300">
          Showing {filteredUsers.length} of {users.length} total users
        </div>
      )}

      {/* Modals */}
      <RoleManagementModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveRole}
      />

      <BlockUserModal 
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveBlock}
      />

      <ConfirmationModal 
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmButtonText={confirmationConfig.confirmButtonText}
        type={confirmationConfig.type}
        onConfirm={confirmationConfig.onConfirm}
      />

      <DeliveryRoleModal 
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveDeliveryRole}
      />
    </div>
  );
};

export default UsersAdmin;