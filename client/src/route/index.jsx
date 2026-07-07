import React, { Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import App from '../App';
import PrivateRoute from '../components/PrivateRoute';

// Eagerly loaded — tiny, needed on every route
import CategoryFallbackErrorPage from '../components/CategoryFallbackErrorPage';
import CategorySmartFallback from '../components/CategorySmartFallback';

// Lazy-loaded page chunks
const Home                         = React.lazy(() => import('../pages/Home'));
const Login                        = React.lazy(() => import('../pages/Login'));
const Register                     = React.lazy(() => import('../pages/Register'));
const VerifyEmailPage              = React.lazy(() => import('../pages/VerifyEmailPage'));
const ForgotPassword               = React.lazy(() => import('../pages/ForgotPassword'));
const OtpVerification              = React.lazy(() => import('../pages/OtpVerification'));
const ResetPassword                = React.lazy(() => import('../pages/ResetPassword'));
const SocialAuthSuccess            = React.lazy(() => import('../pages/SocialAuthSuccess'));
const SearchPage                   = React.lazy(() => import('../pages/SearchPage'));
const OrderTracking                = React.lazy(() => import('../pages/OrderTracking'));
const ProductDisplayPage           = React.lazy(() => import('../pages/ProductDisplayPage'));
const CollectionsPage              = React.lazy(() => import('../pages/CollectionsPage'));
const ShopTheLookGallery           = React.lazy(() => import('../components/ShopTheLookGallery'));
const GuestCheckout                = React.lazy(() => import('../pages/GuestCheckout'));
const GuestOrderTracking           = React.lazy(() => import('../pages/GuestOrderTracking'));
const StaffPOS                     = React.lazy(() => import('../pages/StaffPOS'));
const ProductListPage              = React.lazy(() => import('../pages/ProductListPage'));
const CartMobile                   = React.lazy(() => import('../pages/CartMobile'));
const UserMenuMobile               = React.lazy(() => import('../pages/UserMenuMobile'));
const ProductPage                  = React.lazy(() => import('../pages/Product'));
const SubCategoryPage              = React.lazy(() => import('../pages/SubCategoryPage'));
const ActiveCampaigns              = React.lazy(() => import('../pages/ActiveCampaigns'));
const Success                      = React.lazy(() => import('../pages/Success'));
const MpesaPaymentStatus           = React.lazy(() => import('../components/MpesaPaymentStatus'));
const DeliverySimulator            = React.lazy(() => import('../pages/DeliverySimulator'));
const LoyaltyProgramPage           = React.lazy(() => import('../pages/LoyaltyProgramPage'));
const Address                      = React.lazy(() => import('../pages/Address'));
const MyOrders                     = React.lazy(() => import('../pages/MyOrders'));
const UserProfile                  = React.lazy(() => import('../pages/UserProfile'));
const DashboardHome                = React.lazy(() => import('../pages/DashboardHome'));
const DashboardCart                = React.lazy(() => import('../pages/DashboardCart'));
const DashboardCheckout            = React.lazy(() => import('../pages/DashboardCheckout'));
const UploadProduct                = React.lazy(() => import('../pages/UploadProduct'));
const CategoryPage                 = React.lazy(() => import('../pages/CategoryPage'));
const AllOrdersAdmin               = React.lazy(() => import('../pages/admin/AllOrdersAdmin'));
const LoyaltyProgramAdmin          = React.lazy(() => import('../pages/admin/LoyaltyProgramAdmin'));
const UsersAdmin                   = React.lazy(() => import('../pages/admin/UsersAdmin'));
const CommunityPerksAdmin          = React.lazy(() => import('../pages/admin/CommunityPerksAdmin'));
const CommunityPerks               = React.lazy(() => import('../pages/CommunityPerks'));
const POSDashboard                 = React.lazy(() => import('../pages/POSDashboard'));
const POSSales                     = React.lazy(() => import('../pages/POSSales'));

// Delivery pages
const Dashboard                    = React.lazy(() => import('../layouts/Dashboard'));
const DeliveryLayout               = React.lazy(() => import('../layouts/DeliveryLayout'));
const DeliveryDashboard            = React.lazy(() => import('../pages/delivery/Dashboard'));
const ActiveDeliveries             = React.lazy(() => import('../pages/delivery/ActiveDeliveries'));
const CompletedDeliveries          = React.lazy(() => import('../pages/delivery/CompletedDeliveries'));
const DeliveryHistory              = React.lazy(() => import('../pages/delivery/DeliveryHistory'));
const DeliveryMap                  = React.lazy(() => import('../pages/delivery/DeliveryMap'));

// Staff pages
const StaffDashboard               = React.lazy(() => import('../pages/staff/Dashboard'));
const DeliveryManagement           = React.lazy(() => import('../pages/staff/DeliveryManagement'));
const PendingDispatch              = React.lazy(() => import('../pages/staff/DeliveryManagement/PendingDispatch'));
const DispatchedOrders             = React.lazy(() => import('../pages/staff/DeliveryManagement/DispatchedOrders'));
const ActiveDeliveriesManagement   = React.lazy(() => import('../pages/staff/DeliveryManagement/ActiveDeliveries'));
const CompletedDeliveriesManagement = React.lazy(() => import('../pages/staff/DeliveryManagement/CompletedDeliveries'));
const DriversManagement            = React.lazy(() => import('../pages/staff/DeliveryManagement/DriversManagement'));
const PendingPickups               = React.lazy(() => import('../pages/staff/PendingPickups'));
const VerificationHistory          = React.lazy(() => import('../pages/staff/VerificationHistory'));
const VerificationSuccess          = React.lazy(() => import('../pages/staff/VerificationSuccess'));
const VerifyPickup                 = React.lazy(() => import('../pages/staff/VerifyPickup'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function lazy(element) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function LegacyCheckoutRedirect() {
  const location = useLocation();
  return <Navigate to="/dashboard/checkout" replace state={location.state} />;
}

const isMongoObjectId = (value = '') => /^[a-f0-9]{24}$/i.test(value);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <CategoryFallbackErrorPage />,
    children: [
      { index: true,                      element: lazy(<Home />) },
      { path: 'login',                    element: lazy(<Login />) },
      { path: 'register',                 element: lazy(<Register />) },
      { path: 'verify-email',             element: lazy(<VerifyEmailPage />) },
      { path: 'forgot-password',          element: lazy(<ForgotPassword />) },
      { path: 'verification-otp',         element: lazy(<OtpVerification />) },
      { path: 'reset-password',           element: lazy(<ResetPassword />) },
      { path: 'social-auth-success',      element: lazy(<SocialAuthSuccess />) },
      { path: 'search',                   element: lazy(<SearchPage />) },
      { path: 'order-tracking/:orderId',  element: lazy(<OrderTracking />) },
      { path: 'product/:productId',       element: lazy(<ProductDisplayPage />) },
      { path: 'categories',              element: <Navigate to="/" replace /> },
      { path: 'collections',             element: lazy(<CollectionsPage />) },
      { path: 'shop-the-look',           element: lazy(<ShopTheLookGallery />) },
      { path: 'guest-checkout',          element: lazy(<GuestCheckout />) },
      { path: 'order/track-guest',       element: lazy(<GuestOrderTracking />) },
      { path: 'mobile/cart',             element: lazy(<CartMobile />) },
      { path: 'mobile/profile',          element: lazy(<UserMenuMobile />) },
      { path: 'product',                 element: lazy(<ProductPage />) },
      { path: 'subcategory',             element: lazy(<SubCategoryPage />) },
      { path: 'campaigns',               element: lazy(<ActiveCampaigns />) },
      { path: 'success',                 element: lazy(<Success />) },
      { path: 'mpesa-payment-status',    element: lazy(<MpesaPaymentStatus />) },
      {
        path: 'checkout',
        element: (
          <PrivateRoute>
            <LegacyCheckoutRedirect />
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
        path: 'delivery-simulator',
        element: (
          <PrivateRoute>
            {lazy(<DeliverySimulator />)}
          </PrivateRoute>
        )
      },
      {
        path: 'staff-pos',
        element: (
          <PrivateRoute requireStaff={true}>
            {lazy(<StaffPOS />)}
          </PrivateRoute>
        )
      },
      {
        path: 'sales-counter',
        element: (
          <PrivateRoute requireStaff={true}>
            {lazy(<StaffPOS />)}
          </PrivateRoute>
        )
      },
      // Category routes
      {
        path: 'product-category/:categoryId',
        element: lazy(<ProductListPage />)
      },
      {
        path: ':categoryName-:categoryId',
        element: lazy(<ProductListPage />),
        loader: ({ params }) => {
          if (!isMongoObjectId(params.categoryId)) throw new Response('Not Found', { status: 404 });
          return null;
        }
      },
      {
        path: ':categoryName-:categoryId/:subcategoryName-:subcategoryId',
        element: lazy(<ProductListPage />),
        loader: ({ params }) => {
          if (!isMongoObjectId(params.categoryId) || !isMongoObjectId(params.subcategoryId)) {
            throw new Response('Not Found', { status: 404 });
          }
          return null;
        }
      },
      {
        path: ':slug-:id',
        element: lazy(<ProductListPage />),
        loader: ({ params }) => {
          const reservedWords = ['staff', 'admin', 'dashboard', 'pos', 'api', 'auth', 'login', 'register'];
          const containsReserved = reservedWords.some(word => params.slug?.toLowerCase().includes(word));
          if (!/^[a-f0-9]{24}$/i.test(params.id) || containsReserved) {
            throw new Response('Not Found', { status: 404 });
          }
          return null;
        }
      },
      // Delivery routes
      {
        path: 'delivery',
        element: (
          <PrivateRoute requireDelivery={true}>
            {lazy(<DeliveryLayout />)}
          </PrivateRoute>
        ),
        children: [
          { path: 'dashboard', element: lazy(<DeliveryDashboard />) },
          { path: 'active',    element: lazy(<ActiveDeliveries />) },
          { path: 'completed', element: lazy(<CompletedDeliveries />) },
          { path: 'history',   element: lazy(<DeliveryHistory />) },
          { path: 'map',       element: lazy(<DeliveryMap />) },
        ]
      },
      // Dashboard routes
      {
        path: 'dashboard',
        element: (
          <PrivateRoute>
            {lazy(<Dashboard />)}
          </PrivateRoute>
        ),
        children: [
          { index: true,          element: lazy(<DashboardHome />) },
          { path: 'profile',      element: lazy(<UserProfile />) },
          { path: 'cart',         element: lazy(<DashboardCart />) },
          { path: 'checkout',     element: lazy(<DashboardCheckout />) },
          {
            path: 'upload-product',
            element: <PrivateRoute requireAdmin={true}>{lazy(<UploadProduct />)}</PrivateRoute>
          },
          {
            path: 'product',
            element: <PrivateRoute requireAdmin={true}>{lazy(<ProductPage />)}</PrivateRoute>
          },
          {
            path: 'category',
            element: <PrivateRoute requireAdmin={true}>{lazy(<CategoryPage />)}</PrivateRoute>
          },
          {
            path: 'subcategory',
            element: <PrivateRoute requireAdmin={true}>{lazy(<SubCategoryPage />)}</PrivateRoute>
          },
          {
            path: 'allorders',
            element: <PrivateRoute requireAdmin={true}>{lazy(<AllOrdersAdmin />)}</PrivateRoute>
          },
          {
            path: 'loyalty-program-admin',
            element: <PrivateRoute requireAdmin={true}>{lazy(<LoyaltyProgramAdmin />)}</PrivateRoute>
          },
          {
            path: 'users-admin',
            element: <PrivateRoute requireAdmin={true}>{lazy(<UsersAdmin />)}</PrivateRoute>
          },
          {
            path: 'admin-community-perks',
            element: <PrivateRoute requireAdmin={true}>{lazy(<CommunityPerksAdmin />)}</PrivateRoute>
          },
          {
            path: 'myorders',
            element: <PrivateRoute>{lazy(<MyOrders />)}</PrivateRoute>
          },
          {
            path: 'address',
            element: <PrivateRoute>{lazy(<Address />)}</PrivateRoute>
          },
          {
            path: 'community-perks',
            element: <PrivateRoute>{lazy(<CommunityPerks />)}</PrivateRoute>
          },
          {
            path: 'loyalty-program',
            element: <PrivateRoute>{lazy(<LoyaltyProgramPage />)}</PrivateRoute>
          },
          {
            path: 'active-campaigns',
            element: <PrivateRoute>{lazy(<ActiveCampaigns />)}</PrivateRoute>
          },
          // Delivery redirects
          { path: 'delivery/dashboard', element: <Navigate to="/delivery/dashboard" replace /> },
          { path: 'delivery/active',    element: <Navigate to="/delivery/active"    replace /> },
          { path: 'delivery/completed', element: <Navigate to="/delivery/completed" replace /> },
          { path: 'delivery/history',   element: <Navigate to="/delivery/history"   replace /> },
          { path: 'delivery/map',       element: <Navigate to="/delivery/map"       replace /> },
          // Staff routes
          {
            path: 'staff',
            element: <PrivateRoute requireStaff={true}>{lazy(<StaffDashboard />)}</PrivateRoute>
          },
          {
            path: 'staff/dashboard',
            element: <PrivateRoute requireStaff={true}>{lazy(<StaffDashboard />)}</PrivateRoute>
          },
          {
            path: 'staff/pending-pickups',
            element: <PrivateRoute requireStaff={true}>{lazy(<PendingPickups />)}</PrivateRoute>
          },
          {
            path: 'staff/verify-pickup',
            element: <PrivateRoute requireStaff={true}>{lazy(<VerifyPickup />)}</PrivateRoute>
          },
          {
            path: 'staff/completed-verifications',
            element: <PrivateRoute requireStaff={true}>{lazy(<VerificationHistory />)}</PrivateRoute>
          },
          {
            path: 'staff/verification-success',
            element: <PrivateRoute requireStaff={true}>{lazy(<VerificationSuccess />)}</PrivateRoute>
          },
          {
            path: 'staff-pos',
            element: <PrivateRoute requireStaff={true}>{lazy(<StaffPOS />)}</PrivateRoute>
          },
          {
            path: 'sales-counter',
            element: <PrivateRoute requireStaff={true}>{lazy(<StaffPOS />)}</PrivateRoute>
          },
          {
            path: 'pos-dashboard',
            element: <PrivateRoute requireStaff={true}>{lazy(<POSDashboard />)}</PrivateRoute>
          },
          {
            path: 'sales-hub',
            element: <PrivateRoute requireStaff={true}>{lazy(<POSDashboard />)}</PrivateRoute>
          },
          {
            path: 'pos-sales',
            element: <PrivateRoute requireStaff={true}>{lazy(<POSSales />)}</PrivateRoute>
          },
          {
            path: 'sales-history',
            element: <PrivateRoute requireStaff={true}>{lazy(<POSSales />)}</PrivateRoute>
          },
          {
            path: 'staff/delivery',
            element: <PrivateRoute requireStaff={true}>{lazy(<DeliveryManagement />)}</PrivateRoute>,
            children: [
              { index: true,         element: <Navigate to="pending" replace /> },
              { path: 'pending',     element: lazy(<PendingDispatch />) },
              { path: 'dispatched',  element: lazy(<DispatchedOrders />) },
              { path: 'active',      element: lazy(<ActiveDeliveriesManagement />) },
              { path: 'completed',   element: lazy(<CompletedDeliveriesManagement />) },
              { path: 'drivers',     element: lazy(<DriversManagement />) },
            ]
          }
        ]
      },
      { path: '*', element: <CategorySmartFallback /> }
    ]
  }
]);

export default router;
