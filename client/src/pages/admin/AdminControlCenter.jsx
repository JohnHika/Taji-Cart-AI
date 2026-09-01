import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaBoxOpen,
  FaBullhorn,
  FaChartLine,
  FaClipboardList,
  FaCrown,
  FaEyeSlash,
  FaGift,
  FaIdCard,
  FaLayerGroup,
  FaListAlt,
  FaRocket,
  FaRoute,
  FaTachometerAlt,
  FaUpload,
  FaUsers,
  FaWarehouse,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import isAdmin from '../../utils/isAdmin';

// Every destination here is admin-only — mirrors the admin-gated routes in
// route/index.jsx and the equivalent links in components/AdminMenu.jsx.
// Staff-shared pages (Sales counter, My orders, etc.) are deliberately
// excluded — this is a landing page for what only an admin can do.
const SECTIONS = [
  {
    title: 'People',
    links: [
      { to: '/dashboard/users-admin', icon: FaUsers, label: 'User management', description: 'Roles, staff permissions, accounts' },
    ],
  },
  {
    title: 'Inventory & catalog',
    links: [
      { to: '/dashboard/stock-value', icon: FaWarehouse, label: 'Stock value', description: 'Total cost and retail value of current stock' },
      { to: '/dashboard/upload-product', icon: FaUpload, label: 'Upload product', description: 'Add new products to the catalog' },
      { to: '/dashboard/product', icon: FaBoxOpen, label: 'Product', description: 'Edit existing products' },
      { to: '/dashboard/category', icon: FaListAlt, label: 'Category', description: 'Manage top-level categories' },
      { to: '/dashboard/subcategory', icon: FaLayerGroup, label: 'Sub category', description: 'Manage subcategories' },
      { to: '/dashboard/catalog-quality', icon: FaEyeSlash, label: 'Catalog quality', description: 'Products missing details, storefront visibility' },
      { to: '/dashboard/delivery-zones', icon: FaRoute, label: 'Delivery zones', description: 'Bike delivery zones and fares' },
    ],
  },
  {
    title: 'Marketing & community',
    links: [
      { to: '/dashboard/loyalty-program-admin', icon: FaCrown, label: 'Loyalty program', description: 'Tiers, points, rewards configuration' },
      { to: '/dashboard/admin-community-perks', icon: FaGift, label: 'Manage community perks', description: 'Create and edit perks' },
      { to: '/dashboard/active-campaigns', icon: FaBullhorn, label: 'Active campaigns', description: 'Running promotions' },
    ],
  },
  {
    title: 'Orders, sales & delivery',
    links: [
      { to: '/dashboard/allorders', icon: FaClipboardList, label: 'All orders', description: 'Every order across the shop' },
      { to: '/dashboard/eod-reports', icon: FaChartLine, label: 'Weekly/monthly reports', description: 'Rolled-up sales from closed EOD reports' },
      { to: '/dashboard/driver-verification', icon: FaIdCard, label: 'Driver verification', description: 'Approve and manage delivery riders' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/dashboard/feature-releases', icon: FaRocket, label: 'Feature releases', description: 'Preview features as admin, release them to everyone when ready' },
    ],
  },
];

const AdminControlCenter = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin(user)) {
      toast.error('Admin control center is admin-only.');
      navigate('/dashboard/pos-dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface pb-16">
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to Dashboard"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-plum-600 to-plum-700 text-white shadow-sm">
              <FaTachometerAlt size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Admin Control Center</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">Everything only an admin can do, in one place</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-4 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-brown-400 dark:text-white/40">{section.title}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-start gap-3 rounded-2xl border border-brown-100 bg-white p-4 shadow-sm transition-colors hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:bg-dm-card dark:hover:bg-dm-card-2"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal dark:text-white">{link.label}</p>
                      <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">{link.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminControlCenter;
