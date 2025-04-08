import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaRegEye, FaRegEyeSlash, FaUser } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import backgroundImg from '../assets/register.jpeg';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const Register = () => {
    const [data, setData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [errors, setErrors] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate()

    const validateField = (name, value) => {
        let error = "";
        
        switch(name) {
            case 'name':
                if(value.length > 50) {
                    error = "Name cannot exceed 50 characters";
                } else if(!/^[a-zA-Z\s'.,-]{1,50}$/.test(value) && value) {
                    error = "Name can only contain letters, spaces, and basic punctuation";
                }
                break;
            
            case 'email':
                if(value.length > 100) {
                    error = "Email cannot exceed 100 characters";
                } else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value) {
                    error = "Please enter a valid email address";
                }
                break;
            
            case 'password':
                if(value.length > 100) {
                    error = "Password cannot exceed 100 characters";
                } else if(value && value.length < 8) {
                    error = "Password must be at least 8 characters";
                } else if(!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value) && value) {
                    error = "Password must include letters and numbers";
                }
                break;
                
            case 'confirmPassword':
                if(value !== data.password) {
                    error = "Passwords do not match";
                }
                break;
            
            default:
                break;
        }
        
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Sanitize and restrict input based on field type
        let sanitizedValue = value;
        if (name === 'name') {
            sanitizedValue = value.slice(0, 50); // Max 50 chars
        } else if (name === 'email') {
            sanitizedValue = value.slice(0, 100); // Max 100 chars
        } else if (name === 'password' || name === 'confirmPassword') {
            sanitizedValue = value.slice(0, 100); // Max 100 chars
        }

        // Update the data state
        setData((prev) => ({
            ...prev,
            [name]: sanitizedValue
        }));
        
        // Validate and update errors
        const error = validateField(name, sanitizedValue);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    // Change valideValue to only check if fields are filled, not validation errors
    const valideValue = Object.values(data).every(el => el);

    const handleSubmit = async(e) => {
        e.preventDefault()
        setIsLoading(true);
        
        // Collect all validation errors
        let validationErrors = [];
        
        // Validate name format
        if(!/^[a-zA-Z\s'.,-]{1,50}$/.test(data.name)) {
            validationErrors.push("Name can only contain letters, spaces, and basic punctuation");
        }
        
        // Validate email format
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            validationErrors.push("Please enter a valid email address");
        }
        
        // Check for password length
        if(data.password.length < 8) {
            validationErrors.push("Password must be at least 8 characters");
        }
        
        // Check for password match
        if(data.password !== data.confirmPassword) {
            validationErrors.push("Passwords do not match");
        }
        
        // Check password complexity
        if(!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(data.password)) {
            validationErrors.push("Password must include letters and numbers");
        }
        
        // If we have validation errors, show them as toasts and return
        if(validationErrors.length > 0) {
            validationErrors.forEach(error => toast.error(error));
            setIsLoading(false);
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.register,
                data: data
            })
            
            if(response.data.error) {
                toast.error(response.data.message)
            }

            if(response.data.success) {
                toast.success(response.data.message)
                setData({
                    name: "",
                    email: "",
                    password: "",
                    confirmPassword: ""
                })
                navigate("/login")
            }

        } catch (error) {
            AxiosToastError(error)
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
                <p className="text-center font-semibold text-xl dark:text-white transition-colors duration-200">Welcome to TAJI CART</p>

                <form className='grid gap-4 mt-6' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='name' className="dark:text-gray-200 transition-colors duration-200">Name:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type='text'
                                id='name'
                                autoFocus
                                maxLength={50}
                                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                                name='name'
                                value={data.name}
                                onChange={handleChange}
                                placeholder='Enter your name'
                            />
                            <div className='text-gray-500 dark:text-gray-400 transition-colors duration-200'>
                                <FaUser />
                            </div>
                        </div>
                        {errors.name && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 transition-colors duration-200">{errors.name}</p>
                        )}
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='email' className="dark:text-gray-200 transition-colors duration-200">Email:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type='email'
                                id='email'
                                maxLength={100}
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
                        {errors.email && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 transition-colors duration-200">{errors.email}</p>
                        )}
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='password' className="dark:text-gray-200 transition-colors duration-200">Password:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type={showPassword ? "text" : "password"}
                                id='password'
                                maxLength={100}
                                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                                name='password'
                                value={data.password}
                                onChange={handleChange}
                                placeholder='Enter your password'
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
                        {errors.password && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 transition-colors duration-200">{errors.password}</p>
                        )}
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='confirmPassword' className="dark:text-gray-200 transition-colors duration-200">Confirm Password:</label>
                        <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id='confirmPassword'
                                maxLength={100}
                                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                                name='confirmPassword'
                                value={data.confirmPassword}
                                onChange={handleChange}
                                placeholder='Enter your confirm password'
                            />
                            <div onClick={() => setShowConfirmPassword(preve => !preve)} className='cursor-pointer text-gray-500 dark:text-gray-400 transition-colors duration-200'>
                                {
                                    showConfirmPassword ? (
                                        <FaRegEye />
                                    ) : (
                                        <FaRegEyeSlash />
                                    )
                                }
                            </div>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 transition-colors duration-200">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading || !valideValue} 
                        className={`${
                            isLoading || !valideValue ? "bg-gray-500 dark:bg-gray-600" : "bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                        } text-white py-2 rounded font-semibold my-3 tracking-wide transition-colors duration-200`}
                    >
                        {isLoading ? "Processing..." : "Register"}
                    </button>
                </form>

                <p className="dark:text-gray-300 transition-colors duration-200">
                    Already have account? <Link to={"/login"} className='font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>Login</Link>
                </p>
            </div>
        </section>
    )
}

export default Register