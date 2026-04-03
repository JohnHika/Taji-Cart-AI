import React from 'react'
import UserMenu from '../components/UserMenu'
import { IoClose } from "react-icons/io5";

const UserMenuMobile = () => {
  return (
    <section className='bg-ivory dark:bg-dm-surface min-h-screen w-full py-2 transition-colors duration-200'>
        <button onClick={()=>window.history.back()} className='text-charcoal dark:text-white/80 block w-fit ml-auto mr-3 mt-2 hover:text-plum-700 dark:hover:text-plum-200 transition-colors'>
          <IoClose size={25}/>
        </button>
        <div className='container mx-auto px-3 pb-8 max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain'>
           <UserMenu/>
        </div>
    </section>
  )
}

export default UserMenuMobile
