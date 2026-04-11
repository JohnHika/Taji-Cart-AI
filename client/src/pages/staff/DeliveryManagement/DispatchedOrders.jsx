import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaMapMarkerAlt, FaRedo, FaSearch, FaSpinner, FaTruck, FaUserTie } from 'react-icons/fa';
import Axios from '../../../utils/Axios';
import AxiosToastError from '../../../utils/AxiosToastError';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString));
};

const DispatchedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDispatchedOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/delivery/dispatched-orders',
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

  const fetchAvailableDrivers = async () => {
    try {
      const response = await Axios({
        url: '/api/delivery/available-drivers',
        method: 'GET'
      });

      if (response.data?.success) {
        setDrivers(response.data.data || []);
      }
    } catch (error) {
      AxiosToastError(error);
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetchDispatchedOrders();
    fetchAvailableDrivers();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return orders;

    return orders.filter((order) =>
      order.orderId?.toLowerCase().includes(search) ||
      order.customer?.name?.toLowerCase().includes(search) ||
      order.customer?.email?.toLowerCase().includes(search) ||
      order.customer?.phone?.toLowerCase().includes(search)
    );
  }, [orders, searchTerm]);

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) {
      toast.error('Choose both an order and a driver');
      return;
    }

    try {
      setAssigning(true);
      const response = await Axios({
        url: '/api/delivery/assign-driver',
        method: 'POST',
        data: {
          orderId: selectedOrder._id,
          driverId: selectedDriver,
          notes: assignmentNote
        }
      });

      if (response.data?.success) {
        toast.success('Driver assigned successfully');
        setSelectedOrder(null);
        setSelectedDriver('');
        setAssignmentNote('');
        fetchDispatchedOrders();
        fetchAvailableDrivers();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setAssigning(false);
    }
  };

  const selectedDriverDetails = drivers.find((driver) => driver._id === selectedDriver);

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Dispatched</p>
          <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{orders.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Available drivers</p>
          <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{drivers.filter((driver) => driver.isAvailable !== false).length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Busy drivers</p>
          <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{drivers.filter((driver) => driver.isAvailable === false && driver.isActive !== false).length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Next step</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <FaUserTie />
            Assign drivers
          </p>
        </div>
      </div>

      <div className="mobile-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-charcoal dark:text-white">Dispatched Orders</h2>
            <p className="mt-1 text-sm text-brown-400 dark:text-white/40">
              These orders are ready and waiting for manual driver assignment.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:min-w-[280px]">
              <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-brown-400" />
              <input
                type="text"
                placeholder="Search order or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-brown-100 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                fetchDispatchedOrders();
                fetchAvailableDrivers();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brown-100 px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-ivory disabled:opacity-60 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-surface"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="mobile-surface flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-brown-400 dark:text-white/55">
            <FaSpinner className="animate-spin" />
            Loading dispatched orders...
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <FaMapMarkerAlt />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-charcoal dark:text-white">No dispatched orders waiting</h3>
          <p className="mt-2 text-sm text-brown-400 dark:text-white/40">
            Every dispatched delivery is either already assigned or your search did not match.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {filteredOrders.map((order) => (
              <article key={order._id} className="mobile-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Order</p>
                    <h3 className="mt-1 text-lg font-semibold text-charcoal dark:text-white">{order.orderId}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white"
                  >
                    Assign
                  </button>
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
                    <span className="text-xs text-brown-400 dark:text-white/40">{formatDate(order.dispatchedAt || order.updatedAt)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mobile-surface hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                <thead className="bg-ivory dark:bg-dm-surface">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Dispatched</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-brown-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-100 bg-white dark:divide-dm-border dark:bg-dm-card">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="align-top hover:bg-ivory/70 dark:hover:bg-dm-surface/40">
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
                        {formatDate(order.dispatchedAt || order.updatedAt)}
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
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                        >
                          <FaUserTie />
                          Assign Driver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-dm-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-charcoal dark:text-white">Assign Driver</h3>
                <p className="mt-1 text-sm text-brown-400 dark:text-white/40">
                  Order {selectedOrder.orderId} for {selectedOrder.customer?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedDriver('');
                  setAssignmentNote('');
                }}
                className="rounded-lg border border-brown-100 px-3 py-2 text-sm text-brown-500 dark:border-dm-border dark:text-white/55"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl bg-ivory p-4 dark:bg-dm-surface">
                <p className="text-xs uppercase tracking-[0.16em] text-brown-400">Delivery details</p>
                <div className="mt-3 space-y-3 text-sm text-brown-500 dark:text-white/55">
                  <div>
                    <p className="font-medium text-charcoal dark:text-white">Customer</p>
                    <p>{selectedOrder.customer?.name}</p>
                    <p>{selectedOrder.customer?.phone}</p>
                  </div>
                  <div>
                    <p className="font-medium text-charcoal dark:text-white">Address</p>
                    <p>{selectedOrder.deliveryAddress?.street}</p>
                    <p>{[selectedOrder.deliveryAddress?.city, selectedOrder.deliveryAddress?.neighborhood].filter(Boolean).join(', ')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-charcoal dark:text-white">Items</p>
                    {(selectedOrder.items || []).map((item, index) => (
                      <p key={`${selectedOrder._id}-item-${index}`}>{item.quantity}x {item.name}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-charcoal dark:text-white/70">Choose driver</label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full rounded-xl border border-brown-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
                  >
                    <option value="">Select a driver</option>
                    {drivers.map((driver) => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name} • {driver.isAvailable !== false ? 'Available' : 'Busy'} • {driver.activeOrdersCount || 0} active
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDriverDetails && (
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm dark:border-cyan-900/40 dark:bg-cyan-900/10">
                    <p className="font-medium text-cyan-900 dark:text-cyan-100">{selectedDriverDetails.name}</p>
                    <p className="mt-1 text-cyan-700 dark:text-cyan-200">{selectedDriverDetails.contact?.mobile || 'No phone saved'}</p>
                    <p className="text-cyan-700 dark:text-cyan-200">{selectedDriverDetails.contact?.email || 'No email saved'}</p>
                    <p className="mt-2 text-cyan-700 dark:text-cyan-200">
                      {selectedDriverDetails.isAvailable !== false ? 'Available now' : 'Currently busy'} • {selectedDriverDetails.activeOrdersCount || 0} active orders
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-charcoal dark:text-white/70">Assignment note</label>
                  <textarea
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    rows={4}
                    placeholder="Optional instruction for the driver"
                    className="w-full rounded-xl border border-brown-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedDriver('');
                  setAssignmentNote('');
                }}
                className="rounded-xl border border-brown-100 px-4 py-3 text-sm font-medium text-charcoal dark:border-dm-border dark:text-white/70"
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignDriver}
                disabled={!selectedDriver || assigning}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigning ? <FaSpinner className="animate-spin" /> : <FaTruck />}
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DispatchedOrders;
