import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import SocialAuth from '../components/SocialAuth';
import { nawiriBrand } from '../config/brand';
import { fetchCartItems } from '../redux/slice/cartSlice';
import { setUserDetails } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import fetchUserDetails from '../utils/fetchUserDetails';
import { getPostLoginPath } from '../utils/postLoginRedirect';

const Login = () => {
    const [data, setData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const submitLockRef = useRef(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const valideValue = Object.values(data).every(el => el);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitLockRef.current || isLoading) return;
        submitLockRef.current = true;
        setIsLoading(true);
        try {
            const response = await Axios({
                ...SummaryApi.login,
                data,
                requestLockKey: `auth:login:${data.email.trim().toLowerCase()}`
            });
            if (response.data.error) {
                toast.error(response.data.message || "Login failed.");
                setIsLoading(false);
                return;
            }
            if (response.data.success) {
                sessionStorage.setItem('accesstoken', response.data.data.accesstoken);
                sessionStorage.setItem('refreshToken', response.data.data.refreshToken);
                if (window.setupRefreshTimer) window.setupRefreshTimer();
                const userDetails = await fetchUserDetails();
                const nextUser = {
                    ...userDetails.data,
                    accountType: userDetails.data.role ||
                        (userDetails.data.isAdmin ? 'admin' :
                         userDetails.data.isDelivery ? 'delivery' :
                         userDetails.data.isStaff ? 'staff' : 'customer')
                };
                dispatch(setUserDetails(nextUser));
                dispatch(fetchCartItems());
                setData({ email: "", password: "" });
                toast.success(response.data.message);
                navigate(getPostLoginPath(nextUser));
            }
        } catch (error) {
            if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
                toast.error(error.response.data.message || 'Please verify your email before signing in.');
                navigate(`/verify-email?email=${encodeURIComponent(error.response.data.email || data.email.trim())}&sent=1`);
            } else if (error.response?.status === 400) {
                const msg = error.response?.data?.message;
                if (msg === "Incorrect password") toast.error("Incorrect password. Please try again.");
                else if (msg === "User not registered") toast.error("Email not registered. Please create an account.");
                else toast.error(msg || "Login failed.");
            } else {
                AxiosToastError(error);
            }
        } finally {
            setIsLoading(false);
            submitLockRef.current = false;
        }
    };

    return (
        <section className="w-full min-h-screen flex bg-ivory dark:bg-dm-surface transition-colors">
            {/* Left brand panel (desktop only) */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-plum-900 p-10 xl:p-14 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-plum-700/40" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-plum-800/60" />
                <div className="relative z-10">
                    <div className="inline-flex rounded-3xl bg-white p-3 shadow-lg">
                        <img src={nawiriBrand.logo} alt={nawiriBrand.shortName} className="h-20 w-auto object-contain" />
                    </div>
                    <p className="mt-4 text-white/70 text-sm">{nawiriBrand.companyName}</p>
                </div>
                <div className="relative z-10">
                    <blockquote className="font-display text-white text-4xl xl:text-5xl font-semibold italic leading-tight">
                        {nawiriBrand.motto}
                    </blockquote>
                    <p className="text-white/50 text-sm mt-4">
                        Secure sign-in, polished service, and premium hair collections built for confident everyday styling.
                    </p>
                </div>
                <div className="relative z-10 flex gap-2">
                    <div className="w-8 h-1 rounded-full bg-gold-500" />
                    <div className="w-4 h-1 rounded-full bg-white/20" />
                    <div className="w-2 h-1 rounded-full bg-white/20" />
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-8 lg:px-12">
                <div className="w-full max-w-md animate-fade-up">
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-charcoal dark:text-white">Welcome back</h1>
                        <p className="text-sm text-brown-400 dark:text-white/50 mt-1">Sign in to your Nawiri Hair account</p>
                    </div>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="text-sm font-medium text-charcoal dark:text-white/80">Email address</label>
                            <div className="flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 dark:focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={data.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <FaEnvelope className="text-brown-300 dark:text-white/30 flex-shrink-0" size={14} />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-charcoal dark:text-white/80">Password</label>
                                <Link to="/forgot-password" className="text-xs text-plum-700 dark:text-plum-200 hover:underline underline-offset-2 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 dark:focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={data.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="text-brown-300 dark:text-white/30 hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
                                >
                                    {showPassword ? <FaRegEye size={14} /> : <FaRegEyeSlash size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!valideValue || isLoading}
                            className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 press mt-1 ${
                                valideValue && !isLoading
                                    ? 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-sm hover:shadow-gold'
                                    : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    {/* Social auth */}
                    <div className="my-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-brown-100 dark:bg-dm-border" />
                        <span className="text-xs text-brown-300 dark:text-white/30 flex-shrink-0">or continue with</span>
                        <div className="flex-1 h-px bg-brown-100 dark:bg-dm-border" />
                    </div>
                    <SocialAuth />

                    <p className="mt-6 text-sm text-brown-400 dark:text-white/50 text-center">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-plum-700 dark:text-plum-200 hover:underline underline-offset-2">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Login;
