import React from 'react'
import toast from 'react-hot-toast'
import {
    FaBoxOpen,
    FaBullhorn,
    FaGift,
    FaHistory,
    FaLayerGroup,
    FaListAlt,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaShoppingBag,
    FaSignOutAlt,
    FaTachometerAlt,
    FaTrophy,
    FaTruck,
    FaUpload,
    FaUser
} from "react-icons/fa"
import { HiOutlineExternalLink } from "react-icons/hi"
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import isadmin from '../utils/isAdmin'
import Divider from './Divider'

const UserMenu = ({close}) => {
   const user = useSelector((state)=> state.user)
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const isDelivery = user.role === 'delivery'

   const handleLogout = async()=>{
        try {
          const response = await Axios({
             ...SummaryApi.logout
          })
          console.log("logout",response)
          if(response.data.success){
            if(close){
              close()
            }
            dispatch(logout())
            localStorage.clear()
            toast.success(response.data.message)
            navigate("/")
          }
        } catch (error) {
          console.log(error)
          AxiosToastError(error)
        }
   }

   const handleClose = ()=>{
      if(close){
        close()
      }
   }
  return (
    <div className="dark:bg-gray-800 dark:text-gray-200">
      <div className="font-semibold dark:text-white">My Account</div>
      <div className="text-sm flex items-center gap-2">
        <span className="max-w-52 text-ellipsis line-clamp-1">
          {user.name || user.mobile}{" "}
          <span className="text-medium text-red-600 dark:text-red-400">
            {user.role === "admin" ? "(admin)" : ""}
          </span>
          {isDelivery && (
            <span className="text-medium text-blue-600 dark:text-blue-400">
              (delivery)
            </span>
          )}
        </span>
        <Link
          onClick={handleClose}
          to={"/dashboard/profile"}
          className="hover:text-primary-200 dark:hover:text-primary-300"
        >
          <HiOutlineExternalLink size={15} />
        </Link>
      </div>
      
      <Divider />
      
      <div className="text-sm grid gap-1">
        <Link
          onClick={handleClose}
          to={"/dashboard/profile"}
          className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaUser className="mr-2 text-blue-500" /> My Profile
        </Link>

        {/* Delivery specific menu items */}
        {isDelivery && (
          <>
            <Divider />
            <div className="font-semibold dark:text-white px-2 pt-1">Delivery Options</div>
            
            <Link
              onClick={handleClose}
              to="/dashboard/delivery/dashboard"
              className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
            >
              <FaTachometerAlt className="mr-2 text-green-500" /> Delivery Dashboard
            </Link>
            
            <Link
              onClick={handleClose}
              to="/dashboard/delivery/active"
              className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
            >
              <FaTruck className="mr-2 text-yellow-500" /> Active Deliveries
            </Link>
            
            <Link
              onClick={handleClose}
              to="/dashboard/delivery/completed"
              className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
            >
              <FaBoxOpen className="mr-2 text-indigo-500" /> Completed Deliveries
            </Link>
            
            <Link
              onClick={handleClose}
              to="/dashboard/delivery/history"
              className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
            >
              <FaHistory className="mr-2 text-amber-500" /> Delivery History
            </Link>
            
            <Link
              onClick={handleClose}
              to="/dashboard/delivery/map"
              className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
            >
              <FaMapMarkedAlt className="mr-2 text-red-500" /> Map View
            </Link>
            <Divider />
          </>
        )}

        {/* Admin specific menu items */}
        {isadmin(user.role) && (
          <Link
            onClick={handleClose}
            to={"/dashboard/category"}
            className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
          >
            <FaListAlt className="mr-2 text-blue-500" /> Category
          </Link>
        )}

        {isadmin(user.role) && (
          <Link
            onClick={handleClose}
            to={"/dashboard/subcategory"}
            className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
          >
            <FaLayerGroup className="mr-2 text-green-500" /> Sub Category
          </Link>
        )}

        {isadmin(user.role) && (
          <Link
            onClick={handleClose}
            to={"/dashboard/upload-product"}
            className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
          >
            <FaUpload className="mr-2 text-purple-500" /> Upload Product
          </Link>
        )}

        {isadmin(user.role) && (
          <Link
            onClick={handleClose}
            to={"/dashboard/product"}
            className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
          >
            <FaBoxOpen className="mr-2 text-yellow-500" /> Product
          </Link>
        )}

        {isadmin(user.role) && (
          <Link
            onClick={handleClose}
            to={"/dashboard/admin-community-perks"}
            className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
          >
            <FaGift className="mr-2 text-orange-500" /> Manage Community Perks
          </Link>
        )}

        <Link
          onClick={handleClose}
          to={"/dashboard/community-perks"}
          className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaTrophy className="mr-2 text-amber-500" /> Community Perks
        </Link>

        <Link
          onClick={handleClose}
          to={"/dashboard/active-campaigns"}
          className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center relative"
        >
          <FaBullhorn className="mr-2 text-green-500" /> Active Campaigns
          <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 bg-green-500 rounded-full"></span>
        </Link>

        <Link
          onClick={handleClose}
          to={"/dashboard/myorders"}
          className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaShoppingBag className="mr-2 text-indigo-500" /> My Orders
        </Link>

        <Link
          onClick={handleClose}
          to={"/dashboard/address"}
          className="px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaMapMarkerAlt className="mr-2 text-red-500" /> Save Address
        </Link>

        <button
          onClick={handleLogout}
          className="text-left px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaSignOutAlt className="mr-2 text-gray-500" /> Log Out
        </button>
      </div>
    </div>
  )
}

export default UserMenu