import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaRegEye, FaRegEyeSlash, FaUser } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import SocialAuth from '../components/SocialAuth';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const Register = () => {
    const [data, setData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const validateField = (name, value) => {
        if (name === 'name' && value && !/^[a-zA-Z\s'.,-]{1,50}$/.test(value))
            return "Name can only contain letters, spaces, and basic punctuation";
        if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return "Please enter a valid email address";
        if (name === 'password' && value && value.length < 8)
            return "Password must be at least 8 characters";
        if (name === 'password' && value && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value))
            return "Password must include letters and numbers";
        if (name === 'confirmPassword' && value !== data.password)
            return "Passwords do not match";
        return "";
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let sanitizedValue = value;
        if (name === 'name') sanitizedValue = value.slice(0, 50);
        else if (name === 'email') sanitizedValue = value.slice(0, 100);
        else if (name === 'password' || name === 'confirmPassword') sanitizedValue = value.slice(0, 100);
        setData(prev => ({ ...prev, [name]: sanitizedValue }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, sanitizedValue) }));
    };

    const valideValue = Object.values(data).every(el => el);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const validationErrors = [];
        if (!/^[a-zA-Z\s'.,-]{1,50}$/.test(data.name)) validationErrors.push("Name can only contain letters, spaces, and basic punctuation");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) validationErrors.push("Please enter a valid email address");
        if (data.password.length < 8) validationErrors.push("Password must be at least 8 characters");
        if (data.password !== data.confirmPassword) validationErrors.push("Passwords do not match");
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(data.password)) validationErrors.push("Password must include letters and numbers");
        if (validationErrors.length > 0) {
            validationErrors.forEach(err => toast.error(err));
            setIsLoading(false);
            return;
        }
        try {
            const response = await Axios({ ...SummaryApi.register, data });
            if (response.data.error) toast.error(response.data.message);
            if (response.data.success) {
                toast.success(response.data.message);
                setData({ name: "", email: "", password: "", confirmPassword: "" });
                navigate("/login");
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 dark:focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all";

    return (
        <section className="w-full min-h-screen flex bg-ivory dark:bg-dm-surface transition-colors">
            {/* Left brand panel */}
            <div className="hidden lg:flex flex-col justify-between w-2/5 bg-plum-900 p-10 xl:p-14 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-plum-700/40" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-plum-800/60" />
                <div className="relative z-10">
                    <h2 className="font-display text-gold-300 text-3xl font-semibold italic mb-1">Nawiri Hair</h2>
                    <p className="text-white/50 text-sm">Premium Hair Collections</p>
                </div>
                <div className="relative z-10 space-y-4">
                    <blockquote className="font-display text-white text-3xl xl:text-4xl font-semibold italic leading-tight">
                        "Join the Nawiri<br />family today."
                    </blockquote>
                    <ul className="text-white/50 text-sm space-y-1.5">
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" /> Earn loyalty points on every purchase</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" /> Access exclusive community campaigns</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" /> Track your orders in real-time</li>
                    </ul>
                </div>
                <div className="relative z-10 flex gap-2">
                    <div className="w-8 h-1 rounded-full bg-gold-500" />
                    <div className="w-4 h-1 rounded-full bg-white/20" />
                    <div className="w-2 h-1 rounded-full bg-white/20" />
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-8 lg:px-12 overflow-y-auto">
                <div className="w-full max-w-md animate-fade-up">
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-charcoal dark:text-white">Create your account</h1>
                        <p className="text-sm text-brown-400 dark:text-white/50 mt-1">Join Nawiri Hair and start shopping</p>
                    </div>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {/* Name */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="name" className="text-sm font-medium text-charcoal dark:text-white/80">Full Name</label>
                            <div className={inputClass}>
                                <input
                                    type="text" id="name" name="name" autoFocus maxLength={50}
                                    value={data.name} onChange={handleChange} placeholder="Your full name"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <FaUser className="text-brown-300 dark:text-white/30 flex-shrink-0" size={13} />
                            </div>
                            {errors.name && <p className="text-xs text-red-500 dark:text-red-400">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="text-sm font-medium text-charcoal dark:text-white/80">Email address</label>
                            <div className={inputClass}>
                                <input
                                    type="email" id="email" name="email" maxLength={100}
                                    value={data.email} onChange={handleChange} placeholder="you@example.com"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <FaEnvelope className="text-brown-300 dark:text-white/30 flex-shrink-0" size={13} />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 dark:text-red-400">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="password" className="text-sm font-medium text-charcoal dark:text-white/80">Password</label>
                            <div className={inputClass}>
                                <input
                                    type={showPassword ? "text" : "password"} id="password" name="password" maxLength={100}
                                    value={data.password} onChange={handleChange} placeholder="Min. 8 characters"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <button type="button" onClick={() => setShowPassword(p => !p)} className="text-brown-300 dark:text-white/30 hover:text-plum-700 transition-colors">
                                    {showPassword ? <FaRegEye size={13} /> : <FaRegEyeSlash size={13} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 dark:text-red-400">{errors.password}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-charcoal dark:text-white/80">Confirm Password</label>
                            <div className={inputClass}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" maxLength={100}
                                    value={data.confirmPassword} onChange={handleChange} placeholder="Repeat your password"
                                    className="flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="text-brown-300 dark:text-white/30 hover:text-plum-700 transition-colors">
                                    {showConfirmPassword ? <FaRegEye size={13} /> : <FaRegEyeSlash size={13} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-500 dark:text-red-400">{errors.confirmPassword}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !valideValue}
                            className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 press mt-1 ${
                                !isLoading && valideValue
                                    ? 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-sm hover:shadow-gold'
                                    : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="my-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-brown-100 dark:bg-dm-border" />
                        <span className="text-xs text-brown-300 dark:text-white/30 flex-shrink-0">or continue with</span>
                        <div className="flex-1 h-px bg-brown-100 dark:bg-dm-border" />
                    </div>
                    <SocialAuth />

                    <p className="mt-6 text-sm text-brown-400 dark:text-white/50 text-center">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-plum-700 dark:text-plum-200 hover:underline underline-offset-2">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Register;
