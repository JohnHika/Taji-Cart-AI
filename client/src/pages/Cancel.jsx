import React from 'react'
import { FaTimesCircle } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const Cancel = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-ivory dark:bg-dm-surface px-4 py-8'>
      <div className='bg-white dark:bg-dm-card p-6 sm:p-8 rounded-card shadow-card border border-brown-100 dark:border-dm-border max-w-md w-full text-center'>
        <FaTimesCircle className='text-red-500 dark:text-red-400 text-6xl mx-auto mb-6' />
        <h1 className='text-2xl font-bold mb-3 text-charcoal dark:text-white'>Order Cancelled</h1>
        <p className='text-sm text-brown-500 dark:text-white/60 mb-6'>
          Your order was not completed. No charge was made — you can try again whenever you&apos;re ready.
        </p>
        <Link
          to='/'
          className='w-full inline-flex items-center justify-center py-3 px-4 rounded-pill text-sm font-semibold border border-brown-200 dark:border-dm-border text-charcoal dark:text-white/80 bg-white dark:bg-dm-card hover:bg-plum-50 dark:hover:bg-plum-900/20 transition-colors press'
        >
          Go To Home
        </Link>
      </div>
    </div>
  )
}

export default Cancel
