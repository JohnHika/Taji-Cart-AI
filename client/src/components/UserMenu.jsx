import React from 'react'
import toast from 'react-hot-toast'
import {
    FaBoxes, FaBoxOpen, FaBullhorn, FaClipboardCheck, FaGift,
    FaHistory, FaLayerGroup, FaListAlt, FaMapMarkedAlt, FaMapMarkerAlt,
    FaQrcode, FaShoppingBag, FaSignOutAlt, FaTachometerAlt, FaTrophy,
    FaTruck, FaUpload, FaUser, FaUserTie
} from "react-icons/fa"
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import isadmin from '../utils/isAdmin'
import isStaff from '../utils/isStaff'

const UserMenu = ({ close }) => {
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAdmin = isadmin(user.role)
  const isDelivery = user.role === 'delivery'
  const isUserStaff = isStaff(user)
  const showStaffFunctions = isUserStaff && !isAdmin

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout })
      if (response.data.success) {
        if (close) close()
        dispatch(logout())
        localStorage.clear()
        toast.success(response.data.message)
        navigate("/")
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const handleClose = () => { if (close) close() }

  const itemClass = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
  const sectionLabel = "text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 px-3 py-1 mt-2"

  return (
    <div className="min-w-[220px]">
      {/* User info */}
      <div className="px-3 py-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-pill bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal dark:text-white truncate">{user.name || user.mobile}</p>
            {isAdmin && <span className="text-xs bg-gold-100 dark:bg-gold-600/20 text-gold-600 dark:text-gold-300 px-1.5 py-0.5 rounded font-medium">Admin</span>}
            {isDelivery && <span className="text-xs bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200 px-1.5 py-0.5 rounded font-medium">Delivery</span>}
            {showStaffFunctions && <span className="text-xs bg-blush-100 dark:bg-blush-400/20 text-blush-500 dark:text-blush-300 px-1.5 py-0.5 rounded font-medium">Staff</span>}
          </div>
        </div>
      </div>

      <div className="h-px bg-brown-100 dark:bg-dm-border mb-1" />

      <div className="flex flex-col gap-0.5">
        <Link onClick={handleClose} to="/dashboard/profile" className={itemClass}>
          <FaUser size={13} className="text-plum-400 flex-shrink-0" /> My Profile
        </Link>

        {showStaffFunctions && (
          <Link onClick={handleClose} to="/dashboard/staff" className={itemClass}>
            <FaUserTie size={13} className="text-plum-400 flex-shrink-0" /> Staff Dashboard
          </Link>
        )}

        {isDelivery && (
          <>
            <div className={sectionLabel}>Delivery</div>
            <Link onClick={handleClose} to="/dashboard/delivery/dashboard" className={itemClass}>
              <FaTachometerAlt size={13} className="text-plum-400 flex-shrink-0" /> Delivery Dashboard
            </Link>
            <Link onClick={handleClose} to="/dashboard/delivery/active" className={itemClass}>
              <FaTruck size={13} className="text-plum-400 flex-shrink-0" /> Active Deliveries
            </Link>
            <Link onClick={handleClose} to="/dashboard/delivery/completed" className={itemClass}>
              <FaBoxOpen size={13} className="text-plum-400 flex-shrink-0" /> Completed Deliveries
            </Link>
            <Link onClick={handleClose} to="/dashboard/delivery/history" className={itemClass}>
              <FaHistory size={13} className="text-plum-400 flex-shrink-0" /> Delivery History
            </Link>
            <Link onClick={handleClose} to="/dashboard/delivery/map" className={itemClass}>
              <FaMapMarkedAlt size={13} className="text-plum-400 flex-shrink-0" /> Map View
            </Link>
            <div className="h-px bg-brown-100 dark:bg-dm-border my-1" />
          </>
        )}

        {isAdmin && (
          <>
            <Link onClick={handleClose} to="/dashboard/category" className={itemClass}><FaListAlt size={13} className="text-plum-400 flex-shrink-0" /> Category</Link>
            <Link onClick={handleClose} to="/dashboard/subcategory" className={itemClass}><FaLayerGroup size={13} className="text-plum-400 flex-shrink-0" /> Sub Category</Link>
            <Link onClick={handleClose} to="/dashboard/upload-product" className={itemClass}><FaUpload size={13} className="text-plum-400 flex-shrink-0" /> Upload Product</Link>
            <Link onClick={handleClose} to="/dashboard/product" className={itemClass}><FaBoxOpen size={13} className="text-plum-400 flex-shrink-0" /> Product</Link>
            <Link onClick={handleClose} to="/dashboard/admin-community-perks" className={itemClass}><FaGift size={13} className="text-plum-400 flex-shrink-0" /> Manage Perks</Link>
          </>
        )}

        <Link onClick={handleClose} to="/dashboard/community-perks" className={itemClass}>
          <FaTrophy size={13} className="text-gold-500 flex-shrink-0" /> Community Perks
        </Link>
        <Link onClick={handleClose} to="/dashboard/active-campaigns" className={itemClass}>
          <FaBullhorn size={13} className="text-plum-400 flex-shrink-0" /> Active Campaigns
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        </Link>
        <Link onClick={handleClose} to="/dashboard/myorders" className={itemClass}>
          <FaShoppingBag size={13} className="text-plum-400 flex-shrink-0" /> My Orders
        </Link>
        <Link onClick={handleClose} to="/dashboard/address" className={itemClass}>
          <FaMapMarkerAlt size={13} className="text-plum-400 flex-shrink-0" /> My Addresses
        </Link>

        {showStaffFunctions && (
          <>
            <div className="h-px bg-brown-100 dark:bg-dm-border my-1" />
            <div className={sectionLabel}>Staff Functions</div>
            <Link onClick={handleClose} to="/dashboard/staff/verify-pickup" className={itemClass}><FaQrcode size={13} className="text-plum-400 flex-shrink-0" /> Verify Pickup</Link>
            <Link onClick={handleClose} to="/dashboard/staff/pending-pickups" className={itemClass}><FaBoxes size={13} className="text-plum-400 flex-shrink-0" /> Pending Pickups</Link>
            <Link onClick={handleClose} to="/dashboard/staff/completed-verifications" className={itemClass}><FaClipboardCheck size={13} className="text-plum-400 flex-shrink-0" /> Verification History</Link>
          </>
        )}

        <div className="h-px bg-brown-100 dark:bg-dm-border my-1" />
        <button onClick={handleLogout} className={`${itemClass} w-full text-left`}>
          <FaSignOutAlt size={13} className="text-brown-300 flex-shrink-0" /> Log Out
        </button>
      </div>
    </div>
  )
}

export default UserMenu
