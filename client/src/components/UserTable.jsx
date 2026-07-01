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

  const getStatusTone = (status) => {
    if (status === 'Active') {
      return 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200';
    }

    if (status === 'Inactive') {
      return 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300';
    }

    return 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300';
  };

  const getRoleMeta = (user) => {
    if (user.isAdmin || user.role === 'admin') {
      return {
        label: 'Admin',
        tone: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200',
        icon: <FaUserShield className="mr-1" size={12} />
      };
    }

    if (user.isStaff || user.role === 'staff') {
      return {
        label: 'Seller',
        tone: 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300',
        icon: <FaIdBadge className="mr-1" size={12} />
      };
    }

    if (user.isDelivery || user.role === 'delivery') {
      return {
        label: 'Driver',
        tone: 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300',
        icon: <FaTruck className="mr-1" size={12} />
      };
    }

    return {
      label: 'Customer',
      tone: 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/70',
      icon: <FaUser className="mr-1" size={12} />
    };
  };

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
        {users.map((user) => {
          const roleMeta = getRoleMeta(user);

          return (
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

              <span className={`shrink-0 inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold tracking-wide ${getStatusTone(user.status)}`}>
                {user.status || 'Unknown'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-semibold tracking-wide ${roleMeta.tone}`}>
                {roleMeta.icon}
                {roleMeta.label}
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
          );
        })}
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
          {users.map((user) => {
            const roleMeta = getRoleMeta(user);

            return (
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
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusTone(user.status)}`}>
                  {user.status === 'Active' && <FaCheckCircle className="mr-1" size={12} />}
                  {user.status !== 'Active' && <FaTimesCircle className="mr-1" size={12} />}
                  {user.status || 'Unknown'}
                </span>
              </td>
              <td className="py-2 px-3 border-b dark:border-dm-border">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-semibold ${roleMeta.tone}`}>
                  {roleMeta.icon}
                  {roleMeta.label}
                </span>
              </td>
              {canManageUsers && (
                <td className="py-2 px-3 border-b dark:border-dm-border">
                  <div className="flex flex-wrap gap-1.5">
                    {onChangeRole && (
                      <button 
                        onClick={() => onChangeRole(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-plum-200 bg-plum-50 text-plum-700 hover:bg-plum-100 dark:border-plum-800/40 dark:bg-plum-900/20 dark:text-plum-200 dark:hover:bg-plum-900/40 transition-colors"
                        title="Manage Role"
                      >
                        <FaUserCog size={14} />
                      </button>
                    )}
                    
                    {onSetDelivery && (
                      <button 
                        onClick={() => onSetDelivery(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-200 bg-gold-50 text-gold-700 hover:bg-gold-100 dark:border-gold-800/40 dark:bg-gold-900/20 dark:text-gold-300 dark:hover:bg-gold-900/30 transition-colors"
                        title="Delivery Status"
                      >
                        <FaTruck size={14} />
                      </button>
                    )}
                    
                    {user.status !== 'Suspended' && onBlockUser ? (
                      <button 
                        onClick={() => onBlockUser(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-brown-200 bg-brown-50 text-brown-700 hover:bg-brown-100 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/70 dark:hover:bg-dm-border transition-colors"
                        title="Block User"
                      >
                        <FaBan size={14} />
                      </button>
                    ) : null}

                    {user.status === 'Suspended' && onUnblockUser ? (
                      <button 
                        onClick={() => onUnblockUser(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-plum-200 bg-plum-50 text-plum-700 hover:bg-plum-100 dark:border-plum-800/40 dark:bg-plum-900/20 dark:text-plum-200 dark:hover:bg-plum-900/40 transition-colors"
                        title="Unblock User"
                      >
                        <FaUnlock size={14} />
                      </button>
                    ) : null}
                    
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-blush-200 bg-blush-50 text-blush-500 hover:bg-blush-100 dark:border-blush-500/30 dark:bg-blush-500/10 dark:text-blush-300 dark:hover:bg-blush-500/20 transition-colors"
                        title="Delete User"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
