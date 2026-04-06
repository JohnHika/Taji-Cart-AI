import React, { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaEye, FaSearch } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const POSSales = () => {
  const user = useSelector((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20, includeItems: 'true' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await Axios({ url: `/api/pos/sales?${params.toString()}`, method: 'GET' });
      if (res.data.success) {
        setSales(res.data.data || []);
        setPages(res.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error loading sales', error);
    } finally {
      setLoading(false);
    }
  };

  const openSale = async (saleId) => {
    try {
      const res = await Axios({ url: `/api/pos/sale/${saleId}`, method: 'GET' });
      if (res.data.success) {
        setSelected(res.data.data);
      }
    } catch (error) {
      console.error('Error loading sale', error);
    }
  };

  useEffect(() => {
    loadSales();
  }, [page, startDate, endDate]);

  const filtered = useMemo(() => {
    if (!query) return sales;

    const normalizedQuery = query.toLowerCase();
    return sales.filter((sale) =>
      String(sale.saleNumber).includes(normalizedQuery) ||
      sale.customerName?.toLowerCase().includes(normalizedQuery) ||
      sale.cashierName?.toLowerCase().includes(normalizedQuery) ||
      (sale.items || []).some((item) =>
        item.name?.toLowerCase().includes(normalizedQuery) ||
        item.sku?.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [sales, query]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales History</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sale #, customer, cashier, barcode"
              className="pl-9 pr-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sale #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((sale) => (
              <tr key={sale._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">#{sale.saleNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(sale.saleDate).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{sale.customer?.name || sale.customerName || 'Walk-in'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    {sale.paymentMethod}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{DisplayPriceInShillings(sale.total)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openSale(sale._id)}
                    className="px-3 py-1.5 text-sm rounded bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1"
                  >
                    <FaEye /> View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          className="px-3 py-1.5 rounded border dark:border-gray-700 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-2 py-1 text-gray-600 dark:text-gray-400">Page {page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((current) => current + 1)}
          className="px-3 py-1.5 rounded border dark:border-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSelected(null)}>
          <div
            className="absolute right-0 top-0 h-full w-[520px] bg-white dark:bg-gray-800 p-5 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sale #{selected.saleNumber}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-200">x</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-gray-900 dark:text-white">{new Date(selected.saleDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Cashier</p>
                <p className="text-gray-900 dark:text-white">{selected.cashierName}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Customer</p>
                <p className="text-gray-900 dark:text-white">{selected.customer?.name || selected.customerName || 'Walk-in'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Payment</p>
                <p className="text-gray-900 dark:text-white">{selected.paymentMethod}</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Items</h4>
              <div className="space-y-2">
                {selected.items.map((item, index) => (
                  <div key={item._id || `${item.product}-${index}`} className="flex justify-between text-sm">
                    <div className="text-gray-700 dark:text-gray-300">
                      <div>{item.name} x {item.quantity}</div>
                      {item.sku && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Barcode: {item.sku}</div>
                      )}
                    </div>
                    <div className="text-gray-900 dark:text-white">{DisplayPriceInShillings(item.total)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{DisplayPriceInShillings(selected.subtotal)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="text-red-500">- {DisplayPriceInShillings(selected.discount)}</span>
                </div>
              )}
              {selected.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">{DisplayPriceInShillings(selected.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base mt-1">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">{DisplayPriceInShillings(selected.total)}</span>
              </div>
            </div>

            {selected.paymentMethod === 'split' && Array.isArray(selected.payments) && selected.payments.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Payments</h4>
                <div className="space-y-1 text-sm">
                  {selected.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {payment.method}
                        {payment.phone ? ` (${payment.phone})` : ''}
                      </span>
                      <span className="text-gray-900 dark:text-white">{DisplayPriceInShillings(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(selected.auditTrail) && selected.auditTrail.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Audit Trail</h4>
                <div className="space-y-1 text-xs">
                  {selected.auditTrail.map((entry, index) => (
                    <div key={index} className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>{new Date(entry.at).toLocaleString()}</span>
                      <span>{entry.byName || entry.by}</span>
                      <span className="uppercase">{entry.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSales;
