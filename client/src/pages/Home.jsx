import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaUsers, FaChevronDown } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import SummaryApi from "../common/SummaryApi";
import CategoryWiseProductDisplay from '../components/CategoryWiseProductDisplay';
import CommunityCampaignProgress from "../components/CommunityCampaignProgress";
import UserActiveCampaigns from "../components/UserActiveCampaigns";
import { setAllCategory, setAllSubCategory } from "../store/productSlice";
import Axios from "../utils/Axios";
import { valideURLConvert } from "../utils/valideURLConvert";

/* ─── Scroll-reveal hook ─────────────────────────────────────────────── */
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

/* ─── Section heading with reveal ───────────────────────────────────── */
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
      const endpoint = SummaryApi.getSubCategory || SummaryApi.getAllSubCategory || {
        url: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:8080'}/api/subcategory/get`,
        method: 'get'
      };
      const response = await Axios({ ...endpoint, timeout: 10000 });
      if (response.data?.data) {
        dispatch(setAllSubCategory(response.data.data || []));
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching subcategories:", error);
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
    <section className="bg-ivory dark:bg-dm-surface transition-colors">

      {/* ── Hero Banner (guests only) ─────────────────────────────── */}
      {!user?._id && (
        <div className="relative w-full overflow-hidden">
          <div className="w-full min-h-[300px] sm:min-h-[420px] lg:min-h-[560px] bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal flex items-center">
            <div className="container mx-auto px-5 sm:px-8 py-16 sm:py-20">
              <div className={`max-w-lg transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <p className="font-display italic text-gold-300 text-base sm:text-lg mb-2 animate-fade-in">
                  Premium Hair Collection
                </p>
                <h1 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl leading-tight animate-fade-up">
                  Your Hair,<br />
                  <span style={{ color: '#E8C478' }}>
                    Your Crown
                  </span>
                </h1>
                <p className={`text-white/70 text-sm sm:text-base mt-4 leading-relaxed transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  Discover premium hair extensions, wigs, and care products crafted for every texture and style.
                </p>
                <div className={`flex flex-wrap items-center gap-3 mt-6 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <Link
                    to="/"
                    className="bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-6 py-3 rounded-pill text-sm transition-all duration-200 press shadow-sm hover:shadow-gold"
                  >
                    Shop Now
                  </Link>
                  <Link
                    to="/campaigns"
                    className="border border-white/60 text-white hover:bg-white/10 font-medium px-6 py-3 rounded-pill text-sm transition-all duration-200"
                  >
                    View Campaigns
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 animate-float hidden sm:block">
            <FaChevronDown size={20} />
          </div>
        </div>
      )}

      {/* ── Categories Section (compact pills) ───────────────────── */}
      <div className="container mx-auto px-3 sm:px-4 mt-8 sm:mt-10">
        <SectionHeading
          title="Shop by Category"
          tagline="Find exactly what your hair needs"
          linkTo="/"
          linkLabel="View All"
        />

        <div className="relative -mx-3 sm:-mx-4">
          {/* Outer: bounded width + horizontal scroll (inner row uses w-max so overflow is real) */}
          <div
            className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide [touch-action:pan-x] [-webkit-overflow-scrolling:touch] px-3 sm:px-4"
            role="region"
            aria-label="Shop by category — scroll horizontally for more"
          >
            <div className="flex flex-nowrap gap-2.5 w-max pr-1">
              {loadingCategory
                ? new Array(10).fill(null).map((_, i) => (
                    <div
                      key={i + "loadingcat"}
                      className="snap-start flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-pill border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card"
                      style={{ minWidth: '120px' }}
                    >
                      <div className="w-7 h-7 rounded-full bg-shimmer flex-shrink-0" />
                      <div className="h-3 flex-1 bg-shimmer rounded-pill" />
                    </div>
                  ))
                : categoryData.map((cat) => (
                    <button
                      key={cat._id + "displayCategory"}
                      type="button"
                      onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                      className="group snap-start flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-pill border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card hover:border-plum-300 dark:hover:border-plum-600 hover:bg-plum-50 dark:hover:bg-plum-900/20 shadow-sm hover:shadow-hover transition-all duration-200 cursor-pointer press"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-blush-50 dark:bg-dm-card-2 flex items-center justify-center p-0.5">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 pointer-events-none"
                          draggable={false}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=H'; }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-charcoal dark:text-white/80 group-hover:text-plum-700 dark:group-hover:text-plum-200 transition-colors whitespace-nowrap">
                        {cat.name}
                      </span>
                    </button>
                  ))
              }
            </div>
          </div>

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ivory dark:from-dm-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ivory dark:from-dm-surface to-transparent" />
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 my-8 sm:my-10">
        <div className="section-divider" />
      </div>

      {/* ── Category-wise Product Sections ──────────────────────────── */}
      <div>
        {categoryData?.map((c) => (
          <CategoryWiseProductDisplay
            key={c?._id + "CategorywiseProduct"}
            id={c?._id}
            name={c?.name}
          />
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 mt-8 mb-8 sm:mb-10">
        <div className="section-divider" />
      </div>

      {/* ── Community Section (bottom) ─────────────────────────────── */}
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
