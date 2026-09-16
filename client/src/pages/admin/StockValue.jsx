import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaBoxes, FaChartPie, FaCheckCircle, FaCoins, FaCubes, FaTags } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../../utils/DisplayPriceInShillings';
import isAdmin from '../../utils/isAdmin';

// Cycles through the admin palette so the category list reads as colorful
// icon-badge rows instead of a flat table, without hardcoding one color.
const CATEGORY_TONES = [
  'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200',
  'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300',
  'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  'bg-brown-100 text-brown-700 dark:bg-brown-600/20 dark:text-brown-300'
];

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
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-300">
                  <FaCoins size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Cost Value</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.totalCostValue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">What it cost to acquire</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300">
                  <FaTags size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Retail Value</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.totalRetailValue)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">What it would sell for</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <FaChartPie size={15} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Potential Profit</p>
                <p className="mt-1 text-xl font-black tracking-tight">{DisplayPriceInShillings(data.potentialProfit)}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">If everything sold at full price</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300">
                  <FaBoxes size={14} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Products Counted</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.productCount}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Published products only</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <FaCheckCircle size={14} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Actually In Stock</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.productsWithStock}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Products with stock &gt; 0</p>
              </div>
              <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brown-100 text-brown-700 dark:bg-brown-600/20 dark:text-brown-300">
                  <FaCubes size={14} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/40">Total Units in Stock</p>
                <p className="mt-1 text-lg font-black tracking-tight">{data.totalUnits.toLocaleString()}</p>
                <p className="text-xs text-brown-400 dark:text-white/40">Across all published products</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
              <h3 className="mb-1 text-base font-bold tracking-tight">Value by Category</h3>
              <p className="mb-2 text-xs text-brown-400 dark:text-white/40">
                A product in more than one category counts toward each — these rows won&apos;t sum to the totals above.
              </p>
              {data.byCategory.length > 0 ? (
                <div className="divide-y divide-brown-100 dark:divide-dm-border">
                  {data.byCategory.map((row, idx) => (
                    <div key={row._id} className="flex items-center gap-3 py-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${CATEGORY_TONES[idx % CATEGORY_TONES.length]}`}>
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal dark:text-white">{row.name}</p>
                        <p className="text-xs text-brown-400 dark:text-white/40">{row.productCount} product{row.productCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-charcoal dark:text-white">{DisplayPriceInShillings(row.retailValue)}</p>
                        <p className="text-xs text-brown-400 dark:text-white/40">cost {DisplayPriceInShillings(row.costValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-brown-400 dark:text-white/40">No categorized products yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card">
              <h3 className="mb-1 text-base font-bold tracking-tight">Highest-Value Products</h3>
              <p className="mb-2 text-xs text-brown-400 dark:text-white/40">
                By retail value, in-stock items only.
              </p>
              {data.topProducts.length > 0 ? (
                <div className="divide-y divide-brown-100 dark:divide-dm-border">
                  {data.topProducts.map((product, idx) => (
                    <div key={product._id} className="flex items-center gap-3 py-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        idx < 3
                          ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300'
                          : 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal dark:text-white">
                          {product.name}
                          {product.sku && <span className="ml-1 text-xs font-normal text-brown-400 dark:text-white/35">({product.sku})</span>}
                        </p>
                        <p className="text-xs text-brown-400 dark:text-white/40">{product.stock} in stock • cost {DisplayPriceInShillings(product.costValue)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-charcoal dark:text-white">{DisplayPriceInShillings(product.retailValue)}</p>
                      </div>
                    </div>
                  ))}
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
