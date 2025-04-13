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
    <section className='bg-white dark:bg-gray-900 min-h-[80vh]'>
      <div className='container mx-auto p-4'>
        <div className="flex justify-between items-center mb-4">
          <p className='font-semibold text-gray-800 dark:text-gray-200'>
            {searchText ? `Search Results for "${searchText}": ${data.length}` : 'Enter search term'}
          </p>
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
        </div>

        <InfiniteScroll
              dataLength={data.length}
              hasMore={page < totalPage}
              next={handleFetchMore}
              loader={<div className="text-center py-4">Loading more...</div>}
        >
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 py-4 gap-4'>
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

              {
                //no data 
                !data[0] && !loading && (
                  <div className='flex flex-col justify-center items-center w-full mx-auto'>
                    <img
                      src={noDataImage} 
                      className='w-full h-full max-w-xs max-h-xs block'
                      alt="No results found"
                    />
                    <p className='font-semibold my-2 text-gray-800 dark:text-gray-200'>
                      {searchText ? 'No products match your search' : 'Please enter a search term'}
                    </p>
                  </div>
                )
              }
      </div>
    </section>
  )
}

export default SearchPage
