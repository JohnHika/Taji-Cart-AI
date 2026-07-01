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
    <div className="mobile-page-shell min-h-screen bg-brown-50 dark:bg-dm-surface">
      <div className="mb-4 flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal dark:text-white">Sales History</h1>
        
        {/* Search - full width on mobile */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-brown-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sale #, customer, cashier..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-dm-border dark:bg-dm-card-2 dark:text-white text-sm"
          />
        </div>
        
        {/* Date filters - wrap on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <FaCalendarAlt className="text-brown-400 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 min-w-[120px] px-2 py-2 rounded-lg border dark:border-dm-border dark:bg-dm-card-2 dark:text-white text-sm"
          />
          <span className="text-brown-400 dark:text-white/40 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 min-w-[120px] px-2 py-2 rounded-lg border dark:border-dm-border dark:bg-dm-card-2 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.map((sale) => (
          <div 
            key={sale._id} 
            className="mobile-surface p-3 rounded-lg"
            onClick={() => openSale(sale._id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-charcoal dark:text-white">#{sale.saleNumber}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">
                  {new Date(sale.saleDate).toLocaleDateString()}
                </p>
              </div>
              <span className="text-lg font-bold text-primary-100">{DisplayPriceInShillings(sale.total)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-brown-500 dark:text-white/55 truncate max-w-[120px]">
                {sale.customer?.name || sale.customerName || 'Walk-in'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-brown-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70">
                {sale.paymentMethod}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="mobile-surface p-6 text-center text-brown-400 dark:text-white/40 rounded-lg">
            No sales found
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-dm-card rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
          <thead className="bg-ivory dark:bg-dm-card-2">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase">Sale #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
            {filtered.map((sale) => (
              <tr key={sale._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                <td className="px-4 py-3 text-sm text-charcoal dark:text-white">#{sale.saleNumber}</td>
                <td className="px-4 py-3 text-sm text-brown-500 dark:text-white/55">{new Date(sale.saleDate).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-brown-500 dark:text-white/55">{sale.customer?.name || sale.customerName || 'Walk-in'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-brown-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70">
                    {sale.paymentMethod}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-charcoal dark:text-white">{DisplayPriceInShillings(sale.total)}</td>
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
                <td colSpan={6} className="px-4 py-6 text-center text-brown-400 dark:text-white/40">
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center sm:justify-end items-center gap-2 mt-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          className="px-3 py-1.5 rounded border dark:border-dm-border disabled:opacity-50 text-sm dark:text-white"
        >
          Prev
        </button>
        <span className="px-2 py-1 text-brown-500 dark:text-white/40 text-sm">{page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((current) => current + 1)}
          className="px-3 py-1.5 rounded border dark:border-dm-border disabled:opacity-50 text-sm dark:text-white"
        >
          Next
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSelected(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[400px] md:w-[520px] bg-white dark:bg-dm-card p-4 sm:p-5 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-charcoal dark:text-white">Sale #{selected.saleNumber}</h3>
              <button onClick={() => setSelected(null)} className="text-brown-400 hover:text-charcoal dark:text-white/40 p-2">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>
                <p className="text-brown-400 dark:text-white/40">Date</p>
                <p className="text-charcoal dark:text-white">{new Date(selected.saleDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-brown-400 dark:text-white/40">Cashier</p>
                <p className="text-charcoal dark:text-white">{selected.cashierName}</p>
              </div>
              <div>
                <p className="text-brown-400 dark:text-white/40">Customer</p>
                <p className="text-charcoal dark:text-white">{selected.customer?.name || selected.customerName || 'Walk-in'}</p>
              </div>
              <div>
                <p className="text-brown-400 dark:text-white/40">Payment</p>
                <p className="text-charcoal dark:text-white">{selected.paymentMethod}</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-charcoal dark:text-white mb-2">Items</h4>
              <div className="space-y-2">
                {selected.items.map((item, index) => (
                  <div key={item._id || `${item.product}-${index}`} className="flex justify-between text-sm">
                    <div className="text-charcoal dark:text-white/55">
                      <div>{item.name} x {item.quantity}</div>
                      {item.sku && (
                        <div className="text-xs text-brown-400 dark:text-white/40">Barcode: {item.sku}</div>
                      )}
                    </div>
                    <div className="text-charcoal dark:text-white">{DisplayPriceInShillings(item.total)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-brown-100 dark:border-dm-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-brown-500 dark:text-white/40">Subtotal</span>
                <span className="text-charcoal dark:text-white">{DisplayPriceInShillings(selected.subtotal)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-brown-500 dark:text-white/40">Discount</span>
                  <span className="text-red-500">- {DisplayPriceInShillings(selected.discount)}</span>
                </div>
              )}
              {selected.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-brown-500 dark:text-white/40">Tax</span>
                  <span className="text-charcoal dark:text-white">{DisplayPriceInShillings(selected.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base mt-1">
                <span className="text-charcoal dark:text-white">Total</span>
                <span className="text-charcoal dark:text-white">{DisplayPriceInShillings(selected.total)}</span>
              </div>
            </div>

            {selected.paymentMethod === 'split' && Array.isArray(selected.payments) && selected.payments.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold text-charcoal dark:text-white mb-2">Payments</h4>
                <div className="space-y-1 text-sm">
                  {selected.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-brown-500 dark:text-white/40">
                        {payment.method}
                        {payment.phone ? ` (${payment.phone})` : ''}
                      </span>
                      <span className="text-charcoal dark:text-white">{DisplayPriceInShillings(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(selected.auditTrail) && selected.auditTrail.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-charcoal dark:text-white mb-2">Audit Trail</h4>
                <div className="space-y-1 text-xs">
                  {selected.auditTrail.map((entry, index) => (
                    <div key={index} className="flex justify-between text-brown-400 dark:text-white/40">
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
