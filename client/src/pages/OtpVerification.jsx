import React, { useEffect, useRef, useState } from 'react'
import { FaRegEyeSlash } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa6";
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import backgroundImg from '../assets/register.jpeg';

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
        <section 
            className='w-full min-h-screen flex items-center justify-center py-8 px-2 transition-colors duration-200'
            style={{ 
                backgroundImage: `url(${backgroundImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className='bg-white/60 dark:bg-gray-900/80 backdrop-blur-md my-4 w-full max-w-lg mx-auto rounded p-7 shadow-lg transition-colors duration-200'>
                <p className='font-semibold text-lg dark:text-white transition-colors duration-200'>Enter OTP</p>
                <p className='text-gray-600 dark:text-gray-300 text-sm mt-2 transition-colors duration-200'>
                    Please enter the verification code sent to {location?.state?.email}
                </p>
                
                <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='otp' className='dark:text-gray-200 transition-colors duration-200'>Enter Your OTP:</label>
                        <div className='flex items-center gap-2 justify-between mt-3'>
                            {
                                data.map((element,index)=>{
                                    return(
                                        <input
                                            key={"otp"+index}
                                            type='text'
                                            id={`otp-${index}`}
                                            ref={(ref)=>{
                                                inputRef.current[index] = ref
                                                return ref 
                                            }}
                                            value={data[index]}
                                            onChange={(e)=>{
                                                const value = e.target.value
                                                if (/^[0-9]?$/.test(value)) { // Only allow single digit numbers
                                                    const newData = [...data]
                                                    newData[index] = value
                                                    setData(newData)
                                                    
                                                    if(value && index < 5){
                                                        inputRef.current[index+1].focus()
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // Handle backspace to move to previous input
                                                if (e.key === 'Backspace' && !data[index] && index > 0) {
                                                    inputRef.current[index-1].focus()
                                                }
                                                
                                                // Handle arrow keys for navigation
                                                if (e.key === 'ArrowLeft' && index > 0) {
                                                    inputRef.current[index-1].focus()
                                                }
                                                if (e.key === 'ArrowRight' && index < 5) {
                                                    inputRef.current[index+1].focus()
                                                }
                                            }}
                                            maxLength={1}
                                            className='bg-blue-50 dark:bg-gray-800 w-full max-w-16 p-2 border dark:border-gray-700 rounded outline-none focus:border-primary-200 dark:focus:border-primary-300 text-center font-semibold dark:text-white transition-colors duration-200'
                                        />
                                    )
                                })
                            }
                        </div>
                    </div>
             
                    <button 
                        disabled={!valideValue} 
                        className={`${valideValue ? "bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" : "bg-gray-500 dark:bg-gray-600"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-colors duration-200`}
                    >
                        Verify OTP
                    </button>
                </form>

                <div className='flex justify-between items-center flex-wrap gap-2'>
                    <p className='dark:text-gray-300 transition-colors duration-200'>
                        Already have account? <Link to={"/login"} className='font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>Login</Link>
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
                                    setData(["","","","","",""]);
                                }
                            } catch (error) {
                                AxiosToastError(error);
                            }
                        }}
                        className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200'
                    >
                        Resend OTP
                    </button>
                </div>
            </div>
        </section>
    )
}

export default OtpVerification



