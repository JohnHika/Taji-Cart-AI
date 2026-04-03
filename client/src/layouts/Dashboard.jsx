import React from 'react'
import { useSelector } from 'react-redux'
import { Link, Outlet, useLocation } from 'react-router-dom'
import logoLight from '../assets/hair-logo-light.png'
import logoDark from '../assets/hair-logo-dark.png'
import AdminMenu from '../components/AdminMenu'
import DashboardMobileHeader from '../components/DashboardMobileHeader'
import UserMenu from '../components/UserMenu'
import isadmin from '../utils/isAdmin'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const isAdmin = isadmin(user.role)
  const location = useLocation()
  const isPOSFullScreen = location.pathname.includes('/dashboard/staff-pos')
  /* Plum sidebar is always dark — use light-on-dark mark; fallback if asset missing */
  const sidebarLogo = logoDark
  const handleSidebarLogoError = (e) => {
    if (e.target.dataset.fallback) return
    e.target.dataset.fallback = 'true'
    e.target.src = logoLight
  };

  const renderMenu = () => {
    if (isAdmin) return <AdminMenu />;
    return <UserMenu variant="sidebar" />;
  };

  const dashboardGridClass = isPOSFullScreen
    ? 'w-full p-0 grid grid-cols-1'
    : isAdmin
      ? 'container mx-auto grid lg:grid-cols-[minmax(300px,340px),1fr]'
      : 'container mx-auto grid lg:grid-cols-[minmax(252px,288px),1fr]';

  return (
    <section className="bg-ivory dark:bg-dm-surface transition-colors duration-200 min-h-screen">
      {!isPOSFullScreen && <DashboardMobileHeader />}
      <div className={dashboardGridClass}>
        {/* Sidebar — desktop only; store Header hidden on /dashboard */}
        {!isPOSFullScreen && (
          <aside className="hidden lg:flex flex-col bg-plum-900 border-r border-plum-800 sticky top-0 min-h-screen h-screen max-h-screen w-full min-w-0">
            <div className={`flex-shrink-0 border-b border-plum-800 flex flex-col gap-3 ${isAdmin ? 'px-4 py-5 sm:px-5' : 'px-4 py-5'}`}>
              <Link to="/" className="flex items-center gap-3 group">
                <img
                  src={sidebarLogo}
                  alt="Nawiri Hair"
                  className="h-14 w-auto max-w-[200px] object-contain object-left"
                  onError={handleSidebarLogoError}
                />
              </Link>
              <p className="text-white/40 text-xs">Dashboard</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 pb-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
              {renderMenu()}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className={`bg-ivory dark:bg-dm-surface ${isPOSFullScreen ? 'min-h-screen' : 'min-h-[75vh] p-4 sm:p-6'}`}>
          <Outlet />
        </main>
      </div>
    </section>
  )
}

export default Dashboard
