import React, { useCallback, useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import bannerMobile from "../assets/bannermobile.jpg";
import banner from "../assets/banner.png";
import SummaryApi from "../common/SummaryApi";
import CategoryWiseProductDisplay from '../components/CategoryWiseProductDisplay';
import CommunityCampaignProgress from "../components/CommunityCampaignProgress";
import UserActiveCampaigns from "../components/UserActiveCampaigns";
import { setAllCategory, setAllSubCategory } from "../store/productSlice";
import Axios from "../utils/Axios";
import { valideURLConvert } from "../utils/valideURLConvert";

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()
  const dispatch = useDispatch();
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  useEffect(() => {
    fetchFeaturedCampaign();
  }, []);

  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        console.log("Home page: Explicitly fetching categories");
        
        const response = await Axios({
          ...SummaryApi.getCategory,
          timeout: 10000
        });
        
        if (response.data && response.data.data) {
          console.log(`Home page: Retrieved ${response.data.data.length} categories`);
          dispatch(setAllCategory(response.data.data || []));
        } else {
          console.error("Home page: No categories data in response", response);
        }
      } catch (error) {
        console.error("Home page: Error fetching categories:", error);
      }
    };

    if (!categoryData || categoryData.length === 0) {
      fetchCategoriesData();
    } else {
      console.log("Home page: Categories already loaded:", categoryData.length);
    }
  }, [dispatch, categoryData]);

  const fetchSubCategories = async () => {
    try {
      console.log("Explicitly fetching subcategories");
      
      // Check if the API endpoint is defined before using it
      if (!SummaryApi.getSubCategory) {
        console.error("SubCategory API endpoint is not defined in SummaryApi!");
        console.log("Available API endpoints:", Object.keys(SummaryApi));
        
        // Try using getAllSubCategory instead (checking endpoint naming differences)
        const endpoint = SummaryApi.getAllSubCategory || {
          url: `${import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subcategory/get`,
          method: 'get'
        };
        
        console.log("Using fallback endpoint:", endpoint);
        
        const response = await Axios({
          ...endpoint,
          timeout: 10000
        });
        
        console.log("SubCategory API response:", response);
        
        if (response.data && response.data.data) {
          console.log(`Retrieved ${response.data.data.length} subcategories`);
          dispatch(setAllSubCategory(response.data.data || []));
          return response.data.data;
        } else {
          console.error("No subcategories data in response", response);
          return [];
        }
      } else {
        // Original code path when API is defined
        console.log("SubCategory API endpoint:", SummaryApi.getSubCategory);
        
        const response = await Axios({
          ...SummaryApi.getSubCategory,
          timeout: 10000
        });
        
        console.log("SubCategory API response:", response);
        
        if (response.data && response.data.data) {
          console.log(`Retrieved ${response.data.data.length} subcategories`);
          dispatch(setAllSubCategory(response.data.data || []));
          return response.data.data;
        } else {
          console.error("No subcategories data in response", response);
          return [];
        }
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      return [];
    }
  };

  const fetchFeaturedCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        setFeaturedCampaign(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching featured campaign:', error);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const debouncedFetchSubCategories = useCallback(() => {
    fetchSubCategories();
  }, []);

  useEffect(() => {
    if (!subCategoryData || subCategoryData.length === 0) {
      debouncedFetchSubCategories();
    }
  }, [subCategoryData, debouncedFetchSubCategories]);

  const handleRedirectProductListpage = async (id, cat) => {
    console.log("--------- Category Navigation Debug ----------");
    console.log("1. Category clicked:", { id, name: cat });
    
    const loadingToast = toast.loading("Loading category products...");
    
    try {
      if (!subCategoryData || subCategoryData.length === 0) {
        console.log("No subcategories loaded yet, fetching them now...");
        await fetchSubCategories();
      }
      
      console.log("2. Available subCategories count:", subCategoryData?.length || 0);
      
      // Find matching subcategories for this category
      const matchingSubcategories = subCategoryData.filter(sub => 
        sub.category && Array.isArray(sub.category) && 
        sub.category.some(c => c._id == id)
      );
      
      console.log(`Found ${matchingSubcategories.length} matching subcategories`);
      
      // First preferred option: Category with specific subcategory
      const subcategory = matchingSubcategories.length > 0 ? matchingSubcategories[0] : null;
      
      if (subcategory) {
        console.log("3. Found subcategory:", subcategory.name);
        
        // Use consistent URL format: /category-name-categoryId
        // Don't include subcategory in URL to avoid route matching issues
        const url = `/${valideURLConvert(cat)}-${id}`;
        console.log("4. Navigating to:", url);
        
        // Pass subcategory info via state
        const navigationState = {
          categoryId: id,
          categoryName: cat,
          subcategoryId: subcategory._id,
          subcategoryName: subcategory.name,
          matchingSubcategories: matchingSubcategories.map(s => ({ id: s._id, name: s.name }))
        };
        
        toast.dismiss(loadingToast);
        toast.success(`Showing products in ${cat}`);
        navigate(url, { state: navigationState });
      } else {
        console.warn("No subcategory found for this category");
        
        // Simpler URL format to avoid route matching issues
        const directUrl = `/${valideURLConvert(cat)}-${id}`;
        console.log("Navigating to:", directUrl);
        
        toast.dismiss(loadingToast);
        navigate(directUrl, { 
          state: { 
            categoryId: id, 
            categoryName: cat 
          } 
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast.dismiss(loadingToast);
      toast.error("Something went wrong");
      navigate('/');
    }
    
    console.log("--------- End Navigation Debug ----------");
  };

  return (
   <section className='bg-white dark:bg-gray-900 transition-colors'>
      {/* Hero Banner Section */}
      <div className='container mx-auto px-2 sm:px-4'>
          <div className={`w-full h-auto min-h-[200px] sm:min-h-[250px] lg:min-h-[300px] bg-blue-100 dark:bg-blue-900 rounded-lg overflow-hidden ${!banner && "animate-pulse my-2" } `}>
              <img
                src={banner}
                className='w-full h-full object-cover hidden lg:block'
                alt='banner' 
              />
              <img
                src={bannerMobile}
                className='w-full h-full object-cover lg:hidden'
                alt='banner' 
              />
          </div>
      </div>
      
      {/* Categories Section */}
      <div className='container mx-auto px-2 sm:px-4 my-4 sm:my-6'>
        <div className='flex items-center justify-between mb-3 sm:mb-4'>
          <h2 className='text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-200'>Categories</h2>
          
          <Link to="/categories" className='text-primary-200 hover:underline text-xs sm:text-sm font-medium'>
            View All
          </Link>
        </div>
        
        <div className='relative'>
          <div className='flex overflow-x-auto pb-3 sm:pb-4 scrollbar-hide space-x-2 sm:space-x-4 
              scroll-smooth snap-x snap-mandatory lg:flex-wrap lg:justify-start lg:space-x-0 lg:gap-3 xl:gap-4'>
            {
              loadingCategory ? (
                new Array(12).fill(null).map((c, index) => (
                  <div 
                    key={index+"loadingcategory"} 
                    className='bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 lg:p-4 shadow animate-pulse flex flex-col items-center 
                        flex-shrink-0 snap-start w-[90px] sm:w-[110px] md:w-[120px] lg:w-[140px] xl:w-[150px] lg:snap-align-none'
                  >
                    <div className='bg-blue-100 dark:bg-blue-900 w-full aspect-square rounded-md'></div>
                    <div className='bg-blue-100 dark:bg-blue-900 h-3 sm:h-4 w-3/4 mt-2 sm:mt-3 rounded'></div>
                  </div>
                ))
              ) : (
                categoryData.map((cat) => (
                  <div 
                    key={cat._id+"displayCategory"} 
                    className='group bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                        shadow-sm hover:shadow-md rounded-lg p-2 sm:p-3 lg:p-4 transition-all duration-200 cursor-pointer 
                        flex-shrink-0 snap-start w-[90px] sm:w-[110px] md:w-[120px] lg:w-[140px] xl:w-[150px] lg:snap-align-none
                        flex flex-col items-center active:scale-95 touch-manipulation'
                    onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  >
                    <div className='w-full aspect-square flex items-center justify-center overflow-hidden 
                          rounded-md bg-gray-50 dark:bg-gray-900 p-1 sm:p-2 mb-1 sm:mb-2'>
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
                    <span className='text-center text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 
                          group-hover:text-primary-200 transition-colors truncate w-full leading-tight'>
                      {cat.name}
                    </span>
                  </div>
                ))
              )
            }
          </div>
          
          {/* Gradient overlays for mobile scroll indication */}
          <div className='absolute top-0 right-0 bottom-0 w-6 sm:w-8 lg:w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent 
              pointer-events-none lg:hidden'></div>
          <div className='absolute top-0 left-0 bottom-0 w-6 sm:w-8 lg:w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent 
              pointer-events-none lg:hidden'></div>
        </div>
      </div>

      {/* Community Challenges Section */}
      <section className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center">
            <FaUsers className="mr-2 text-primary-200 text-base sm:text-lg" /> 
            Community Challenges
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Join other shoppers to unlock exclusive rewards!</p>
        </div>
        
        <UserActiveCampaigns />
        
        {loadingCampaign ? (
          <div className="h-32 sm:h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
        ) : featuredCampaign ? (
          <CommunityCampaignProgress campaign={featuredCampaign} />
        ) : (
          <div className="p-3 sm:p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-center">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No active community campaigns at the moment.</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">Check back soon for new challenges!</p>
          </div>
        )}
      </section>

      {/* Category-wise Product Sections */}
      <div className='px-2 sm:px-4'>
        {
          categoryData?.map((c) => (
            <CategoryWiseProductDisplay 
              key={c?._id+"CategorywiseProduct"} 
              id={c?._id} 
              name={c?.name}
            />
          ))
        }
      </div>
   </section>
  )
}

export default Home;
