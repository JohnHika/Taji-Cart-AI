import React from 'react'
import toast from 'react-hot-toast'
import {
    FaBoxes, FaBoxOpen, FaBullhorn, FaClipboardCheck, FaCrown, FaGift,
    FaHistory, FaLayerGroup, FaListAlt, FaMapMarkedAlt, FaMapMarkerAlt,
    FaQrcode, FaShoppingBag, FaSignOutAlt, FaTachometerAlt, FaTrophy,
    FaTruck, FaUpload, FaUser, FaUserTie
} from "react-icons/fa"
import { FiGrid, FiPackage } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import isadmin from '../utils/isAdmin'
import isStaff from '../utils/isStaff'

const UserMenu = ({ close, variant = 'dropdown' }) => {
  const user = useSelector(state => state.user)
  const location = useLocation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAdmin = isadmin(user.role)
  const isDelivery = user.role === 'delivery'
  const isUserStaff = isStaff(user)
  const showStaffFunctions = isUserStaff && !isAdmin
  const isSidebar = variant === 'sidebar'

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

  const isPathActive = (to, exact) => {
    if (exact) return location.pathname === to || location.pathname === `${to}/`
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  const sidebarLink = (to, exact) => {
    const active = isPathActive(to, exact)
    return `flex items-center gap-2.5 px-4 py-2.5 rounded-pill text-sm font-medium transition-all duration-200 mx-2 mb-1 border ${
      active
        ? 'bg-plum-700 text-white border-gold-500/60 shadow-inner ring-1 ring-gold-400/30'
        : 'text-white/75 border-transparent hover:bg-plum-800/90 hover:text-white hover:border-plum-600'
    }`
  }

  const itemClassDropdown = "flex items-center gap-2.5 px-3 py-2 rounded-pill text-sm text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
  const sectionLabelDropdown = "text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 px-3 py-1 mt-2"
  const sectionLabelSidebar = "text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45 px-4 py-2 mt-2 mb-0.5"

  const NavLink = ({ to, icon: Icon, iconClass, children, exact }) => {
    if (isSidebar) {
      return (
        <Link onClick={handleClose} to={to} className={sidebarLink(to, exact)}>
          <Icon size={14} className={`flex-shrink-0 ${iconClass || 'text-gold-400/90'}`} />
          <span className="truncate text-left flex-1 min-w-0">{children}</span>
        </Link>
      )
    }
    return (
      <Link onClick={handleClose} to={to} className={itemClassDropdown}>
        <Icon size={13} className={iconClass || 'text-plum-400 flex-shrink-0'} />
        {children}
      </Link>
    )
  }

  const sectionLabel = isSidebar ? sectionLabelSidebar : sectionLabelDropdown

  return (
    <div className={isSidebar ? 'min-w-0 w-full px-1' : 'min-w-[220px]'}>
      <div className={isSidebar ? 'px-3 py-2 mb-2 border-b border-plum-800/80' : 'px-3 py-2 mb-2'}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-pill flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
            isSidebar
              ? 'bg-plum-700 text-gold-200 border-plum-500'
              : 'bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200'
          }`}>
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isSidebar ? 'text-white' : 'text-charcoal dark:text-white'}`}>{user.name || user.mobile}</p>
            {isAdmin && <span className="text-xs bg-gold-500/25 text-gold-200 px-2 py-0.5 rounded-pill font-medium">Admin</span>}
            {isDelivery && <span className={`text-xs px-2 py-0.5 rounded-pill font-medium ${isSidebar ? 'bg-plum-700 text-plum-100' : 'bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200'}`}>Delivery</span>}
            {showStaffFunctions && <span className={`text-xs px-2 py-0.5 rounded-pill font-medium ${isSidebar ? 'bg-blush-500/20 text-blush-200' : 'bg-blush-100 dark:bg-blush-400/20 text-blush-500 dark:text-blush-300'}`}>Staff</span>}
          </div>
        </div>
      </div>

      <div className="mb-1">
        <p className={sectionLabel}>Browse</p>
        <div className={`flex flex-col ${isSidebar ? 'gap-1' : 'gap-0.5'}`}>
          <NavLink to="/" icon={FiGrid} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'} exact>Shop</NavLink>
          <NavLink to="/collections" icon={FiPackage} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Collections</NavLink>
          <NavLink to="/dashboard/loyalty-program" icon={FaCrown} iconClass="text-gold-400 flex-shrink-0">Loyalty Program</NavLink>
        </div>
      </div>

      <div className={`h-px mb-1 ${isSidebar ? 'bg-plum-700 mx-3' : 'bg-brown-100 dark:bg-dm-border'}`} />

      <div className={`flex flex-col ${isSidebar ? 'gap-1' : 'gap-0.5'}`}>
        <NavLink to="/dashboard/profile" icon={FaUser} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>My Profile</NavLink>

        {showStaffFunctions && (
          <NavLink to="/dashboard/staff" icon={FaUserTie} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Staff Dashboard</NavLink>
        )}

        {isDelivery && (
          <>
            <p className={sectionLabel}>Delivery</p>
            <NavLink to="/dashboard/delivery/dashboard" icon={FaTachometerAlt} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Delivery Dashboard</NavLink>
            <NavLink to="/dashboard/delivery/active" icon={FaTruck} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Active Deliveries</NavLink>
            <NavLink to="/dashboard/delivery/completed" icon={FaBoxOpen} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Completed Deliveries</NavLink>
            <NavLink to="/dashboard/delivery/history" icon={FaHistory} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Delivery History</NavLink>
            <NavLink to="/dashboard/delivery/map" icon={FaMapMarkedAlt} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Map View</NavLink>
            <div className={`h-px my-1 ${isSidebar ? 'bg-plum-700 mx-3' : 'bg-brown-100 dark:bg-dm-border'}`} />
          </>
        )}

        {isAdmin && (
          <>
            <NavLink to="/dashboard/category" icon={FaListAlt} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Category</NavLink>
            <NavLink to="/dashboard/subcategory" icon={FaLayerGroup} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Sub Category</NavLink>
            <NavLink to="/dashboard/upload-product" icon={FaUpload} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Upload Product</NavLink>
            <NavLink to="/dashboard/product" icon={FaBoxOpen} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Product</NavLink>
            <NavLink to="/dashboard/admin-community-perks" icon={FaGift} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Manage Perks</NavLink>
          </>
        )}

        <NavLink to="/dashboard/community-perks" icon={FaTrophy} iconClass="text-gold-400 flex-shrink-0">Community perks</NavLink>
        <Link
          onClick={handleClose}
          to="/dashboard/active-campaigns"
          className={isSidebar ? sidebarLink('/dashboard/active-campaigns') : itemClassDropdown}
        >
          <FaBullhorn size={isSidebar ? 14 : 13} className={isSidebar ? 'text-gold-400 flex-shrink-0' : 'text-plum-400 flex-shrink-0'} />
          <span className={isSidebar ? 'truncate flex-1 text-left' : ''}>Active Campaigns</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </Link>
        <NavLink to="/dashboard/myorders" icon={FaShoppingBag} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>My Orders</NavLink>
        <NavLink to="/dashboard/address" icon={FaMapMarkerAlt} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>My Addresses</NavLink>

        {showStaffFunctions && (
          <>
            <div className={`h-px my-1 ${isSidebar ? 'bg-plum-700 mx-3' : 'bg-brown-100 dark:bg-dm-border'}`} />
            <p className={sectionLabel}>Staff Functions</p>
            <NavLink to="/dashboard/staff/verify-pickup" icon={FaQrcode} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Verify Pickup</NavLink>
            <NavLink to="/dashboard/staff/pending-pickups" icon={FaBoxes} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Pending Pickups</NavLink>
            <NavLink to="/dashboard/staff/completed-verifications" icon={FaClipboardCheck} iconClass={isSidebar ? 'text-gold-400' : 'text-plum-400 flex-shrink-0'}>Verification History</NavLink>
          </>
        )}

        <div className={`h-px my-1 ${isSidebar ? 'bg-plum-700 mx-3' : 'bg-brown-100 dark:bg-dm-border'}`} />
        <button
          type="button"
          onClick={handleLogout}
          className={
            isSidebar
              ? 'flex items-center gap-2.5 px-4 py-2.5 rounded-pill text-sm font-medium transition-all duration-200 mx-2 mb-1 border border-transparent text-white/65 hover:bg-plum-800/90 hover:text-white hover:border-plum-600 w-full text-left'
              : `${itemClassDropdown} w-full text-left`
          }
        >
          <FaSignOutAlt size={isSidebar ? 14 : 13} className={isSidebar ? 'text-white/60 flex-shrink-0' : 'text-brown-300 flex-shrink-0'} />
          Log Out
        </button>
      </div>
    </div>
  )
}

export default UserMenu
