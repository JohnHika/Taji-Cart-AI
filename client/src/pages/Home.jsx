import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaUsers, FaChevronDown } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
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

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const SectionHeading = ({ title, tagline, linkTo, linkLabel }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`flex items-end justify-between mb-5 sm:mb-6 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-charcoal dark:text-white">{title}</h2>
        {tagline && (
          <p className="font-display italic text-sm text-plum-500 dark:text-plum-300 mt-0.5">{tagline}</p>
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-sm font-semibold text-gold-600 dark:text-gold-300 hover:text-gold-500 underline underline-offset-2 transition-colors flex-shrink-0"
        >
          {linkLabel || 'See All'} <FiArrowRight size={14} />
        </Link>
      )}
    </div>
  );
};

const Home = () => {
  const user = useSelector(state => state.user);
  const loadingCategory = useSelector(state => state.product.loadingCategory);
  const categoryData = useSelector(state => state.product.allCategory);
  const subCategoryData = useSelector(state => state.product.allSubCategory);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [heroVisible, setHeroVisible] = useState(false);
  const [communityRef, communityVisible] = useScrollReveal();

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { fetchFeaturedCampaign(); }, []);

  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const response = await Axios({ ...SummaryApi.getCategory, timeout: 10000 });
        if (response.data?.data) dispatch(setAllCategory(response.data.data || []));
      } catch (error) {
        console.error("Home page: Error fetching categories:", error);
      }
    };
    if (!categoryData || categoryData.length === 0) fetchCategoriesData();
  }, [dispatch, categoryData]);

  const fetchSubCategories = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getSubCategory, timeout: 10000 });
      if (response.data?.data) {
        dispatch(setAllSubCategory(response.data.data));
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  };

  const fetchFeaturedCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const response = await Axios({ url: '/api/campaigns/active', method: 'GET' });
      if (response.data.success && response.data.data?.length > 0) {
        setFeaturedCampaign(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching featured campaign:', error);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const debouncedFetchSubCategories = useCallback(() => { fetchSubCategories(); }, []);

  useEffect(() => {
    if (!subCategoryData || subCategoryData.length === 0) debouncedFetchSubCategories();
  }, [subCategoryData, debouncedFetchSubCategories]);

  const handleRedirectProductListpage = async (id, cat) => {
    const loadingToast = toast.loading("Loading products...");
    try {
      let currentSubCategories = subCategoryData;
      if (!currentSubCategories || currentSubCategories.length === 0) {
        currentSubCategories = await fetchSubCategories();
      }
      const matchingSubcategories = (currentSubCategories || []).filter(sub =>
        sub.category?.some(c => c._id == id)
      );
      const subcategory = matchingSubcategories[0] || null;
      const url = `/${valideURLConvert(cat)}-${id}`;
      toast.dismiss(loadingToast);
      navigate(url, {
        state: {
          categoryId: id, categoryName: cat,
          subcategoryId: subcategory?._id,
          subcategoryName: subcategory?.name,
          matchingSubcategories: matchingSubcategories.map(s => ({ id: s._id, name: s.name }))
        }
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Something went wrong");
      navigate('/');
    }
  };

  return (
   <section className='bg-white dark:bg-gray-900 transition-colors'>
      {/* Premium Hero Banner Section - Hair Products */}
      <div className='container mx-auto px-2 sm:px-4'>
          <div className='w-full h-auto min-h-[200px] sm:min-h-[280px] lg:min-h-[350px] rounded-lg overflow-hidden shadow-lg relative bg-gradient-to-r from-pink-600 to-rose-600'>
            {/* Gradient Overlay for better text readability */}
            <div className='absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-10'></div>
            
            {/* Hero Banner Image Background - positioned behind overlay */}
            <img
              src={banner}
              className='w-full h-full object-cover hidden lg:block absolute inset-0'
              alt='Nawiri Hair Premium Products' 
            />
            <img
              src={bannerMobile}
              className='w-full h-full object-cover lg:hidden absolute inset-0'
              alt='Nawiri Hair Premium Products' 
            />
            
            {/* Hero Content - positioned on top */}
            <div className='absolute inset-0 flex flex-col justify-center items-start pl-4 sm:pl-6 lg:pl-10 z-20'>
              <h1 className='text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg'>
                Premium Hair Products
              </h1>
              <p className='text-xs sm:text-sm lg:text-lg text-gray-100 mb-4 sm:mb-6 drop-shadow max-w-md'>
                Discover premium hair extensions, care products, and styling solutions. Transform your look with Nawiri Hair quality.
              </p>
              <Link 
                to="/categories" 
                className='bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105'
              >
                Shop Now
              </Link>
            </div>
          </div>
      </div>
      
      {/* Hair Product Categories Section */}
      <div className='container mx-auto px-2 sm:px-4 my-6 sm:my-10'>
        {/* Premium Benefits Banner */}
        <div className='hidden mb-8 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg'>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6'>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>âœ“</div>
              <h3 className='font-bold text-sm sm:text-base'>100% Authentic</h3>
              <p className='text-xs sm:text-sm text-pink-100'>Nawiri Hair quality guaranteed</p>
            </div>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>ðŸš€</div>
              <h3 className='font-bold text-sm sm:text-base'>Fast Delivery</h3>
              <p className='text-xs sm:text-sm text-pink-100'>Quick & reliable shipping</p>
            </div>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>ðŸ’¯</div>
              <h3 className='font-bold text-sm sm:text-base'>Money-Back Guarantee</h3>
              <p className='text-xs sm:text-sm text-pink-100'>Satisfaction guaranteed</p>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between mb-6 sm:mb-8'>
          <div>
            <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>Hair Collections</h2>
            <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1'>Explore our exclusive range of hair products & extensions</p>
          </div>
          
          <Link to="/categories" className='text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 underline text-xs sm:text-sm font-semibold transition-colors'>
            View All â†’
          </Link>
        </div>
        
        <div className='relative'>
          <div className='flex overflow-x-auto pb-3 sm:pb-4 scrollbar-hide space-x-2 sm:space-x-3 lg:space-x-4
              scroll-smooth snap-x snap-mandatory lg:flex-wrap lg:justify-start lg:gap-3 xl:gap-4'>
            {
              loadingCategory ? (
                new Array(12).fill(null).map((c, index) => (
                  <div 
                    key={index+"loadingcategory"} 
                    className='bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm animate-pulse flex flex-col items-center 
                        flex-shrink-0 snap-start w-[95px] sm:w-[115px] md:w-[130px] lg:w-[150px] xl:w-[160px] lg:snap-align-none border border-gray-100 dark:border-gray-700'
                  >
                    <div className='bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 w-full aspect-square rounded-lg'></div>
                    <div className='bg-pink-100 dark:bg-pink-900 h-3 sm:h-4 w-3/4 mt-3 sm:mt-4 rounded-full'></div>
                  </div>
                ))
              ) : (
                categoryData.map((cat) => (
                  <div 
                    key={cat._id+"displayCategory"} 
                    className='group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:from-pink-50 hover:to-rose-50 dark:hover:from-gray-700 dark:hover:to-gray-800
                        shadow-sm hover:shadow-lg rounded-xl p-3 sm:p-4 transition-all duration-300 cursor-pointer 
                        flex-shrink-0 snap-start w-[95px] sm:w-[115px] md:w-[130px] lg:w-[150px] xl:w-[160px] lg:snap-align-none
                        flex flex-col items-center active:scale-95 touch-manipulation border border-gray-100 dark:border-gray-700 hover:border-pink-200 dark:hover:border-pink-800'
                    onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  >
                    <div className='w-full aspect-square flex items-center justify-center overflow-hidden 
                          rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 mb-2 sm:mb-3'>
                      <img 
                        src={cat.image}
                        alt={cat.name}
                        className='max-w-full max-h-full object-contain group-hover:scale-125 transition-transform duration-300'
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/100?text=Hair';
                        }}
                      />
                    </div>
                    <span className='text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 
                          group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate w-full leading-tight'>
                      {cat.name}
                    </span>
                  </div>
                ))
              )
            }
          </div>

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ivory dark:from-dm-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ivory dark:from-dm-surface to-transparent" />
        </div>
      </div>

      {/* Community Challenges Section */}
      <section className="container mx-auto px-2 sm:px-4 py-6 sm:py-10 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900 rounded-xl my-6 sm:my-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center text-gray-900 dark:text-white">
            <FaUsers className="mr-3 text-pink-600 dark:text-pink-400 text-lg sm:text-2xl" /> 
            Exclusive Community Rewards
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2">Join thousands of hair enthusiasts & unlock special discounts, early access to new products, and exclusive rewards!</p>
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

      {/* Hair Products by Category */}
      <div className='px-2 sm:px-4 py-6 sm:py-10'>
        <h2 className='text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4'>Shop by Hair Type & Concern</h2>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8'>Find the perfect products for your hair goals</p>
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

      {/* â”€â”€ Divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="container mx-auto px-4 mt-8 mb-8 sm:mb-10">
        <div className="section-divider" />
      </div>

      {/* â”€â”€ Community Section (bottom) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        ref={communityRef}
        className={`container mx-auto px-3 sm:px-4 pb-8 sm:pb-10 transition-all duration-600 ${communityVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="bg-plum-100 dark:bg-plum-900/30 rounded-card p-5 sm:p-6 border border-plum-200 dark:border-plum-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-pill bg-plum-700 text-white flex items-center justify-center flex-shrink-0">
              <FaUsers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal dark:text-white">Community Challenges</h2>
              <p className="text-xs text-brown-400 dark:text-white/50">Join shoppers to unlock exclusive rewards!</p>
            </div>
            <Link
              to="/campaigns"
              className="ml-auto text-sm font-semibold text-gold-600 dark:text-gold-300 hover:underline underline-offset-2 flex-shrink-0"
            >
              View All
            </Link>
          </div>

          <UserActiveCampaigns />

          {loadingCampaign ? (
            <div className="h-24 bg-shimmer rounded-card mt-3" />
          ) : featuredCampaign ? (
            <CommunityCampaignProgress campaign={featuredCampaign} />
          ) : (
            <div className="text-center py-4 text-sm text-brown-400 dark:text-white/40">
              No active campaigns at the moment â€” check back soon!
            </div>
          )}
        </div>
      </div>

    </section>
  );
};

export default Home;
