import { useEffect, useState } from 'react';
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
        console.log("Category data received:", categoryResponse.data);
        
        if (categoryResponse.data && categoryResponse.data.data) {
          console.log(`Retrieved ${categoryResponse.data.data.length} categories`);
          dispatch(setAllCategory(categoryResponse.data.data || []));
          toast.success("Categories loaded successfully");
        } else {
          console.warn("No category data in response", categoryResponse.data);
          toast.warning("No categories found");
        }
        
        // Only fetch subcategories if categories succeeded
        console.log("Fetching subcategories from:", SummaryApi.getAllSubCategory.url);
        const subCategoryResponse = await Axios({
          url: SummaryApi.getAllSubCategory.url,
          method: SummaryApi.getAllSubCategory.method,
          timeout: 10000
        });
        
        console.log("SubCategory response status:", subCategoryResponse.status);
        console.log("SubCategory data received:", subCategoryResponse.data);
        
        if (subCategoryResponse.data && subCategoryResponse.data.data) {
          console.log(`Retrieved ${subCategoryResponse.data.data.length} subcategories`);
          dispatch(setAllSubCategory(subCategoryResponse.data.data || []));
        } else {
          console.warn("No subcategory data in response");
        }
        
        console.log("Product data fetching completed successfully");
        return true;
      } catch (connectionError) {
        console.error("Connection error details:", connectionError);
        console.error("Server might not be running or accessible");
        toast.error("Failed to connect to product server");
        
        // Use any cached data if available
        console.log("Attempting to use cached category data");
        return false;
      }
    } catch (error) {
      console.error("Product data fetch error:", error);
      toast.error("Error loading product data");
      return false;
    } finally {
      console.log("Setting loading to false in fetchProductData");
      dispatch(setLoadingCategory(false));
      setIsLoading(false);
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

  // Monitor category state for debugging
  useEffect(() => {
    console.log("Categories updated:", categories.length);
  }, [categories]);

  return (
    <GlobalProvider> 
      <Header/>
      <CartSynchronizer />
      <main className='min-h-[78vh]'>
        {/* Main content will be rendered via the router's Outlet */}
        <Outlet/>
      </main>
      <Footer/>
      <Toaster/>
      <ToastContainer position="top-right" autoClose={3000} />
      {location.pathname !== '/checkout' && user?._id && <CartMobileLink/>}
      <ChatbotAI />
    </GlobalProvider>
  );
}

export default App;