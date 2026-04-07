import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaPhone, FaRedo, FaSearch, FaSpinner, FaStar, FaToggleOff, FaToggleOn, FaTruck, FaUserTie } from 'react-icons/fa';
import Axios from '../../../utils/Axios';
import AxiosToastError from '../../../utils/AxiosToastError';

const driverStatusLabel = (driver) => {
  if (driver.isActive === false) return 'Inactive';
  if (driver.isAvailable === false) return 'Busy';
  return 'Available';
};

const driverStatusTone = (driver) => {
  if (driver.isActive === false) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200';
  if (driver.isAvailable === false) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
};

const DriversManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [togglingDriverId, setTogglingDriverId] = useState('');

  const fetchDrivers = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesSearch = !search ||
        driver.name?.toLowerCase().includes(search) ||
        driver.contact?.email?.toLowerCase().includes(search) ||
        driver.contact?.mobile?.toLowerCase().includes(search);

      const status = driverStatusLabel(driver).toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchTerm, statusFilter]);

  const handleToggleDriverStatus = async (driver) => {
    try {
      setTogglingDriverId(driver._id);
      const nextActiveState = driver.isActive === false;
      const response = await Axios({
        url: '/api/delivery/toggle-driver-status',
        method: 'POST',
        data: {
          driverId: driver._id,
          isActive: nextActiveState
        }
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Driver status updated');
        setDrivers((prev) => prev.map((entry) => (
          entry._id === driver._id
            ? {
                ...entry,
                isActive: response.data.data?.isActive,
                isAvailable: response.data.data?.isAvailable
              }
            : entry
        )));

        if (selectedDriver?._id === driver._id) {
          setSelectedDriver((prev) => prev ? {
            ...prev,
            isActive: response.data.data?.isActive,
            isAvailable: response.data.data?.isAvailable
          } : prev);
        }
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setTogglingDriverId('');
    }
  };

  const activeDrivers = drivers.filter((driver) => driver.isActive !== false).length;
  const availableDrivers = drivers.filter((driver) => driver.isActive !== false && driver.isAvailable !== false).length;

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Drivers</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{drivers.length}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Active</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{activeDrivers}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Available</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{availableDrivers}</p>
        </div>
        <div className="mobile-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Assigned load</p>
          <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {drivers.reduce((sum, driver) => sum + Number(driver.activeOrdersCount || 0), 0)}
          </p>
        </div>
      </div>

      <div className="mobile-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Drivers</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review delivery capacity and activate or deactivate drivers when needed.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:min-w-[280px]">
              <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={fetchDrivers}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && drivers.length === 0 ? (
        <div className="mobile-surface flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-300">
            <FaSpinner className="animate-spin" />
            Loading drivers...
          </div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
            <FaUserTie />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No drivers matched</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Try another search or status filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredDrivers.map((driver) => {
            const isToggling = togglingDriverId === driver._id;

            return (
              <article key={driver._id} className="mobile-surface p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xl font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    {driver.profileImage ? (
                      <img src={driver.profileImage} alt={driver.name} className="h-full w-full object-cover" />
                    ) : (
                      (driver.name || '?').charAt(0)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                        <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${driverStatusTone(driver)}`}>
                          {driverStatusLabel(driver)}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Active orders</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{driver.activeOrdersCount || 0}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <p className="inline-flex items-center gap-2">
                        <FaPhone className="text-cyan-600 dark:text-cyan-300" />
                        {driver.contact?.mobile || 'No phone saved'}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaEnvelope className="text-cyan-600 dark:text-cyan-300" />
                        {driver.contact?.email || 'No email saved'}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaStar className="text-amber-500" />
                        Rating {typeof driver.efficiencyScore === 'object' ? driver.efficiencyScore.avgRating || 'N/A' : 'N/A'}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaTruck className="text-cyan-600 dark:text-cyan-300" />
                        Completed {typeof driver.efficiencyScore === 'object' ? driver.efficiencyScore.completedOrders || 0 : 0}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setSelectedDriver(driver)}
                        className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDriverStatus(driver)}
                        disabled={isToggling}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                          driver.isActive === false
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        } disabled:opacity-50`}
                      >
                        {isToggling ? (
                          <FaSpinner className="animate-spin" />
                        ) : driver.isActive === false ? (
                          <FaToggleOn />
                        ) : (
                          <FaToggleOff />
                        )}
                        {driver.isActive === false ? 'Activate Driver' : 'Deactivate Driver'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Driver Details</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedDriver.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-900">
                <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-4xl font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  {selectedDriver.profileImage ? (
                    <img src={selectedDriver.profileImage} alt={selectedDriver.name} className="h-full w-full object-cover" />
                  ) : (
                    (selectedDriver.name || '?').charAt(0)
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDriver.name}</p>
                  <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${driverStatusTone(selectedDriver)}`}>
                    {driverStatusLabel(selectedDriver)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-cyan-50 p-4 dark:bg-cyan-900/10">
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Active orders</p>
                  <p className="mt-2 text-3xl font-bold text-cyan-900 dark:text-cyan-100">{selectedDriver.activeOrdersCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/10">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Average rating</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-100">
                    {typeof selectedDriver.efficiencyScore === 'object' ? selectedDriver.efficiencyScore.avgRating || 'N/A' : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/10 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Contact</p>
                  <div className="mt-3 grid gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                    <p>{selectedDriver.contact?.mobile || 'No phone saved'}</p>
                    <p>{selectedDriver.contact?.email || 'No email saved'}</p>
                    <p>Last active: {selectedDriver.lastActive ? new Date(selectedDriver.lastActive).toLocaleString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DriversManagement;
