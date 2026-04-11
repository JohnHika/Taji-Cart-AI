import React, { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaClock, FaRoute, FaTruck, FaUserTie } from 'react-icons/fa';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Axios from '../../../utils/Axios';
import AxiosToastError from '../../../utils/AxiosToastError';

const DeliveryManagement = () => {
  const location = useLocation();
  const [stats, setStats] = useState({
    counts: {
      pendingOrders: 0,
      dispatchedOrders: 0,
      activeDeliveries: 0,
      completedToday: 0,
      availableDrivers: 0
    }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await Axios({
          url: '/api/delivery/dashboard-stats',
          method: 'GET'
        });

        if (response.data?.success) {
          setStats(response.data.data || { counts: {} });
        }
      } catch (error) {
        AxiosToastError(error);
      }
    };

    fetchStats();
  }, []);

  const tabs = useMemo(() => ([
    {
      name: 'Pending',
      to: 'pending',
      icon: FaClock,
      count: stats.counts?.pendingOrders || 0
    },
    {
      name: 'Dispatched',
      to: 'dispatched',
      icon: FaTruck,
      count: stats.counts?.dispatchedOrders || 0
    },
    {
      name: 'Active',
      to: 'active',
      icon: FaRoute,
      count: stats.counts?.activeDeliveries || 0
    },
    {
      name: 'Completed',
      to: 'completed',
      icon: FaCheckCircle,
      count: stats.counts?.completedToday || 0
    },
    {
      name: 'Drivers',
      to: 'drivers',
      icon: FaUserTie,
      count: stats.counts?.availableDrivers || 0
    }
  ]), [stats]);

  return (
    <div className="mobile-page-shell lg:h-full lg:overflow-hidden lg:pb-6">
      <div className="flex flex-col gap-4 lg:h-full">
        <section className="mobile-surface overflow-hidden">
          <div className="bg-gradient-to-r from-sky-700 via-cyan-700 to-emerald-700 px-4 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Staff delivery</p>
                <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Delivery Management</h1>
                <p className="mt-2 max-w-2xl text-sm text-cyan-50/90 sm:text-base">
                  Dispatch orders, assign drivers, monitor active deliveries, and review completed drop-offs from one workspace.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/70">Pending</p>
                  <p className="mt-1 text-xl font-semibold text-white">{stats.counts?.pendingOrders || 0}</p>
                </div>
                <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/70">Dispatched</p>
                  <p className="mt-1 text-xl font-semibold text-white">{stats.counts?.dispatchedOrders || 0}</p>
                </div>
                <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/70">Active</p>
                  <p className="mt-1 text-xl font-semibold text-white">{stats.counts?.activeDeliveries || 0}</p>
                </div>
                <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/70">Drivers</p>
                  <p className="mt-1 text-xl font-semibold text-white">{stats.counts?.availableDrivers || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white px-3 py-3 dark:border-dm-border dark:bg-dm-card sm:px-4">
            <nav className="mobile-chip-row">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) =>
                      `inline-flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                        isActive || location.pathname.endsWith(`/${tab.to}`)
                          ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm'
                          : 'border-brown-100 bg-ivory text-charcoal hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-dm-border dark:bg-dm-surface dark:text-white/70 dark:hover:border-cyan-800 dark:hover:bg-cyan-900/20 dark:hover:text-cyan-200'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{tab.name}</span>
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">{tab.count}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </section>

        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DeliveryManagement;
