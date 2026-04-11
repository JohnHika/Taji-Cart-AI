import React, { useEffect, useRef, useState } from 'react'
import { FaRegEyeSlash } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa6";
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const OtpVerification = () => {
    const [data, setData] = useState(["","","","","",""])
    const navigate = useNavigate()
    const inputRef = useRef([])
    const location = useLocation()

    useEffect(()=>{
        if(!location?.state?.email){
            navigate("/forgot-password")
        }
    },[])

    const valideValue = data.every(el => el)

    const handleSubmit = async(e)=>{
        e.preventDefault()

        try {
            const response = await Axios({
                ...SummaryApi.forgot_password_otp_verification,
                data : {
                    otp : data.join(""),
                    email : location?.state?.email
                }
            })
            
            if(response.data.error){
                toast.error(response.data.message)
            }

            if(response.data.success){
                toast.success(response.data.message)
                setData(["","","","","",""])
                navigate("/reset-password",{
                    state : {
                        data : response.data,
                        email : location?.state?.email
                    }
                })
            }

        } catch (error) {
            console.log('error',error)
            AxiosToastError(error)
        }
    }

    return (
        <section className='w-full min-h-screen flex items-center justify-center py-8 px-3 sm:px-4 bg-ivory dark:bg-dm-surface transition-colors'>
            <div className='bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border my-4 w-full max-w-md mx-auto rounded-card p-6 sm:p-8 shadow-card transition-colors'>
                <h1 className='font-bold text-xl text-charcoal dark:text-white mb-1'>Enter OTP</h1>
                <p className='text-sm text-brown-400 dark:text-white/50 mb-6'>
                    Verification code sent to <span className="font-medium text-charcoal dark:text-white">{location?.state?.email}</span>
                </p>

                <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-charcoal dark:text-white/80'>Verification Code</label>
                        <div className='flex items-center gap-2 justify-between'>
                            {data.map((element, index) => (
                                <input
                                    key={"otp" + index}
                                    type='text'
                                    id={`otp-${index}`}
                                    ref={(ref) => {
                                        inputRef.current[index] = ref
                                        return ref
                                    }}
                                    value={data[index]}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (/^[0-9]?$/.test(value)) {
                                            const newData = [...data]
                                            newData[index] = value
                                            setData(newData)
                                            if (value && index < 5) {
                                                inputRef.current[index + 1].focus()
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Backspace' && !data[index] && index > 0) {
                                            inputRef.current[index - 1].focus()
                                        }
                                        if (e.key === 'ArrowLeft' && index > 0) {
                                            inputRef.current[index - 1].focus()
                                        }
                                        if (e.key === 'ArrowRight' && index < 5) {
                                            inputRef.current[index + 1].focus()
                                        }
                                    }}
                                    maxLength={1}
                                    inputMode='numeric'
                                    className='bg-blush-50 dark:bg-dm-card-2 w-full aspect-square max-w-[48px] sm:max-w-[52px] border border-blush-200 dark:border-dm-border rounded-lg outline-none focus:border-plum-500 focus:ring-2 focus:ring-plum-500/20 text-center text-lg font-bold text-charcoal dark:text-white transition-all'
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        disabled={!valideValue}
                        className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 press ${
                            valideValue
                                ? 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-sm hover:shadow-gold'
                                : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
                        }`}
                    >
                        Verify OTP
                    </button>
                </form>

                <div className='flex flex-wrap justify-between items-center gap-3 mt-6'>
                    <p className='text-sm text-brown-400 dark:text-white/50'>
                        Remember your password?{' '}
                        <Link to="/login" className='font-semibold text-plum-700 dark:text-plum-200 hover:underline underline-offset-2'>Sign in</Link>
                    </p>
                    <button
                        onClick={async () => {
                            try {
                                const response = await Axios({
                                    ...SummaryApi.resend_otp,
                                    data: { email: location?.state?.email }
                                });
                                if (response.data.success) {
                                    toast.success("OTP has been resent");
                                    setData(["", "", "", "", "", ""]);
                                }
                            } catch (error) {
                                AxiosToastError(error);
                            }
                        }}
                        className='text-sm font-semibold text-plum-600 dark:text-plum-300 hover:text-plum-800 dark:hover:text-plum-200 underline underline-offset-2 transition-colors'
                    >
                        Resend OTP
                    </button>
                </div>
            </div>
        </section>
    )
}

export default OtpVerification



