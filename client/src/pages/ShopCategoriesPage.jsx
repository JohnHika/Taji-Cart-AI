import React, { useEffect, useCallback } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SummaryApi from '../common/SummaryApi';
import { setAllCategory, setAllSubCategory } from '../store/productSlice';
import Axios from '../utils/Axios';
import { valideURLConvert } from '../utils/valideURLConvert';

const ShopCategoriesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categoryData = useSelector(state => state.product.allCategory);
  const subCategoryData = useSelector(state => state.product.allSubCategory);
  const loadingCategory = useSelector(state => state.product.loadingCategory);

  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const response = await Axios({ ...SummaryApi.getCategory, timeout: 10000 });
        if (response.data?.data) dispatch(setAllCategory(response.data.data || []));
      } catch (error) {
        console.error('ShopCategoriesPage: error fetching categories:', error);
      }
    };
    if (!categoryData || categoryData.length === 0) fetchCategoriesData();
  }, [dispatch, categoryData]);

  const fetchSubCategories = useCallback(async () => {
    try {
      const endpoint = SummaryApi.getSubCategory || {
        url: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:8080'}/api/subcategory/get`,
        method: 'get',
      };
      const response = await Axios({ ...endpoint, timeout: 10000 });
      if (response.data?.data) {
        dispatch(setAllSubCategory(response.data.data || []));
        return response.data.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [dispatch]);

  useEffect(() => {
    if (!subCategoryData || subCategoryData.length === 0) fetchSubCategories();
  }, [subCategoryData, fetchSubCategories]);

  const handleNavigateToCategory = async (id, cat) => {
    const loadingToast = toast.loading('Loading products…');
    try {
      let currentSubCategories = subCategoryData;
      if (!currentSubCategories || currentSubCategories.length === 0) {
        currentSubCategories = await fetchSubCategories();
      }
      const matchingSubcategories = (currentSubCategories || []).filter(sub =>
        sub.category?.some(c => c._id === id)
      );
      const subcategory = matchingSubcategories[0] || null;
      const url = `/${valideURLConvert(cat)}-${id}`;
      toast.dismiss(loadingToast);
      navigate(url, {
        state: {
          categoryId: id,
          categoryName: cat,
          subcategoryId: subcategory?._id,
          subcategoryName: subcategory?.name,
          matchingSubcategories: matchingSubcategories.map(s => ({ id: s._id, name: s.name })),
        },
      });
    } catch {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong');
    }
  };

  const skeletonCount = 12;

  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      {/* Page header */}
      <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal py-12 sm:py-16 px-4">
        <div className="container mx-auto text-center">
          <p className="font-display italic text-gold-300 text-sm sm:text-base mb-1">
            Nawiri Hair
          </p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl">
            Shop by Category
          </h1>
          <p className="text-white/60 text-sm sm:text-base mt-3 max-w-md mx-auto">
            Find exactly what your hair needs — browse all our curated collections.
          </p>
        </div>
      </div>

      {/* Category grid */}
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {loadingCategory
            ? new Array(skeletonCount).fill(null).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="w-full aspect-square rounded-card bg-shimmer" />
                  <div className="h-3 w-2/3 bg-shimmer rounded-pill" />
                </div>
              ))
            : categoryData.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => handleNavigateToCategory(cat._id, cat.name)}
                  className="group flex flex-col items-center cursor-pointer hover-lift press text-left"
                >
                  <div className="w-full aspect-square rounded-card overflow-hidden bg-blush-50 dark:bg-dm-card border border-brown-100 dark:border-dm-border shadow-card group-hover:shadow-hover group-hover:border-plum-200 dark:group-hover:border-plum-700 transition-all duration-300 flex items-center justify-center p-3 relative">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-400"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200?text=Hair';
                      }}
                    />
                    <div className="absolute inset-0 bg-plum-900/0 group-hover:bg-plum-900/10 transition-all duration-300 rounded-card" />
                    {/* Arrow indicator */}
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-gold-500/0 group-hover:bg-gold-500 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                      <FiArrowRight size={12} className="text-charcoal" />
                    </div>
                  </div>
                  <span className="text-center text-xs sm:text-sm font-medium text-charcoal dark:text-white/80 group-hover:text-plum-700 dark:group-hover:text-plum-200 transition-colors mt-2.5 line-clamp-2 leading-snug w-full">
                    {cat.name}
                  </span>
                </button>
              ))
          }
        </div>

        {!loadingCategory && categoryData.length === 0 && (
          <div className="text-center py-20 text-brown-400 dark:text-white/40">
            <p className="text-base">No categories found.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShopCategoriesPage;
