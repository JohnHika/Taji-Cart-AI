import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const ForgotPassword = () => {
    const [data, setData] = useState({
        email: "",
    })
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target

        setData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    const valideValue = Object.values(data).every(el => el)

    const handleSubmit = async(e) => {
        e.preventDefault()

        try {
            const response = await Axios({
                ...SummaryApi.forgot_password,
                data : data
            })
            
            if(response.data.error){
                toast.error(response.data.message)
            }

            if(response.data.success){
                toast.success(response.data.message)
                navigate("/verification-otp", {
                  state : data
                })
                setData({
                    email : "",
                })
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    return (
        <section className='w-full min-h-screen flex items-center justify-center py-8 px-3 sm:px-4 bg-ivory dark:bg-dm-surface transition-colors'>
            <div className='bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border my-4 w-full max-w-md mx-auto rounded-card p-6 sm:p-8 shadow-card transition-colors'>
                <h1 className='font-bold text-xl text-charcoal dark:text-white mb-1'>Forgot Password</h1>
                <p className='text-sm text-brown-400 dark:text-white/50 mb-5'>Enter your email and we'll send a verification code.</p>
                <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
                    <div className='flex flex-col gap-1.5'>
                        <label htmlFor='email' className="text-sm font-medium text-charcoal dark:text-white/80">Email address</label>
                        <div className='flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all'>
                            <input
                                type='email'
                                id='email'
                                className='flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30'
                                name='email'
                                value={data.email}
                                onChange={handleChange}
                                placeholder='you@example.com'
                                autoComplete='email'
                            />
                            <FaEnvelope className='text-brown-300 dark:text-white/30 shrink-0' size={14} />
                        </div>
                    </div>

                    <button
                        disabled={!valideValue}
                        className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 press mt-1 ${
                            valideValue
                                ? 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-sm hover:shadow-gold'
                                : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
                        }`}
                    >
                        Send OTP
                    </button>
                </form>

                <p className="mt-6 text-sm text-brown-400 dark:text-white/50 text-center">
                    Remember your password?{' '}
                    <Link to="/login" className='font-semibold text-plum-700 dark:text-plum-200 hover:underline underline-offset-2'>Sign in</Link>
                </p>
            </div>
        </section>
    )
}

export default ForgotPassword


