import { useEffect, useState } from 'react';
import { FaArrowRight, FaCheckCircle, FaEyeSlash, FaImage, FaPen, FaTags } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { getCatalogVisibilityCopy } from '../utils/catalogQualityPresentation';

const CatalogQuality = () => {
  const [hideIncompleteProducts, setHideIncompleteProducts] = useState(true);
  const [incompleteProducts, setIncompleteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCatalogQuality = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await Axios({ ...SummaryApi.getCatalogQuality });
      const payload = response.data?.data;

      if (!response.data?.success || !payload) {
        throw new Error(response.data?.message || 'Unable to load catalog quality settings');
      }

      setHideIncompleteProducts(payload.settings.hideIncompleteProducts);
      setIncompleteProducts(payload.incompleteProducts || []);
    } catch (requestError) {
      setError('Unable to load catalog quality right now. Please try again.');
      AxiosToastError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogQuality();
  }, []);

  const handleVisibilityChange = async (event) => {
    const nextValue = event.target.checked;
    const confirmation = nextValue
      ? 'Hide incomplete products from customers now?'
      : 'Allow incomplete published products to appear for customers?';

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      setSaving(true);
      const response = await Axios({
        ...SummaryApi.updateCatalogQuality,
        data: { hideIncompleteProducts: nextValue },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update customer visibility');
      }

      setHideIncompleteProducts(response.data.data.hideIncompleteProducts);
      await loadCatalogQuality();
    } catch (requestError) {
      AxiosToastError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const copy = getCatalogVisibilityCopy(hideIncompleteProducts);

  return (
    <main className="min-h-screen bg-ivory px-3 py-4 dark:bg-dm-surface sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-card border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-300">Storefront control</p>
              <h1 className="text-2xl font-bold text-charcoal dark:text-white sm:text-3xl">Catalog quality</h1>
              <p className="mt-2 text-sm leading-relaxed text-brown-600 dark:text-white/65">
                Keep the customer storefront focused on products that are ready to buy. Fix the items below directly from this queue.
              </p>
            </div>
            <Link
              to="/dashboard/product"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-plum-200 px-4 py-2 text-sm font-semibold text-plum-700 transition-colors hover:bg-plum-50 dark:border-plum-700 dark:text-plum-200 dark:hover:bg-plum-900/30"
            >
              All products <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section className="mb-5 rounded-card border border-plum-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-6" aria-busy={loading || saving}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hideIncompleteProducts ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300'}`}>
                {hideIncompleteProducts ? <FaCheckCircle aria-hidden="true" /> : <FaEyeSlash aria-hidden="true" />}
              </span>
              <div>
                <h2 className="font-bold text-charcoal dark:text-white">{copy.status}</h2>
                <p className="mt-1 text-sm text-brown-600 dark:text-white/60">{copy.description}</p>
              </div>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 self-start rounded-pill border border-brown-200 px-3 py-2 dark:border-dm-border sm:self-auto">
              <span className="text-sm font-semibold text-charcoal dark:text-white">Hide incomplete items</span>
              <input
                type="checkbox"
                checked={hideIncompleteProducts}
                onChange={handleVisibilityChange}
                disabled={loading || saving}
                className="h-5 w-5 accent-plum-700"
                aria-label="Hide incomplete products from customers"
              />
            </label>
          </div>
        </section>

        <section className="rounded-card border border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
          <div className="flex flex-col gap-2 border-b border-brown-100 px-4 py-4 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-charcoal dark:text-white">Needs attention</h2>
              <p className="text-sm text-brown-600 dark:text-white/60">
                {loading ? 'Checking your catalog…' : `${incompleteProducts.length} item${incompleteProducts.length === 1 ? '' : 's'} need an image or a price.`}
              </p>
            </div>
            {!loading && incompleteProducts.length > 0 && hideIncompleteProducts && (
              <span className="w-fit rounded-pill bg-blush-100 px-3 py-1 text-xs font-bold text-blush-600 dark:bg-blush-500/15 dark:text-blush-300">
                Hidden from customers
              </span>
            )}
          </div>

          {error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              <button type="button" onClick={loadCatalogQuality} className="mt-3 rounded-pill bg-plum-700 px-4 py-2 text-sm font-semibold text-white">Try again</button>
            </div>
          ) : loading ? (
            <div className="space-y-3 p-4 sm:p-6">
              {[1, 2, 3].map((index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-brown-100 dark:bg-dm-card-2" />)}
            </div>
          ) : incompleteProducts.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><FaCheckCircle size={22} aria-hidden="true" /></span>
              <h3 className="mt-3 font-bold text-charcoal dark:text-white">Your catalog is customer-ready</h3>
              <p className="mt-1 text-sm text-brown-600 dark:text-white/60">Every product has a usable image and a price above KSh 0.</p>
            </div>
          ) : (
            <ul className="divide-y divide-brown-100 dark:divide-dm-border">
              {incompleteProducts.map((product) => (
                <li key={product._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blush-100 text-blush-600 dark:bg-blush-500/15 dark:text-blush-300"><FaTags aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-charcoal dark:text-white">{product.name || 'Untitled product'}</h3>
                      <p className="mt-0.5 text-xs text-brown-500 dark:text-white/45">SKU: {product.sku || 'Not set'} · {product.customerVisibility === 'hidden' ? 'Hidden from customers' : product.customerVisibility === 'visible' ? 'Currently visible' : 'Unpublished'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.incompleteReasons.map((reason) => (
                          <span key={reason} className="inline-flex items-center gap-1 rounded-pill bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                            {reason.includes('image') ? <FaImage aria-hidden="true" /> : null}{reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/dashboard/upload-product?edit=${product._id}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-plum-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-plum-600"
                  >
                    <FaPen aria-hidden="true" /> Fix product
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default CatalogQuality;
