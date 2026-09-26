import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import './App.css';
import SummaryApi from './common/SummaryApi';
import BottomNavigation from './components/BottomNavigation';
import CartMobileLink from './components/CartMobile';
import DashboardMobileHeader from './components/DashboardMobileHeader';
import Footer from './components/Footer';
import Header from './components/Header';
import WhatsAppOrderWidget from './components/WhatsAppOrderWidget';
import AdminSecretGate from './components/AdminSecretGate';
import GlobalProvider from './provider/GlobalProvider';
import { WhatsAppOrderProvider } from './provider/WhatsAppOrderProvider';
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice';
import { logout, setSessionStatus, setUserDetails } from './store/userSlice';
import { fetchWishlist } from './store/wishlistSlice';
import Axios from './utils/Axios';
import { clearAuthStorage, getStoredAccessToken, isAuthSessionError } from './utils/authStorage';
import fetchUserDetails from './utils/fetchUserDetails';
import { getPOSOverflowClass } from './utils/posLayout';
import { isStorePortalHost } from './utils/storePortalAccess';
// Only ever rendered on the store.nawirihairke.com host (isStorePortalHost()) --
// lazy so its dependencies (including recharts) never load for the customer
// storefront, which shares this same build.
const StoreManagementApp = lazy(() => import('./pages/admin/StoreManagementApp'));

// Pages a deploy-update reload must never interrupt — a customer mid-checkout
// (including waiting on an M-Pesa STK push, or returning from the M-Pesa app
// on refocus) would lose all in-progress state.
const CHECKOUT_LIKE_PATHS = ['/dashboard/checkout', '/checkout', '/guest-checkout', '/order/card-result'];

