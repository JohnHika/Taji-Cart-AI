import React, { useEffect, useState } from 'react';
import { FaCheck, FaTimes, FaTruck, FaUser, FaUserShield } from 'react-icons/fa';

const VEHICLE_TYPES = [
  ['motorcycle', 'Motorcycle'],
  ['bicycle', 'Bicycle'],
  ['car', 'Car'],
  ['van', 'Van'],
  ['on_foot', 'On foot (CBD)'],
];

const STAFF_PERMISSION_GROUPS = [
  {
    label: 'Sales counter',
    permissions: [
      ['pos.open_counter', 'Open counter and create sales'], ['pos.view_own_sales', 'View own sales'],
      ['pos.view_all_sales', 'View all sales'], ['pos.view_analytics', 'View sales analytics'],
      ['receipt.reprint', 'View and reprint receipts'], ['sales.export', 'Export sales'],
      ['pos.close_eod', 'Close and download end-of-day reports'],
      ['pos.manage_fulfillment', 'Manage counter sale pickups & deliveries'],
    ],
  },
  {
    label: 'Customers & loyalty',
    permissions: [
      ['customer.search', 'Search customers'], ['customer.view_contact', 'View customer contact details'],
      ['loyalty.scan', 'Scan loyalty cards'],
    ],
  },
  {
    label: 'Pickup',
    permissions: [
      ['pickup.view_queue', 'View pickup queue'], ['pickup.verify_code', 'Verify pickup codes'],
      ['pickup.complete', 'Complete pickup handovers'], ['pickup.view_history', 'View pickup history'],
    ],
  },
  {
    label: 'Delivery',
    permissions: [
      ['delivery.view', 'View delivery operations'], ['delivery.dispatch', 'Dispatch orders'],
      ['delivery.assign_driver', 'Assign drivers'], ['delivery.manage_drivers', 'Manage driver availability'],
      ['delivery.view_history', 'View delivery history'], ['delivery.export', 'Export deliveries'],
    ],
  },
  {
    label: 'Orders',
    permissions: [
      ['order.view', 'View operational orders'], ['order.update_status', 'Update order status'],
    ],
  },
  {
    label: 'Returns & exchanges',
    permissions: [
      ['exchange.manage', 'Process returns and exchanges'],
    ],
  },
];

// One-click starting points for common staff jobs, so an admin doesn't have
// to know what each of the 20 checkboxes means to set someone up correctly.
// Presets are additive toggles, not a single choice — a person can be a
// Cashier AND a Delivery coordinator AND a Supervisor at once. Clicking an
// active preset removes only the permissions unique to it (nothing another
// still-active preset also needs); individual checkboxes remain adjustable
// on top at any time.
const PERMISSION_PRESETS = [
  {
    id: 'cashier',
    label: 'Cashier',
    description: 'Run the sales counter: ring up sales, view their own sales, reprint receipts, scan loyalty cards.',
    permissions: ['pos.open_counter', 'pos.view_own_sales', 'receipt.reprint', 'loyalty.scan', 'customer.search'],
  },
  {
    id: 'front_desk',
    label: 'Front desk / pickup',
    description: 'Handle customer pickups: view the pickup queue, verify codes, complete handovers, look up customers.',
    permissions: ['pickup.view_queue', 'pickup.verify_code', 'pickup.complete', 'pickup.view_history', 'customer.search', 'customer.view_contact'],
  },
  {
    id: 'delivery_coordinator',
    label: 'Delivery coordinator',
    description: 'Manage deliveries: dispatch orders, assign drivers, track delivery history and operational orders.',
    permissions: ['delivery.view', 'delivery.dispatch', 'delivery.assign_driver', 'delivery.manage_drivers', 'delivery.view_history', 'order.view', 'order.update_status'],
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    description: 'Everything a cashier and delivery coordinator can do, plus sales analytics, viewing all sales, exports, and returns/exchanges.',
    permissions: [
      'pos.open_counter', 'pos.view_all_sales', 'pos.view_analytics', 'receipt.reprint', 'sales.export',
      'customer.search', 'customer.view_contact', 'loyalty.scan',
      'pickup.view_queue', 'pickup.verify_code', 'pickup.complete', 'pickup.view_history',
      'delivery.view', 'delivery.dispatch', 'delivery.assign_driver', 'delivery.manage_drivers', 'delivery.view_history', 'delivery.export',
      'order.view', 'order.update_status', 'exchange.manage',
    ],
  },
];

