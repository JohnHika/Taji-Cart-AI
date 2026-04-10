import React, { useCallback, useEffect } from 'react';
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
  const categoryData = useSelector((state) => state.product.allCategory);
  const subCategoryData = useSelector((state) => state.product.allSubCategory);
  const loadingCategory = useSelector((state) => state.product.loadingCategory);

  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const response = await Axios({ ...SummaryApi.getCategory, timeout: 10000 });
        if (response.data?.data) {
          dispatch(setAllCategory(response.data.data || []));
        }
      } catch (error) {
        console.error('ShopCategoriesPage: error fetching categories:', error);
      }
    };

    if (!categoryData || categoryData.length === 0) {
      fetchCategoriesData();
    }
  }, [categoryData, dispatch]);

  const fetchSubCategories = useCallback(async () => {
    try {
      const response = await Axios({
        ...SummaryApi.getSubCategory,
        timeout: 10000,
      });

      if (response.data?.data) {
        dispatch(setAllSubCategory(response.data.data || []));
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('ShopCategoriesPage: error fetching subcategories:', error);
      return [];
    }
  }, [dispatch]);

  useEffect(() => {
    if (!subCategoryData || subCategoryData.length === 0) {
      fetchSubCategories();
    }
  }, [fetchSubCategories, subCategoryData]);

  const handleNavigateToCategory = async (id, categoryName) => {
    const loadingToast = toast.loading('Loading products...');

    try {
      let currentSubCategories = subCategoryData;
      if (!currentSubCategories || currentSubCategories.length === 0) {
        currentSubCategories = await fetchSubCategories();
      }

      const matchingSubcategories = (currentSubCategories || []).filter((subCategory) =>
        subCategory.category?.some((category) => category._id === id)
      );

      const url = `/${valideURLConvert(categoryName)}-${id}`;

      toast.dismiss(loadingToast);
      navigate(url, {
        state: {
          categoryId: id,
          categoryName,
          matchingSubcategories: matchingSubcategories.map((subcategory) => ({
            id: subcategory._id,
            name: subcategory.name,
          })),
        },
      });
    } catch (error) {
      console.error('ShopCategoriesPage: navigation failed', error);
      toast.dismiss(loadingToast);
      toast.error('Something went wrong');
    }
  };

  const skeletonCount = 12;

  return (
    <section className="min-h-screen bg-ivory transition-colors duration-200 dark:bg-dm-surface">
      <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal px-4 py-12 sm:py-16">
        <div className="container mx-auto text-center">
          <p className="mb-1 text-sm italic text-gold-300 sm:text-base">Nawiri Hair</p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Shop by Category
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60 sm:text-base">
            Find exactly what your hair needs and browse our collections in a cleaner, easier flow.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {loadingCategory
            ? Array.from({ length: skeletonCount }).map((_, index) => (
                <div key={`shop-category-skeleton-${index}`} className="flex flex-col items-center gap-3">
                  <div className="aspect-square w-full rounded-card bg-shimmer" />
                  <div className="h-3 w-2/3 rounded-pill bg-shimmer" />
                </div>
              ))
            : categoryData.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleNavigateToCategory(category._id, category.name)}
                  className="group flex cursor-pointer flex-col items-center text-left hover-lift press"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-card border border-brown-100 bg-blush-50 p-3 shadow-card transition-all duration-300 group-hover:border-plum-200 group-hover:shadow-hover dark:border-dm-border dark:bg-dm-card dark:group-hover:border-plum-700">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-400 group-hover:scale-110"
                      onError={(event) => {
                        event.target.src = 'https://via.placeholder.com/200?text=Hair';
                      }}
                    />
                    <div className="absolute inset-0 rounded-card bg-plum-900/0 transition-all duration-300 group-hover:bg-plum-900/10" />
                    <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/0 opacity-0 transition-all duration-300 group-hover:bg-gold-500 group-hover:opacity-100">
                      <FiArrowRight size={12} className="text-charcoal" />
                    </div>
                  </div>
                  <span className="mt-2.5 w-full line-clamp-2 text-center text-xs font-medium leading-snug text-charcoal transition-colors group-hover:text-plum-700 dark:text-white/80 dark:group-hover:text-plum-200 sm:text-sm">
                    {category.name}
                  </span>
                </button>
              ))}
        </div>

        {!loadingCategory && categoryData.length === 0 && (
          <div className="py-20 text-center text-brown-400 dark:text-white/40">
            <p className="text-base">No categories found.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShopCategoriesPage;
