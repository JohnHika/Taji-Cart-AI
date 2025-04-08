import React from 'react';
import {
    FaBan,
    FaCheckCircle,
    FaTimesCircle,
    FaTrash,
    FaTruck,
    FaUnlock,
    FaUser,
    FaUserCog,
    FaUserShield
} from 'react-icons/fa';

const UserTable = ({ users, onDelete, onChangeRole, onBlockUser, onUnblockUser, onSetDelivery }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <table className="min-w-full bg-white dark:bg-gray-800 dark:text-gray-200">
      <thead>
        <tr className="bg-gray-100 dark:bg-gray-700">
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Name</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Email</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Phone Number</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Joined</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Last Login</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Status</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Role</th>
          <th className="py-2 px-4 border-b dark:border-gray-600 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="py-2 px-4 border-b dark:border-gray-600">
              {user.name || 'Not Set'}
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              {user.email || 'Not Set'}
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              {user.mobile || 'Not Set'}
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              {formatDate(user.createdAt)}
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              {user.last_login_date ? formatDate(user.last_login_date) : 'Never'}
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.status === 'Active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : user.status === 'Inactive'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {user.status === 'Active' && <FaCheckCircle className="mr-1 text-green-500" />}
                {user.status === 'Inactive' && <FaTimesCircle className="mr-1 text-yellow-500" />}
                {user.status === 'Suspended' && <FaTimesCircle className="mr-1 text-red-500" />}
                {user.status || 'Unknown'}
              </span>
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              <span className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
                user.isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                user.isDelivery || user.role === 'delivery' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {user.isAdmin ? <FaUserShield className="mr-1" /> : 
                 user.isDelivery || user.role === 'delivery' ? <FaTruck className="mr-1" /> : 
                 <FaUser className="mr-1" />}
                {user.isAdmin ? 'Admin' : 
                 user.isDelivery || user.role === 'delivery' ? 'Driver' : 
                 'Customer'}
              </span>
            </td>
            <td className="py-2 px-4 border-b dark:border-gray-600">
              <div className="flex space-x-2">
                <button 
                  onClick={() => onChangeRole(user)}
                  className="p-1.5 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                  title="Manage Role"
                >
                  <FaUserCog size={16} />
                </button>
                
                <button 
                  onClick={() => onSetDelivery(user)}
                  className="p-1.5 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                  title="Delivery Status"
                >
                  <FaTruck size={16} />
                </button>
                
                {user.status !== 'Suspended' ? (
                  <button 
                    onClick={() => onBlockUser(user)}
                    className="p-1.5 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 transition-colors"
                    title="Block User"
                  >
                    <FaBan size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => onUnblockUser(user)}
                    className="p-1.5 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                    title="Unblock User"
                  >
                    <FaUnlock size={16} />
                  </button>
                )}
                
                <button 
                  onClick={() => onDelete(user)}
                  className="p-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                  title="Delete User"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
