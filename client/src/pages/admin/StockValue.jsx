import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaBoxes, FaChartPie, FaCoins, FaTags } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../../utils/DisplayPriceInShillings';
import isAdmin from '../../utils/isAdmin';

const StockValue = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin(user)) {
      toast.error('Stock value is admin-only.');
      navigate('/dashboard/pos-dashboard');
    }
  }, [user, navigate]);

  const loadStockValue = async () => {
    try {
      setLoading(true);
      const res = await Axios({ url: '/api/product/admin/stock-value', method: 'GET' });
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      AxiosToastError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockValue();
  }, []);

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface pb-16">
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/pos-dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to Sales Hub"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-plum-600 to-plum-700 text-white shadow-sm">
              <FaBoxes size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Stock Value</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">What&apos;s currently on the shelves is worth</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !data ? (
          <div className="rounded-2xl border border-brown-100 bg-white p-10 text-center text-brown-400 dark:border-dm-border dark:bg-dm-card dark:text-white/40">
            Could not load stock value.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                  <FaCoins size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Cost Value</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.totalCostValue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">What it cost to acquire</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
                  <FaTags size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Retail Value</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.totalRetailValue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">What it would sell for</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <FaChartPie size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Potential Profit</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.potentialProfit)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">If everything sold at full price</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Products Counted</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.productCount}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Published products only</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Actually In Stock</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.productsWithStock}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Products with stock &gt; 0</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Units in Stock</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.totalUnits.toLocaleString()}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Across all published products</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
              <h3 className="mb-1 text-base font-bold tracking-tight">Value by Category</h3>
              <p className="mb-4 text-xs text-brown-400 dark:text-white/40">
                A product in more than one category counts toward each — these rows won&apos;t sum to the totals above.
              </p>
              {data.byCategory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Category</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Products</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Cost Value</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Retail Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
                      {data.byCategory.map((row) => (
                        <tr key={row._id}>
                          <td className="px-3 py-2 text-sm text-charcoal dark:text-white">{row.name}</td>
                          <td className="px-3 py-2 text-right text-sm text-brown-500 dark:text-white/55">{row.productCount}</td>
                          <td className="px-3 py-2 text-right text-sm text-brown-500 dark:text-white/55">{DisplayPriceInShillings(row.costValue)}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-charcoal dark:text-white">{DisplayPriceInShillings(row.retailValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No categorized products yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
              <h3 className="mb-1 text-base font-bold tracking-tight">Highest-Value Products</h3>
              <p className="mb-4 text-xs text-brown-400 dark:text-white/40">
                By retail value, in-stock items only.
              </p>
              {data.topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Stock</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Cost Value</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brown-400 dark:text-white/40">Retail Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
                      {data.topProducts.map((product) => (
                        <tr key={product._id}>
                          <td className="px-3 py-2 text-sm text-charcoal dark:text-white">
                            {product.name}
                            {product.sku && <span className="ml-1 text-xs text-brown-400 dark:text-white/35">({product.sku})</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-brown-500 dark:text-white/55">{product.stock}</td>
                          <td className="px-3 py-2 text-right text-sm text-brown-500 dark:text-white/55">{DisplayPriceInShillings(product.costValue)}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-charcoal dark:text-white">{DisplayPriceInShillings(product.retailValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No products yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockValue;
