import React, { useEffect } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import App from '../App';
import CategoryFallbackErrorPage from '../components/CategoryFallbackErrorPage';
import CategorySmartFallback from '../components/CategorySmartFallback';
import MpesaPaymentStatus from '../components/MpesaPaymentStatus';
import PrivateRoute from '../components/PrivateRoute';
import Dashboard from '../layouts/Dashboard';
import DeliveryLayout from '../layouts/DeliveryLayout';
import ActiveCampaigns from '../pages/ActiveCampaigns';
import Address from '../pages/Address';
// import AdminChatMonitor from '../pages/admin/AdminChatMonitor'; // Hidden: AI not yet complete
import AllOrdersAdmin from '../pages/admin/AllOrdersAdmin';
// import ChatSessionView from '../pages/admin/ChatSessionView'; // Hidden: AI not yet complete
import CommunityPerksAdmin from '../pages/admin/CommunityPerksAdmin';
import LoyaltyProgramAdmin from '../pages/admin/LoyaltyProgramAdmin';
import UsersAdmin from '../pages/admin/UsersAdmin';
import CategoryPage from '../pages/CategoryPage';
// import ChatInterface from '../pages/ChatInterface'; // Hidden: AI not yet complete
import CommunityPerks from '../pages/CommunityPerks';
import ActiveDeliveries from '../pages/delivery/ActiveDeliveries';
import CompletedDeliveries from '../pages/delivery/CompletedDeliveries';
import DeliveryDashboard from '../pages/delivery/Dashboard';
import DeliveryHistory from '../pages/delivery/DeliveryHistory';
import DeliveryMap from '../pages/delivery/DeliveryMap';
import DeliverySimulator from '../pages/DeliverySimulator';
import DashboardHome from '../pages/DashboardHome';
import Home from '../pages/Home';
import Login from '../pages/Login';
import MyOrders from '../pages/MyOrders';
import OtpVerification from '../pages/OtpVerification';
import OrderTracking from '../pages/OrderTracking.jsx';
import ProductPage from '../pages/Product';
import ProductDisplayPage from '../pages/ProductDisplayPage';
import ProductListPage from '../pages/ProductListPage';
import Register from '../pages/Register';
import ResetPassword from '../pages/ResetPassword';
import SearchPage from '../pages/SearchPage'; // Add SearchPage import
import SocialAuthSuccess from '../pages/SocialAuthSuccess'; // Import the SocialAuthSuccess component
import StaffPOS from '../pages/StaffPOS'; // Import POS component
import POSDashboard from '../pages/POSDashboard'; // Import POS Dashboard component
import POSSales from '../pages/POSSales';

// Import new staff components
import StaffDashboard from '../pages/staff/Dashboard';
import ActiveDeliveriesManagement from '../pages/staff/DeliveryManagement/ActiveDeliveries';
import CompletedDeliveriesManagement from '../pages/staff/DeliveryManagement/CompletedDeliveries';
import DeliveryManagement from '../pages/staff/DeliveryManagement';
import DispatchedOrders from '../pages/staff/DeliveryManagement/DispatchedOrders';
import DriversManagement from '../pages/staff/DeliveryManagement/DriversManagement';
import PendingDispatch from '../pages/staff/DeliveryManagement/PendingDispatch';

// Legacy staff pages
import PendingPickups from '../pages/staff/PendingPickups';
import VerificationHistory from '../pages/staff/VerificationHistory';
import VerificationSuccess from '../pages/staff/VerificationSuccess';
import VerifyPickup from '../pages/staff/VerifyPickup';
import CollectionsPage from '../pages/CollectionsPage';
import ForgotPassword from '../pages/ForgotPassword';
import SubCategoryPage from '../pages/SubCategoryPage';
import Success from '../pages/Success';
import UploadProduct from '../pages/UploadProduct';
import LoyaltyProgramPage from '../pages/LoyaltyProgramPage';
import UserProfile from '../pages/UserProfile';
import UserMenuMobile from '../pages/UserMenuMobile';
import CartMobile from '../pages/CartMobile';
import DashboardCart from '../pages/DashboardCart';
import DashboardCheckout from '../pages/DashboardCheckout';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import UserSettings from '../pages/UserSettings';

