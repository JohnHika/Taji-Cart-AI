import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaSave } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import SummaryApi from '../common/SummaryApi';
import ThemeToggle from '../components/ThemeToggle';
import { setUserDetails } from '../store/userSlice';
import Axios from '../utils/Axios';

const defaultNotif = { email: true, push: true, sms: false };

const UserSettings = () => {
  const user = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notif, setNotif] = useState(defaultNotif);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      mobile: user.mobile || ''
    });
    const p = user.notification_preferences;
    if (p && typeof p === 'object') {
      setNotif({
        email: p.email !== false,
        push: p.push !== false,
        sms: p.sms === true
      });
    }
  }, [user]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await Axios({
        ...SummaryApi.updateUserDetails,
        data: {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          notification_preferences: notif
        }
      });
      if (response.data.success) {
        toast.success(response.data.message || 'Settings saved');
        if (response.data.data) {
          dispatch(setUserDetails(response.data.data));
        }
      } else {
        toast.error(response.data.message || 'Could not save');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/user/change-password',
        method: 'POST',
        data: {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }
      });
      if (response.data.success) {
        toast.success('Password updated');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(response.data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password');
    } finally {
      setLoading(false);
    }
  };

  const panel =
    'rounded-2xl border border-brown-100 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-6';

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden bg-ivory px-3 py-5 dark:bg-dm-surface sm:px-6 sm:py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-xl font-bold text-charcoal dark:text-white sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-brown-600 dark:text-white/55">Account, notifications, and appearance.</p>

        <form onSubmit={handleSaveAccount} className={`${panel} mt-6 space-y-4`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">Account</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown-600 dark:text-white/60" htmlFor="settings-name">
              Name
            </label>
            <input
              id="settings-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm text-charcoal outline-none ring-plum-500/30 focus:ring-2 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown-600 dark:text-white/60" htmlFor="settings-email">
              Email
            </label>
            <input
              id="settings-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm text-charcoal outline-none ring-plum-500/30 focus:ring-2 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown-600 dark:text-white/60" htmlFor="settings-mobile">
              Mobile
            </label>
            <input
              id="settings-mobile"
              name="mobile"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm text-charcoal outline-none ring-plum-500/30 focus:ring-2 dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
            />
          </div>

          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
            Notifications
          </h2>
          <p className="text-xs text-brown-500 dark:text-white/45">Stored on your account where supported.</p>
          {(['email', 'push', 'sms']).map((key) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-brown-100 px-3 py-2.5 dark:border-dm-border">
              <span className="text-sm font-medium capitalize text-charcoal dark:text-white/85">{key} updates</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brown-300 text-plum-700 focus:ring-plum-500"
                checked={notif[key]}
                onChange={(e) => setNotif((n) => ({ ...n, [key]: e.target.checked }))}
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-gold-400 disabled:opacity-60"
          >
            <FaSave size={14} />
            Save account & notifications
          </button>
        </form>

        <form onSubmit={handleChangePassword} className={`${panel} mt-5 space-y-4`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">Password</h2>
          <input
            type="password"
            placeholder="Current password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
            className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
          />
          <input
            type="password"
            placeholder="New password (8+ chars, letters & numbers)"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
            className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
            className="w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full border border-plum-200 py-2.5 text-sm font-semibold text-plum-800 transition hover:bg-plum-50 disabled:opacity-60 dark:border-plum-700 dark:text-plum-200 dark:hover:bg-plum-900/30"
          >
            Update password
          </button>
        </form>

        <div className={`${panel} mt-5`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">Appearance</h2>
          <p className="mt-1 text-xs text-brown-500 dark:text-white/45">Theme is saved on this device.</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm text-charcoal dark:text-white/80">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
