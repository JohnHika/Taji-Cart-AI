import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaUsers } from 'react-icons/fa';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import SummaryApi from "../common/SummaryApi";
import CardLoading from '../components/CardLoading';
import CardProduct from '../components/CardProduct';
import CommunityCampaignProgress from "../components/CommunityCampaignProgress";
import Search from '../components/Search';
import UserActiveCampaigns from "../components/UserActiveCampaigns";
import { useStoreCompact } from '../context/StoreLayoutContext';
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

const Home = () => {
  const isCompact = useStoreCompact();
  const loadingCategory = useSelector(state => state.product.loadingCategory);
  const categoryData = useSelector(state => state.product.allCategory);
  const subCategoryData = useSelector(state => state.product.allSubCategory);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [communityRef, communityVisible] = useScrollReveal();
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => { fetchFeaturedCampaign(); }, []);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await Axios({ ...SummaryApi.getProduct, data: {} });
        if (response.data?.success && Array.isArray(response.data.data)) {
          setAllProducts(response.data.data);
        } else {
          setAllProducts([]);
        }
      } catch (error) {
        console.error('Home: failed to load products', error);
        setAllProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchAllProducts();
  }, []);

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
   <section className='bg-ivory dark:bg-dm-surface transition-colors'>
      {isCompact && (
        <div className="container mx-auto px-3 pt-3 sm:px-4">
          <div className="mx-auto max-w-lg">
            <Search />
          </div>
        </div>
      )}
      {/* Categories */}
      <div className='container mx-auto px-2 pt-4 sm:px-4 sm:pt-6 my-6 sm:my-10'>
        {/* Premium Benefits Banner */}
        <div className='hidden mb-8 bg-gradient-to-r from-plum-800 to-plum-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-plum-700/50'>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6'>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>✓</div>
              <h3 className='font-bold text-sm sm:text-base'>100% Authentic</h3>
              <p className='text-xs sm:text-sm text-plum-100'>Nawiri Hair quality guaranteed</p>
            </div>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>🚀</div>
              <h3 className='font-bold text-sm sm:text-base'>Fast Delivery</h3>
              <p className='text-xs sm:text-sm text-plum-100'>Quick & reliable shipping</p>
            </div>
            <div className='flex flex-col items-center sm:items-start text-center sm:text-left'>
              <div className='text-3xl mb-2'>💯</div>
              <h3 className='font-bold text-sm sm:text-base'>Money-Back Guarantee</h3>
              <p className='text-xs sm:text-sm text-plum-100'>Satisfaction guaranteed</p>
            </div>
          </div>
        </div>

        <div className='mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-xl font-bold text-charcoal dark:text-white sm:text-2xl lg:text-3xl'>Categories</h2>
            <p className='mt-1 text-xs text-brown-600 dark:text-white/60 sm:text-sm'>Shop by category — tap a pill to browse products</p>
          </div>
          <Link to="/" className='shrink-0 text-xs font-semibold text-gold-600 underline underline-offset-2 transition-colors hover:text-gold-500 dark:text-gold-300 dark:hover:text-gold-200 sm:text-sm'>
            View all →
          </Link>
        </div>

        <div className='flex flex-wrap gap-2 sm:gap-2.5'>
          {loadingCategory
            ? new Array(10).fill(null).map((_, index) => (
                <div
                  key={`cat-skel-${index}`}
                  className='h-9 w-24 animate-pulse rounded-full bg-plum-100 dark:bg-plum-900/50 sm:h-10 sm:w-28'
                />
              ))
            : categoryData.map((cat) => (
                <button
                  key={cat._id + 'pill'}
                  type='button'
                  onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  className='group inline-flex max-w-full items-center gap-2 rounded-full border border-brown-200/90 bg-white px-3 py-1.5 text-left text-xs font-semibold text-charcoal shadow-sm transition-all hover:border-plum-300 hover:bg-plum-50 hover:shadow-md active:scale-[0.98] dark:border-dm-border dark:bg-dm-card dark:text-white/90 dark:hover:border-plum-600 dark:hover:bg-plum-900/30 sm:px-4 sm:py-2 sm:text-sm'
                >
                  <span className='relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-ivory to-plum-100 dark:from-dm-card-2 dark:to-plum-900/40'>
                    <img
                      src={cat.image}
                      alt=''
                      className='h-full w-full object-contain p-0.5 transition-transform group-hover:scale-110'
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/56?text=·';
                      }}
                    />
                  </span>
                  <span className='min-w-0 truncate'>{cat.name}</span>
                </button>
              ))}
        </div>
      </div>

      {/* All products (categories are above) */}
      <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-10">
        <div className="mb-6 flex flex-col gap-1 sm:mb-8">
          <h2 className="text-2xl font-bold text-charcoal dark:text-white lg:text-3xl">All products</h2>
          <p className="text-sm text-brown-600 dark:text-white/60">Browse everything in one place — use categories above to filter by type.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {loadingProducts
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={`home-skel-${i}`} className="flex justify-center">
                  <CardLoading />
                </div>
              ))
            : allProducts.map((p) => (
                <div key={p._id} className="flex justify-center">
                  <CardProduct data={p} />
                </div>
              ))}
        </div>
        {!loadingProducts && allProducts.length === 0 && (
          <p className="py-10 text-center text-sm text-brown-500 dark:text-white/50">No products available yet.</p>
        )}
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
              No active campaigns at the moment — check back soon!
            </div>
          )}
        </div>
      </div>

    </section>
  );
};

export default Home;
