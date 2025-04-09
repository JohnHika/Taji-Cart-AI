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
    console.error("🔴 ProductListPage ERROR:", error);
    console.error("Error details:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 dark:bg-red-900 rounded m-4">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
            Error rendering ProductListPage
          </h2>
          <p className="my-4 text-red-600 dark:text-red-400">
            {this.state.error?.message}
          </p>
          <Link 
            to="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
        const idMatch = firstPart.match(/[a-f0-9]{24}$/);
        if (idMatch) {
          categoryId = idMatch[0];
          console.log("Found category ID in URL:", categoryId);
        }
      }
      
      if (!categoryId) {
        if (params.categoryId) {
          categoryId = params.categoryId;
          console.log("Using categoryId from params:", categoryId);
        } else if (navigationState.categoryId) {
          categoryId = navigationState.categoryId;
          console.log("Using categoryId from navigation state:", categoryId);
        }
      }
      
      let subCategoryId = null;
      if (pathParts.length > 1) {
        const secondPart = pathParts[1];
        const idMatch = secondPart.match(/[a-f0-9]{24}$/);
        if (idMatch) {
          subCategoryId = idMatch[0];
          console.log("Found subcategory ID in URL:", subCategoryId);
        }
      }
      
      if (!subCategoryId) {
        if (params.subcategoryId) {
          subCategoryId = params.subcategoryId;
        } else if (navigationState.subcategoryId) {
          subCategoryId = navigationState.subcategoryId;
        }
      }
      
      console.log("Final IDs:", { categoryId, subCategoryId });
      return { categoryId, subCategoryId };
    } catch (error) {
      console.error("Error parsing parameters:", error);
      return { categoryId: null, subCategoryId: null };
    }
  };

  const testServerConnection = async (categoryId) => {
    console.log("🔍 Testing direct server connection for category:", categoryId);
    
    try {
      // Try a direct server API call bypassing routes
      const testResponse = await Axios({
        url: '/api/product/get-product-by-category', // Direct API path
        method: 'post',
        data: { id: categoryId }
      });
      
      console.log("📊 Direct API test response:", testResponse.data);
      
      if (testResponse.data && testResponse.data.success) {
        console.log(`✅ Server connection successful! Found ${testResponse.data.data.length} products.`);
        return {
          success: true,
          products: testResponse.data.data
        };
      } else {
        console.error("❌ Server returned success:false");
        return {
          success: false,
          message: testResponse.data.message || "Unknown server error" 
        };
      }
    } catch (error) {
      console.error("❌ Direct API call failed:", error);
      
      // Try fallback endpoints
      try {
        console.log("🔄 Trying alternative API endpoint...");
        const fallbackResponse = await Axios({
          url: '/api/products/by-category', // Alternative path
          method: 'post',
          data: { categoryId: categoryId }
        });
        
        console.log("📊 Fallback response:", fallbackResponse.data);
        
        if (fallbackResponse.data && fallbackResponse.data.success) {
          console.log(`✅ Fallback successful! Found ${fallbackResponse.data.data.length} products.`);
          return {
            success: true,
            products: fallbackResponse.data.data,
            usedFallback: true
          };
        }
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
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
  }, [location.state]);

  const fetchProducts = async () => {
    console.log("Fetching products with URL:", window.location.pathname);
    setLoading(true);
    
    try {
      const { categoryId, subCategoryId } = parseParams();
      console.log("🔄 Fetching products for category:", categoryId);
      
      if (!categoryId) {
        setError("Category not found");
        setLoading(false);
        return;
      }
      
      // Test server connection first
      const connectionTest = await testServerConnection(categoryId);
      
      if (connectionTest.success) {
        // If we got products directly, use them
        if (connectionTest.usedFallback) {
          console.log("⚠️ Using fallback API results");
          setData(connectionTest.products);
          setLoading(false);
          return;
        }
        
        // Continue with normal flow if direct test succeeded
        const response = await Axios({
          ...SummaryApi.getProductByCategory,
          data: {
            id: categoryId
          }
        });
        
        if (response.data && response.data.success) {
          setData(response.data.data || []);
          setLoading(false);
        } else {
          setError("No products found");
          setLoading(false);
        }
      } else {
        // Server connection test failed, set error
        console.error("❌ Server connection test failed");
        setError(`Could not connect to server: ${connectionTest.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Error loading products");
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

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-5 dark:bg-gray-900">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4 dark:text-red-400">
            Error Loading Products
          </h1>
          <p className="text-gray-700 mb-5 dark:text-gray-300">{error}</p>
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className='min-h-screen w-full dark:bg-gray-900'>
      <div className='mx-auto max-w-7xl p-2'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='w-full shadow-sm p-2 bg-white dark:bg-gray-800'>
            <h2 className='font-semibold mb-4 dark:text-gray-100'>Sub Categories</h2>
            <div className='w-full grid gap-2'>
              {
                DisplaySubCatory.length > 0 ? 
                  DisplaySubCatory.map(s => (
                    <Link 
                      key={s._id}
                      to={`/products/category/${params.categoryName || params.category}/${valideURLConvert(s.name)}-${s._id}`}
                      className="group"
                    >
                      <div className='p-2 rounded flex justify-between items-center bg-gray-100 group-hover:bg-primary-200 dark:bg-gray-700 dark:group-hover:bg-primary-300 dark:text-white text-sm'>
                        <p>{s.name}</p>
                        <p>
                          {
                            params.subcategoryName ? params.subcategoryName.includes(s._id) ? '✓' : '' : ''
                          }
                        </p>
                      </div>
                    </Link>
                  ))
                : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    No subcategories available
                  </div>
                )
              }
            </div>
          </div>

          {/**Product **/}
          <div className='sticky top-20 md:col-span-3'>
            <div className='bg-white dark:bg-gray-800 shadow-md p-4 z-10'>
              <h3 className='font-semibold dark:text-gray-100'>Products</h3>
            </div>
            <div>
              <div className='min-h-[80vh] max-h-[80vh] overflow-y-auto relative dark:bg-gray-900'>
                {loading ? (
                  <Loading />
                ) : data.length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 p-4 gap-4'>
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
                  <div className="flex justify-center items-center h-full py-20">
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No products found in this category</p>
                      <Link 
                        to="/"
                        className="inline-block px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
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
