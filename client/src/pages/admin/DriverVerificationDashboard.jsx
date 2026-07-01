import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaClock, FaSearch, FaFileAlt, FaMotorcycle, FaIdCard,
         FaExclamationTriangle, FaFilter, FaDownload, FaEye, FaEdit } from 'react-icons/fa';
import { useTable, useSortBy, usePagination, useFilters } from 'react-table';
import Axios from '../../utils/Axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DriverVerificationDashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch drivers based on verification status
  const fetchDrivers = async (status = 'all') => {
    try {
      setLoading(true);
      const params = status !== 'all' ? { status } : {};

      const response = await Axios({
        url: '/api/driver-verification',
        method: 'GET',
        params
      });

      if (response.data.success) {
        setDrivers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers(filterStatus);
  }, [filterStatus]);

  // Handle verification decision
  const handleVerify = async (status) => {
    try {
      if (!selectedDriver || !status) return;

      const response = await Axios({
        url: `/api/driver-verification/${selectedDriver._id}/verify`,
        method: 'PUT',
        data: { status, notes }
      });

      if (response.data.success) {
        toast.success(`Driver ${status} successfully!`);
        setIsModalOpen(false);
        fetchDrivers(filterStatus);
      }
    } catch (error) {
      console.error('Error verifying driver:', error);
      toast.error('Failed to update verification status');
    }
  };

  // Define table columns
  const columns = React.useMemo(
    () => [
      {
        Header: 'Driver',
        accessor: 'userId.name',
        Cell: ({ row }) => (
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-plum-100 flex items-center justify-center mr-3">
              <FaMotorcycle className="text-plum-600" />
            </div>
            <div>
              <div className="font-medium">{row.original.userId?.name || 'N/A'}</div>
              <div className="text-sm text-brown-500">{row.original.userId?.email || 'N/A'}</div>
            </div>
          </div>
        )
      },
      {
        Header: 'Phone',
        accessor: 'userId.mobile',
        Cell: ({ value }) => value || 'N/A'
      },
      {
        Header: 'Status',
        accessor: 'verificationStatus',
        Cell: ({ value }) => (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            value === 'verified' ? 'bg-brown-100 text-brown-800 dark:bg-brown-600/20 dark:text-brown-200' :
            value === 'rejected' ? 'bg-blush-100 text-blush-700 dark:bg-blush-500/20 dark:text-blush-300' :
            'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300'
          }`}>
            {value === 'pending' ? 'Pending' :
             value === 'verified' ? 'Verified' : 'Rejected'}
          </span>
        )
      },
      {
        Header: 'Documents',
        accessor: 'idNumber',
        Cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            {row.original.idNumber ? <FaIdCard className="text-brown-500" title="ID Uploaded" /> : <FaIdCard className="text-brown-200 dark:text-white/25" title="ID Missing" />}
            {row.original.licenseNumber ? <FaFileAlt className="text-brown-500" title="License Uploaded" /> : <FaFileAlt className="text-brown-200 dark:text-white/25" title="License Missing" />}
            {row.original.kraPin ? <FaFileAlt className="text-brown-500" title="KRA PIN Uploaded" /> : <FaFileAlt className="text-brown-200 dark:text-white/25" title="KRA PIN Missing" />}
          </div>
        )
      },
      {
        Header: 'Vehicle',
        accessor: 'vehicleDetails.type',
        Cell: ({ row }) => (
          <div>
            {row.original.vehicleDetails?.type ? (
              <div>
                <div className="capitalize">{row.original.vehicleDetails.type}</div>
                <div className="text-xs text-brown-500">{row.original.vehicleDetails.registrationNumber || 'No reg #'}</div>
              </div>
            ) : 'Not specified'}
          </div>
        )
      },
      {
        Header: 'Actions',
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedDriver(row.original);
                setVerificationStatus(row.original.verificationStatus);
                setNotes('');
                setIsModalOpen(true);
              }}
              className="p-2 text-plum-600 hover:bg-plum-50 rounded-full"
              title="Review documents"
            >
              <FaEye size={16} />
            </button>
            {row.original.verificationStatus === 'pending' && (
              <button
                onClick={async () => {
                  try {
                    const response = await Axios({
                      url: `/api/driver-verification/${row.original._id}/verify`,
                      method: 'PUT',
                      data: { status: 'verified', notes: 'Quick verify' }
                    });
                    if (response.data.success) {
                      toast.success('Driver verified successfully!');
                      fetchDrivers(filterStatus);
                    }
                  } catch (error) {
                    toast.error('Failed to verify driver');
                  }
                }}
                className="p-2 text-brown-600 hover:bg-brown-50 dark:hover:bg-dm-card-2 rounded-full"
                title="Quick verify"
              >
                <FaCheckCircle size={16} />
              </button>
            )}
          </div>
        )
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data: drivers,
      initialState: { pageIndex: 0, pageSize: 10 }
    },
    useFilters,
    useSortBy,
    usePagination
  );

  return (
    <div className="container mx-auto px-4 py-6 dark:bg-dm-surface dark:text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal dark:text-white">Driver Verification Dashboard</h1>
        <p className="text-brown-500 dark:text-white/55">Manage driver document verification and compliance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-dm-card p-4 rounded-lg shadow border border-brown-100 dark:border-dm-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brown-500 dark:text-white/55">Pending Verification</p>
              <p className="text-2xl font-bold text-charcoal dark:text-white">
                {drivers.filter(d => d.verificationStatus === 'pending').length}
              </p>
            </div>
            <div className="bg-gold-100 dark:bg-gold-600/20 p-3 rounded-full">
              <FaClock className="text-gold-600 dark:text-gold-400 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dm-card p-4 rounded-lg shadow border border-brown-100 dark:border-dm-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brown-500 dark:text-white/55">Verified Drivers</p>
              <p className="text-2xl font-bold text-charcoal dark:text-white">
                {drivers.filter(d => d.verificationStatus === 'verified').length}
              </p>
            </div>
            <div className="bg-brown-100 dark:bg-brown-600/20 p-3 rounded-full">
              <FaCheckCircle className="text-brown-600 dark:text-brown-400 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dm-card p-4 rounded-lg shadow border border-brown-100 dark:border-dm-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brown-500 dark:text-white/55">Rejected Applications</p>
              <p className="text-2xl font-bold text-charcoal dark:text-white">
                {drivers.filter(d => d.verificationStatus === 'rejected').length}
              </p>
            </div>
            <div className="bg-blush-100 dark:bg-blush-500/20 p-3 rounded-full">
              <FaTimesCircle className="text-blush-600 dark:text-blush-400 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-dm-card p-4 rounded-lg shadow border border-brown-100 dark:border-dm-border mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-brown-500 dark:text-white/55" />
            <span className="font-medium">Filter by status:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 focus:outline-none focus:ring-2 focus:ring-plum-500"
          >
            <option value="all">All Drivers</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => fetchDrivers(filterStatus)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-plum-700 text-white rounded-md hover:bg-plum-600 transition-colors"
          >
            <FaSearch />
            Refresh
          </button>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-brown-100 dark:bg-dm-card-2 rounded mb-2"></div>
              <div className="h-4 bg-brown-100 dark:bg-dm-card-2 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-6 text-center text-brown-500 dark:text-white/55">
            No drivers found with current filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table {...getTableProps()} className="w-full divide-y divide-brown-100 dark:divide-dm-border">
              <thead className="bg-brown-50 dark:bg-dm-card-2">
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                      <th
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        className="px-6 py-3 text-left text-xs font-medium text-brown-600 dark:text-white/70 uppercase tracking-wider"
                      >
                        <div className="flex items-center">
                          {column.render('Header')}
                          <span>
                            {column.isSorted
                              ? column.isSortedDesc
                                ? ' 🔽'
                                : ' 🔼'
                              : ''}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()} className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
                {page.map(row => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} className="hover:bg-brown-50 dark:hover:bg-dm-card-2">
                      {row.cells.map(cell => (
                        <td {...cell.getCellProps()} className="px-6 py-4 whitespace-nowrap">
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                  className={`px-3 py-1 border rounded-md text-sm ${!canPreviousPage ? 'text-brown-300 border-brown-200 dark:text-white/30 dark:border-dm-border' : 'text-charcoal border-brown-300 hover:bg-brown-50 dark:text-white dark:border-dm-border dark:hover:bg-dm-card-2'}`}
                >
                  Previous
                </button>
                <button
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                  className={`px-3 py-1 border rounded-md text-sm ${!canNextPage ? 'text-brown-300 border-brown-200 dark:text-white/30 dark:border-dm-border' : 'text-charcoal border-brown-300 hover:bg-brown-50 dark:text-white dark:border-dm-border dark:hover:bg-dm-card-2'}`}
                >
                  Next
                </button>
                <span className="text-sm text-brown-500 dark:text-white/55">
                  Page {pageIndex + 1} of {pageOptions.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-brown-500 dark:text-white/55">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="text-sm border border-brown-200 dark:border-dm-border rounded px-2 py-1"
                >
                  {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {isModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-dm-card rounded-lg shadow-lg p-6 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-charcoal dark:text-white">
                Driver Verification Review
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-brown-400 hover:text-charcoal dark:text-white/55 dark:hover:text-white"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Driver Info */}
            <div className="mb-6 p-4 bg-brown-50 dark:bg-dm-card-2 rounded-lg">
              <h3 className="font-medium mb-3">Driver Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-brown-500 dark:text-white/55">Name</p>
                  <p className="font-medium">{selectedDriver.userId?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-brown-500 dark:text-white/55">Email</p>
                  <p className="font-medium">{selectedDriver.userId?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-brown-500 dark:text-white/55">Phone</p>
                  <p className="font-medium">{selectedDriver.userId?.mobile || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-brown-500 dark:text-white/55">Current Status</p>
                  <p className={`font-medium ${selectedDriver.verificationStatus === 'verified' ? 'text-brown-600 dark:text-brown-400' :
                                          selectedDriver.verificationStatus === 'rejected' ? 'text-blush-600 dark:text-blush-400' : 'text-gold-600 dark:text-gold-400'}`}>
                    {selectedDriver.verificationStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Verification Documents</h3>
              <div className="space-y-4">
                {/* ID Document */}
                <div className="p-4 border border-brown-100 dark:border-dm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">National ID</h4>
                    {selectedDriver.idNumber ? (
                      <FaCheckCircle className="text-brown-500 dark:text-brown-400" />
                    ) : (
                      <FaExclamationTriangle className="text-gold-500 dark:text-gold-400" />
                    )}
                  </div>
                  <p className="text-sm mb-2">
                    <span className="text-brown-500 dark:text-white/55">ID Number:</span>
                    <span className="font-mono">{selectedDriver.idNumber || 'Not provided'}</span>
                  </p>
                  <div className="flex gap-2">
                    {selectedDriver.idFrontImage && (
                      <a
                        href={selectedDriver.idFrontImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-plum-50 text-plum-700 rounded text-sm hover:bg-plum-100"
                      >
                        <FaEye /> ID Front
                      </a>
                    )}
                    {selectedDriver.idBackImage && (
                      <a
                        href={selectedDriver.idBackImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-plum-50 text-plum-700 rounded text-sm hover:bg-plum-100"
                      >
                        <FaEye /> ID Back
                      </a>
                    )}
                  </div>
                </div>

                {/* License */}
                <div className="p-4 border border-brown-100 dark:border-dm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Driving License</h4>
                    {selectedDriver.licenseNumber ? (
                      <FaCheckCircle className="text-brown-500 dark:text-brown-400" />
                    ) : (
                      <FaExclamationTriangle className="text-gold-500 dark:text-gold-400" />
                    )}
                  </div>
                  <p className="text-sm mb-2">
                    <span className="text-brown-500 dark:text-white/55">License Number:</span>
                    <span className="font-mono">{selectedDriver.licenseNumber || 'Not provided'}</span>
                  </p>
                  {selectedDriver.licenseExpiry && (
                    <p className="text-sm mb-2">
                      <span className="text-brown-500 dark:text-white/55">Expiry Date:</span>
                      <span>{format(new Date(selectedDriver.licenseExpiry), 'MMM dd, yyyy')}</span>
                    </p>
                  )}
                  {selectedDriver.licenseFrontImage && (
                    <a
                      href={selectedDriver.licenseFrontImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-plum-50 text-plum-700 rounded text-sm hover:bg-plum-100"
                    >
                      <FaEye /> License Front
                    </a>
                  )}
                </div>

                {/* KRA PIN */}
                <div className="p-4 border border-brown-100 dark:border-dm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">KRA PIN</h4>
                    {selectedDriver.kraPin ? (
                      <FaCheckCircle className="text-brown-500 dark:text-brown-400" />
                    ) : (
                      <FaExclamationTriangle className="text-gold-500 dark:text-gold-400" />
                    )}
                  </div>
                  <p className="text-sm">
                    <span className="text-brown-500 dark:text-white/55">PIN:</span>
                    <span className="font-mono">{selectedDriver.kraPin || 'Not provided'}</span>
                  </p>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 border border-brown-100 dark:border-dm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Vehicle Details</h4>
                    {selectedDriver.vehicleDetails?.type ? (
                      <FaCheckCircle className="text-brown-500 dark:text-brown-400" />
                    ) : (
                      <FaExclamationTriangle className="text-gold-500 dark:text-gold-400" />
                    )}
                  </div>
                  {selectedDriver.vehicleDetails?.type ? (
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-brown-500 dark:text-white/55">Type:</span>
                        <span className="capitalize">{selectedDriver.vehicleDetails.type}</span>
                      </p>
                      <p>
                        <span className="text-brown-500 dark:text-white/55">Registration:</span>
                        <span>{selectedDriver.vehicleDetails.registrationNumber || 'Not provided'}</span>
                      </p>
                      {selectedDriver.vehicleDetails.insuranceValidUntil && (
                        <p>
                          <span className="text-brown-500 dark:text-white/55">Insurance Expiry:</span>
                          <span>{format(new Date(selectedDriver.vehicleDetails.insuranceValidUntil), 'MMM dd, yyyy')}</span>
                        </p>
                      )}
                      <p>
                        <span className="text-brown-500 dark:text-white/55">Provider:</span>
                        <span>{selectedDriver.vehicleDetails.insuranceProvider || 'Not provided'}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-brown-500 dark:text-white/55">No vehicle details provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Decision */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Verification Decision</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this verification (optional)"
                className="w-full p-3 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 focus:outline-none focus:ring-2 focus:ring-plum-500 min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-brown-100 text-charcoal rounded hover:bg-brown-200 dark:bg-dm-card-2 dark:text-white dark:hover:bg-dm-border transition-colors"
              >
                Cancel
              </button>

              {selectedDriver.verificationStatus !== 'verified' && (
                <button
                  onClick={() => handleVerify('verified')}
                  className="px-4 py-2 bg-brown-600 text-white rounded hover:bg-brown-500 transition-colors flex items-center gap-2"
                >
                  <FaCheckCircle />
                  Approve
                </button>
              )}

              {selectedDriver.verificationStatus !== 'rejected' && (
                <button
                  onClick={() => handleVerify('rejected')}
                  className="px-4 py-2 bg-blush-500 text-white rounded hover:bg-blush-600 transition-colors flex items-center gap-2"
                >
                  <FaTimesCircle />
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverVerificationDashboard;