import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { nawiriBrand } from '../config/brand';

const VerifyEmail = () => {
    const { token, email } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleVerification = async () => {
        if (!token || !email) {
            toast.error("Missing verification parameters.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await Axios({
                method: 'GET', // Assuming the API endpoint is GET or we need to pass token/email in body/query
                url: `/api/user/verify-email`, // Placeholder URL, adjust as needed
                params: { token, email },
            });

            if (response.data.error) {
                toast.error(response.data.message || "Verification failed.");
                setMessage({ type: 'error', text: response.data.message || "Verification failed." });
            } else {
                toast.success(response.data.message || "Email verified successfully!");
                setMessage({ type: 'success', text: "Your email has been successfully verified. You can now log in." });
                // Redirect to login or dashboard after success
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error) {
            console.error("Verification API Error:", error);
            toast.error("An unexpected error occurred during verification.");
            setMessage({ type: 'error', text: "Could not connect to the verification service." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-dm-surface p-4">
            <div className="w-full max-w-md bg-white dark:bg-dm-card p-8 rounded-3xl shadow-xl border border-blush-100 dark:border-dm-border">
                <div className="text-center mb-8">
                    <img src={nawiriBrand.logo} alt={nawiriBrand.shortName} className="h-16 w-auto object-contain mb-3" />
                    <h1 className="text-3xl font-bold text-charcoal dark:text-white">Verify Your Email</h1>
                    <p className="text-sm text-brown-400 dark:text-white/50 mt-1">
                        {nawiriBrand.shortName} requires email verification for security.
                    </p>
                </div>

                {message && (
                    <div className={`p-3 mb-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        <span>{message.text}</span>
                    </div>
                )}

                <p className="text-center text-sm text-charcoal dark:text-white/80 mb-6">
                    If the button below doesn't work, copy the link from your email and paste it into your browser.
                </p>

                <button
                    onClick={handleVerification}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 ${
                        isLoading
                            ? 'bg-plum-300 cursor-not-allowed'
                            : 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-md hover:shadow-lg'
                    }`}
                >
                    {isLoading ? "Verifying..." : "Verify My Email Address"}
                </button>
            </div>
        </div>
    );
};

export default VerifyEmail;