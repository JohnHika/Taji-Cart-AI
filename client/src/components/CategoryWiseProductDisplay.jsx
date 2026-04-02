import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { valideURLConvert } from '../utils/valideURLConvert'
import CardLoading from './CardLoading'
import CardProduct from './CardProduct'

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
                data: { id }
            })
            const { data: responseData } = response
            if (responseData.success) {
                setData(responseData.data || [])
            }
        } catch (error) {
            AxiosToastError(error)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) fetchCategoryWiseProduct()
    }, [id])

    const handleScrollRight = () => {
        if (containerRef.current) containerRef.current.scrollLeft += 220
    }
    const handleScrollLeft = () => {
        if (containerRef.current) containerRef.current.scrollLeft -= 220
    }

    const handleRedirectProductListpage = () => {
        const subcategory = subCategoryData?.find(sub =>
            sub.category?.some(c => c._id == id)
        )
        if (subcategory?._id && subcategory?.name) {
            return `/${valideURLConvert(name)}-${id}/${valideURLConvert(subcategory.name)}-${subcategory._id}`
        }
        return `/${valideURLConvert(name)}-${id}`
    }

    const redirectURL = handleRedirectProductListpage()

    if (!id || !name) return null

    return (
        <div className="mb-8 sm:mb-10">
            {/* Section heading */}
            <div className="container mx-auto px-3 sm:px-4 flex items-end justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-semibold text-lg sm:text-xl text-charcoal dark:text-white leading-tight">
                        {name}
                    </h3>
                    <p className="font-display italic text-sm text-plum-500 dark:text-plum-300 mt-0.5 hidden sm:block">
                        Curated for you
                    </p>
                </div>
                <Link
                    to={redirectURL}
                    className="text-sm font-semibold text-gold-600 dark:text-gold-300 hover:text-gold-500 underline underline-offset-2 whitespace-nowrap flex-shrink-0 transition-colors"
                >
                    See All
                </Link>
            </div>

            {/* Cards row */}
            <div className="relative flex items-center">
                <div
                    ref={containerRef}
                    className="flex gap-3 sm:gap-4 container mx-auto px-3 sm:px-4 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
                >
                    {loading
                        ? loadingCardNumber.map((_, i) => (
                            <div key={`loading-${id}-${i}`} className="snap-start flex-shrink-0">
                                <CardLoading />
                            </div>
                        ))
                        : data.map((p, i) => (
                            <div key={`product-${p._id || i}`} className="snap-start flex-shrink-0">
                                <CardProduct data={p} />
                            </div>
                        ))
                    }
                </div>

                {/* Desktop nav arrows */}
                <div className="w-full left-0 right-0 container mx-auto px-3 sm:px-4 absolute hidden lg:flex justify-between pointer-events-none">
                    <button
                        onClick={handleScrollLeft}
                        className="z-10 relative bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border shadow-card text-plum-700 dark:text-plum-200 p-2 rounded-full pointer-events-auto transition-all duration-200 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:shadow-hover"
                    >
                        <FaAngleLeft />
                    </button>
                    <button
                        onClick={handleScrollRight}
                        className="z-10 relative bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border shadow-card text-plum-700 dark:text-plum-200 p-2 rounded-full pointer-events-auto transition-all duration-200 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:shadow-hover"
                    >
                        <FaAngleRight />
                    </button>
                </div>

                {/* Edge fades */}
                <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-ivory dark:from-dm-surface to-transparent pointer-events-none lg:hidden" />
                <div className="absolute top-0 left-0 bottom-0 w-10 bg-gradient-to-r from-ivory dark:from-dm-surface to-transparent pointer-events-none lg:hidden" />
            </div>
        </div>
    )
}

export default CategoryWiseProductDisplay
