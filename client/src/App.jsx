import { Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import './App.css';
import SummaryApi from './common/SummaryApi';
import CartMobileLink from './components/CartMobile';
import ChatbotAI from './components/ChatbotAI';
import Footer from './components/Footer';
import Header from './components/Header';
import GlobalProvider from './provider/GlobalProvider';
import { fetchCartItems } from './redux/slice/cartSlice';
import { setAllCategory, setAllSubCategory, setLoadingCategory, setLoyaltyDetails } from './store/productSlice';
import { setUserDetails } from './store/userSlice';
import Axios from './utils/Axios';
import fetchUserDetails from './utils/fetchUserDetails';

// Error fallback component
function ErrorFallback({ error }) {
  return (
    <div className="p-5 text-center" role="alert">
      <h2 className="text-lg font-bold text-red-600">Something went wrong:</h2>
      <pre className="mt-2 p-3 bg-gray-100 rounded text-red-500 overflow-auto text-left">
        {error.message}
      </pre>
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => window.location.reload()}
      >
        Try reloading
      </button>
    </div>
  );
}

// CartSynchronizer component
const CartSynchronizer = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Synchronize cart when navigating to certain routes
    if (location.pathname === '/') {
      console.log('Synchronizing cart on navigation to home');
      dispatch(fetchCartItems());
    }
  }, [location.pathname, dispatch]);
  
  return null;
};

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector(state => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const categories = useSelector(state => state.product.allCategory);

  // Product/category fetching function
  const fetchProductData = async () => {
    try {
      console.log("Fetching product data...");
      dispatch(setLoadingCategory(true));
      
      // Add a simple connection check
      try {
        console.log("Attempting to fetch categories from:", SummaryApi.getCategory.url);
        
        // Fetch categories with timeout and error handling
        const categoryResponse = await Axios({
          ...SummaryApi.getCategory,
          timeout: 10000 // 10 second timeout
        });
        
        console.log("Category response status:", categoryResponse.status);
        
        if (categoryResponse.data && categoryResponse.data.data) {
          console.log(`Retrieved ${categoryResponse.data.data.length} categories`);
          dispatch(setAllCategory(categoryResponse.data.data || []));
          
          // Also fetch subcategories
          const subCategoryResponse = await Axios({
            ...SummaryApi.getSubCategory,
            timeout: 10000
          });
          
          if (subCategoryResponse.data && subCategoryResponse.data.data) {
            console.log(`Retrieved ${subCategoryResponse.data.data.length} subcategories`);
            dispatch(setAllSubCategory(subCategoryResponse.data.data || []));
          }
          
          return true;
        } else {
          console.error("No data in category response");
          return false;
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        console.error("Server might not be running or accessible");
        toast.error("Failed to connect to product server");
        return false;
      }
    } catch (error) {
      console.error("Product data fetch error:", error);
      toast.error("Error loading product data");
      return false;
    } finally {
      console.log("Setting loading to false in fetchProductData");
      dispatch(setLoadingCategory(false));
    }
  };

  // Fetch loyalty details function - pulls this logic out of the useEffect for better error handling
  const fetchLoyaltyDetails = async (userId) => {
    try {
      const response = await Axios({
        url: `/api/loyalty/users/${userId}/loyalty-card`,
        method: 'GET'
      });
      
      if (response.data && response.data.data) {
        const { points, class: loyaltyClass } = response.data.data;
        dispatch(setLoyaltyDetails({ points, class: loyaltyClass }));
      }
    } catch (error) {
      console.error("Error fetching loyalty details:", error);
      // Don't throw - just log the error and continue
    }
  };

  // Auth + products initialization
  useEffect(() => {
    console.log("App initialization started");
    let isMounted = true;
    
    // Set a loading flag
    setIsLoading(true);
    
    const initializeApp = async () => {
      try {
        // Always fetch product data on app init
        const productDataResult = await fetchProductData();
        console.log("Product data fetch result:", productDataResult);
        
        // Check authentication - Using sessionStorage instead of localStorage
        const token = sessionStorage.getItem('accesstoken');
        if (token) {
          const userDetails = await fetchUserDetails();
          
          if (userDetails?.data && isMounted) {
            // Update user state
            dispatch(setUserDetails(userDetails.data));
            
            // Fetch cart items
            dispatch(fetchCartItems());
            
            // Fetch loyalty details if we have a user ID
            if (userDetails.data._id) {
              await fetchLoyaltyDetails(userDetails.data._id);
            }
          }
        }
      } catch (error) {
        console.error("App initialization error:", error);
        toast.error("Error initializing app");
        // Clear tokens on auth error - Using sessionStorage instead of localStorage
        sessionStorage.removeItem('accesstoken');
        sessionStorage.removeItem('refreshToken');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeApp();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Ensure categories and products are fetched on initial load
  useEffect(() => {
    // Fetch product data on initial load and whenever the app becomes active
    fetchProductData();
    
    // Add an event listener for when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page is visible again, refreshing product data");
        fetchProductData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Monitor category state for debugging
  useEffect(() => {
    console.log("Categories updated:", categories.length);
  }, [categories]);

  // Add a specific effect to handle dynamic routes
  useEffect(() => {
    // Check if the current route is a category route
    const isCategoryRoute = location.pathname.includes('-');
    if (isCategoryRoute) {
      console.log("App detected category route:", location.pathname);
      console.log("App has navigation state:", location.state);
      
      // Ensure categories are loaded for category routes
      if (!categories || categories.length === 0) {
        console.log("Categories not loaded yet for category route - fetching now");
        fetchProductData();
      }
    }
  }, [location.pathname, categories]);

  // Add a special handler for direct URL navigation to category routes
  useEffect(() => {
    // Check if we're on a category page (URL contains a dash which indicates category-id format)
    const isCategoryRoute = location.pathname.match(/\/[^/]+-[a-f0-9]+/);
    
    if (isCategoryRoute) {
      console.log("🚨 Direct navigation to category route detected:", location.pathname);
      
      // Force data loading for direct URL navigation
      if (!categories || categories.length === 0) {
        console.log("Categories not loaded for direct category navigation - loading now");
        fetchProductData();
      }
      
      // Check if state is missing (happens with direct URL navigation)
      if (!location.state) {
        console.log("⚠️ No state available for category route - this likely means direct URL access");
        
        // Try to extract category/subcategory IDs from URL
        const pathParts = location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const categoryPart = pathParts[0];
          const categoryMatch = categoryPart.match(/-([\da-f]+)$/);
          
          if (categoryMatch && categoryMatch[1]) {
            const extractedCategoryId = categoryMatch[1];
            console.log("Extracted category ID from URL:", extractedCategoryId);
            
            // You might want to fetch specific data here or set state
          }
        }
      }
    }
  }, [location.pathname, categories, location.state]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GlobalProvider> 
        <Header/>
        <CartSynchronizer />
        <main className='min-h-[78vh]'>
          {/* Add suspense to catch lazy-loaded component errors */}
          <Suspense fallback={<div className="p-5 text-center">Loading...</div>}>
            <Outlet key={location.pathname} />
          </Suspense>
        </main>
        <Footer/>
        <Toaster/>
        <ToastContainer position="top-right" autoClose={3000} />
        {location.pathname !== '/checkout' && user?._id && <CartMobileLink/>}
        <ChatbotAI />
      </GlobalProvider>
    </ErrorBoundary>
  );
}

export default App;