// Error fallback component
function ErrorFallback({ error }) {
  if (import.meta.env.DEV) {
    console.error('ErrorBoundary caught:', error);
  }
  return (
    <div className="p-5 text-center bg-ivory dark:bg-dm-surface min-h-screen flex flex-col items-center justify-center" role="alert">
      <div className="max-w-md w-full bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card p-8">
        <h2 className="text-lg font-bold text-charcoal dark:text-white mb-3">Something went wrong</h2>
        <p className="text-brown-500 dark:text-white/60 text-sm">
          We hit an unexpected error loading this page. Please try reloading.
        </p>
        <button
          className="mt-5 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill text-sm transition-colors press"
          onClick={() => window.location.reload()}
        >
          Try reloading
        </button>
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector(state => state.user);
  const storePortalHost = isStorePortalHost();
  const [isLoading, setIsLoading] = useState(true);
  const categories = useSelector(state => state.product.allCategory);
  const isFetchingProductsRef = useRef(false);
  const lastVisibilityFetchRef = useRef(0);
  const lastUserRefreshRef = useRef(0);
  const lastVersionCheckRef = useRef(0);
  const reloadingForUpdateRef = useRef(false);
  // Deferred-reload state for the version-check effect (item C below): a
  // reload found while on a checkout-like page waits here until navigation
  // away from it. currentPathRef lets checkForUpdate (defined once, in a
  // `[]`-dependency effect) read the up-to-date pathname without becoming a
  // stale closure over the value from mount time.
  const pendingReloadRef = useRef(false);
  const currentPathRef = useRef(location.pathname);

  // Product/category fetching function
  const fetchProductData = async () => {
    if (isFetchingProductsRef.current) {
      return false;
    }

    isFetchingProductsRef.current = true;

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
      isFetchingProductsRef.current = false;
    }
  };

  // Auth + products initialization
  useEffect(() => {
    console.log("App initialization started");
    let isMounted = true;

    setIsLoading(true);

    // Safety net: never show spinner longer than 15 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 15000);

    // Loads the logged-in user's data in the background; never blocks first
    // paint. sessionStatus tracks this attempt (see userSlice.js) so
    // PrivateRoute can wait on a real outcome instead of a fixed timeout.
    const hydrateUserSession = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        if (isMounted) dispatch(setSessionStatus('none'));
        return;
      }

      dispatch(setSessionStatus('loading'));

      try {
        const userDetails = await fetchUserDetails();

        if (userDetails?.data && isMounted) {
          // setUserDetails itself marks sessionStatus 'ready'.
          dispatch(setUserDetails(userDetails.data));
          dispatch(fetchWishlist());
          // Cart, address and Royal-card/loyalty data are fetched by
          // GlobalProvider's own user-change effect — fetching them here too
          // was a duplicate request pair on every load.
        } else if (isMounted) {
          dispatch(setSessionStatus('none'));
        }
      } catch (error) {
        console.error("Session hydration error:", error);
        if (isAuthSessionError(error)) {
          clearAuthStorage();
        } else {
          console.warn('Keeping the saved session after a temporary hydration failure.');
        }
        if (isMounted) dispatch(setSessionStatus('none'));
      }
    };

    const initializeApp = async () => {
      lastVisibilityFetchRef.current = Date.now(); // stamp so visibility cooldown applies immediately

      // Start user-session hydration immediately, in parallel with product
      // data — this used to only start once fetchProductData resolved,
      // needlessly serializing two independent requests and delaying how
      // soon a stored session was restored (see PrivateRoute.jsx).
      hydrateUserSession();

      try {
        const productDataResult = await fetchProductData();
        console.log("Product data fetch result:", productDataResult);
      } catch (error) {
        console.error("App initialization error:", error);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [dispatch]);

  // Refresh categories when tab becomes visible, with a 5-minute cooldown
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityFetchRef.current < 5 * 60 * 1000) return;
      lastVisibilityFetchRef.current = now;
      console.log("Page is visible again, refreshing product data");
      fetchProductData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Re-fetch the logged-in user's own record (role/staffPermissions) so an
  // admin granting/revoking a permission elsewhere takes effect without the
  // affected staff member needing to log out and back in — the token
  // auto-refresh alone only renews the JWT, it never re-reads permissions.
  // Triggered whenever the tab becomes visible again, and after every
  // background token refresh (for tabs that stay foregrounded a long time),
  // sharing one 5-minute cooldown so it never fires more than that often.
  useEffect(() => {
    const refreshUserIfStale = async () => {
      if (!getStoredAccessToken()) return;
      const now = Date.now();
      if (now - lastUserRefreshRef.current < 5 * 60 * 1000) return;
      lastUserRefreshRef.current = now;

      try {
        const userDetails = await fetchUserDetails();
        if (userDetails?.data) {
          dispatch(setUserDetails(userDetails.data));
        }
      } catch (error) {
        console.warn('Background user-details refresh failed:', error?.message);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshUserIfStale();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('nawiri:token-refreshed', refreshUserIfStale);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('nawiri:token-refreshed', refreshUserIfStale);
    };
  }, [dispatch]);

  // Axios's gracefulLogout (see utils/Axios.js) can only touch storage and
  // dispatch a plain DOM event — it can't reach into Redux without importing
  // it into a transport module. Listen for that event here instead, so the
  // UI (PrivateRoute, auth-gated menus) reflects the logout immediately
  // rather than waiting for the full-page redirect it also triggers.
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logout());
    };

    window.addEventListener('nawiri:session-expired', handleSessionExpired);
    return () => window.removeEventListener('nawiri:session-expired', handleSessionExpired);
  }, [dispatch]);

  // Detects when a newer deploy has gone live and reloads this tab onto it,
  // so cashiers/staff who leave a page open for a whole shift don't stay
  // stuck running old code (an already-loaded SPA never re-checks its own
  // bundle on its own). Safe to do silently: in-progress Sales Counter
  // state is restored from sessionStorage after reload (see SalesCounter.jsx).
  // Runs on a 5-minute cooldown, both periodically and whenever the tab
  // becomes visible again — the periodic timer also fires while backgrounded
  // so a stale tab is often already updated by the time it's switched back to.
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    const checkForUpdate = async () => {
      if (reloadingForUpdateRef.current) return;
      const now = Date.now();
      if (now - lastVersionCheckRef.current < 5 * 60 * 1000) return;
      lastVersionCheckRef.current = now;

      try {
        const response = await fetch(`/version.json?t=${now}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.buildId && data.buildId !== __APP_BUILD_ID__) {
          if (CHECKOUT_LIKE_PATHS.includes(currentPathRef.current)) {
            // Reloading now would wipe in-progress checkout/guest-checkout/
            // M-Pesa STK-wait UI — most commonly hit when a customer returns
            // to the tab after switching to the M-Pesa app to approve a push.
            // Defer the reload until they navigate away from that page instead.
            pendingReloadRef.current = true;
            return;
          }
          reloadingForUpdateRef.current = true;
          window.location.reload();
        }
      } catch (error) {
        console.warn('Version check failed (offline or blocked) — will retry later:', error?.message);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(checkForUpdate, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  // Keeps currentPathRef current for checkForUpdate above (defined once, in
  // a `[]`-dependency effect, so it can't read location.pathname directly
  // without becoming a stale closure) and flushes a reload that effect
  // deferred while the visitor was on a checkout-like page, the moment they
  // navigate away from it.
  useEffect(() => {
    currentPathRef.current = location.pathname;

    if (pendingReloadRef.current && !CHECKOUT_LIKE_PATHS.includes(location.pathname)) {
      pendingReloadRef.current = false;
      reloadingForUpdateRef.current = true;
      window.location.reload();
    }
  }, [location.pathname]);

  // Ensures categories are loaded for a direct/refreshed visit to a category
  // route, and logs when navigation state (used elsewhere for breadcrumbs)
  // is missing on one — was two near-duplicate effects, merged here. Both
  // depended on the `categories` array itself; since the reducer stores a
  // *new* empty array on every fetch, landing on a category route before the
  // first successful fetch re-ran this effect on every render in a tight
  // loop. Depending on categories.length instead is stable once loaded.
  useEffect(() => {
    // Treat category routes as /:slug-:id and not other dashed paths (e.g., /staff-pos)
    const isCategoryRoute = /^\/(category|categories|c)\/[^/]+-[a-f0-9]{8,}$/i.test(location.pathname) ||
                            /\/[^/]+-[a-f0-9]{8,}$/i.test(location.pathname);
    if (!isCategoryRoute) return;

    console.log("App detected category route:", location.pathname);
    console.log("App has navigation state:", location.state);

    // Ensure categories are loaded for category routes
    if (categories.length === 0) {
      console.log("Categories not loaded yet for category route - fetching now");
      fetchProductData();
    }

    // Check if state is missing (happens with direct URL navigation)
    if (!location.state) {
      console.log("[warn] No state available for category route - this likely means direct URL access");

      // Try to extract category/subcategory IDs from URL
      const pathParts = location.pathname.split('/').filter(Boolean);
      const categoryPart = pathParts[pathParts.length - 1] || '';
      const categoryMatch = categoryPart.match(/-([\da-f]+)$/);

      if (categoryMatch && categoryMatch[1]) {
        const extractedCategoryId = categoryMatch[1];
        console.log("Extracted category ID from URL:", extractedCategoryId);

        // You might want to fetch specific data here or set state
      }
    }
  }, [location.pathname, categories.length, location.state]);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/verification-otp', '/reset-password', '/verify-email'].includes(location.pathname);
  const isDashboardShell = location.pathname.startsWith('/dashboard');
  const isDeliveryShell = location.pathname.startsWith('/delivery');
  const isPOSPage = location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos');

  const showStoreChrome = !isAuthPage && !isDashboardShell && !isDeliveryShell;
  const showMobileNavigation = !isAuthPage && !isDashboardShell;

  // Show loading screen while app is initializing to prevent flash of empty state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory dark:bg-dm-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-charcoal dark:text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GlobalProvider>
        <WhatsAppOrderProvider>
        {storePortalHost ? <Suspense fallback={<div className="p-5 text-center">Loading...</div>}><StoreManagementApp /></Suspense> : <>
        <ScrollRestoration />
        {isDashboardShell && !isPOSPage && <DashboardMobileHeader />}
        {showStoreChrome && <Header />}
        <main className={`min-h-[78vh] max-w-full ${getPOSOverflowClass(isPOSPage)}`}>
          {/* Add suspense to catch lazy-loaded component errors */}
          <Suspense fallback={<div className="p-5 text-center">Loading...</div>}>
            <Outlet key={location.pathname} />
          </Suspense>
        </main>
        {showStoreChrome && <Footer />}
        {showMobileNavigation && <BottomNavigation />}
        <Toaster />
        <ToastContainer position="top-right" autoClose={3000} />
        <AdminSecretGate />
        {showStoreChrome && location.pathname !== '/checkout' && location.pathname !== '/dashboard/checkout' && user?._id && <CartMobileLink />}
        {showStoreChrome && <WhatsAppOrderWidget />}
        {/* ChatbotAI hidden: AI feature not yet complete */}
        </>}
        </WhatsAppOrderProvider>
      </GlobalProvider>
    </ErrorBoundary>
  );
}

export default App;
