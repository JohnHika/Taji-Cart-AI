import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCheck, FaClock, FaRedo, FaSearch, FaSpinner, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
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

const PendingDispatch = () => {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [processingIds, setProcessingIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/delivery/pending-orders',
        method: 'GET',
        params: {
          sort: sortBy,
          direction: sortDirection
        }
      });

      if (response.data?.success) {
        setPendingOrders(response.data.data || []);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, [sortBy, sortDirection]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return pendingOrders;

    return pendingOrders.filter((order) =>
      order.orderId?.toLowerCase().includes(search) ||
      order.customer?.name?.toLowerCase().includes(search) ||
      order.customer?.phone?.toLowerCase().includes(search) ||
      order.customer?.email?.toLowerCase().includes(search)
    );
  }, [pendingOrders, searchTerm]);

  const selectedValue = useMemo(
    () => filteredOrders
      .filter((order) => selectedOrders.includes(order._id))
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [filteredOrders, selectedOrders]
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortDirection('asc');
  };

  const getSortArrow = (field) => (
    sortBy === field ? (sortDirection === 'asc' ? '↑' : '↓') : ''
  );

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
      return;
    }

    setSelectedOrders(filteredOrders.map((order) => order._id));
  };

  const dispatchOrderById = async (orderId) => {
    try {
      setProcessingIds((prev) => [...prev, orderId]);
      const response = await Axios({
        url: '/api/delivery/dispatch',
        method: 'POST',
        data: { orderId }
      });

      if (response.data?.success) {
        setPendingOrders((prev) => prev.filter((order) => order._id !== orderId));
        setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
        toast.success('Order dispatched successfully');
        return true;
      }

      toast.error(response.data?.message || 'Failed to dispatch order');
      return false;
    } catch (error) {
      AxiosToastError(error);
      return false;
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleDispatchSelected = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Select at least one order first');
      return;
    }

    try {
      setBulkProcessing(true);
      let successCount = 0;

      for (const orderId of selectedOrders) {
        // eslint-disable-next-line no-await-in-loop
        const success = await dispatchOrderById(orderId);
        if (success) {
          successCount += 1;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} order${successCount === 1 ? '' : 's'} dispatched`);
        navigate('/dashboard/staff/delivery/dispatched');
      }
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Pending orders</p>
          <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{pendingOrders.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Selected</p>
          <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{selectedOrders.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Selected value</p>
          <p className="mt-2 text-xl font-bold text-charcoal dark:text-white">{formatCurrency(selectedValue)}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Ready now</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <FaTruck />
            Dispatch to driver queue
          </p>
        </div>
      </div>

      <div className="mobile-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-charcoal dark:text-white">Pending Orders</h2>
            <p className="mt-1 text-sm text-brown-400 dark:text-white/40">
              Confirm delivery orders and move them into the dispatch queue.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:min-w-[280px]">
              <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-brown-400" />
              <input
                type="text"
                placeholder="Search order, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-brown-100 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={fetchPendingOrders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brown-100 px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-ivory disabled:opacity-60 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-surface"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Refresh
            </button>
            <button
              type="button"
              onClick={handleDispatchSelected}
              disabled={selectedOrders.length === 0 || bulkProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkProcessing ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              Dispatch Selected
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['Newest', 'createdAt'],
            ['Order ID', 'orderId'],
            ['Customer', 'customer.name'],
            ['Total', 'total']
          ].map(([label, field]) => (
            <button
              key={field}
              type="button"
              onClick={() => handleSort(field)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sortBy === field
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200'
                  : 'border-brown-100 text-brown-500 hover:border-cyan-200 hover:text-cyan-700 dark:border-dm-border dark:text-white/55'
              }`}
            >
              {label} {getSortArrow(field)}
            </button>
          ))}
        </div>
      </div>

      {loading && pendingOrders.length === 0 ? (
        <div className="mobile-surface flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-brown-400 dark:text-white/55">
            <FaSpinner className="animate-spin" />
            Loading pending orders...
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
            <FaClock />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-charcoal dark:text-white">No pending delivery orders</h3>
          <p className="mt-2 text-sm text-brown-400 dark:text-white/40">
            Everything is already dispatched, or your search did not match any order.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {filteredOrders.map((order) => {
              const isBusy = processingIds.includes(order._id);
              return (
                <article key={order._id} className="mobile-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Order</p>
                      <h3 className="mt-1 text-lg font-semibold text-charcoal dark:text-white">{order.orderId}</h3>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order._id)}
                      onChange={() => handleSelectOrder(order._id)}
                      className="mt-1 h-4 w-4 rounded border-brown-200 text-cyan-600 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-brown-500 dark:text-white/55">
                    <div>
                      <p className="font-medium text-charcoal dark:text-white">{order.customer?.name}</p>
                      <p>{order.customer?.phone}</p>
                      <p className="text-xs text-brown-400 dark:text-white/40">{order.customer?.email}</p>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal dark:text-white">Address</p>
                      <p>{order.deliveryAddress?.street}</p>
                      <p>{[order.deliveryAddress?.city, order.deliveryAddress?.neighborhood].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{order.items?.length || 0} item(s)</span>
                      <span className="font-semibold text-charcoal dark:text-white">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="text-xs text-brown-400 dark:text-white/40">{formatDate(order.createdAt)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dispatchOrderById(order._id)}
                    disabled={isBusy || bulkProcessing}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {isBusy ? <FaSpinner className="animate-spin" /> : <FaTruck />}
                    Dispatch Order
                  </button>
                </article>
              );
            })}
          </div>

          <div className="mobile-surface hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                <thead className="bg-ivory dark:bg-dm-surface">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-brown-200 text-cyan-600 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-100 bg-white dark:divide-dm-border dark:bg-dm-card">
                  {filteredOrders.map((order) => {
                    const isBusy = processingIds.includes(order._id);
                    return (
                      <tr key={order._id} className="align-top hover:bg-ivory/70 dark:hover:bg-dm-surface/40">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() => handleSelectOrder(order._id)}
                            className="h-4 w-4 rounded border-brown-200 text-cyan-600 focus:ring-cyan-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-charcoal dark:text-white">{order.orderId}</p>
                          <p className="mt-1 text-xs text-brown-400 dark:text-white/40">{order.paymentStatus}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-charcoal dark:text-white">{order.customer?.name}</p>
                          <p className="text-sm text-brown-500 dark:text-white/55">{order.customer?.phone}</p>
                          <p className="text-xs text-brown-400 dark:text-white/40">{order.customer?.email}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-brown-500 dark:text-white/55">
                          <p>{order.deliveryAddress?.street}</p>
                          <p className="text-xs text-brown-400 dark:text-white/40">
                            {[order.deliveryAddress?.city, order.deliveryAddress?.neighborhood].filter(Boolean).join(', ')}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-brown-500 dark:text-white/55">
                          <p>{order.items?.length || 0} item(s)</p>
                          <div className="mt-1 space-y-1 text-xs text-brown-400 dark:text-white/40">
                            {(order.items || []).slice(0, 2).map((item, index) => (
                              <p key={`${order._id}-${index}`}>{item.quantity}x {item.name}</p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-charcoal dark:text-white">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-4 text-sm text-brown-500 dark:text-white/55">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => dispatchOrderById(order._id)}
                            disabled={isBusy || bulkProcessing}
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {isBusy ? <FaSpinner className="animate-spin" /> : <FaTruck />}
                            Dispatch
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default PendingDispatch;