const RoleManagementModal = ({ isOpen, onClose, user, onSave }) => {
  const [role, setRole] = useState('customer');
  const [extraPermissions, setExtraPermissions] = useState([]);
  const [vehicleType, setVehicleType] = useState('motorcycle');

  useEffect(() => {
    if (user) {
      setExtraPermissions(Array.isArray(user.staffPermissions) ? user.staffPermissions : []);
      setVehicleType(user.vehicleType || 'motorcycle');
      if (user.isAdmin) {
        setRole('admin');
      } else if (user.isDelivery || user.role === 'delivery') {
        setRole('driver');
      } else if (user.isStaff || user.role === 'staff') {
        setRole('staff');
      } else {
        setRole('customer');
      }
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const isAdmin = role === 'admin';
    const isDelivery = role === 'driver';
    const isStaff = role === 'staff';
    onSave(user._id, isAdmin, isDelivery, isStaff, extraPermissions, isDelivery ? vehicleType : undefined);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-dm-card rounded-lg shadow-lg w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-0">
          <h2 className="text-xl font-semibold text-charcoal dark:text-white">
            Manage User Role
          </h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-charcoal dark:text-white/55 dark:hover:text-white"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <p className="text-brown-500 dark:text-white/55">
            User: <span className="font-medium">{user?.name || 'Unknown'}</span>
          </p>
          <p className="text-brown-500 dark:text-white/55">
            Email: <span className="font-medium">{user?.email || 'Unknown'}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <label className="block text-charcoal dark:text-white/55 mb-2">Select Role:</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-ivory dark:border-dm-border dark:hover:bg-dm-card-2">
                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={role === 'customer'}
                  onChange={() => setRole('customer')}
                  className="h-5 w-5 text-plum-600"
                />
                <span className="flex items-center">
                  <FaUser className="mr-2 text-brown-400 dark:text-white/40" />
                  <span className="font-medium text-charcoal dark:text-white/55">Customer</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-ivory dark:border-dm-border dark:hover:bg-dm-card-2">
                <input
                  type="radio"
                  name="role"
                  value="staff"
                  checked={role === 'staff'}
                  onChange={() => setRole('staff')}
                  className="h-5 w-5 text-plum-600"
                />
                <span className="flex items-center">
                  <FaUser className="mr-2 text-brown-400 dark:text-white/40" />
                  <span className="font-medium text-charcoal dark:text-white/55">Staff</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-ivory dark:border-dm-border dark:hover:bg-dm-card-2">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="h-5 w-5 text-plum-600"
                />
                <span className="flex items-center">
                  <FaUserShield className="mr-2 text-purple-500" />
                  <span className="font-medium text-charcoal dark:text-white/55">Admin</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-ivory dark:border-dm-border dark:hover:bg-dm-card-2">
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  checked={role === 'driver'}
                  onChange={() => setRole('driver')}
                  className="h-5 w-5 text-plum-600"
                />
                <span className="flex items-center">
                  <FaTruck className="mr-2 text-plum-600" />
                  <span className="font-medium text-charcoal dark:text-white/55">Driver</span>
                </span>
              </label>
            </div>
          </div>
          {role === 'driver' && (
            <div className="mb-6 border-t border-brown-100 dark:border-dm-border pt-4">
              <label className="block text-sm font-medium text-charcoal dark:text-white mb-2">Delivery mode</label>
              <select
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value)}
                className="w-full rounded-lg border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-card-2 px-3 py-2 text-sm text-charcoal dark:text-white"
              >
                {VEHICLE_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          {role === 'staff' && (
            <div className="mb-6 border-t border-brown-100 dark:border-dm-border pt-4">
              <p className="text-sm font-medium text-charcoal dark:text-white mb-1">Additional permissions</p>
              <p className="text-xs text-brown-500 dark:text-white/50 mb-3">
                All staff keep their standard access. Tap a job below to add its permissions — jobs stack, so someone can be a Cashier and a Supervisor at once. Fine-tune with the checkboxes underneath.
              </p>

              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_PRESETS.map((preset) => {
                  const isActive = preset.permissions.every((permission) => extraPermissions.includes(permission));
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.description}
                      aria-pressed={isActive}
                      onClick={() => setExtraPermissions((current) => {
                        if (isActive) {
                          // Only drop permissions this preset owns that no OTHER
                          // active preset still needs, so stacked jobs don't
                          // clobber each other when one is turned off.
                          const stillNeeded = new Set(
                            PERMISSION_PRESETS
                              .filter((other) => other.id !== preset.id && other.permissions.every((p) => current.includes(p)))
                              .flatMap((other) => other.permissions)
                          );
                          return current.filter((p) => !preset.permissions.includes(p) || stillNeeded.has(p));
                        }
                        return [...new Set([...current, ...preset.permissions])];
                      })}
                      className={`relative text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        isActive
                          ? 'border-plum-500 bg-plum-50 dark:bg-plum-900/20 dark:border-plum-400'
                          : 'border-brown-200 dark:border-dm-border hover:bg-ivory dark:hover:bg-dm-card-2'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isActive ? 'bg-plum-600 border-plum-600 text-white' : 'border-brown-300 dark:border-dm-border'
                        }`}>
                          {isActive && <FaCheck size={9} />}
                        </span>
                        <span className="text-sm font-medium text-charcoal dark:text-white">{preset.label}</span>
                      </span>
                      <span className="block text-xs text-brown-500 dark:text-white/50 mt-1 leading-snug">{preset.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-brown-500 dark:text-white/50">
                  {extraPermissions.length} permission{extraPermissions.length === 1 ? '' : 's'} selected
                </span>
                <button
                  type="button"
                  onClick={() => setExtraPermissions([])}
                  className="text-xs text-brown-500 dark:text-white/50 underline hover:text-charcoal dark:hover:text-white"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-3">
                {STAFF_PERMISSION_GROUPS.map((group) => (
                  <div key={group.label} className="rounded-lg border border-brown-100 dark:border-dm-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40 mb-1.5">{group.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                      {group.permissions.map(([permission, label]) => (
                        <label key={permission} className="flex items-center gap-2 py-1 text-sm text-charcoal dark:text-white/70 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={extraPermissions.includes(permission)}
                            onChange={(event) => setExtraPermissions((current) => event.target.checked
                              ? [...new Set([...current, permission])]
                              : current.filter((value) => value !== permission))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="flex justify-end space-x-3 border-t border-brown-100 dark:border-dm-border p-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-brown-100 text-charcoal rounded hover:bg-brown-200 dark:bg-dm-card-2 dark:text-white dark:hover:bg-dm-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-plum-700 text-white rounded hover:bg-plum-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleManagementModal;
