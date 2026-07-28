export const STAFF_BASE_PERMISSIONS = [
  'staff.dashboard.view'
];

// These are opt-in capabilities an administrator can grant to an individual staff member.
export const STAFF_GRANTABLE_PERMISSIONS = [
  { id: 'pos.open_counter', label: 'Open sales counter and create sales' },
  { id: 'pos.view_own_sales', label: 'View own sales' },
  { id: 'pos.view_all_sales', label: 'View all sales and receipt details' },
  { id: 'pos.view_analytics', label: 'View sales analytics and daily summaries' },
  { id: 'receipt.reprint', label: 'View and reprint receipts' },
  { id: 'customer.search', label: 'Search customers' },
  { id: 'customer.view_contact', label: 'View customer contact details' },
  { id: 'loyalty.scan', label: 'Scan loyalty cards' },
  { id: 'pickup.view_queue', label: 'View pickup queue' },
  { id: 'pickup.verify_code', label: 'Verify pickup codes' },
  { id: 'pickup.complete', label: 'Complete pickup handovers' },
  { id: 'pickup.view_history', label: 'View pickup verification history' },
  { id: 'delivery.view', label: 'View delivery operations' },
  { id: 'delivery.dispatch', label: 'Dispatch orders for delivery' },
  { id: 'delivery.assign_driver', label: 'Assign drivers to dispatched orders' },
  { id: 'delivery.manage_drivers', label: 'Manage driver availability' },
  { id: 'delivery.view_history', label: 'View/export delivery history' },
  { id: 'order.view', label: 'View operational orders' },
  { id: 'order.update_status', label: 'Update operational order status' },
  { id: 'sales.export', label: 'Export sales records' },
  { id: 'delivery.export', label: 'Export delivery records' }
];

export const getEffectiveStaffPermissions = (user) => {
  if (user?.isAdmin || user?.role === 'admin') return ['*'];
  if (!(user?.isStaff || user?.role === 'staff')) return [];
  return [...new Set([...STAFF_BASE_PERMISSIONS, ...(user.staffPermissions || [])])];
};

export const hasStaffPermission = (user, permission) => {
  const permissions = getEffectiveStaffPermissions(user);
  return permissions.includes('*') || permissions.includes(permission);
};
