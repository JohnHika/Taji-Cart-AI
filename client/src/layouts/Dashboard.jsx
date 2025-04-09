import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import AdminMenu from '../components/AdminMenu'
import UserMenu from '../components/UserMenu'
import isadmin from '../utils/isAdmin'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const isAdmin = isadmin(user.role)
  const isDelivery = user.role === 'delivery'
  
  // Render menu based on user role
  const renderMenu = () => {
    if (isAdmin) return <AdminMenu />;
    if (user.role === 'staff') return <UserMenu />; // Ensure staff users see the correct menu
    return <UserMenu />;
  };
  
  return (
    <section className='bg-white dark:bg-gray-900 transition-colors duration-200'>
        <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>
                {/**left for menu */}
                <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r dark:border-gray-700'>
                    {renderMenu()}
                </div>

                {/**right for content */}
                <div className='bg-white dark:bg-gray-900 min-h-[75vh]'>
                    <Outlet/>
                </div>
        </div>
    </section>
  )
}

export default Dashboard
