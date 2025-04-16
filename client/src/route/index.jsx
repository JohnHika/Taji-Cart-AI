import React, { useEffect } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import CategoryFallbackErrorPage from '../components/CategoryFallbackErrorPage';
import MpesaPaymentStatus from '../components/MpesaPaymentStatus';
import PrivateRoute from '../components/PrivateRoute';
import Dashboard from '../layouts/Dashboard';
import DeliveryLayout from '../layouts/DeliveryLayout';
import ActiveCampaigns from '../pages/ActiveCampaigns';
import Address from '../pages/Address';
import AdminChatMonitor from '../pages/admin/AdminChatMonitor';
import AllOrdersAdmin from '../pages/admin/AllOrdersAdmin';
import ChatSessionView from '../pages/admin/ChatSessionView';
import CommunityPerksAdmin from '../pages/admin/CommunityPerksAdmin';
import LoyaltyProgramAdmin from '../pages/admin/LoyaltyProgramAdmin';
import UsersAdmin from '../pages/admin/UsersAdmin';
import CategoryPage from '../pages/CategoryPage';
import Checkout from '../pages/CheckoutPage';
import CommunityPerks from '../pages/CommunityPerks';
import ActiveDeliveries from '../pages/delivery/ActiveDeliveries';
import CompletedDeliveries from '../pages/delivery/CompletedDeliveries';
import DeliveryDashboard from '../pages/delivery/Dashboard';
import DeliveryHistory from '../pages/delivery/DeliveryHistory';
import DeliveryMap from '../pages/delivery/DeliveryMap';
import DeliverySimulator from '../pages/DeliverySimulator';
import Home from '../pages/Home';
import Login from '../pages/Login';
import MyOrders from '../pages/MyOrders';
import OrderTracking from '../pages/OrderTracking.jsx';
import ProductPage from '../pages/Product';
import ProductDisplayPage from '../pages/ProductDisplayPage';
import ProductListPage from '../pages/ProductListPage';
import Register from '../pages/Register';
import SearchPage from '../pages/SearchPage'; // Add SearchPage import

// Import new staff components
import StaffDashboard from '../pages/staff/Dashboard';
import DeliveryManagement from '../pages/staff/DeliveryManagement';
import DispatchedOrders from '../pages/staff/DeliveryManagement/DispatchedOrders';
import DriversManagement from '../pages/staff/DeliveryManagement/DriversManagement';
import PendingDispatch from '../pages/staff/DeliveryManagement/PendingDispatch';

// Legacy staff pages
import PendingPickups from '../pages/staff/PendingPickups';
import VerificationHistory from '../pages/staff/VerificationHistory';
import VerificationSuccess from '../pages/staff/VerificationSuccess';
import VerifyPickup from '../pages/staff/VerifyPickup';
import SubCategoryPage from '../pages/SubCategoryPage';
import Success from '../pages/Success';
import UploadProduct from '../pages/UploadProduct';
import UserProfile from '../pages/UserProfile';

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
      // Add search route
      {
        path: 'search',
        element: <RouteDebugger component={SearchPage} routeName="Search Page" />
      },
      {
        path: 'checkout',
        element: (
          <PrivateRoute>
            <Checkout />
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
        element: <CategoryPage />
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
      // Generic pattern for any hyphenated path with an ID at the end
      {
        path: '*-:id',
        element: <RouteDebugger component={ProductListPage} routeName="Generic category route" />,
      },
      
      // Other app routes
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
            path: 'profile',
            element: <UserProfile />
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
            path: 'staff/delivery',
            element: (
              <PrivateRoute requireStaff={true}>
                <DeliveryManagement />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery/pending',
            element: (
              <PrivateRoute requireStaff={true}>
                <PendingDispatch />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery/dispatched',
            element: (
              <PrivateRoute requireStaff={true}>
                <DispatchedOrders />
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery/active',
            element: (
              <PrivateRoute requireStaff={true}>
                <div>Active Deliveries</div>
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery/completed',
            element: (
              <PrivateRoute requireStaff={true}>
                <div>Completed Deliveries</div>
              </PrivateRoute>
            )
          },
          {
            path: 'staff/delivery/drivers',
            element: (
              <PrivateRoute requireStaff={true}>
                <DriversManagement />
              </PrivateRoute>
            )
          }
        ]
      },
      {
        path: 'admin/chats',
        element: (
          <PrivateRoute requireAdmin={true}>
            <AdminChatMonitor />
          </PrivateRoute>
        )
      },
      {
        path: 'admin/chat/:id',
        element: (
          <PrivateRoute requireAdmin={true}>
            <ChatSessionView />
          </PrivateRoute>
        )
      },
      // Improved catch-all route
      {
        path: '*',
        element: <CategoryFallbackErrorPage />
      }
    ]
  }
]);

export default router;