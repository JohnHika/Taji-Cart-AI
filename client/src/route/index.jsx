import React, { Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import App from '../App';
import PrivateRoute from '../components/PrivateRoute';
import lazyWithRetry from '../utils/lazyWithRetry';

// Eagerly loaded — tiny, needed on every route
import CategoryFallbackErrorPage from '../components/CategoryFallbackErrorPage';
import CategorySmartFallback from '../components/CategorySmartFallback';

// Lazy-loaded page chunks
const Home                          = lazyWithRetry(() => import('../pages/Home'));
const Login                         = lazyWithRetry(() => import('../pages/Login'));
const Register                      = lazyWithRetry(() => import('../pages/Register'));
const VerifyEmailPage               = lazyWithRetry(() => import('../pages/VerifyEmailPage'));
const ForgotPassword                = lazyWithRetry(() => import('../pages/ForgotPassword'));
const OtpVerification               = lazyWithRetry(() => import('../pages/OtpVerification'));
const ResetPassword                 = lazyWithRetry(() => import('../pages/ResetPassword'));
const SocialAuthSuccess             = lazyWithRetry(() => import('../pages/SocialAuthSuccess'));
const SearchPage                    = lazyWithRetry(() => import('../pages/SearchPage'));
const OrderTracking                 = lazyWithRetry(() => import('../pages/OrderTracking'));
const ProductDisplayPage            = lazyWithRetry(() => import('../pages/ProductDisplayPage'));
const CollectionsPage               = lazyWithRetry(() => import('../pages/CollectionsPage'));
const WishlistPage                  = lazyWithRetry(() => import('../pages/WishlistPage'));
const ShopTheLookGallery            = lazyWithRetry(() => import('../components/ShopTheLookGallery'));
const GuestCheckout                 = lazyWithRetry(() => import('../pages/GuestCheckout'));
const GuestOrderTracking            = lazyWithRetry(() => import('../pages/GuestOrderTracking'));
const StaffPOS                      = lazyWithRetry(() => import('../pages/StaffPOS'));
const SalesCounter                  = lazyWithRetry(() => import('../pages/SalesCounter'));
const ProductListPage               = lazyWithRetry(() => import('../pages/ProductListPage'));
const CartMobile                    = lazyWithRetry(() => import('../pages/CartMobile'));
const UserMenuMobile                = lazyWithRetry(() => import('../pages/UserMenuMobile'));
const ProductPage                   = lazyWithRetry(() => import('../pages/Product'));
const SubCategoryPage               = lazyWithRetry(() => import('../pages/SubCategoryPage'));
const ActiveCampaigns               = lazyWithRetry(() => import('../pages/ActiveCampaigns'));
const Success                       = lazyWithRetry(() => import('../pages/Success'));
const DeliverySimulator             = lazyWithRetry(() => import('../pages/DeliverySimulator'));
const LoyaltyProgramPage            = lazyWithRetry(() => import('../pages/LoyaltyProgramPage'));
const Address                       = lazyWithRetry(() => import('../pages/Address'));
const MyOrders                      = lazyWithRetry(() => import('../pages/MyOrders'));
const UserProfile                   = lazyWithRetry(() => import('../pages/UserProfile'));
const DashboardHome                 = lazyWithRetry(() => import('../pages/DashboardHome'));
const DashboardCart                 = lazyWithRetry(() => import('../pages/DashboardCart'));
const DashboardCheckout             = lazyWithRetry(() => import('../pages/DashboardCheckout'));
const UploadProduct                 = lazyWithRetry(() => import('../pages/UploadProduct'));
const CategoryPage                  = lazyWithRetry(() => import('../pages/CategoryPage'));
const AllOrdersAdmin                = lazyWithRetry(() => import('../pages/admin/AllOrdersAdmin'));
const LoyaltyProgramAdmin           = lazyWithRetry(() => import('../pages/admin/LoyaltyProgramAdmin'));
const UsersAdmin                    = lazyWithRetry(() => import('../pages/admin/UsersAdmin'));
const CommunityPerksAdmin           = lazyWithRetry(() => import('../pages/admin/CommunityPerksAdmin'));
const CommunityPerks                = lazyWithRetry(() => import('../pages/CommunityPerks'));
const POSDashboard                  = lazyWithRetry(() => import('../pages/POSDashboard'));
const POSSales                      = lazyWithRetry(() => import('../pages/POSSales'));
const DashboardLayout               = lazyWithRetry(() => import('../layouts/Dashboard'));
const DeliveryLayout                = lazyWithRetry(() => import('../layouts/DeliveryLayout'));
const DeliveryDashboard             = lazyWithRetry(() => import('../pages/delivery/Dashboard'));
const ActiveDeliveries              = lazyWithRetry(() => import('../pages/delivery/ActiveDeliveries'));
const CompletedDeliveries           = lazyWithRetry(() => import('../pages/delivery/CompletedDeliveries'));
const DeliveryHistory               = lazyWithRetry(() => import('../pages/delivery/DeliveryHistory'));
const DeliveryMap                   = lazyWithRetry(() => import('../pages/delivery/DeliveryMap'));
const StaffDashboard                = lazyWithRetry(() => import('../pages/staff/Dashboard'));
const DeliveryManagement            = lazyWithRetry(() => import('../pages/staff/DeliveryManagement'));
const PendingDispatch               = lazyWithRetry(() => import('../pages/staff/DeliveryManagement/PendingDispatch'));
const DispatchedOrders              = lazyWithRetry(() => import('../pages/staff/DeliveryManagement/DispatchedOrders'));
const ActiveDeliveriesManagement    = lazyWithRetry(() => import('../pages/staff/DeliveryManagement/ActiveDeliveries'));
const CompletedDeliveriesManagement = lazyWithRetry(() => import('../pages/staff/DeliveryManagement/CompletedDeliveries'));
const DriversManagement             = lazyWithRetry(() => import('../pages/staff/DeliveryManagement/DriversManagement'));
const PendingPickups                = lazyWithRetry(() => import('../pages/staff/PendingPickups'));
const VerificationHistory           = lazyWithRetry(() => import('../pages/staff/VerificationHistory'));
const VerificationSuccess           = lazyWithRetry(() => import('../pages/staff/VerificationSuccess'));
const VerifyPickup                  = lazyWithRetry(() => import('../pages/staff/VerifyPickup'));

// Suspense spinner shown while a lazy chunk is loading
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Wrap a lazy element — must only be called inside render, not at module level
const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

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
      { index: true,                     element: S(Home) },
      { path: 'login',                   element: S(Login) },
      { path: 'register',                element: S(Register) },
      { path: 'verify-email',            element: S(VerifyEmailPage) },
      { path: 'forgot-password',         element: S(ForgotPassword) },
      { path: 'verification-otp',        element: S(OtpVerification) },
      { path: 'reset-password',          element: S(ResetPassword) },
      { path: 'social-auth-success',     element: S(SocialAuthSuccess) },
      { path: 'search',                  element: S(SearchPage) },
      { path: 'order-tracking/:orderId', element: S(OrderTracking) },
      { path: 'product/:productId',      element: S(ProductDisplayPage) },
      { path: 'categories',              element: <Navigate to="/" replace /> },
      { path: 'collections',             element: S(CollectionsPage) },
      { path: 'shop-the-look',           element: S(ShopTheLookGallery) },
      { path: 'guest-checkout',          element: S(GuestCheckout) },
      { path: 'order/track-guest',       element: S(GuestOrderTracking) },
      { path: 'mobile/cart',             element: S(CartMobile) },
      { path: 'mobile/profile',          element: <PrivateRoute>{S(UserMenuMobile)}</PrivateRoute> },
      { path: 'product',                 element: S(ProductPage) },
      { path: 'subcategory',             element: S(SubCategoryPage) },
      { path: 'campaigns',              element: S(ActiveCampaigns) },
      { path: 'success',                element: S(Success) },
      {
        path: 'checkout',
        element: <PrivateRoute><LegacyCheckoutRedirect /></PrivateRoute>,
      },
      {
        path: 'wishlist',
        element: <PrivateRoute>{S(WishlistPage)}</PrivateRoute>,
      },
      {
        path: 'delivery-simulator',
        element: <PrivateRoute>{S(DeliverySimulator)}</PrivateRoute>,
      },
      {
        path: 'staff-pos',
        element: <PrivateRoute requireStaff={true}>{S(StaffPOS)}</PrivateRoute>,
      },
      {
        path: 'sales-counter',
        element: <PrivateRoute requireStaff={true}>{S(StaffPOS)}</PrivateRoute>,
      },

      // Category routes
      {
        path: 'product-category/:categoryId',
        element: S(ProductListPage),
      },
      {
        path: ':categoryName-:categoryId',
        element: S(ProductListPage),
        loader: ({ params }) => {
          if (!isMongoObjectId(params.categoryId)) throw new Response('Not Found', { status: 404 });
          return null;
        },
      },
      {
        path: ':categoryName-:categoryId/:subcategoryName-:subcategoryId',
        element: S(ProductListPage),
        loader: ({ params }) => {
          if (!isMongoObjectId(params.categoryId) || !isMongoObjectId(params.subcategoryId)) {
            throw new Response('Not Found', { status: 404 });
          }
          return null;
        },
      },
      {
        path: ':slug-:id',
        element: S(ProductListPage),
        loader: ({ params }) => {
          const reservedWords = ['staff', 'admin', 'dashboard', 'pos', 'api', 'auth', 'login', 'register'];
          const containsReserved = reservedWords.some(word => params.slug?.toLowerCase().includes(word));
          if (!/^[a-f0-9]{24}$/i.test(params.id) || containsReserved) {
            throw new Response('Not Found', { status: 404 });
          }
          return null;
        },
      },

      // Delivery routes
      {
        path: 'delivery',
        element: <PrivateRoute requireDelivery={true}>{S(DeliveryLayout)}</PrivateRoute>,
        children: [
          { path: 'dashboard', element: S(DeliveryDashboard) },
          { path: 'active',    element: S(ActiveDeliveries) },
          { path: 'completed', element: S(CompletedDeliveries) },
          { path: 'history',   element: S(DeliveryHistory) },
          { path: 'map',       element: S(DeliveryMap) },
        ],
      },

      // Dashboard routes
      {
        path: 'dashboard',
        element: <PrivateRoute>{S(DashboardLayout)}</PrivateRoute>,
        children: [
          { index: true,      element: S(DashboardHome) },
          { path: 'profile',  element: S(UserProfile) },
          { path: 'cart',     element: S(DashboardCart) },
          { path: 'checkout', element: S(DashboardCheckout) },
          { path: 'upload-product',         element: <PrivateRoute requireAdmin={true}>{S(UploadProduct)}</PrivateRoute> },
          { path: 'product',                element: <PrivateRoute requireAdmin={true}>{S(ProductPage)}</PrivateRoute> },
          { path: 'category',               element: <PrivateRoute requireAdmin={true}>{S(CategoryPage)}</PrivateRoute> },
          { path: 'subcategory',            element: <PrivateRoute requireAdmin={true}>{S(SubCategoryPage)}</PrivateRoute> },
          { path: 'allorders',              element: <PrivateRoute requireAdmin={true}>{S(AllOrdersAdmin)}</PrivateRoute> },
          { path: 'loyalty-program-admin',  element: <PrivateRoute requireAdmin={true}>{S(LoyaltyProgramAdmin)}</PrivateRoute> },
          { path: 'users-admin',            element: <PrivateRoute requireAdmin={true}>{S(UsersAdmin)}</PrivateRoute> },
          { path: 'admin-community-perks',  element: <PrivateRoute requireAdmin={true}>{S(CommunityPerksAdmin)}</PrivateRoute> },
          { path: 'myorders',               element: <PrivateRoute>{S(MyOrders)}</PrivateRoute> },
          { path: 'address',                element: <PrivateRoute>{S(Address)}</PrivateRoute> },
          { path: 'community-perks',        element: <PrivateRoute>{S(CommunityPerks)}</PrivateRoute> },
          { path: 'loyalty-program',        element: <PrivateRoute>{S(LoyaltyProgramPage)}</PrivateRoute> },
          { path: 'active-campaigns',       element: <PrivateRoute>{S(ActiveCampaigns)}</PrivateRoute> },
          // Delivery redirects
          { path: 'delivery/dashboard', element: <Navigate to="/delivery/dashboard" replace /> },
          { path: 'delivery/active',    element: <Navigate to="/delivery/active"    replace /> },
          { path: 'delivery/completed', element: <Navigate to="/delivery/completed" replace /> },
          { path: 'delivery/history',   element: <Navigate to="/delivery/history"   replace /> },
          { path: 'delivery/map',       element: <Navigate to="/delivery/map"       replace /> },
          // Staff routes
          { path: 'staff',                       element: <PrivateRoute requireStaff={true}>{S(StaffDashboard)}</PrivateRoute> },
          { path: 'staff/dashboard',             element: <PrivateRoute requireStaff={true}>{S(StaffDashboard)}</PrivateRoute> },
          { path: 'staff/pending-pickups',       element: <PrivateRoute requireStaff={true}>{S(PendingPickups)}</PrivateRoute> },
          { path: 'staff/verify-pickup',         element: <PrivateRoute requireStaff={true}>{S(VerifyPickup)}</PrivateRoute> },
          { path: 'staff/completed-verifications', element: <PrivateRoute requireStaff={true}>{S(VerificationHistory)}</PrivateRoute> },
          { path: 'staff/verification-success',  element: <PrivateRoute requireStaff={true}>{S(VerificationSuccess)}</PrivateRoute> },
          { path: 'staff-pos',                   element: <PrivateRoute requireStaff={true}>{S(StaffPOS)}</PrivateRoute> },
          { path: 'sales-counter',               element: <PrivateRoute requireStaff={true}>{S(SalesCounter)}</PrivateRoute> },
          { path: 'pos-dashboard',               element: <PrivateRoute requireStaff={true}>{S(POSDashboard)}</PrivateRoute> },
          { path: 'sales-hub',                   element: <PrivateRoute requireStaff={true}>{S(POSDashboard)}</PrivateRoute> },
          { path: 'pos-sales',                   element: <PrivateRoute requireStaff={true}>{S(POSSales)}</PrivateRoute> },
          { path: 'sales-history',               element: <PrivateRoute requireStaff={true}>{S(POSSales)}</PrivateRoute> },
          {
            path: 'staff/delivery',
            element: <PrivateRoute requireStaff={true}>{S(DeliveryManagement)}</PrivateRoute>,
            children: [
              { index: true,         element: <Navigate to="pending" replace /> },
              { path: 'pending',     element: S(PendingDispatch) },
              { path: 'dispatched',  element: S(DispatchedOrders) },
              { path: 'active',      element: S(ActiveDeliveriesManagement) },
              { path: 'completed',   element: S(CompletedDeliveriesManagement) },
              { path: 'drivers',     element: S(DriversManagement) },
            ],
          },
        ],
      },

      { path: '*', element: <CategorySmartFallback /> },
    ],
  },
]);

export default router;
