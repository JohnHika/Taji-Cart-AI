import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import AdminMenu from '../components/AdminMenu'
import UserMenu from '../components/UserMenu'
import isadmin from '../utils/isAdmin'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const isAdmin = isadmin(user.role)
  const location = useLocation()
  const isPOSFullScreen = location.pathname.includes('/dashboard/staff-pos')

  const renderMenu = () => {
    if (isAdmin) return <AdminMenu />;
    return <UserMenu />;
  };

  return (
    <section className="bg-ivory dark:bg-dm-surface transition-colors duration-200 min-h-[80vh]">
      <div className={isPOSFullScreen
        ? 'w-full p-0 grid grid-cols-1'
        : 'container mx-auto grid lg:grid-cols-[240px,1fr]'
      }>
        {/* Sidebar */}
        {!isPOSFullScreen && (
          <aside className="hidden lg:flex flex-col bg-plum-900 border-r border-plum-800 sticky top-[60px] max-h-[calc(100vh-60px)] overflow-y-auto">
            {/* Sidebar brand monogram */}
            <div className="px-5 py-5 border-b border-plum-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-pill bg-gold-500 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-charcoal text-sm">N</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">Nawiri Hair</p>
                <p className="text-white/40 text-xs">Dashboard</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
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
