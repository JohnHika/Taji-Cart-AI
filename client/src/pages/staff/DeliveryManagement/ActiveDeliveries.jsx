import React, { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaMapMarkerAlt, FaRedo, FaRoute, FaSearch, FaSpinner, FaTruck } from 'react-icons/fa';
import Axios from '../../../utils/Axios';
import AxiosToastError from '../../../utils/AxiosToastError';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString));
};

const statusTone = (status) => {
  switch (status) {
    case 'nearby':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
    case 'out_for_delivery':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
    default:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200';
  }
};

const formatStatus = (status = '') =>
  status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const ActiveDeliveriesManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/delivery/active-deliveries',
        method: 'GET'
      });

      if (response.data?.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return orders;

    return orders.filter((order) =>
      order.orderId?.toLowerCase().includes(search) ||
      order.customer?.name?.toLowerCase().includes(search) ||
      order.driver?.name?.toLowerCase().includes(search) ||
      order.deliveryAddress?.street?.toLowerCase().includes(search)
    );
  }, [orders, searchTerm]);

  const nearbyCount = orders.filter((order) => order.status === 'nearby').length;
  const inTransitCount = orders.filter((order) => order.status === 'out_for_delivery').length;
  const assignedCount = orders.filter((order) => order.status === 'driver_assigned').length;

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Active now</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Assigned</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{assignedCount}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">On the road</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{inTransitCount}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Nearby</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{nearbyCount}</p>
        </div>
      </div>

      <div className="mobile-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Deliveries</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track orders already assigned to drivers and moving through delivery.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:min-w-[280px]">
              <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search order, driver, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="mobile-surface flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-300">
            <FaSpinner className="animate-spin" />
            Loading active deliveries...
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200">
            <FaRoute />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No active deliveries right now</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            There are no in-progress deliveries matching your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredOrders.map((order) => (
            <article key={order._id} className="mobile-surface p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Order</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{order.orderId}</h3>
                  <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(order.status)}`}>
                    {formatStatus(order.status)}
                  </div>
                </div>
                <div className="grid gap-1 text-sm text-gray-500 dark:text-gray-400 lg:text-right">
                  <span>{formatDate(order.updatedAt)}</span>
                  <span>{order.driver?.name || 'No driver assigned'}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Customer</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{order.customer?.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{order.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Driver</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{order.driver?.name || 'Awaiting assignment'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{order.driver?.phone || order.driver?.email || 'No driver contact saved'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white p-2 text-cyan-700 shadow-sm dark:bg-gray-800 dark:text-cyan-300">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Delivery address</p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{order.deliveryAddress?.street}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {[order.deliveryAddress?.city, order.deliveryAddress?.neighborhood].filter(Boolean).join(', ')}
                    </p>
                    {order.deliveryAddress?.landmark && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Near {order.deliveryAddress.landmark}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
                  <FaTruck className="text-cyan-600 dark:text-cyan-300" />
                  {(order.items || []).length} item(s)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
                  <FaCheckCircle className="text-emerald-600 dark:text-emerald-300" />
                  ETA {order.estimatedDeliveryTime ? formatDate(order.estimatedDeliveryTime) : 'Not set'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ActiveDeliveriesManagement;
