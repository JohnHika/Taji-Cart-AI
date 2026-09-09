import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaCloudUploadAlt,
  FaCopy,
  FaEdit,
  FaHistory,
  FaLock,
  FaPlus,
  FaRocket,
  FaSave,
  FaTrash,
  FaUsers,
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi, { baseURL } from '../../common/SummaryApi';
import { fetchFeatureFlags } from '../../store/featureFlagSlice';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import isAdmin from '../../utils/isAdmin';

const flagUrl = (id, suffix = '') => `${baseURL}/api/feature-flags/${id}${suffix}`;

// Feature keys must match /^[a-z0-9][a-z0-9._-]*$/ (server model rule). Typing
// "ai style tryon" used to fail with a cryptic server regex error — instead,
// normalise as the admin types: lowercase, spaces/underscores → hyphens,
// anything else stripped. What lands in the DB is always a valid key.
const slugifyFeatureKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-{2,}/g, '-');

const StatusBadge = ({ flag }) => {
  if (flag.enabled === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-brown-100 px-2.5 py-1 text-[11px] font-semibold text-brown-600 dark:bg-dm-card-2 dark:text-white/60">
        <FaHistory size={10} /> Disabled — hidden from everyone
      </span>
    );
  }
  if (flag.status === 'released') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <FaUsers size={10} /> Released — visible to everyone
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-plum-50 px-2.5 py-1 text-[11px] font-semibold text-plum-700 dark:bg-plum-900/40 dark:text-plum-200">
      <FaLock size={10} /> Admin-only — customers can&apos;t see it yet
    </span>
  );
};

StatusBadge.propTypes = {
  flag: PropTypes.shape({
    _id: PropTypes.string,
    key: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.oneOf(['admin-only', 'released']),
    enabled: PropTypes.bool,
    releasedAt: PropTypes.string,
  }).isRequired,
};

