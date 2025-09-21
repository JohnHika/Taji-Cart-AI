import React, { useEffect, useRef, useState } from 'react'
import { Link, } from 'react-router-dom'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardLoading from './CardLoading'
import CardProduct from './CardProduct'
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'

const CategoryWiseProductDisplay = ({ id, name }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const containerRef = useRef()
    const subCategoryData = useSelector(state => state.product.allSubCategory)
    const loadingCardNumber = new Array(6).fill(null)

    const fetchCategoryWiseProduct = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getProductByCategory,
                data: {
                    id: id
                }
            })

            const { data: responseData } = response

            if (responseData.success) {
                setData(responseData.data || [])
            }
        } catch (error) {
            AxiosToastError(error)
            setData([]) // Set empty array on error
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) {
            fetchCategoryWiseProduct()
        }
    }, [id])

    const handleScrollRight = () => {
        if (containerRef.current) {
            containerRef.current.scrollLeft += 200
        }
    }

    const handleScrollLeft = () => {
        if (containerRef.current) {
            containerRef.current.scrollLeft -= 200
        }
    }

    const handleRedirectProductListpage = () => {
        const subcategory = subCategoryData?.find(sub => {
            const filterData = sub.category?.some(c => c._id == id)
            return filterData ? true : null
        })
        if (subcategory && subcategory._id && subcategory.name) {
            return `/${valideURLConvert(name)}-${id}/${valideURLConvert(subcategory.name)}-${subcategory._id}`
        }
        // Fallback to category-only URL when no subcategory is available
        return `/${valideURLConvert(name)}-${id}`
    }

    const redirectURL = handleRedirectProductListpage()

    // Don't render if no id or name
    if (!id || !name) {
        return null
    }
    return (
        <div className='mb-6 sm:mb-8'>
            <div className='container mx-auto px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4'>
                <h3 className='font-semibold text-base sm:text-lg md:text-xl text-gray-800 dark:text-gray-200 truncate'>{name}</h3>
                <Link  
                    to={redirectURL} 
                    className='text-green-600 hover:text-green-400 text-sm sm:text-base font-medium whitespace-nowrap flex-shrink-0'
                >
                    See All
                </Link>
            </div>
            <div className='relative flex items-center'>
                <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 container mx-auto px-2 sm:px-4 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory' ref={containerRef}>
                    {loading ? (
                        loadingCardNumber.map((_, index) => (
                            <CardLoading key={`loading-${id}-${index}`} />
                        ))
                    ) : (
                        data.map((p, index) => (
                            <div key={`product-${p._id || index}`} className='snap-start flex-shrink-0'>
                                <CardProduct data={p} />
                            </div>
                        ))
                    )}
                </div>
                
                {/* Desktop Navigation Arrows */}
                <div className='w-full left-0 right-0 container mx-auto px-2 sm:px-4 absolute hidden lg:flex justify-between pointer-events-none'>
                    <button 
                        onClick={handleScrollLeft} 
                        className='z-10 relative bg-white hover:bg-gray-100 shadow-lg text-lg p-2 rounded-full pointer-events-auto transition-all duration-200 hover:scale-105 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
                    >
                        <FaAngleLeft />
                    </button>
                    <button 
                        onClick={handleScrollRight} 
                        className='z-10 relative bg-white hover:bg-gray-100 shadow-lg p-2 text-lg rounded-full pointer-events-auto transition-all duration-200 hover:scale-105 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
                    >
                        <FaAngleRight />
                    </button>
                </div>
                
                {/* Mobile Scroll Indicators */}
                <div className='absolute top-0 right-0 bottom-0 w-6 sm:w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none lg:hidden'></div>
                <div className='absolute top-0 left-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none lg:hidden'></div>
            </div>
        </div>
    )
}

export default CategoryWiseProductDisplay
