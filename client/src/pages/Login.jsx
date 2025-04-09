import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import backgroundImg from '../assets/register.jpeg';
import SummaryApi from '../common/SummaryApi';
import { fetchCartItems } from '../redux/slice/cartSlice';
import { setUserDetails } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import fetchUserDetails from '../utils/fetchUserDetails';

const Login = () => {
    const [data, setData] = useState({
        email: "",
        password: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate()
    const dispatch = useDispatch()

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
        setIsLoading(true);

        try {
            const response = await Axios({
                ...SummaryApi.login,
                data: data
            })
            
            if(response.data.error) {
                // Enhanced error messaging for login failures
                toast.error(response.data.message || "Login failed. Please check your credentials.");
                setIsLoading(false);
                return;
            }

            if(response.data.success) {
                console.log("Login successful, user data:", response.data.data);
                
                // Store tokens in sessionStorage for security
                sessionStorage.setItem('accesstoken', response.data.data.accesstoken)
                sessionStorage.setItem('refreshToken', response.data.data.refreshToken)

                // Start the auto-refresh timer to maintain the session
                if (window.setupRefreshTimer) {
                    window.setupRefreshTimer();
                }

                const userDetails = await fetchUserDetails()
                console.log("User details retrieved:", userDetails);
                
                // Set user details in Redux store with role information
                dispatch(setUserDetails({
                    ...userDetails.data,
                    // Ensure role information is prominently available
                    accountType: userDetails.data.role || 
                                 (userDetails.data.isAdmin ? 'admin' : 
                                  userDetails.data.isDelivery ? 'delivery' : 
                                  userDetails.data.isStaff ? 'staff' : 'customer')
                }))
                
                dispatch(fetchCartItems())
                
                setData({
                    email : "",
                    password : "",
                })
                
                toast.success(response.data.message)
                
                // Redirect to home page instead of dashboard
                navigate("/")
            }
        } catch (error) {
            // Handle different login error scenarios with appropriate messages
            if (error.response?.status === 400) {
                if (error.response?.data?.message === "Incorrect password") {
                    toast.error("Incorrect password. Please try again.");
                } else if (error.response?.data?.message === "User not registered") {
                    toast.error("Email not registered. Please check your email or create an account.");
                } else {
                    toast.error(error.response?.data?.message || "Login failed. Please check your credentials.");
                }
            } else {
                // Use the general error handler for other error types
                AxiosToastError(error);
            }
        } finally {
            setIsLoading(false);
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
                <h1 className="text-2xl font-bold text-center mb-6 dark:text-white transition-colors duration-200">Login to TAJI CART</h1>
                
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
                                autoComplete="email"
                            />
                            <div className='text-gray-500 dark:text-gray-400 transition-colors duration-200'>
                                <FaEnvelope />
                            </div>
                        </div>
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='password' className="dark:text-gray-200 transition-colors duration-200">Password:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type={showPassword ? "text" : "password"}
                                id='password'
                                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                                name='password'
                                value={data.password}
                                onChange={handleChange}
                                placeholder='Enter your password'
                                autoComplete="current-password"
                            />
                            <div onClick={() => setShowPassword(preve => !preve)} className='cursor-pointer text-gray-500 dark:text-gray-400 transition-colors duration-200'>
                                {
                                    showPassword ? (
                                        <FaRegEye />
                                    ) : (
                                        <FaRegEyeSlash />
                                    )
                                }
                            </div>
                        </div>
                        <Link to={"/forgot-password"} className='block ml-auto text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>
                            Forgot password?
                        </Link>
                    </div>
    
                    <button 
                        disabled={!valideValue || isLoading} 
                        className={`${valideValue && !isLoading ? "bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" : "bg-gray-500 dark:bg-gray-600"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-colors duration-200`}>
                        {isLoading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="dark:text-gray-300 transition-colors duration-200">
                    Don't have account? <Link to={"/register"} className='font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>Register</Link>
                </p>
            </div>
        </section>
    )
}

export default Login

