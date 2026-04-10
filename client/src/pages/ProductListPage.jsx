import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import CardProduct from '../components/CardProduct';
import Loading from '../components/Loading';
import { setAllSubCategory } from '../store/productSlice';
import Axios from '../utils/Axios';
import { valideURLConvert } from '../utils/valideURLConvert';

const formatSlugLabel = (slug = '') =>
  String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const extractIdFromSegment = (segment = '') => {
  if (!segment) {
    return null;
  }

  const parts = String(segment).split('-');
  const candidate = parts[parts.length - 1];
  return /^[a-f0-9]{5,}$/i.test(candidate) ? candidate : null;
};

const resolveRouteIds = (pathname, params, navigationState) => {
  const pathParts = String(pathname).split('/').filter(Boolean);

  return {
    categoryId:
      params.categoryId ||
      extractIdFromSegment(pathParts[0]) ||
      navigationState.categoryId ||
      null,
    subcategoryId:
      params.subcategoryId ||
      extractIdFromSegment(pathParts[1]) ||
      navigationState.subcategoryId ||
      null,
  };
};

class ProductListPageErrorLogger extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ProductListPage ERROR:', error);
    console.error('Error details:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-card border border-brown-100 bg-blush-50 p-8 dark:border-dm-border dark:bg-dm-card">
          <h2 className="text-xl font-bold text-charcoal dark:text-white">Something went wrong</h2>
          <p className="my-4 text-brown-500 dark:text-white/60">{this.state.error?.message}</p>
          <Link
            to="/"
            className="inline-block rounded-pill bg-plum-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-plum-600"
          >
            Return to Home
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProductListPage = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allSubCategory = useSelector((state) => state.product.allSubCategory);
  const navigationState = location.state || {};

  const [{ categoryId, subcategoryId }, setResolvedIds] = useState(() =>
    resolveRouteIds(location.pathname, params, navigationState)
  );
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResolvedIds(resolveRouteIds(location.pathname, params, navigationState));
  }, [location.pathname, navigationState, params]);

  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        const response = await Axios({
          ...SummaryApi.getSubCategory,
          timeout: 10000,
        });

        if (response.data?.data) {
          dispatch(setAllSubCategory(response.data.data || []));
        }
      } catch (fetchError) {
        console.error('ProductListPage: failed to fetch subcategories', fetchError);
      }
    };

    if (!allSubCategory || allSubCategory.length === 0) {
      fetchSubCategories();
    }
  }, [allSubCategory, dispatch]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categoryId) {
        setError('Category ID could not be determined from this link.');
        setData([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await Axios(
          subcategoryId
            ? {
                ...SummaryApi.getProductByCategoryAndSubCategory,
                data: {
                  categoryId,
                  subCategoryId: subcategoryId,
                  page: 1,
                  limit: 40,
                },
              }
            : {
                ...SummaryApi.getProductByCategory,
                data: { id: categoryId },
              }
        );

        if (response.data?.success) {
          setData(response.data.data || []);
        } else {
          setData([]);
        }
      } catch (fetchError) {
        console.error('ProductListPage: failed to fetch products', fetchError);
        setError('Unable to load this collection right now.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId, subcategoryId]);

  const displaySubCategory = useMemo(() => {
    if (allSubCategory?.length > 0 && categoryId) {
      return allSubCategory.filter((sub) => {
        if (Array.isArray(sub.category)) {
          return sub.category.some((category) => {
            const currentId = category?._id || category;
            return String(currentId) === String(categoryId);
          });
        }

        const currentId = sub.category?._id || sub.category;
        return String(currentId) === String(categoryId);
      });
    }

    if (navigationState.matchingSubcategories?.length) {
      return navigationState.matchingSubcategories.map((sub) => ({
        _id: sub.id || sub._id,
        name: sub.name,
      }));
    }

    return [];
  }, [allSubCategory, categoryId, navigationState.matchingSubcategories]);

  const currentCategoryLabel =
    navigationState.categoryName ||
    formatSlugLabel(params.categoryName) ||
    'Hair Products';

  const currentSubcategoryLabel =
    navigationState.subcategoryName ||
    formatSlugLabel(params.subcategoryName) ||
    '';

  const categorySlug = valideURLConvert(currentCategoryLabel || 'category');
  const activeSubcategoryId = subcategoryId || null;

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-ivory p-5 dark:bg-dm-surface">
        <div className="w-full max-w-md rounded-card border border-brown-100 bg-white p-6 shadow-card dark:border-dm-border dark:bg-dm-card">
          <h1 className="mb-4 text-2xl font-bold text-charcoal dark:text-white">Error Loading Products</h1>
          <p className="mb-5 text-brown-500 dark:text-white/60">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="rounded-pill bg-gold-500 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen w-full bg-ivory dark:bg-dm-surface">
      <div className="mx-auto max-w-7xl p-2 sm:p-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-3xl font-bold text-charcoal dark:text-white sm:text-4xl">
            {currentCategoryLabel}
          </h1>
          <p className="text-brown-600 dark:text-white/60">
            {currentSubcategoryLabel
              ? `${currentSubcategoryLabel} styles picked from ${currentCategoryLabel}.`
              : `Discover premium hair products inside ${currentCategoryLabel}.`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="sticky top-20 h-fit w-full rounded-xl border border-brown-200 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card">
            <h2 className="mb-4 flex items-center text-lg font-bold text-charcoal dark:text-white">
              <span className="mr-3 h-6 w-1 rounded-full bg-gradient-to-b from-plum-700 to-plum-500"></span>
              Hair Types
            </h2>

            <div className="grid gap-2">
              {displaySubCategory.length > 0 ? (
                displaySubCategory.map((subcategory) => (
                  <Link
                    key={subcategory._id}
                    to={`/${categorySlug}-${categoryId}/${valideURLConvert(subcategory.name)}-${subcategory._id}`}
                    state={{
                      categoryId,
                      categoryName: currentCategoryLabel,
                      subcategoryId: subcategory._id,
                      subcategoryName: subcategory.name,
                      matchingSubcategories: displaySubCategory.map((sub) => ({
                        id: sub._id,
                        name: sub.name,
                      })),
                    }}
                    className="group"
                  >
                    <div className="flex items-center justify-between rounded-lg border border-transparent bg-plum-50/50 p-3 text-sm font-medium transition-all duration-300 group-hover:border-plum-200 group-hover:bg-plum-100 group-hover:text-plum-800 dark:bg-dm-card-2 dark:text-white/80 dark:group-hover:border-plum-700 dark:group-hover:bg-plum-900/30 dark:group-hover:text-plum-200">
                      <p>{subcategory.name}</p>
                      <p className="text-lg">
                        {String(activeSubcategoryId) === String(subcategory._id) ? '✓' : ''}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-4 text-center">
                  <div className="text-sm text-brown-500 dark:text-white/50">All Hair Types</div>
                  <p className="mt-2 text-sm text-brown-400 dark:text-white/50">
                    No subcategories have been attached to this collection yet.
                  </p>
                  <Link
                    to="/"
                    className="mt-4 inline-block rounded-pill bg-gold-500 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400"
                  >
                    Browse All Categories
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="z-10 mb-4 rounded-xl border border-plum-100 bg-gradient-to-r from-plum-50 to-blush-50 p-4 shadow-sm dark:border-dm-border dark:from-dm-card dark:to-dm-card-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-charcoal dark:text-white">
                  {currentSubcategoryLabel || 'Our Selection'}
                </h3>
                <span className="text-sm text-brown-600 dark:text-white/60">{data.length} products</span>
              </div>
            </div>

            <div className="min-h-[60vh] dark:bg-dm-surface">
              {loading ? (
                <Loading />
              ) : data.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
                  {data.map((product, index) => (
                    <CardProduct
                      data={product}
                      key={`${product._id}-productSubCategory-${index}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-plum-500 dark:text-plum-300">
                      Empty shelf
                    </div>
                    <p className="mb-4 text-lg font-semibold text-brown-600 dark:text-white/60">
                      No products found in this category
                    </p>
                    <p className="mb-6 text-sm text-brown-500 dark:text-white/45">
                      Check back soon for new hair products.
                    </p>
                    <Link
                      to="/"
                      className="inline-block rounded-lg bg-plum-700 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-plum-600 hover:shadow-xl"
                    >
                      Browse All Products
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function WrappedProductListPage() {
  return (
    <ProductListPageErrorLogger>
      <ProductListPage />
    </ProductListPageErrorLogger>
  );
}
