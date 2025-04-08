import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import backgroundImg from '../assets/register.jpeg';

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
                <p className='font-semibold text-lg dark:text-white transition-colors duration-200'>Forgot Password</p>
                <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='email' className="dark:text-gray-200 transition-colors duration-200">Email:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type='email'
                                id='email'
                                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                                name='email'
                                value={data.email}
                                onChange={handleChange}
                                placeholder='Enter your email'
                            />
                            <div className='text-gray-500 dark:text-gray-400 transition-colors duration-200'>
                                <FaEnvelope />
                            </div>
                        </div>
                    </div>
             
                    <button 
                        disabled={!valideValue} 
                        className={`${valideValue ? "bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" : "bg-gray-500 dark:bg-gray-600"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-colors duration-200`}
                    >
                        Send OTP
                    </button>
                </form>

                <p className="dark:text-gray-300 transition-colors duration-200">
                    Already have account? <Link to={"/login"} className='font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>Login</Link>
                </p>
            </div>
        </section>
    )
}

export default ForgotPassword


