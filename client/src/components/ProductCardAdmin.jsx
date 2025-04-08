import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { IoClose } from 'react-icons/io5'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import EditProductAdmin from './EditProductAdmin'

const ProductCardAdmin = ({ data, fetchProductData }) => {
  const [editOpen, setEditOpen] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)

  const handleDeleteCancel = () => {
    setOpenDelete(false)
  }

  const handleDelete = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.deleteProduct,
        data: {
          _id: data._id
        }
      })

      const { data: responseData } = response

      if (responseData.success) {
        toast.success(responseData.message)
        if (fetchProductData) {
          fetchProductData()
        }
        setOpenDelete(false)
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <div className='w-full p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
      <div className='h-40 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-lg mb-3'>
        <img
          src={data?.image[0]}
          alt={data?.name}
          className='w-full h-full object-cover object-center'
          onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image' }}
        />
      </div>
      <h3 className='truncate font-medium text-gray-800 dark:text-white mb-1'>{data?.name || 'Product Name'}</h3>
      <p className='text-sm capitalize truncate text-slate-500 dark:text-gray-300 mb-3'>{data?.unit || 'Unit'}</p>
      <div className='flex gap-2 py-2'>
        <button
          onClick={() => setEditOpen(true)}
          className='flex-1 border px-2 py-1.5 text-sm font-medium border-green-600 bg-green-100 text-green-800 hover:bg-green-200 rounded-md transition-colors
                   dark:bg-green-900/30 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-800/50'
        >
          Edit
        </button>
        <button
          onClick={() => setOpenDelete(true)}
          className='flex-1 border px-2 py-1.5 text-sm font-medium border-red-600 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors
                   dark:bg-red-900/30 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-800/50'
        >
          Delete
        </button>
      </div>

      {
        editOpen && (
          <EditProductAdmin fetchProductData={fetchProductData} data={data} close={() => setEditOpen(false)} />
        )
      }

      {
        openDelete && (
          <section className='fixed top-0 left-0 right-0 bottom-0 bg-neutral-600 dark:bg-gray-900/80 z-50 bg-opacity-70 p-4 flex justify-center items-center'>
            <div className='bg-white dark:bg-gray-800 p-4 w-full max-w-md rounded-md shadow-lg'>
              <div className='flex items-center justify-between gap-4'>
                <h3 className='font-semibold dark:text-gray-100'>Permanent Delete</h3>
                <button onClick={() => setOpenDelete(false)} className='dark:text-gray-300 hover:dark:bg-gray-700 rounded-full p-1'>
                  <IoClose size={25} />
                </button>
              </div>
              <p className='my-2 dark:text-gray-300'>Are you sure want to delete permanent ?</p>
              <div className='flex justify-end gap-5 py-4'>
                <button
                  onClick={handleDeleteCancel}
                  className='border px-3 py-1 rounded bg-red-100 border-red-500 text-red-500 hover:bg-red-200
                                 dark:bg-red-900/30 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-800/40'
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className='border px-3 py-1 rounded bg-green-100 border-green-500 text-green-500 hover:bg-green-200
                                 dark:bg-green-900/30 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-800/40'
                >
                  Delete
                </button>
              </div>
            </div>
          </section>
        )
      }
    </div>
  )
}

export default ProductCardAdmin
