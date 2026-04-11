import React, { useEffect, useState } from 'react'
import { IoSearchOutline } from "react-icons/io5"
import SummaryApi from '../common/SummaryApi'
import Loading from '../components/Loading'
import ProductCardAdmin from '../components/ProductCardAdmin'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const ProductAdmin = () => {
  const [productData,setProductData] = useState([])
  const [page,setPage] = useState(1)
  const [loading,setLoading] = useState(false)
  const [totalPageCount,setTotalPageCount] = useState(1)
  const [search,setSearch] = useState("")
  
  const fetchProductData = async()=>{
    try {
        setLoading(true)
        const response = await Axios({
           ...SummaryApi.getProduct,
           data : {
              page : page,
              limit : 12,
              search : search 
           }
        })

        const { data : responseData } = response 

        if(responseData.success){
          setTotalPageCount(responseData.totalNoPage)
          setProductData(responseData.data)
        }

    } catch (error) {
      AxiosToastError(error)
    }finally{
      setLoading(false)
    }
  }
  
  useEffect(()=>{
    fetchProductData()
  },[page])

  const handleNext = ()=>{
    if(page !== totalPageCount){
      setPage(preve => preve + 1)
    }
  }
  const handlePrevious = ()=>{
    if(page > 1){
      setPage(preve => preve - 1)
    }
  }

  const handleOnChange = (e)=>{
    const { value } = e.target
    setSearch(value)
    setPage(1)
  }

  useEffect(()=>{
    let flag = true 

    const interval = setTimeout(() => {
      if(flag){
        fetchProductData()
        flag = false
      }
    }, 300);

    return ()=>{
      clearTimeout(interval)
    }
  },[search])
  
  return (
    <section className='min-h-screen dark:bg-dm-surface'>
        <div className='p-2 bg-white dark:bg-dm-card border-b border-brown-100 dark:border-dm-border shadow-md flex items-center justify-between gap-4'>
                <h2 className='font-semibold dark:text-white'>Product</h2>
                <div className='h-full min-w-24 max-w-56 w-full ml-auto bg-plum-50 dark:bg-dm-card-2 px-4 flex items-center gap-3 py-2 rounded border focus-within:border-plum-500 dark:border-dm-border dark:focus-within:border-plum-400'>
                  <IoSearchOutline size={25} className="dark:text-white/55"/>
                  <input
                    type='text'
                    placeholder='Search product here ...' 
                    className='h-full w-full outline-none bg-transparent dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30'
                    value={search}
                    onChange={handleOnChange}
                  />
                </div>
        </div>
        {
          loading && (
            <Loading/>
          )
        }


        <div className='p-4 bg-plum-50 dark:bg-dm-card/50'>


            <div className='min-h-[55vh]'>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                {
                  productData.map((p,index)=>{
                    return(
                      <ProductCardAdmin 
                        data={p} 
                        fetchProductData={fetchProductData}
                        key={p._id + "admin-product" + index}
                      />
                    )
                  })
                }
              </div>
            </div>
            
            <div className='flex justify-between my-4'>
              <button 
                onClick={handlePrevious} 
                className="border border-plum-300 dark:border-plum-600 px-4 py-1 hover:bg-plum-100 dark:text-white dark:hover:bg-plum-900/40"
              >
                Previous
              </button>
              <button className='w-full bg-slate-100 dark:bg-dm-card-2 dark:text-white'>
                {page}/{totalPageCount}
              </button>
              <button 
                onClick={handleNext} 
                className="border border-plum-300 dark:border-plum-600 px-4 py-1 hover:bg-plum-100 dark:text-white dark:hover:bg-plum-900/40"
              >
                Next
              </button>
            </div>

        </div>
          

      
    </section>
  )
}

export default ProductAdmin
