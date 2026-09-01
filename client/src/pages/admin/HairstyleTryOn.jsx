import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaCamera,
  FaCheck,
  FaCloudUploadAlt,
  FaEye,
  FaImage,
  FaInfoCircle,
  FaMagic,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { baseURL } from '../../common/SummaryApi';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import uploadImage from '../../utils/UploadImage';
import { compressImage } from '../../utils/compressImage';
import isAdmin from '../../utils/isAdmin';
import useFeatureFlag from '../../hooks/useFeatureFlag';

const TRYON_URL = `${baseURL}/api/tryon`;

const STATUS_STYLES = {
  pending_review: { label: 'Pending review', cls: 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300' },
};

/**
 * AI Hairstyle Try-On — admin tool (feature-flagged: ai-style-tryon).
 *
 * Aunty picks a hairstyle product, optionally attaches a face photo and
 * styling notes, and the AI generates a photorealistic photo of a person
 * actually wearing that hairstyle. Results are reviewed here; an approved
 * result can be pushed straight into the product's public gallery.
 */
const HairstyleTryOn = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const faceInputRef = useRef(null);

  const { visible: flagVisible, flag } = useFeatureFlag('ai-style-tryon');

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notes, setNotes] = useState('');
  const [faceUrl, setFaceUrl] = useState('');
  const [faceUploading, setFaceUploading] = useState(false);
  const [faceUploadProgress, setFaceUploadProgress] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin(user)) {
      toast.error('AI Style Try-On is for admins only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await Axios({ url: `${baseURL}/api/product/get`, method: 'GET' });
      if (res.data?.success) setProducts(res.data?.data || []);
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin(user)) loadProducts();
  }, [user, loadProducts]);

  const loadResults = useCallback(async (productId) => {
    if (!productId) return;
    try {
      setLoadingResults(true);
      const res = await Axios({
        url: `${TRYON_URL}/results`,
        method: 'GET',
        params: { productId },
      });
      if (res.data?.success) setResults(res.data?.data || []);
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadResults(selectedProduct?._id);
  }, [selectedProduct, loadResults]);

  const filteredProducts = (() => {
    const s = search.trim().toLowerCase();
    const withImages = products.filter((p) => p.image?.[0]);
    if (!s) return withImages.slice(0, 24);
    return withImages.filter((p) =>
      p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)
    ).slice(0, 40);
  })();

  const handleFaceSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setFaceUploading(true);
      setFaceUploadProgress(0);
      const compressed = await compressImage(file);
      const res = await uploadImage(compressed, setFaceUploadProgress);
      const url = res?.data?.data?.url;
      if (!url) throw new Error('Upload did not return an image URL');
      setFaceUrl(url);
      toast.success('Face photo attached');
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setFaceUploading(false);
      setFaceUploadProgress(0);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProduct) {
      toast.error('Pick a hairstyle first.');
      return;
    }
    try {
      setGenerating(true);
      const res = await Axios({
        url: `${TRYON_URL}/generate`,
        method: 'POST',
        data: {
          productId: selectedProduct._id,
          faceImageUrl: faceUrl || undefined,
          notes: notes.trim() || undefined,
        },
        timeout: 180000,
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Try-on photo generated');
        setNotes('');
        loadResults(selectedProduct._id);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatus = async (result, status) => {
    try {
      setBusyId(result._id);
      const res = await Axios({
        url: `${TRYON_URL}/results/${result._id}/status`,
        method: 'PUT',
        data: { status },
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Updated');
        loadResults(selectedProduct?._id);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleAttach = async (result) => {
    try {
      setBusyId(result._id);
      const res = await Axios({
        url: `${TRYON_URL}/results/${result._id}/attach`,
        method: 'POST',
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Added to product gallery');
        loadResults(selectedProduct?._id);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (result) => {
    if (!window.confirm('Delete this try-on result?')) return;
    try {
      setBusyId(result._id);
      const res = await Axios({
        url: `${TRYON_URL}/results/${result._id}`,
        method: 'DELETE',
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Deleted');
        loadResults(selectedProduct?._id);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const isPreviewStage = flag?.status === 'admin-only';

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-brown-100 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brown-200 text-brown-700 transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-plum-700 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
            aria-label="Back to Dashboard"
          >
            <FaArrowLeft size={14} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-plum-600 to-plum-700 text-white shadow-sm">
              <FaMagic size={15} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">AI Hairstyle Try-On</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">
                Generate photos of a person actually wearing the hairstyle
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 pt-4 sm:px-4">
        {isPreviewStage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-plum-200 bg-plum-50 p-3 text-xs text-plum-800 dark:border-plum-800 dark:bg-plum-900/20 dark:text-plum-200">
            <FaInfoCircle className="mt-0.5 shrink-0" />
            <span>
              🔒 <strong>Preview — admin-only until released.</strong> You&apos;re seeing this because the
              <span className="font-mono"> ai-style-tryon</span> feature is in preview. Release it from the
              Feature Releases panel when you&apos;re pleased with the results.
            </span>
          </div>
        )}

        {/* Step 1: pick the hairstyle */}
        <div className="mb-4 rounded-card border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <p className="mb-3 text-sm font-semibold text-charcoal dark:text-white">1 · Pick the hairstyle</p>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search braids, wigs, weaves by name or SKU..."
              className="w-full min-h-[44px] rounded-xl border border-brown-200 bg-ivory pl-10 pr-4 text-sm outline-none transition-colors focus:border-plum-500 focus:bg-white dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-8"><FaSpinner className="mt-0.5 animate-spin text-plum-600" size={20} /></div>
          ) : (
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {filteredProducts.map((p) => {
                const active = selectedProduct?._id === p._id;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedProduct(p)}
                    className={`relative overflow-hidden rounded-xl border text-left transition-all dark:border-dm-border ${
                      active
                        ? 'border-plum-400 ring-2 ring-plum-300 dark:border-plum-500 dark:ring-plum-700'
                        : 'border-brown-100 bg-ivory hover:border-plum-300 dark:bg-dm-card-2'
                    }`}
                  >
                    {active && (
                      <span className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-plum-700 text-white shadow-sm">
                        <FaCheck size={11} />
                      </span>
                    )}
                    <div className="flex aspect-square items-center justify-center bg-white dark:bg-dm-card">
                      {p.image?.[0] ? (
                        <img src={p.image[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-2xl">🛍️</span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 min-h-[2rem] text-xs font-semibold leading-snug">{p.name}</p>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-brown-400 dark:text-white/40">
                  No products with photos match.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: face + notes */}
        <div className="mb-4 rounded-card border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <p className="mb-3 text-sm font-semibold text-charcoal dark:text-white">2 · Face &amp; styling notes <span className="font-normal text-brown-400 dark:text-white/40">(both optional)</span></p>

          <input
            ref={faceInputRef}
            id="tryon-face-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFaceSelected}
            style={{ position: 'absolute', left: '-9999px' }}
          />
          {!faceUrl ? (
            <label
              htmlFor="tryon-face-input"
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brown-300 bg-white py-3 text-sm font-medium text-brown-600 transition-colors hover:bg-brown-50 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/70 dark:hover:bg-dm-card ${faceUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
            >
              <FaCamera />
              {faceUploading
                ? (faceUploadProgress > 0 ? `Uploading… ${faceUploadProgress}%` : 'Uploading…')
                : 'Attach a face photo (optional — the person to wear it)'}
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-brown-200 bg-white p-2.5 dark:border-dm-border dark:bg-dm-card-2">
              <img src={faceUrl} alt="Face" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <p className="min-w-0 flex-1 truncate text-xs text-brown-500 dark:text-white/50">Face photo attached</p>
              <button
                type="button"
                onClick={() => setFaceUrl('')}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label="Remove face photo"
              >
                <FaTimes size={13} />
              </button>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Styling notes, e.g. 'knotless, waist length, side part, studio lighting' — optional"
            className="mt-3 w-full resize-none rounded-xl border border-brown-200 bg-ivory px-3 py-2.5 text-sm outline-none transition-colors focus:border-plum-500 focus:bg-white dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
          />
        </div>

        {/* Generate */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedProduct || generating || !flagVisible}
          className="mb-6 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-plum-600 to-plum-700 text-sm font-bold text-white shadow-sm transition-all hover:from-plum-500 hover:to-plum-600 active:scale-[0.99] disabled:from-brown-300 disabled:to-brown-300"
        >
          {generating ? (
            <>
              <FaSpinner className="animate-spin" size={15} />
              Generating… this can take up to a minute
            </>
          ) : (
            <>
              <FaMagic size={15} />
              {selectedProduct ? `Generate “${selectedProduct.name.length > 28 ? `${selectedProduct.name.slice(0, 28)}…` : selectedProduct.name}” worn` : 'Generate try-on photo'}
            </>
          )}
        </button>

        {/* Results */}
        <div className="mb-4 rounded-card border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <p className="mb-3 text-sm font-semibold text-charcoal dark:text-white">
            3 · Review results{selectedProduct ? ` — ${selectedProduct.name}` : ''}
          </p>

          {!selectedProduct ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-brown-400 dark:text-white/40">
              <FaImage size={22} />
              <p>Pick a hairstyle to see its generated try-on photos here.</p>
            </div>
          ) : loadingResults ? (
            <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-plum-600" size={20} /></div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-brown-400 dark:text-white/40">
              <FaImage size={22} />
              <p>No try-on photos yet for this hairstyle. Generate the first one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((r) => {
                const badge = STATUS_STYLES[r.status] || STATUS_STYLES.pending_review;
                const busy = busyId === r._id;
                return (
                  <div key={r._id} className="overflow-hidden rounded-xl border border-brown-100 dark:border-dm-border">
                    <div className="relative">
                      <img src={r.resultImageUrl} alt="Try-on result" className="aspect-square w-full bg-white object-cover dark:bg-dm-card" loading="lazy" />
                      <span className={`absolute left-2 top-2 rounded-pill px-2.5 py-1 text-[10px] font-bold shadow-sm ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {r.attachedToProductAt && (
                        <span className="absolute right-2 top-2 rounded-pill bg-plum-700 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                          In gallery
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      {r.promptNotes && (
                        <p className="mb-2 line-clamp-1 text-[11px] italic text-brown-400 dark:text-white/40">“{r.promptNotes}”</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {r.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleStatus(r, 'approved')}
                            disabled={busy}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            <FaCheck size={11} /> Approve
                          </button>
                        )}
                        {r.status === 'approved' && !r.attachedToProductAt && (
                          <button
                            type="button"
                            onClick={() => handleAttach(r)}
                            disabled={busy}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-plum-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-plum-800 disabled:opacity-60"
                          >
                            <FaCloudUploadAlt size={11} /> Add to gallery
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleStatus(r, 'rejected')}
                            disabled={busy}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:hover:bg-red-950/30"
                          >
                            <FaTimes size={11} /> Reject
                          </button>
                        )}
                        <a
                          href={r.resultImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-brown-200 px-3 text-xs font-semibold text-brown-600 transition-colors hover:bg-brown-50 dark:border-dm-border dark:text-white/60 dark:hover:bg-dm-card-2"
                        >
                          <FaEye size={11} /> Full size
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={busy}
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg px-2.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
                          aria-label="Delete result"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HairstyleTryOn;