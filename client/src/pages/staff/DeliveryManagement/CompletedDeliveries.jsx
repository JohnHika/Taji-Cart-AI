import React, { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaCalendarAlt, FaRedo, FaSearch, FaSpinner, FaTruck } from 'react-icons/fa';
import Axios from '../../../utils/Axios';
import AxiosToastError from '../../../utils/AxiosToastError';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString));
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));

const getTodayIso = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const CompletedDeliveriesManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(getTodayIso());
  const [dateTo, setDateTo] = useState(getTodayIso());

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/delivery/completed-deliveries',
        method: 'GET',
        params: {
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined
        }
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

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const deliveredWithDrivers = filteredOrders.filter((order) => order.driver?.name).length;

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{filteredOrders.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Revenue</p>
          <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">With driver record</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{deliveredWithDrivers}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Status</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <FaCheckCircle />
            Delivered successfully
          </p>
        </div>
      </div>

      <div className="mobile-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Completed Deliveries</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review delivered orders and the drivers who completed them.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Refresh
            </button>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="relative min-w-0">
              <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search order, customer, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                <FaCalendarAlt />
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                <FaCalendarAlt />
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={fetchOrders}
              className="self-end rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="mobile-surface flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-300">
            <FaSpinner className="animate-spin" />
            Loading completed deliveries...
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
            <FaCheckCircle />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No completed deliveries found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Try a different date range or search term.
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
                  <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                    Delivered
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 lg:text-right">
                  <p>{formatDate(order.deliveredAt || order.updatedAt)}</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatCurrency(order.total)}</p>
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
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{order.driver?.name || 'No driver record'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{order.driver?.phone || order.driver?.email || 'No contact saved'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Delivery address</p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{order.deliveryAddress?.street}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {[order.deliveryAddress?.city, order.deliveryAddress?.neighborhood].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
                  <FaTruck className="text-cyan-600 dark:text-cyan-300" />
                  {(order.items || []).length} item(s)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
                  <FaCalendarAlt className="text-emerald-600 dark:text-emerald-300" />
                  Delivered {formatDate(order.deliveredAt || order.updatedAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default CompletedDeliveriesManagement;
