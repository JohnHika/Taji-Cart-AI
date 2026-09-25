import React, { useEffect, useRef, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useLocation } from 'react-router-dom'
import noDataImage from '../assets/nothing here yet.webp'
import SummaryApi from '../common/SummaryApi'
import CardLoading from '../components/CardLoading'
import CardProduct from '../components/CardProduct'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const SearchPage = () => {
  const [data,setData] = useState([])
  const [loading,setLoading] = useState(true)
  const loadingArrayCard = new Array(10).fill(null)
  const [page,setPage] = useState(1)
  const [totalPage,setTotalPage] = useState(1)
  
  // Fix search parameter parsing
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const searchText = searchParams.get('q') || ''

  // Incremented per request so a slow response for an older query/page can't
  // overwrite the results of a newer one.
  const latestRequestIdRef = useRef(0)

  const fetchData = async(pageToLoad) => {
    const requestId = ++latestRequestIdRef.current
    const isStale = () => requestId !== latestRequestIdRef.current

    try {
      if (!searchText) {
        // If no search text, don't make the API call
        setData([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      const response = await Axios({
          ...SummaryApi.searchProduct,
          data : {
            search : searchText,
            page : pageToLoad,
          }
      })

      if (isStale()) return

      const { data : responseData } = response

      if(responseData.success){
          if(pageToLoad === 1){
            setData(responseData.data)
          }else{
            setData((preve)=>{
              return[
                ...preve,
                ...responseData.data
              ]
            })
          }
          setTotalPage(responseData.totalPage)
          console.log('Search results:', responseData)
      }
    } catch (error) {
        if (isStale()) return
        console.error('Search error:', error)
        AxiosToastError(error)
    }finally{
      if (!isStale()) setLoading(false)
    }
  }

  useEffect(()=>{
    // Reset page, results and paging info when the search term changes, then
    // load page 1 explicitly (the `page` state is still stale in this render).
    setPage(1)
    setTotalPage(1)
    setData([])
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[searchText])

  // Only fetch more when page changes, but not on searchText change
  useEffect(() => {
    if (page > 1) {
      fetchData(page)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  console.log("Current page:", page, "Search term:", searchText)

  const handleFetchMore = ()=>{
    if(!loading && totalPage > page){
      setPage(preve => preve + 1)
    }
  }

  return (
    <section className='customer-page-shell bg-ivory dark:bg-dm-surface min-h-[80vh]'>
      <div className='mobile-page-shell container mx-auto px-3 sm:px-4 py-4 sm:py-6'>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className='font-semibold text-charcoal dark:text-white text-sm sm:text-base'>
            {searchText ? `Results for "${searchText}": ${data.length}` : 'Enter a search term'}
          </p>
          {loading && <p className="text-sm text-brown-400 dark:text-white/45">Loading...</p>}
        </div>

        <InfiniteScroll
          dataLength={data.length}
          hasMore={page < totalPage}
          next={handleFetchMore}
          loader={
            <div className="text-center py-6 text-sm text-brown-400 dark:text-white/45">
              Loading more...
            </div>
          }
        >
          <div className='grid grid-cols-2 gap-2.5 py-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4'>
            {data.map((p, index) => (
              <CardProduct data={p} key={p?._id + "searchProduct" + index} />
            ))}
            {loading && loadingArrayCard.map((_, index) => (
              <CardLoading key={"loadingsearchpage" + index} />
            ))}
          </div>
        </InfiniteScroll>

        {!data[0] && !loading && (
          <div className='flex flex-col justify-center items-center w-full mx-auto rounded-3xl border border-dashed border-brown-200 px-4 py-10 dark:border-dm-border'>
            <img
              src={noDataImage}
              className='w-full max-w-[220px] sm:max-w-xs block mx-auto'
              alt="No results found"
            />
            <p className='font-semibold my-2 text-charcoal dark:text-white text-center'>
              {searchText ? 'No products match your search' : 'Please enter a search term'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default SearchPage
