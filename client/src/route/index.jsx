import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
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
import ErrorPage from '../pages/ErrorPage';
import Home from '../pages/Home';
import Login from '../pages/Login';
import MyOrders from '../pages/MyOrders';
import OrderTracking from '../pages/OrderTracking.jsx';
import ProductPage from '../pages/Product';
import ProductDisplayPage from '../pages/ProductDisplayPage';
import ProductListPage from '../pages/ProductListPage';
import Register from '../pages/Register';
import SubCategoryPage from '../pages/SubCategoryPage';
import Success from '../pages/Success';
import UploadProduct from '../pages/UploadProduct';
import UserProfile from '../pages/UserProfile';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
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
      // Fixed pattern to match category and subcategory URLs
      {
        path: ':categoryName-:categoryId',
        element: <ProductListPage />
      },
      {
        path: ':categoryName-:categoryId/:subcategoryName-:subcategoryId',
        element: <ProductListPage />
      },
      {
        path: 'product/:productId',
        element: <ProductDisplayPage />
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
      // Catch-all route for unmatched pages
      {
        path: '*',
        element: <ErrorPage />
      }
    ]
  }
]);

export default router;