import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { useDispatch } from 'react-redux'; // Add this import
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
    <section className='w-full min-h-screen flex items-center justify-center py-8 px-3 sm:px-4 bg-ivory dark:bg-dm-surface transition-colors'>
      <div className='bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border my-4 w-full max-w-md mx-auto rounded-card p-6 sm:p-8 shadow-card transition-colors'>
        <h1 className='font-bold text-xl text-charcoal dark:text-white mb-1'>Reset Your Password</h1>
        <p className='text-sm text-brown-400 dark:text-white/50 mb-5'>Create a strong new password for your account.</p>

        <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
          <div className='flex flex-col gap-1.5'>
            <label htmlFor='newPassword' className='text-sm font-medium text-charcoal dark:text-white/80'>New Password</label>
            <div className='flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all'>
              <input
                type={showPassword ? "text" : "password"}
                id='newPassword'
                className='flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30'
                name='newPassword'
                value={data.newPassword}
                onChange={handleChange}
                placeholder='Min. 8 characters'
                autoComplete='new-password'
              />
              <button type='button' onClick={() => setShowPassword(p => !p)} className='text-brown-300 dark:text-white/30 hover:text-plum-700 dark:hover:text-plum-200 transition-colors'>
                {showPassword ? <FaRegEye size={14} /> : <FaRegEyeSlash size={14} />}
              </button>
            </div>
            <p className='text-xs text-brown-400 dark:text-white/40'>Must be at least 8 characters with letters and numbers</p>
          </div>

          <div className='flex flex-col gap-1.5'>
            <label htmlFor='confirmPassword' className='text-sm font-medium text-charcoal dark:text-white/80'>Confirm Password</label>
            <div className='flex items-center gap-2 bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-card px-3 py-2.5 focus-within:border-plum-500 focus-within:ring-1 focus-within:ring-plum-500/20 transition-all'>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id='confirmPassword'
                className='flex-1 bg-transparent outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30'
                name='confirmPassword'
                value={data.confirmPassword}
                onChange={handleChange}
                placeholder='Repeat your password'
                autoComplete='new-password'
              />
              <button type='button' onClick={() => setShowConfirmPassword(p => !p)} className='text-brown-300 dark:text-white/30 hover:text-plum-700 dark:hover:text-plum-200 transition-colors'>
                {showConfirmPassword ? <FaRegEye size={14} /> : <FaRegEyeSlash size={14} />}
              </button>
            </div>
            {data.confirmPassword && data.newPassword && data.confirmPassword !== data.newPassword && (
              <p className='text-xs text-red-500 dark:text-red-400'>Passwords do not match</p>
            )}
          </div>

          <button
            disabled={!valideValue}
            className={`w-full py-3 rounded-pill font-semibold text-sm transition-all duration-200 press mt-1 ${
              valideValue
                ? 'bg-gold-500 hover:bg-gold-400 text-charcoal shadow-sm hover:shadow-gold'
                : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
            }`}
          >
            Change Password
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

export default ResetPassword