const FeatureReleases = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // Create form
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin(user)) {
      toast.error('Feature releases is admin-only.');
      navigate('/dashboard/pos-dashboard');
    }
  }, [user, navigate]);

  const loadFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await Axios({ ...SummaryApi.getAllFeatureFlags });
      setFlags(res.data?.data || []);
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?._id && isAdmin(user)) {
      loadFlags();
    }
  }, [user, loadFlags]);

  // After any change, refresh the app-wide visible-flags cache too so gates
  // on other pages reflect the new rollout state immediately.
  const refreshVisibleFlags = () => dispatch(fetchFeatureFlags({ force: true }));

  const reloadAll = async () => {
    await loadFlags();
    refreshVisibleFlags();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.key.trim() || !form.name.trim()) {
      toast.error('Key and name are required');
      return;
    }
    try {
      setCreating(true);
      const res = await Axios({
        ...SummaryApi.createFeatureFlag,
        data: {
          key: form.key.trim().toLowerCase(),
          name: form.name.trim(),
          description: form.description.trim(),
        },
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Feature created');
        setForm({ key: '', name: '', description: '' });
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setCreating(false);
    }
  };

  const handleRelease = async (flag) => {
    try {
      setBusyId(flag._id);
      const res = await Axios({ url: flagUrl(flag._id, '/release'), method: 'POST' });
      if (res.data?.success) {
        toast.success(res.data.message || 'Feature released');
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnrelease = async (flag) => {
    try {
      setBusyId(flag._id);
      const res = await Axios({ url: flagUrl(flag._id, '/unrelease'), method: 'POST' });
      if (res.data?.success) {
        toast.success(res.data.message || 'Feature pulled back to admin-only');
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleEnabled = async (flag, next) => {
    try {
      setBusyId(flag._id);
      const res = await Axios({ url: flagUrl(flag._id), method: 'PUT', data: { enabled: next } });
      if (res.data?.success) {
        toast.success(next ? `"${flag.name}" enabled` : `"${flag.name}" disabled — hidden from everyone`);
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (flag) => {
    setEditId(flag._id);
    setEditForm({ name: flag.name, description: flag.description || '' });
  };

  const handleSaveEdit = async (flag) => {
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setBusyId(flag._id);
      const res = await Axios({
        url: flagUrl(flag._id),
        method: 'PUT',
        data: { name: editForm.name.trim(), description: editForm.description.trim() },
      });
      if (res.data?.success) {
        toast.success('Feature updated');
        setEditId(null);
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (flag) => {
    try {
      setBusyId(flag._id);
      const res = await Axios({ url: flagUrl(flag._id), method: 'DELETE' });
      if (res.data?.success) {
        toast.success(res.data.message || 'Feature deleted');
        setConfirmDeleteId(null);
        await reloadAll();
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setBusyId(null);
    }
  };

  const copyKey = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success(`Key "${key}" copied`);
    } catch {
      toast.error('Could not copy — select the text manually');
    }
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleString('en-KE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

  return (
    <div className="min-h-screen bg-ivory pb-16 dark:bg-dm-surface">
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
              <FaRocket size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">Feature releases</h1>
              <p className="text-[11px] text-brown-500 dark:text-white/50">
                Preview new features as admin, release them to everyone when ready
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 pt-4 sm:px-4">
        {/* How it works */}
        <div className="mb-4 rounded-card border border-brown-100 bg-white p-4 text-[12px] leading-relaxed text-brown-600 dark:border-dm-border dark:bg-dm-card dark:text-white/60">
          <p className="mb-1 font-semibold text-charcoal dark:text-white">How staged releases work</p>
          <p>
            1. Register a feature with a <span className="font-mono">key</span> — it starts admin-only: you see it live
            in the app, customers see nothing.
          </p>
          <p>2. Click <span className="font-semibold">Release</span> when it&apos;s ready — it instantly becomes visible to everyone.</p>
          <p>
            3. In code, wrap the feature in{' '}
            <span className="font-mono">&lt;FeatureGate flagKey=&quot;the-key&quot;&gt;…&lt;/FeatureGate&gt;</span> — the server
            decides who sees it. Deleting a flag re-hides the feature from everyone, including admins.
          </p>
        </div>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-card border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card"
        >
          <p className="mb-3 text-sm font-semibold text-charcoal dark:text-white">Register a new feature</p>
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/50">
                Key <span className="normal-case">(used in code, e.g. ai-style-finder)</span>
              </span>
              <input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: slugifyFeatureKey(e.target.value) }))}
                placeholder="ai-style-finder"
                className="w-full rounded-xl border border-brown-200 bg-ivory px-3 py-2 font-mono text-sm text-charcoal outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
                autoComplete="off"
                required
              />
              <span className="mt-1 block text-[11px] text-brown-400 dark:text-white/40">
                Spaces and underscores become hyphens automatically; capital letters become lowercase.
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/50">
                Display name
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="AI Style Finder"
                className="w-full rounded-xl border border-brown-200 bg-ivory px-3 py-2 text-sm text-charcoal outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/50">
              Description <span className="normal-case">(optional — what is this feature?)</span>
            </span>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Personalised product recommendations in the storefront"
              className="mb-3 w-full rounded-xl border border-brown-200 bg-ivory px-3 py-2 text-sm text-charcoal outline-none focus:border-plum-400 focus:ring-2 focus:ring-plum-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-pill bg-plum-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-plum-500 disabled:opacity-60"
          >
            <FaPlus size={12} />
            {creating ? 'Creating…' : 'Create feature (admin-only preview)'}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-plum-500 border-t-transparent" />
          </div>
        ) : flags.length === 0 ? (
          <div className="rounded-card border border-dashed border-brown-200 bg-white/60 p-8 text-center text-sm text-brown-500 dark:border-dm-border dark:bg-dm-card/60 dark:text-white/50">
            No features registered yet. Create one above — it stays admin-only until you release it.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map((flag) => {
              const isBusy = busyId === flag._id;
              const releasedAt = formatDate(flag.releasedAt);

              return (
                <div
                  key={flag._id}
                  className="rounded-card border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editId === flag._id ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="min-w-0 flex-1 rounded-xl border border-brown-200 bg-ivory px-3 py-2 text-sm font-semibold text-charcoal outline-none focus:border-plum-400 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
                            placeholder="Feature name"
                          />
                          <input
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            className="min-w-0 flex-1 rounded-xl border border-brown-200 bg-ivory px-3 py-2 text-sm text-charcoal outline-none focus:border-plum-400 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(flag)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-pill bg-plum-600 px-3 py-2 text-xs font-semibold text-white hover:bg-plum-500 disabled:opacity-60"
                            >
                              <FaSave size={11} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="rounded-pill border border-brown-200 px-3 py-2 text-xs font-semibold text-brown-600 hover:bg-brown-50 dark:border-dm-border dark:text-white/60 dark:hover:bg-dm-card-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="truncate text-sm font-bold text-charcoal dark:text-white">{flag.name}</p>
                          <button
                            type="button"
                            onClick={() => copyKey(flag.key)}
                            title="Copy key for use in code"
                            className="mt-1 inline-flex items-center gap-1.5 rounded-pill border border-brown-200 px-2 py-0.5 font-mono text-[11px] text-brown-600 transition-colors hover:border-plum-300 hover:text-plum-700 dark:border-dm-border dark:text-white/50"
                          >
                            <FaCopy size={9} /> {flag.key}
                          </button>
                          {flag.description ? (
                            <p className="mt-1.5 text-xs text-brown-500 dark:text-white/50">{flag.description}</p>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge flag={flag} />
                      {releasedAt ? (
                        <p className="text-[10px] text-brown-400 dark:text-white/40">Released {releasedAt}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brown-100 pt-3 dark:border-dm-border">
                    {/* Enable / disable kill switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(flag, !flag.enabled)}
                      disabled={isBusy}
                      className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                        flag.enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'border-brown-200 bg-brown-50 text-brown-600 hover:bg-brown-100 dark:border-dm-border dark:bg-dm-card-2 dark:text-white/60'
                      }`}
                    >
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {/* Release / unrelease */}
                    {flag.status === 'released' ? (
                      <button
                        type="button"
                        onClick={() => handleUnrelease(flag)}
                        disabled={isBusy || flag.enabled === false}
                        title="Pull back to admin-only preview"
                        className="inline-flex items-center gap-1.5 rounded-pill border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      >
                        <FaLock size={10} /> Pull back to admin-only
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRelease(flag)}
                        disabled={isBusy || flag.enabled === false}
                        title="Make this feature visible to everyone"
                        className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <FaCloudUploadAlt size={11} /> Release to public
                      </button>
                    )}

                    {editId !== flag._id && (
                      <button
                        type="button"
                        onClick={() => startEdit(flag)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-brown-200 px-3 py-1.5 text-xs font-semibold text-brown-600 hover:bg-brown-50 disabled:opacity-60 dark:border-dm-border dark:text-white/60 dark:hover:bg-dm-card-2"
                      >
                        <FaEdit size={10} /> Edit
                      </button>
                    )}

                    {confirmDeleteId === flag._id ? (
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-brown-500 dark:text-white/50">Delete? Re-hides it from everyone.</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(flag)}
                          disabled={isBusy}
                          className="rounded-pill bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-pill border border-brown-200 px-3 py-1.5 text-xs font-semibold text-brown-600 hover:bg-brown-50 dark:border-dm-border dark:text-white/60"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(flag._id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <FaTrash size={10} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureReleases;
