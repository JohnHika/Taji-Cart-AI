const configuredBaseURL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BACKEND_URL;
const localBaseURL = import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000';
const isLocalBrowser =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const baseURL = (import.meta.env.DEV && isLocalBrowser)
  ? localBaseURL
  : (configuredBaseURL || localBaseURL);

// Define SummaryApi first before trying to use it
const SummaryApi = {
    register: {
        url: `${baseURL}/api/user/register`,
        method: 'POST'
    },
    login: {
        url: `${baseURL}/api/user/login`,
        method: 'POST'
    },
    forgot_password: {
        url: `${baseURL}/api/user/forgot-password`,
        method: 'put'
    },
    forgot_password_otp_verification: {
        url: `${baseURL}/api/user/verify-forgot-password-otp`,
        method: 'put'
    },
    resetPassword: {
        url: `${baseURL}/api/user/reset-password`,
        method: 'put'
    },
    refreshToken: {
        url: `${baseURL}/api/user/refresh-token`,
        method: 'post'
    },
    userDetails: {
        url: `${baseURL}/api/user/user-details`,
        method: "get"
    },
    logout: {
        url: `${baseURL}/api/user/logout`,
        method: 'get'
    },
    uploadAvatar: {
        url: `${baseURL}/api/user/upload-avatar`,
        method: 'put'
    },
    updateUserDetails: {
        url: `${baseURL}/api/user/update-user`,
        method: 'put'
    },
    addCategory: {
        url: `${baseURL}/api/category/add-category`,
        method: 'post'
    },
    uploadImage: {
        url: `${baseURL}/api/upload/upload`,
        method: 'post'
    },
    getCategory: {
        url: `${baseURL}/api/category/get`,
        method: 'get'
    },
    updateCategory: {
        url: `${baseURL}/api/category/update`,
        method: 'put'
    },
    deleteCategory: {
        url: `${baseURL}/api/category/delete`,
        method: 'delete'
    },
    createSubCategory: {
        url: `${baseURL}/api/subcategory/create`,
        method: 'post'
    },
    getAllSubCategory: {
        url: `${baseURL}/api/subcategory/get`,
        method: 'get'
    },
    getSubCategory: {
        url: `${baseURL}/api/subcategory/get`,
        method: 'get'
    },
    updateSubCategory: {
        url: `${baseURL}/api/subcategory/update`,
        method: 'put'
    },
    deleteSubCategory: {
        url: `${baseURL}/api/subcategory/delete`,
        method: 'delete'
    },
    createProduct: {
        url: `${baseURL}/api/product/create`,
        method: 'post'
    },
    getProduct: {
        url: `${baseURL}/api/product/get`,
        method: 'post'
    },
    getProductByCategory: {
        url: `${baseURL}/api/product/get-product-by-category`,
        method: 'post'
    },
    getProductByCategoryAndSubCategory: {
        url: `${baseURL}/api/product/get-product-by-category-and-subcategory`,
        method: 'post'
    },
    getProductDetails: {
        url: `${baseURL}/api/product/get-product-details`,
        method: 'post'
    },
    updateProductDetails: {
        url: `${baseURL}/api/product/update-product-details`,
        method: 'put'
    },
    deleteProduct: {
        url: `${baseURL}/api/product/delete-product`,
        method: 'delete'
    },
    searchProduct: {
        url: `${baseURL}/api/product/search-product`,
        method: 'post'
    },
    addTocart: {
        url: `${baseURL}/api/cart/create`,
        method: 'POST',
    },
    getCartItem: {
        url: `${baseURL}/api/cart/get`,
        method: 'get'
    },
    updateCartItemQty: {
        url: `${baseURL}/api/cart/update-qty`,
        method: 'put'
    },
    deleteCartItem: {
        url: `${baseURL}/api/cart/delete-cart-item`,
        method: 'delete'
    },
    clearCart: {
        url: `${baseURL}/api/cart/clear`,
        method: 'delete'
    },
    createAddress: {
        url: `${baseURL}/api/address/create`,
        method: 'post'
    },
    getAddress: {
        url: `${baseURL}/api/address/get`,
        method: 'get'
    },
    updateAddress: {
        url: `${baseURL}/api/address/update`,
        method: 'put'
    },
    disableAddress: {
        url: `${baseURL}/api/address/disable`,
        method: 'delete'
    },
    CashOnDeliveryOrder: {
        url: `${baseURL}/api/order/cash-on-delivery`,
        method: 'post'
    },
    payment_url: {
        url: `${baseURL}/api/order/checkout`,
        method: 'post'
    },
    getOrderItems: {
        url: `${baseURL}/api/order/order-list`,
        method: 'get'
    },
    mpesaPayment: {
        url: `${baseURL}/api/mpesa/stk-push`,
        method: 'post'
    },
    getAllProducts: {
        url: `${baseURL}/api/product/get`,
        method: 'POST',
        data: {
        }
    },
    getUserRoyalCard: {
        url: `${baseURL}/api/loyalty/card`,
        method: 'get'
    },
    updateLoyaltyPoints: {
        url: `${baseURL}/api/loyalty/points`,
        method: 'post'
    },
    validateLoyaltyCard: {
        url: `${baseURL}/api/loyalty/validate`,
        method: 'get'
    },
    getLoyaltyCardApplePass: {
        url: `${baseURL}/api/loyalty/apple-wallet-pass`,
        method: 'post'
    },
    getLoyaltyCardGooglePass: {
        url: `${baseURL}/api/loyalty/google-pay-pass`,
        method: 'post'
    },
    getActiveCampaigns: {
        url: `${baseURL}/api/campaigns/active`,
        method: 'get'
    },
    getUserCampaigns: {
        url: `${baseURL}/api/campaigns/user/:userId`,
        method: 'get'
    },
    contributeToCampaign: {
        url: `${baseURL}/api/campaigns/:campaignId/contribute`,
        method: 'post'
    },
    createCommunityPerk: {
        url: `${baseURL}/api/admin/perks`,
        method: 'post'
    },
    getAllCampaigns: {
        url: `${baseURL}/api/admin/campaigns`,
        method: 'get'
    },
    rateProduct: {
        url: `${baseURL}/api/product/rate`,
        method: 'POST'
    },
    getOrderReceipt: {
        url: `${baseURL}/api/order/receipt`,
        method: 'get'
    },
    getOrderDetails: {
        url: `${baseURL}/api/order/details`,
        method: 'get'
    },
    getOrders: {
        url: `${baseURL}/api/order/order-list`,
        method: 'get'
    },
    getMostRecentOrder: {
        url: `${baseURL}/api/order/recent`,
        method: 'get'
    },
    verifyPickup: {
        url: `${baseURL}/api/order/staff/verify-pickup-code`,
        method: 'POST'
    },
    completePickup: {
        url: `${baseURL}/api/order/staff/complete-pickup`,
        method: 'POST'
    },
    getPendingPickups: {
        url: `${baseURL}/api/order/staff/pending-pickups`,
        method: 'GET'
    },
    getVerificationHistory: {
        url: `${baseURL}/api/order/staff/verification-history`,
        method: 'GET'
    },
    // POS Endpoints
    createSale: {
        url: `${baseURL}/api/pos/sale`,
        method: 'POST'
    },
    getSales: {
        url: `${baseURL}/api/pos/sales`,
        method: 'GET'
    },
    getDailySummary: {
        url: `${baseURL}/api/pos/summary/daily`,
        method: 'GET'
    },
    getPOSAnalytics: {
        url: `${baseURL}/api/pos/analytics`,
        method: 'GET'
    },
    voidSale: {
        url: `${baseURL}/api/pos/sale`,
        method: 'PUT'
    },
    searchUsers: {
        url: `${baseURL}/api/user/search`,
        method: 'GET'
    },
    posMpesaSTK: {
        url: `${baseURL}/api/pos/mpesa/stk-push`,
        method: 'POST'
    }
};

// Now that SummaryApi is defined, you can perform logging and validation
console.log("==================== SUMMARY API CONFIGURATION ====================");
console.log("API endpoints available:", Object.keys(SummaryApi || {}));

// Check if critical endpoints exist
const REQUIRED_ENDPOINTS = [
  'getCategory', 
  'getSubCategory', 
  'getProductByCategory',
  'getProductByCategoryAndSubCategory'
];

REQUIRED_ENDPOINTS.forEach(endpoint => {
  if (!SummaryApi[endpoint]) {
    console.error(`❌ CRITICAL ERROR: Missing required API endpoint: ${endpoint}`);
  } else {
    console.log(`✅ Found API endpoint: ${endpoint}`, SummaryApi[endpoint]);
  }
});

export default SummaryApi;