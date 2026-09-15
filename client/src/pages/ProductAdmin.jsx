import React, { useEffect, useState } from 'react'
import { IoSearchOutline } from "react-icons/io5"
import toast from 'react-hot-toast'
import SummaryApi from '../common/SummaryApi'
import Loading from '../components/Loading'
import ProductCardAdmin from '../components/ProductCardAdmin'
import ExportButton from '../components/ExportButton'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportToWord,
  exportToJSON
} from '../utils/exportUtils'

const ProductAdmin = () => {
  const [productData,setProductData] = useState([])
  const [page,setPage] = useState(1)
  const [loading,setLoading] = useState(false)
  const [totalPageCount,setTotalPageCount] = useState(1)
  const [search,setSearch] = useState("")
  const [exporting, setExporting] = useState(false)
  
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

  const handleExport = async (format) => {
    try {
      setExporting(true);
      switch (format) {
        case 'excel':
          await exportToExcel(productData, 'taji-cart-products');
          break;
        case 'pdf':
          exportToPDF(productData, 'taji-cart-products');
          break;
        case 'word':
          exportToWord(productData, 'taji-cart-products');
          break;
        case 'csv':
          exportToCSV(productData, 'taji-cart-products');
          break;
        case 'json':
          exportToJSON(productData, 'taji-cart-products');
          break;
        default:
          break;
      }
      toast.success(`Exported ${productData.length} product${productData.length === 1 ? '' : 's'} as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error?.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

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
    <section className='operations-shell min-h-screen dark:bg-dm-surface'>
        <div className='flex flex-col items-stretch gap-3 border-b border-brown-100 bg-white p-3 shadow-md dark:border-dm-border dark:bg-dm-card sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <h2 className='font-semibold dark:text-white'>Product</h2>
                <div className='flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4'>
                  <div className='flex min-h-[44px] w-full min-w-0 max-w-none items-center gap-3 rounded border border-brown-200 bg-plum-50 px-4 py-2 focus-within:border-plum-500 dark:border-dm-border dark:bg-dm-card-2 dark:focus-within:border-plum-400 sm:max-w-56'>
                    <IoSearchOutline size={25} className="dark:text-white/55"/>
                    <input
                      type='text'
                      placeholder='Search product here ...'
                      className='h-full w-full outline-none bg-transparent dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30'
                      value={search}
                      onChange={handleOnChange}
                    />
                  </div>
                  <ExportButton
                    data={productData}
                    onExport={handleExport}
                    exporting={exporting}
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
