import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import AdminMenu from '../components/AdminMenu'
import UserMenu from '../components/UserMenu'
import isadmin from '../utils/isAdmin'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const isAdmin = isadmin(user)
  const location = useLocation()
  const isPOSFullScreen =
    location.pathname.includes('/dashboard/staff-pos') ||
    location.pathname.includes('/dashboard/sales-counter')
  
  // Render menu based on user role
  const renderMenu = () => {
    if (isAdmin) return <AdminMenu forLightPanel />;
    return <UserMenu variant="sidebar" />;
  };
  
  return (
    <section className={`w-full max-w-full bg-ivory dark:bg-dm-surface transition-colors duration-200 ${isPOSFullScreen ? '' : 'lg:h-[100dvh] lg:overflow-hidden'}`}>
        <div className={`${isPOSFullScreen ? 'grid w-full max-w-full grid-cols-1 p-0' : 'container mx-auto grid w-full max-w-full items-start p-3 lg:h-full lg:grid-cols-[minmax(0,248px)_minmax(0,1fr)] lg:gap-3 lg:overflow-hidden'}`}>
                {!isPOSFullScreen && (
                  <aside className='hidden min-w-0 lg:block lg:h-full lg:overflow-hidden'>
                    <div className='h-full overflow-hidden border-r border-brown-100 pr-2 dark:border-dm-border'>
                      <div className='h-full overflow-x-hidden'>
                          {renderMenu()}
                      </div>
                    </div>
                  </aside>
                )}

                {/**right for content */}
                <div className={`min-w-0 max-w-full overflow-x-hidden bg-white dark:bg-dm-card ${isPOSFullScreen ? 'min-h-[calc(100vh-0px)]' : 'min-h-[75vh] pb-24 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-6'}`}>
                    <Outlet/>
                </div>
        </div>
    </section>
  )
}

export default Dashboard
