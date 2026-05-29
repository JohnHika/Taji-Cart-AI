import React from 'react';
import {
    FaBan,
    FaCheckCircle,
    FaIdBadge,
    FaTimesCircle,
    FaTrash,
    FaTruck,
    FaUnlock,
    FaUser,
    FaUserCog,
    FaUserShield
} from 'react-icons/fa';

const UserTable = ({ users, onDelete, onChangeRole, onBlockUser, onUnblockUser, onSetDelivery }) => {
  const canManageUsers = Boolean(onDelete || onChangeRole || onBlockUser || onUnblockUser || onSetDelivery);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden md:overflow-x-auto">
      <div className="divide-y divide-brown-100 dark:divide-dm-border md:hidden">
        {users.map((user) => (
          <div key={user._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-charcoal dark:text-white truncate">
                  {user.name || 'Not Set'}
                </div>
                <div className="mt-1 text-sm text-brown-400 dark:text-white/40 break-all">
                  {user.email || 'Not Set'}
                </div>
                <div className="mt-1 text-sm text-brown-400 dark:text-white/40">
                  {user.mobile || 'No phone'}
                </div>
              </div>

              <span className={`shrink-0 inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold tracking-wide ${
                user.status === 'Active'
                  ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                  : user.status === 'Inactive'
                  ? 'bg-brown-100 text-brown-500 dark:bg-dm-card-2 dark:text-white/60'
                  : 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300'
              }`}>
                {user.status || 'Unknown'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-semibold tracking-wide ${
                user.isAdmin ? 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' : 
                user.isStaff || user.role === 'staff' ? 'bg-gold-100 text-gold-600 dark:bg-gold-900/20 dark:text-gold-300' :
                user.isDelivery || user.role === 'delivery' ? 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300' :
                'bg-brown-100 text-brown-500 dark:bg-dm-card-2 dark:text-white/70'
              }`}>
                {user.isAdmin ? <FaUserShield className="mr-1" size={12} /> : 
                 user.isStaff || user.role === 'staff' ? <FaIdBadge className="mr-1" size={12} /> :
                 user.isDelivery || user.role === 'delivery' ? <FaTruck className="mr-1" size={12} /> : 
                 <FaUser className="mr-1" size={12} />}
                {user.isAdmin ? 'Admin' : 
                 user.isStaff || user.role === 'staff' ? 'Staff' :
                 user.isDelivery || user.role === 'delivery' ? 'Driver' : 
                 'Customer'}
              </span>
              <span className="inline-flex items-center rounded-full bg-brown-50 px-2.5 py-1 text-xs font-medium text-charcoal dark:bg-dm-card-2 dark:text-white/70">
                Joined {formatDate(user.createdAt)}
              </span>
              <span className="inline-flex items-center rounded-full bg-brown-50 px-2.5 py-1 text-xs font-medium text-charcoal dark:bg-dm-card-2 dark:text-white/70">
                Last login {user.last_login_date ? formatDate(user.last_login_date) : 'Never'}
              </span>
            </div>

            {canManageUsers && (
              <div className="mt-4 flex flex-wrap gap-2">
                {onChangeRole && (
                  <button 
                    onClick={() => onChangeRole(user)}
                    className="inline-flex items-center rounded-lg bg-plum-100 px-3 py-2 text-xs font-medium text-plum-800 transition-colors hover:bg-plum-200 dark:bg-plum-900 dark:text-plum-200 dark:hover:bg-plum-800"
                    title="Manage Role"
                  >
                    <FaUserCog size={14} className="mr-2" />
                    Role
                  </button>
                )}

                {onSetDelivery && (
                  <button 
                    onClick={() => onSetDelivery(user)}
                    className="inline-flex items-center rounded-lg bg-brown-100 px-3 py-2 text-xs font-medium text-brown-700 transition-colors hover:bg-brown-200 dark:bg-brown-900/30 dark:text-brown-200 dark:hover:bg-brown-800/50"
                    title="Delivery Status"
                  >
                    <FaTruck size={14} className="mr-2" />
                    Delivery
                  </button>
                )}

                {user.status !== 'Suspended' && onBlockUser && (
                  <button 
                    onClick={() => onBlockUser(user)}
                    className="inline-flex items-center rounded-lg bg-gold-100 px-3 py-2 text-xs font-medium text-gold-700 transition-colors hover:bg-gold-200 dark:bg-gold-900/20 dark:text-gold-300 dark:hover:bg-gold-800/30"
                    title="Block User"
                  >
                    <FaBan size={14} className="mr-2" />
                    Block
                  </button>
                )}

                {user.status === 'Suspended' && onUnblockUser && (
                  <button 
                    onClick={() => onUnblockUser(user)}
                    className="inline-flex items-center rounded-lg bg-brown-100 px-3 py-2 text-xs font-medium text-brown-700 transition-colors hover:bg-brown-200 dark:bg-brown-900/30 dark:text-brown-200 dark:hover:bg-brown-800/50"
                    title="Unblock User"
                  >
                    <FaUnlock size={14} className="mr-2" />
                    Unblock
                  </button>
                )}

                {onDelete && (
                  <button 
                    onClick={() => onDelete(user)}
                    className="inline-flex items-center rounded-lg bg-blush-100 px-3 py-2 text-xs font-medium text-blush-500 transition-colors hover:bg-blush-200 dark:bg-blush-500/10 dark:text-blush-300 dark:hover:bg-blush-500/20"
                    title="Delete User"
                  >
                    <FaTrash size={14} className="mr-2" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <table className="hidden md:table w-full bg-white dark:bg-dm-card dark:text-white/70">
        <thead>
          <tr className="bg-brown-50 dark:bg-dm-card-2">
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Name</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Email</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Phone</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Joined</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Last Login</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Status</th>
            <th className="py-2 px-3 border-b dark:border-dm-border text-left">Role</th>
            {canManageUsers && (
              <th className="py-2 px-3 border-b dark:border-dm-border text-left">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <div className="max-w-[120px] truncate" title={user.name || 'Not Set'}>
                  {user.name || 'Not Set'}
                </div>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <div className="max-w-[180px] truncate" title={user.email || 'Not Set'}>
                  {user.email || 'Not Set'}
                </div>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <div className="max-w-[100px] truncate" title={user.mobile || 'Not Set'}>
                  {user.mobile || 'Not Set'}
                </div>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <div className="max-w-[90px] truncate" title={formatDate(user.createdAt)}>
                  {formatDate(user.createdAt)}
                </div>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <div className="max-w-[90px] truncate" title={user.last_login_date ? formatDate(user.last_login_date) : 'Never'}>
                  {user.last_login_date ? formatDate(user.last_login_date) : 'Never'}
                </div>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'Active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : user.status === 'Inactive'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {user.status === 'Active' && <FaCheckCircle className="mr-1 text-green-500" size={12} />}
                  {user.status === 'Inactive' && <FaTimesCircle className="mr-1 text-yellow-500" size={12} />}
                  {user.status === 'Suspended' && <FaTimesCircle className="mr-1 text-red-500" size={12} />}
                  {user.status || 'Unknown'}
                </span>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <span className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
                  user.isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                  user.isStaff || user.role === 'staff' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' :
                  user.isDelivery || user.role === 'delivery' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  'bg-plum-100 text-plum-800 dark:bg-plum-900 dark:text-plum-200'
                }`}>
                  {user.isAdmin ? <FaUserShield className="mr-1" size={12} /> : 
                   user.isStaff || user.role === 'staff' ? <FaIdBadge className="mr-1" size={12} /> :
                   user.isDelivery || user.role === 'delivery' ? <FaTruck className="mr-1" size={12} /> : 
                   <FaUser className="mr-1" size={12} />}
                  {user.isAdmin ? 'Admin' : 
                   user.isStaff || user.role === 'staff' ? 'Staff' :
                   user.isDelivery || user.role === 'delivery' ? 'Driver' : 
                   'Customer'}
                </span>
              </td>
              {canManageUsers && (
                <td className="py-2 px-3 border-b dark:border-dm-border">
                  <div className="flex space-x-1">
                    {onChangeRole && (
                      <button 
                        onClick={() => onChangeRole(user)}
                        className="p-1 bg-plum-100 text-plum-800 rounded hover:bg-plum-200 dark:bg-plum-900 dark:text-plum-200 dark:hover:bg-plum-800 transition-colors"
                        title="Manage Role"
                      >
                        <FaUserCog size={14} />
                      </button>
                    )}
                    
                    {onSetDelivery && (
                      <button 
                        onClick={() => onSetDelivery(user)}
                        className="p-1 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                        title="Delivery Status"
                      >
                        <FaTruck size={14} />
                      </button>
                    )}
                    
                    {user.status !== 'Suspended' && onBlockUser ? (
                      <button 
                        onClick={() => onBlockUser(user)}
                        className="p-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 transition-colors"
                        title="Block User"
                      >
                        <FaBan size={14} />
                      </button>
                    ) : null}

                    {user.status === 'Suspended' && onUnblockUser ? (
                      <button 
                        onClick={() => onUnblockUser(user)}
                        className="p-1 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                        title="Unblock User"
                      >
                        <FaUnlock size={14} />
                      </button>
                    ) : null}
                    
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(user)}
                        className="p-1 bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                        title="Delete User"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
