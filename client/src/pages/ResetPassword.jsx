import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { useDispatch } from 'react-redux'; // Add this import
import { Link, useLocation, useNavigate } from 'react-router-dom'
import backgroundImg from '../assets/register.jpeg'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'; // Add this import
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const ResetPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch() // Add this line
  const [data, setData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const valideValue = Object.values(data).every(el => el)

  useEffect(() => {
    if (!(location?.state?.data?.success)) {
      navigate("/")
    }

    if (location?.state?.email) {
      setData((preve) => {
        return {
          ...preve,
          email: location?.state?.email
        }
      })
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target

    setData((preve) => {
      return {
        ...preve,
        [name]: value
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    ///optional 
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New password and confirm password must be same.")
      return
    }

    try {
      const response = await Axios({
        ...SummaryApi.resetPassword,
        data: data
      })

      if (response.data.error) {
        toast.error(response.data.message)
      }

      if (response.data.success) {
        // Complete session termination
        
        // 1. Clear all tokens from localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        // Clear any other auth items you might have
        
        // 2. Reset Redux state
        dispatch(logout())
        
        // 3. Show success toast
        toast.success("Password updated successfully. Please login with your new password.")
        
        // 4. Redirect to login with replace (prevents back navigation)
        navigate("/login", { replace: true })
        
        // 5. Clear form data
        setData({
          email: "",
          newPassword: "",
          confirmPassword: ""
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
        <p className='font-semibold text-lg dark:text-white transition-colors duration-200'>Reset Your Password</p>
        <p className='text-gray-600 dark:text-gray-300 text-sm mt-2 transition-colors duration-200'>
          Create a new password for your account
        </p>
        
        <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
          <div className='grid gap-1'>
            <label htmlFor='newPassword' className='dark:text-gray-200 transition-colors duration-200'>New Password:</label>
            <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
              <input
                type={showPassword ? "text" : "password"}
                id='newPassword'
                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                name='newPassword'
                value={data.newPassword}
                onChange={handleChange}
                placeholder='Enter your new password'
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
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-200'>
              Password must be at least 8 characters and include both letters and numbers
            </p>
          </div>

          <div className='grid gap-1'>
            <label htmlFor='confirmPassword' className='dark:text-gray-200 transition-colors duration-200'>Confirm Password:</label>
            <div className='bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded flex items-center focus-within:border-primary-200 dark:focus-within:border-primary-300 transition-colors duration-200'>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id='confirmPassword'
                className='w-full outline-none bg-transparent dark:text-white transition-colors duration-200'
                name='confirmPassword'
                value={data.confirmPassword}
                onChange={handleChange}
                placeholder='Confirm your new password'
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
            {data.confirmPassword && data.newPassword && data.confirmPassword !== data.newPassword && (
              <p className='text-xs text-red-600 dark:text-red-400 mt-1 transition-colors duration-200'>
                Passwords do not match
              </p>
            )}
          </div>

          <button 
            disabled={!valideValue} 
            className={`${valideValue ? "bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" : "bg-gray-500 dark:bg-gray-600"} text-white py-2 rounded font-semibold my-3 tracking-wide transition-colors duration-200`}
          >
            Change Password
          </button>
        </form>

        <p className="dark:text-gray-300 transition-colors duration-200">
          Already have account? <Link to={"/login"} className='font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200'>Login</Link>
        </p>
      </div>
    </section>
  )
}

export default ResetPassword
