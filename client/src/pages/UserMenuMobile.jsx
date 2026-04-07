import React from 'react'
import UserMenu from '../components/UserMenu'
import { IoClose } from "react-icons/io5";

const UserMenuMobile = () => {
  return (
    <section className='min-h-screen bg-gray-50 dark:bg-gray-900 mobile-page-shell'>
        <div className='mobile-surface mx-auto max-w-3xl overflow-hidden'>
          <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95'>
            <div>
              <h1 className='text-lg font-semibold text-gray-900 dark:text-white'>Account menu</h1>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Quick access to profile, orders, rewards, and role tools.</p>
            </div>
            <button onClick={()=>window.history.back()} className='rounded-full p-2 text-neutral-800 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'>
              <IoClose size={22}/>
            </button>
          </div>
          <div className='container mx-auto px-3 py-4 sm:px-4 sm:py-5'>
             <UserMenu/>
          </div>
        </div>
    </section>
  )
}

export default UserMenuMobile
