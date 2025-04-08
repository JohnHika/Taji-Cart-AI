import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import AdminMenu from '../components/AdminMenu'
import UserMenu from '../components/UserMenu'
import isadmin from '../utils/isAdmin'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const isAdmin = isadmin(user.role)
  
  return (
    <section className='bg-white'>
        <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]  '>
                {/**left for menu */}
                <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r'>
                    {isAdmin ? <AdminMenu /> : <UserMenu />}
                </div>

                {/**right for content */}
                <div className='bg-white min-h-[75vh] '>
                    <Outlet/>
                </div>
        </div>
    </section>
  )
}

export default Dashboard
