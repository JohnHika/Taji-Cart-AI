import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import Loading from '../components/Loading'
import Axios from '../utils/Axios'
import { valideURLConvert } from '../utils/valideURLConvert'

// Add this special error boundary for ProductListPage
class ProductListPageErrorLogger extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ðŸ”´ ProductListPage ERROR:", error);
    console.error("Error details:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-blush-50 dark:bg-dm-card rounded-card m-4 border border-brown-100 dark:border-dm-border">
          <h2 className="text-xl font-bold text-charcoal dark:text-white">
            Something went wrong
          </h2>
          <p className="my-4 text-brown-500 dark:text-white/60">
            {this.state.error?.message}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-plum-700 hover:bg-plum-600 text-white font-semibold rounded-pill text-sm transition-colors"
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
  console.log("ProductListPage STARTING RENDER");
  console.log("URL:", window.location.href);

  console.log("==== PRODUCT LIST PAGE MOUNTED ====");
  console.log("Full URL:", window.location.href);
  console.log("Path:", window.location.pathname);
  console.log("Search params:", window.location.search);
  console.log("Hash:", window.location.hash);
  
  try {
    console.log("Available routes:", window._REACT_ROUTER_ROUTES);
  } catch (e) {
    console.log("Could not access routes:", e.message);
  }
  
  const params = useParams();
  const location = useLocation();
  const navigationState = location.state || {};
  
  console.log("ProductListPage - URL Parameters:", params);
  console.log("Navigation state:", navigationState);
  console.log("Location object:", {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    key: location.key
  });

  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const AllSubCategory = useSelector(state => state.product.allSubCategory)
  const [DisplaySubCatory, setDisplaySubCategory] = useState([])

  const logDebugInfo = () => {
    console.log("==== DEBUG STATE ====");
    console.log("URL:", window.location.href);
    console.log("Params:", params);
    console.log("Page:", page);
    console.log("Loading:", loading);
    console.log("Error:", error);
    console.log("Data items:", data.length);
    console.log("Total pages:", totalPage);
    console.log("SubCategories available:", AllSubCategory?.length || 0);
    console.log("Display subcategories:", DisplaySubCatory?.length || 0);
    console.log("==== END DEBUG STATE ====");
  };

  const parseParams = () => {
    try {
      console.log("==== PARSING URL PARAMETERS ====");
      console.log("Raw URL:", window.location.href);
      console.log("Path:", window.location.pathname);
      
      let categoryId = null;
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      console.log("Path parts:", pathParts);
      
      if (pathParts.length > 0) {
        const firstPart = pathParts[0];
        
        // First try to extract the ID from URL params if they exist
        if (params.categoryId) {
          categoryId = params.categoryId;
          console.log("Extracted categoryId from params:", categoryId);
        } 
        // Then try to extract from the path
        else if (firstPart) {
          // Check for hyphenated format (name-id)
          const parts = firstPart.split('-');
          if (parts.length > 1) {
            // Get the last part which should be the ID
            const potentialId = parts[parts.length - 1];
            
            // Verify this looks like an ID (alphanumeric, at least 5 chars)
            if (/^[a-f0-9]{5,}$/i.test(potentialId)) {
              categoryId = potentialId;
              console.log("Extracted categoryId from hyphenated path:", categoryId);
            }
          }
          
          // If we still don't have an ID, check if the path itself is an ID
          if (!categoryId && /^[a-f0-9]{5,}$/i.test(firstPart)) {
            categoryId = firstPart;
            console.log("Path itself appears to be a categoryId:", categoryId);
          }
        }
      }
      
      // Still no categoryId? Fall back to navigation state if available
      if (!categoryId && navigationState.categoryId) {
        categoryId = navigationState.categoryId;
        console.log("Using categoryId from navigation state:", categoryId);
      }
      
      let subCategoryId = null;
      // Similar logic for subcategory
      if (params.subcategoryId) {
        subCategoryId = params.subcategoryId;
      } else if (pathParts.length > 1) {
        const secondPart = pathParts[1];
        const parts = secondPart.split('-');
        if (parts.length > 1) {
          const potentialId = parts[parts.length - 1];
          if (/^[a-f0-9]{5,}$/i.test(potentialId)) {
            subCategoryId = potentialId;
            console.log("Extracted subCategoryId from path:", subCategoryId);
          }
        }
      }
      
      // Fall back to navigation state for subcategory
      if (!subCategoryId && navigationState.subcategoryId) {
        subCategoryId = navigationState.subcategoryId;
        console.log("Using subCategoryId from navigation state:", subCategoryId);
      }
      
      console.log("Final IDs:", { categoryId, subCategoryId });
      return { categoryId, subCategoryId };
    } catch (error) {
      console.error("Error parsing parameters:", error);
      return { categoryId: null, subCategoryId: null };
    }
  };

  const testServerConnection = async (categoryId) => {
    console.log("ðŸ” Testing direct server connection for category:", categoryId);
    
    try {
      // Try a direct server API call bypassing routes
      const testResponse = await Axios({
        url: '/api/product/get-product-by-category', // Direct API path
        method: 'post',
        data: { id: categoryId }
      });
      
      console.log("ðŸ“Š Direct API test response:", testResponse.data);
      
      if (testResponse.data && testResponse.data.success) {
        console.log(`âœ… Server connection successful! Found ${testResponse.data.data.length} products.`);
        return {
          success: true,
          products: testResponse.data.data
        };
      } else {
        console.error("âŒ Server returned success:false");
        return {
          success: false,
          message: testResponse.data.message || "Unknown server error" 
        };
      }
    } catch (error) {
      console.error("âŒ Direct API call failed:", error);
      
      // Try fallback endpoints
      try {
        console.log("ðŸ”„ Trying alternative API endpoint...");
        const fallbackResponse = await Axios({
          url: '/api/products/by-category', // Alternative path
          method: 'post',
          data: { categoryId: categoryId }
        });
        
        console.log("ðŸ“Š Fallback response:", fallbackResponse.data);
        
        if (fallbackResponse.data && fallbackResponse.data.success) {
          console.log(`âœ… Fallback successful! Found ${fallbackResponse.data.data.length} products.`);
          return {
            success: true,
            products: fallbackResponse.data.data,
            usedFallback: true
          };
        }
      } catch (fallbackError) {
        console.error("âŒ Fallback also failed:", fallbackError);
      }
      
      return {
        success: false,
        message: error.message
      };
    }
  };

  // Handle direct navigation or error recovery
  useEffect(() => {
    console.log("ProductListPage mounted - checking for recovery state");
    
    // If we're recovering from an error, we need to identify the category
    if (location.state?.recoveredFromError) {
      console.log("Recovered from error - original path:", location.state.originalPath);
      console.log("Using category ID:", location.state.categoryId);
      
      // If we have subcategories but no matching ones for this category, fetch category info
      if (location.state.categoryId && AllSubCategory.length > 0 && DisplaySubCatory.length === 0) {
        console.log("Need to find category info for recovered page");
        
        // You could make a direct API call here to get category name if needed
        // For now we'll just set a message
        setError("Showing products by category ID. Some information may be missing.");
      }
    }
    
    // Initialize subcategories when component mounts
    const { categoryId } = parseParams();
    if (categoryId && AllSubCategory.length > 0) {
      console.log("Finding subcategories for category:", categoryId);
      
      // Find all subcategories that belong to this category
      const matchingSubcats = AllSubCategory.filter(sub => {
        // Handle different subcategory data structures
        if (sub.category && Array.isArray(sub.category)) {
          return sub.category.some(cat => 
            (cat._id && cat._id === categoryId) || 
            (cat === categoryId) ||
            (typeof cat === 'string' && cat.includes(categoryId))
          );
        }
        if (sub.category && typeof sub.category === 'object') {
          return sub.category._id === categoryId;
        }
        return String(sub.category) === String(categoryId);
      });
      
      console.log(`Found ${matchingSubcats.length} matching subcategories`);
      setDisplaySubCategory(matchingSubcats);
      
      // Store category name if available in navigation state
      if (navigationState.categoryName) {
        console.log("Category name from navigation state:", navigationState.categoryName);
      }
    }
  }, [location.state, AllSubCategory, navigationState]);

  const fetchProducts = async () => {
    console.log("Fetching products with URL:", window.location.pathname);
    setLoading(true);
    
    try {
      const { categoryId, subCategoryId } = parseParams();
      console.log("ðŸ”„ Fetching products for category:", categoryId);
      
      if (!categoryId) {
        setError("Category ID could not be determined from the URL");
        setLoading(false);
        return;
      }

      // For debugging - log the exact ID we're using
      console.log("Using category ID for API request:", categoryId);
      
      // Direct API call without testing connection first (simplified approach)
      try {
        console.log("Making API request to get category products");
        const response = await Axios({
          ...SummaryApi.getProductByCategory,
          data: { id: categoryId }
        });
        
        console.log("API response received:", response.data);
        
        if (response.data && response.data.success) {
          console.log(`Found ${response.data.data?.length || 0} products`);
          
          if (response.data.data && response.data.data.length > 0) {
            setData(response.data.data);
            setLoading(false);
            setError(null); // Clear any previous errors
          } else {
            console.log("No products found in category");
            setData([]);
            setLoading(false);
            // Don't set error for empty product list - it's a valid state
          }
        } else {
          console.error("API returned success:false");
          
          // Try fallback approach
          try {
            console.log("ðŸ”„ Trying alternative API endpoint...");
            const fallbackResponse = await Axios({
              url: '/api/products/by-category',
              method: 'post',
              data: { categoryId: categoryId }
            });
            
            if (fallbackResponse.data && fallbackResponse.data.success) {
              console.log(`Fallback found ${fallbackResponse.data.data?.length || 0} products`);
              setData(fallbackResponse.data.data || []);
              setLoading(false);
              setError(null);
            } else {
              setData([]);
              setLoading(false);
              // Don't set error for empty product list
            }
          } catch (fallbackError) {
            console.error("Fallback API call failed:", fallbackError);
            setData([]);
            setLoading(false);
            // Don't set error for empty product list
          }
        }
      } catch (apiError) {
        console.error("API call error:", apiError);
        
        // Final fallback - try a simpler API request with just the base ID
        try {
          console.log("Attempting direct product lookup");
          const simpleResponse = await Axios({
            url: '/api/product/get-product-by-category',
            method: 'post',
            data: { id: categoryId.toString().replace(/[^a-f0-9]/gi, '') }
          });
          
          if (simpleResponse.data && simpleResponse.data.data) {
            console.log(`Simple lookup found ${simpleResponse.data.data.length} products`);
            setData(simpleResponse.data.data);
          } else {
            setData([]);
          }
        } catch (simpleError) {
          console.error("Simple lookup failed:", simpleError);
          setData([]);
        }
        
        setLoading(false);
        // Don't set error - just show empty product state
      }
    } catch (error) {
      console.error("Fatal error in fetchProducts:", error);
      setError(null); // Don't show error to user, just empty state
      setData([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("ProductListPage component mounted");
    return () => {
      console.log("ProductListPage component unmounting");
    };
  }, []);

  useEffect(() => {
    console.log("ProductListPage mounted with route:", window.location.pathname);
    console.log("ProductListPage received params:", params);
    console.log("ProductListPage navigation state:", navigationState);
    
    // Log if we're inside GlobalProvider context
    try {
      if (window.GlobalContext) {
        console.log("GlobalContext is available");
      } else {
        console.warn("GlobalContext is NOT available");
      }
    } catch (e) {
      console.error("Error checking GlobalContext:", e);
    }
  }, []);

  useEffect(() => {
    console.log("URL or page changed, fetching products");
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.pathname, page, AllSubCategory.length]);

  useEffect(() => {
    console.log(`SubCategory data updated. Available subcategories: ${AllSubCategory?.length || 0}`);
  }, [AllSubCategory]);

  console.log("ProductListPage rendering");
  logDebugInfo();

  // Derive current category slug and id for building subcategory links
  const derivedParams = (() => {
    try {
      const { categoryId } = parseParams();
      const categorySlug = valideURLConvert(navigationState.categoryName || params.categoryName || 'category');
      return { categoryId, categorySlug };
    } catch {
      return { categoryId: null, categorySlug: 'category' };
    }
  })();

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-5 bg-ivory dark:bg-dm-surface">
        <div className="max-w-md w-full p-6 bg-white dark:bg-dm-card rounded-card shadow-card border border-brown-100 dark:border-dm-border">
          <h1 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
            Error Loading Products
          </h1>
          <p className="text-brown-500 dark:text-white/60 mb-5">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill text-sm transition-colors press"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className='min-h-screen w-full bg-ivory dark:bg-dm-surface'>
      <div className='mx-auto max-w-7xl p-2 sm:p-4'>
        {/* Page Header */}
        <div className='mb-6 sm:mb-8'>
          <h1 className='text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-2'>
            {navigationState.categoryName || 'Hair Products'}
          </h1>
          <p className='text-brown-600 dark:text-white/60'>Discover premium hair products & extensions</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          {/* Sidebar - Sub Categories */}
          <div className='w-full shadow-sm p-4 bg-white dark:bg-dm-card rounded-xl border border-brown-200 dark:border-dm-border h-fit sticky top-20'>
            <h2 className='font-bold text-lg mb-4 text-charcoal dark:text-white flex items-center'>
              <span className='w-1 h-6 bg-gradient-to-b from-plum-700 to-plum-500 rounded-full mr-3'></span>
              Hair Types
            </h2>
            <div className='w-full grid gap-2'>
              {
                DisplaySubCatory.length > 0 ? 
                  DisplaySubCatory.map(s => (
                    <Link 
                      key={s._id}
                      to={`/${derivedParams.categorySlug}-${derivedParams.categoryId}/${valideURLConvert(s.name)}-${s._id}`}
                      className="group"
                    >
                      <div className='p-3 rounded-lg flex justify-between items-center bg-plum-50/50 group-hover:bg-plum-100 dark:bg-dm-card-2 dark:group-hover:bg-plum-900/30 dark:text-white/80 group-hover:text-plum-800 dark:group-hover:text-plum-200 text-sm font-medium transition-all duration-300 border border-transparent group-hover:border-plum-200 dark:group-hover:border-plum-700'>
                        <p>{s.name}</p>
                        <p className='text-lg'>{params.subcategoryName && params.subcategoryName.includes(s._id) ? '✓' : ''}</p>
                      </div>
                    </Link>
                  ))
                : (
                  <div className="text-center py-4">
                    <div className="text-brown-500 dark:text-white/50 text-sm">
                      All Hair Types
                    </div>
                    <p className="mt-2 text-brown-400 dark:text-white/50 text-sm">
                      No products found in this category
                    </p>
                    <Link
                      to="/"
                      className="mt-4 inline-block px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill text-sm transition-colors press"
                    >
                      Browse All Categories
                    </Link>
                  </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className='md:col-span-3'>
            <div className='bg-gradient-to-r from-plum-50 to-blush-50 dark:from-dm-card dark:to-dm-card-2 shadow-sm p-4 rounded-xl border border-plum-100 dark:border-dm-border mb-4 z-10'>
              <div className='flex items-center justify-between'>
                <h3 className='font-bold text-lg text-charcoal dark:text-white'>Our Selection</h3>
                <span className='text-sm text-brown-600 dark:text-white/60'>{data.length} products</span>
              </div>
            </div>
            <div>
              <div className='min-h-[60vh] dark:bg-dm-surface'>
                {loading ? (
                  <Loading />
                ) : data.length > 0 ? (
                  <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4'>
                    {
                      data.map((p, index) => (
                        <CardProduct
                          data={p}
                          key={p._id + "productSubCategory" + index}
                        />
                      ))
                    }
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-20">
                    <div className="text-center">
                      <div className='text-6xl mb-4'>✨</div>
                      <p className="text-brown-600 dark:text-white/60 font-semibold mb-4 text-lg">No products found in this category</p>
                      <p className="text-brown-500 dark:text-white/45 text-sm mb-6">Check back soon for new hair products!</p>
                      <Link 
                        to="/"
                        className="inline-block px-6 py-3 bg-plum-700 text-white rounded-lg hover:bg-plum-600 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        ← Browse All Products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function WrappedProductListPage() {
  return (
    <ProductListPageErrorLogger>
      <ProductListPage />
    </ProductListPageErrorLogger>
  );
}
