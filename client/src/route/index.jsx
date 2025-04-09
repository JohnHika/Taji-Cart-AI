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
import PendingPickups from '../pages/staff/PendingPickups';
import VerificationHistory from '../pages/staff/VerificationHistory';
import VerificationSuccess from '../pages/staff/VerificationSuccess';
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
    "/:categoryName-:categoryId/:subcategoryName-:subcategoryId"
  ],
  // Add other route groups as needed
});

// Add this at the top of the file (before the router definition)
console.log("==== DEBUGGING CATEGORY ROUTES ====");
console.log("Current location:", window.location.pathname);

// Add a function to determine if a path should be treated as a category page
function isCategoryRoute(path) {
  // Check if the URL contains a MongoDB ObjectID (24 hex characters) at the end
  return /[a-f0-9]{24}$/.test(path);
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
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
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
        path: 'delivery-simulator',
        element: (
          <PrivateRoute>
            <DeliverySimulator />
          </PrivateRoute>
        )
      },
      // Move these important routes higher in the list for priority matching
      // Fixed pattern to match category and subcategory URLs
      {
        path: 'product-category/:categoryId',
        element: <ProductListPage />
      },
      {
        path: ':categoryName-:categoryId',
        element: (
          <>
            {console.log("Rendering category-only route")}
            <ProductListPage />
          </>
        )
      },
      {
        path: ':categoryName-:categoryId/:subcategoryName-:subcategoryId',
        element: (
          <>
            {console.log("Rendering category-subcategory route")}
            <ProductListPage />
          </>
        )
      },
      // Catch all category routes with multiple formats
      // Format: /category-name-ID
      {
        path: ':name-:id([a-f0-9]{24})',
        element: <ProductListPage />,
      },
      
      // Format: /category-name-with-hyphens-ID
      {
        path: '*-:id([a-f0-9]{24})',
        element: <ProductListPage />,
      },
      
      // Fallback for just IDs: /ID
      {
        path: ':id([a-f0-9]{24})',
        element: <ProductListPage />,
      },
      
      // Special catch-all route that should match any category ID pattern
      // This will catch direct navigation to category pages that might otherwise not match
      {
        path: '*-:categoryId([a-f0-9]+)',
        element: (
          <RouteDebugger 
            component={ProductListPage} 
            routeName="Catch-all category route" 
          />
        )
      },
      // Then list more specific routes
      {
        path: 'product/:productId',
        element: <ProductDisplayPage />
      },
      // Ensure category routes are properly defined
      {
        path: 'categories',
        element: <CategoryPage />
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
      // Delivery routes with specialized layout
      {
        path: 'delivery',
        element: <DeliveryLayout />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />
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
          // Staff specific routes
          {
            path: 'dashboard/staff',
            element: (
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            ),
            children: [
              {
                path: 'pending-pickups',
                element: (
                  <PrivateRoute requireStaff={true}>
                    <PendingPickups />
                  </PrivateRoute>
                )
              },
              {
                path: 'completed-verifications',
                element: (
                  <PrivateRoute requireStaff={true}>
                    <VerificationHistory />
                  </PrivateRoute>
                )
              },
              {
                path: 'verification-success',
                element: (
                  <PrivateRoute requireStaff={true}>
                    <VerificationSuccess />
                  </PrivateRoute>
                )
              }
            ]
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