function LegacyCheckoutRedirect() {
  const location = useLocation();
  return <Navigate to="/dashboard/checkout" replace state={location.state} />;
}

// Add this debugging code near the top of your router configuration
console.log("==== ROUTER CONFIGURATION ====");
console.log("Configuring routes:", {
  // List all your routes here for debugging
  categoryRoutes: [
    "/:categoryName-:categoryId",
    "/:categoryName/:categoryId"
  ],
});

// Add this at the top of the file (before the router definition)
console.log("==== DEBUGGING CATEGORY ROUTES ====");
console.log("Current location:", window.location.pathname);

// Add a function to determine if a path should be treated as a category page
function isCategoryRoute(path) {
  // More lenient check for alphanumeric IDs at the end
  return /[a-f0-9]{12,}$/.test(path) || /-[a-f0-9]{12,}$/.test(path);
}

// Get the current path
const currentPath = window.location.pathname;
if (isCategoryRoute(currentPath)) {
  console.log("Detected current path is likely a category route:", currentPath);
}

// Add a diagnostic wrapper component to help debug route issues
const RouteDebugger = ({ component: Component, routeName }) => {
  console.log(`Rendering route: ${routeName}`);
  
  useEffect(() => {
    console.log(`Route ${routeName} mounted`);
    return () => console.log(`Route ${routeName} unmounted`);
  }, [routeName]);
  
  try {
    return <Component />;
  } catch (error) {
    console.error(`Error rendering ${routeName}:`, error);
    return (
      <div className="p-8 bg-red-50 text-red-500 rounded m-4">
        <h2 className="text-xl font-bold">Error rendering {routeName}</h2>
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {error.stack || error.message}
        </pre>
      </div>
    );
  }
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <CategoryFallbackErrorPage />,
    children: [
      {
        index: true,
        element: <Home />
      },
      // Standard app routes
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      },
      {
        path: 'verify-email',
        element: <VerifyEmailPage />
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />
      },
      {
        path: 'verification-otp',
        element: <OtpVerification />
      },
      {
        path: 'reset-password',
        element: <ResetPassword />
      },
      // Add SocialAuthSuccess route
      {
        path: 'social-auth-success',
        element: <SocialAuthSuccess />
      },
      // Add search route
      {
        path: 'search',
        element: <RouteDebugger component={SearchPage} routeName="Search Page" />
      },
      {
        path: 'checkout',
        element: (
          <PrivateRoute>
            <LegacyCheckoutRedirect />
          </PrivateRoute>
        )
      },
      {
        path: 'order-tracking/:orderId',
        element: <OrderTracking />
      },
      {
        path: 'product/:productId',
        element: <ProductDisplayPage />
      },
      {
        path: 'categories',
        element: <Navigate to="/" replace />
      },
      {
        path: 'collections',
        element: <CollectionsPage />
      },

      // Staff POS route - must be before category catch-all routes
      {
        path: 'staff-pos',
        element: (
          <PrivateRoute requireStaff={true}>
            <StaffPOS />
          </PrivateRoute>
        )
      },
      {
        path: 'sales-counter',
        element: (
          <PrivateRoute requireStaff={true}>
            <StaffPOS />
          </PrivateRoute>
        )
      },
      
      // Core category routes - With proper flexibility for IDs
      {
        path: 'product-category/:categoryId',
        element: <ProductListPage />
      },
      // Primary category pattern with name and ID
      {
        path: ':categoryName-:categoryId',
        element: <RouteDebugger component={ProductListPage} routeName="Category by name-id" />
      },
      // Subcategory pattern
      {
        path: ':categoryName-:categoryId/:subcategoryName-:subcategoryId',
        element: <RouteDebugger component={ProductListPage} routeName="Category with subcategory" />
      },
      // Generic pattern for category routes with ObjectId-like IDs at the end (24 chars hex)
      // This should only match actual category slugs, not app routes like staff-pos
      {
        path: ':slug-:id',
        element: <RouteDebugger component={ProductListPage} routeName="Generic category route" />,
        loader: ({ params }) => {
          // Only match if the ID looks like a MongoDB ObjectId (24 character hex string)
          // and the slug doesn't contain reserved words
          const reservedWords = ['staff', 'admin', 'dashboard', 'pos', 'api', 'auth', 'login', 'register'];
          const containsReserved = reservedWords.some(word => params.slug?.toLowerCase().includes(word));
          
          if (!/^[a-f0-9]{24}$/i.test(params.id) || containsReserved) {
            throw new Response("Not Found", { status: 404 });
          }
          return null;
        }
      },
      
      // Chat route hidden: AI feature not yet complete
      // {
      //   path: 'chat',
      //   element: <ChatInterface />
      // },
      
      // Mobile-specific routes
      {
        path: 'mobile/cart',
        element: <CartMobile />
      },
      {
        path: 'mobile/profile',
        element: (
          <PrivateRoute>
            <UserMenuMobile />
          </PrivateRoute>
        )
      },
      {
        path: 'wishlist',
        element: (
          <PrivateRoute>
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-ivory dark:bg-dm-surface p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-plum-50 dark:bg-plum-900/20 flex items-center justify-center">
                <span className="text-2xl">🤍</span>
              </div>
              <h1 className="text-xl font-semibold text-charcoal dark:text-white">Wishlist</h1>
              <p className="text-sm text-brown-400 dark:text-white/50">Your wishlist is coming soon!</p>
            </div>
          </PrivateRoute>
        )
      },
      {
        path: 'product',
        element: <ProductPage />
      },
      {
        path: 'subcategory',
        element: <SubCategoryPage />
      },
      {
        path: 'campaigns',
        element: <ActiveCampaigns />
      },
      {
        path: 'success',
        element: <Success />
      },
      {
        path: 'mpesa-payment-status',
        element: <MpesaPaymentStatus />
      },
      {
        path: 'delivery-simulator',
        element: (
          <PrivateRoute>
            <DeliverySimulator />
          </PrivateRoute>
        )
      },
      
      // Delivery routes with specialized layout
      {
        path: 'delivery',
        element: <DeliveryLayout />,
        children: [
          {
            path: 'dashboard',
            element: <DeliveryDashboard />
          },
          {
            path: 'active',
            element: <ActiveDeliveries />
          },
          {
            path: 'completed',
            element: <CompletedDeliveries />
          },
          {
            path: 'history',
            element: <DeliveryHistory />
          },
          {
            path: 'map',
            element: <DeliveryMap />
          }
        ]
      },
      // Dashboard routes - All under one unified dashboard structure
      {
        path: 'dashboard',
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardHome />
          },
          {
            path: 'profile',
            element: <UserProfile />
          },
          {
            path: 'cart',
            element: <DashboardCart />
          },
          {
            path: 'checkout',
            element: <DashboardCheckout />
          },
          {
            path: 'settings',
            element: <UserSettings />
          },

          // Admin routes
          {
            path: 'upload-product',
            element: (
              <PrivateRoute requireAdmin={true}>
                <UploadProduct />
              </PrivateRoute>
            )
          },
          {
            path: 'product',
            element: (
              <PrivateRoute requireAdmin={true}>
                <ProductPage />
              </PrivateRoute>
            )
          },
          {
            path: 'category',
            element: (
              <PrivateRoute requireAdmin={true}>
                <CategoryPage />
              </PrivateRoute>
            )
          },
          {
            path: 'subcategory',
            element: (
              <PrivateRoute requireAdmin={true}>
                <SubCategoryPage />
              </PrivateRoute>
            )
          },
          {
            path: 'allorders',
            element: (
              <PrivateRoute requireAdmin={true}>
                <AllOrdersAdmin />
              </PrivateRoute>
            )
          },
          {
            path: 'loyalty-program-admin',
            element: (
              <PrivateRoute requireAdmin={true}>
                <LoyaltyProgramAdmin />
              </PrivateRoute>
            )
          },
          {
            path: 'users-admin',
            element: (
              <PrivateRoute requireAdmin={true}>
                <UsersAdmin />
              </PrivateRoute>
            )
          },
          
          // User routes
          {
            path: 'myorders',
            element: (
              <PrivateRoute>
                <MyOrders />
              </PrivateRoute>
            )
          },
          {
            path: 'address',
            element: (
              <PrivateRoute>
                <Address />
              </PrivateRoute>
            )
          },
          {
            path: 'admin-community-perks',
            element: (
              <PrivateRoute requireAdmin={true}>
                <CommunityPerksAdmin />
              </PrivateRoute>
            )
          },
          {
            path: 'community-perks',
            element: (
              <PrivateRoute>
                <CommunityPerks />
              </PrivateRoute>
            )
          },
          {
            path: 'loyalty-program',
            element: (
              <PrivateRoute>
                <LoyaltyProgramPage />
              </PrivateRoute>
            )
          },
          {
            path: 'active-campaigns',
            element: (
              <PrivateRoute>
                <ActiveCampaigns />
              </PrivateRoute>
            )
          },
          
          // Delivery specific routes
          {
            path: 'delivery/dashboard',
            element: <DeliveryDashboard />
          },
          {
            path: 'delivery/active',
            element: <ActiveDeliveries />
          },
          {
            path: 'delivery/completed',
            element: <CompletedDeliveries />
          },
          {
            path: 'delivery/history',
            element: <DeliveryHistory />
          },
          {
            path: 'delivery/map',
            element: <DeliveryMap />
          },
          
          // Staff specific routes - redirects for backward compatibility
          {
            path: 'staff',
            element: (
              <PrivateRoute requireStaff={true}>
                <StaffDashboard />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/dashboard',
            element: (
              <PrivateRoute requireStaff={true}>
                <StaffDashboard />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/pending-pickups',
            element: (
              <PrivateRoute requireStaff={true}>
                <PendingPickups />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/verify-pickup',
            element: (
              <PrivateRoute requireStaff={true}>
                <VerifyPickup />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/completed-verifications',
            element: (
              <PrivateRoute requireStaff={true}>
                <VerificationHistory />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/verification-success',
            element: (
              <PrivateRoute requireStaff={true}>
                <VerificationSuccess />
              </PrivateRoute>
            )
          },
          {
            path: 'staff-pos',
            element: (
              <PrivateRoute requireStaff={true}>
                <StaffPOS />
              </PrivateRoute>
            )
          },
          {
            path: 'sales-counter',
            element: (
              <PrivateRoute requireStaff={true}>
                <StaffPOS />
              </PrivateRoute>
            )
          },
          {
            path: 'pos-dashboard',
            element: (
              <PrivateRoute requireStaff={true}>
                <POSDashboard />
              </PrivateRoute>
            )
          },
          {
            path: 'sales-hub',
            element: (
              <PrivateRoute requireStaff={true}>
                <POSDashboard />
              </PrivateRoute>
            )
          },
          {
            path: 'pos-sales',
            element: (
              <PrivateRoute requireStaff={true}>
                <POSSales />
              </PrivateRoute>
            )
          },
          {
            path: 'sales-history',
            element: (
              <PrivateRoute requireStaff={true}>
                <POSSales />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery',
            element: (
              <PrivateRoute requireStaff={true}>
                <DeliveryManagement />
              </PrivateRoute>
            ),
            children: [
              {
                index: true,
                element: <Navigate to="pending" replace />
              },
              {
                path: 'pending',
                element: <PendingDispatch />
              },
              {
                path: 'dispatched',
                element: <DispatchedOrders />
              },
              {
                path: 'active',
                element: <ActiveDeliveriesManagement />
              },
              {
                path: 'completed',
                element: <CompletedDeliveriesManagement />
              },
              {
                path: 'drivers',
                element: <DriversManagement />
              }
            ]
          }
        ]
      },
      // Admin chat routes hidden: AI feature not yet complete
      // {
      //   path: 'admin/chats',
      //   element: (
      //     <PrivateRoute requireAdmin={true}>
      //       <AdminChatMonitor />
      //     </PrivateRoute>
      //   )
      // },
      // {
      //   path: 'admin/chat/:id',
      //   element: (
      //     <PrivateRoute requireAdmin={true}>
      //       <ChatSessionView />
      //     </PrivateRoute>
      //   )
      // },
      // Improved catch-all route
      {
        path: '*',
        element: <CategorySmartFallback />
      }
    ]
  }
]);

export default router;
