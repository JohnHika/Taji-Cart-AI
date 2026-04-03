import React, { useEffect, useState } from 'react'
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

  const fetchData = async() => {
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
            page : page,
          }
      })

      const { data : responseData } = response

      if(responseData.success){
          if(responseData.page == 1){
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
        console.error('Search error:', error)
        AxiosToastError(error)
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    // Reset page when search term changes
    setPage(1)
    // Reset data when search term changes
    setData([])
    fetchData()
  },[searchText])

  // Only fetch more when page changes, but not on searchText change
  useEffect(() => {
    if (page > 1) {
      fetchData()
    }
  }, [page])

  console.log("Current page:", page, "Search term:", searchText)

  const handleFetchMore = ()=>{
    if(totalPage > page){
      setPage(preve => preve + 1)
    }
  }

  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-[80vh] transition-colors duration-200">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 pb-4 border-b border-brown-100 dark:border-dm-border">
          <h1 className="text-xl sm:text-2xl font-semibold text-charcoal dark:text-white">
            {searchText ? (
              <>Results for &ldquo;{searchText}&rdquo;</>
            ) : (
              <>Search the shop</>
            )}
          </h1>
          {searchText && (
            <p className="text-sm text-brown-400 dark:text-white/50 mt-1">
              {loading ? 'Searching…' : `${data.length} product${data.length !== 1 ? 's' : ''} found`}
            </p>
          )}
          {!searchText && (
            <p className="text-sm text-brown-400 dark:text-white/50 mt-1">
              Use the search bar above to find wigs, care, and accessories.
            </p>
          )}
        </div>

        <InfiniteScroll
          dataLength={data.length}
          hasMore={page < totalPage}
          next={handleFetchMore}
          loader={
            <div className="text-center py-6 text-sm text-brown-400 dark:text-white/45">
              Loading more…
            </div>
          }
        >
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 py-2 gap-3 sm:gap-4">
              {
                data.map((p,index)=>{
                  return(
                    <CardProduct data={p} key={p?._id+"searchProduct"+index}/>
                  )
                })
              }

            {/***loading data */}
            {
              loading && (
                loadingArrayCard.map((_,index)=>{
                  return(
                    <CardLoading key={"loadingsearchpage"+index}/>
                  )
                })
              )
            }
        </div>
        </InfiniteScroll>

              {!data[0] && !loading && (
                <div className="flex flex-col justify-center items-center w-full mx-auto py-12">
                  <img
                    src={noDataImage}
                    className="w-full max-w-[220px] h-auto object-contain opacity-90"
                    alt=""
                  />
                  <p className="font-semibold text-charcoal dark:text-white mt-4 text-center max-w-sm">
                    {searchText ? 'No products match your search' : 'Type a search to see products'}
                  </p>
                  <p className="text-sm text-brown-400 dark:text-white/45 mt-2 text-center max-w-sm">
                    Try different keywords or browse categories from the home page.
                  </p>
                </div>
              )}
      </div>
    </section>
  )
}

export default SearchPage
