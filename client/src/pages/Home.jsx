import React, { useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa'; // Import FaUsers icon
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import bannerMobile from '../assets/banner-mobile.jpg';
import banner from '../assets/banner1.jpg';
import CategoryWiseProductDisplay from '../components/CategoryWiseProductDisplay';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress';
import UserActiveCampaigns from '../components/UserActiveCampaigns';
import Axios from '../utils/Axios';
import { valideURLConvert } from '../utils/valideURLConvert';

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  useEffect(() => {
    fetchFeaturedCampaign();
  }, []);

  const fetchFeaturedCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        // Get the first active campaign to feature
        setFeaturedCampaign(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching featured campaign:', error);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleRedirectProductListpage = (id,cat)=>{
      console.log(id,cat)
      const subcategory = subCategoryData.find(sub =>{
        const filterData = sub.category.some(c => {
          return c._id == id
        })

        return filterData ? true : null
      })
      const url = `/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory.name)}-${subcategory._id}`

      navigate(url)
      console.log(url)
  }

  return (
   <section className='bg-white dark:bg-gray-900 transition-colors'>
      {/* Banner section - No changes needed */}
      <div className='container mx-auto'>
          <div className={`w-full h-full min-h-48 bg-blue-100 dark:bg-blue-900 rounded ${!banner && "animate-pulse my-2" } `}>
              <img
                src={banner}
                className='w-full h-full hidden lg:block'
                alt='banner' 
              />
              <img
                src={bannerMobile}
                className='w-full h-full lg:hidden'
                alt='banner' 
              />
          </div>
      </div>
      
      {/* Categories section - Horizontally scrollable on mobile */}
      <div className='container mx-auto px-4 my-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-semibold text-gray-800 dark:text-gray-200'>Categories</h2>
          
          {/* Optional: View All button */}
          <Link to="/categories" className='text-primary-200 hover:underline text-sm font-medium'>
            View All
          </Link>
        </div>
        
        {/* Horizontal scrollable container */}
        <div className='relative'>
          {/* The scrollable container */}
          <div className='flex overflow-x-auto pb-4 scrollbar-hide space-x-4 
              scroll-smooth snap-x snap-mandatory lg:flex-wrap lg:justify-center lg:space-x-0 lg:gap-4'>
            {
              loadingCategory ? (
                // Loading placeholders
                new Array(12).fill(null).map((c, index) => (
                  <div 
                    key={index+"loadingcategory"} 
                    className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow animate-pulse flex flex-col items-center 
                        flex-shrink-0 snap-start w-[120px] sm:w-[140px] lg:snap-align-none'
                  >
                    <div className='bg-blue-100 dark:bg-blue-900 w-full aspect-square rounded-md'></div>
                    <div className='bg-blue-100 dark:bg-blue-900 h-4 w-3/4 mt-3 rounded'></div>
                  </div>
                ))
              ) : (
                // Category items
                categoryData.map((cat) => (
                  <div 
                    key={cat._id+"displayCategory"} 
                    className='group bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                        shadow-md hover:shadow-lg rounded-lg p-4 transition-all duration-200 cursor-pointer 
                        flex-shrink-0 snap-start w-[120px] sm:w-[140px] md:w-[140px] lg:snap-align-none
                        flex flex-col items-center'
                    onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  >
                    <div className='w-full aspect-square flex items-center justify-center overflow-hidden 
                          rounded-md bg-gray-50 dark:bg-gray-900 p-2 mb-2'>
                      <img 
                        src={cat.image}
                        alt={cat.name}
                        className='max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300'
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                        }}
                      />
                    </div>
                    <span className='text-center text-sm font-medium text-gray-700 dark:text-gray-300 
                          group-hover:text-primary-200 transition-colors truncate w-full'>
                      {cat.name}
                    </span>
                  </div>
                ))
              )
            }
          </div>
          
          {/* Optional: Gradient fades to indicate more content */}
          <div className='absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent 
              pointer-events-none lg:hidden'></div>
          <div className='absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent 
              pointer-events-none lg:hidden'></div>
        </div>
      </div>

      {/* Community Challenges section */}
      <section className="container mx-auto px-4 py-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold flex items-center">
            <FaUsers className="mr-2 text-primary-200" /> 
            Community Challenges
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Join other shoppers to unlock exclusive rewards!</p>
        </div>
        
        {/* User's active campaigns */}
        <UserActiveCampaigns />
        
        {/* Featured campaign */}
        {loadingCampaign ? (
          <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
        ) : featuredCampaign ? (
          <CommunityCampaignProgress campaign={featuredCampaign} />
        ) : (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400">No active community campaigns at the moment.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Check back soon for new challenges!</p>
          </div>
        )}
      </section>

      {/* Category-wise product display - Keep as is */}
      {
        categoryData?.map((c) => (
          <CategoryWiseProductDisplay 
            key={c?._id+"CategorywiseProduct"} 
            id={c?._id} 
            name={c?.name}
          />
        ))
      }
   </section>
  )
}

export default Home
