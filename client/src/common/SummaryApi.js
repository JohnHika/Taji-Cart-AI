export const baseURL = "http://localhost:8080";

const SummaryApi = {
    register: {
        url: 'http://localhost:8080/api/user/register', // Use absolute URL
        method: 'POST'
    },
    login: {
        url: 'http://localhost:8080/api/user/login', // Use absolute URL
        method: 'POST'
    },
    forgot_password: {
        url: "http://localhost:8080/api/user/forgot-password",
        method: 'put'
    },
    forgot_password_otp_verification: {
        url: 'http://localhost:8080/api/user/verify-forgot-password-otp',
        method: 'put'
    },
    resetPassword: {
        url: "http://localhost:8080/api/user/reset-password",
        method: 'put'
    },
    refreshToken: {
        url: 'http://localhost:8080/api/user/refresh-token',
        method: 'post'
    },
    userDetails: {
        url: 'http://localhost:8080/api/user/user-details',
        method: "get"
    },
    logout: {
        url: "http://localhost:8080/api/user/logout",
        method: 'get'
    },
    uploadAvatar: {
        url: "http://localhost:8080/api/user/upload-avatar",
        method: 'put'
    },
    updateUserDetails: {
        url: 'http://localhost:8080/api/user/update-user',
        method: 'put'
    },
    addCategory: {
        url: 'http://localhost:8080/api/category/add-category',
        method: 'post'
    },
    uploadImage: {
        url: 'http://localhost:8080/api/upload/upload', // Changed from /api/file/upload
        method: 'post'
    },
    getCategory: {
        url: 'http://localhost:8080/api/category/get',
        method: 'get'
    },
    updateCategory: {
        url: 'http://localhost:8080/api/category/update',
        method: 'put'
    },
    deleteCategory: {
        url: 'http://localhost:8080/api/category/delete',
        method: 'delete'
    },
    createSubCategory: {
        url: 'http://localhost:8080/api/subcategory/create',
        method: 'post'
    },
    getAllSubCategory: {
        url: 'http://localhost:8080/api/subcategory/get',
        method: 'get'
    },
    updateSubCategory: {
        url: 'http://localhost:8080/api/subcategory/update',
        method: 'put'
    },
    deleteSubCategory: {
        url: 'http://localhost:8080/api/subcategory/delete',
        method: 'delete'
    },
    createProduct: {
        url: 'http://localhost:8080/api/product/create',
        method: 'post'
    },
    getProduct: {
        url: 'http://localhost:8080/api/product/get',
        method: 'post'
    },
    getProductByCategory: {
        url: 'http://localhost:8080/api/product/get-product-by-category',
        method: 'post'
    },
    getProductByCategoryAndSubCategory: {
        url: 'http://localhost:8080/api/product/get-product-by-category-and-subcategory',
        method: 'post'
    },
    getProductDetails: {
        url: 'http://localhost:8080/api/product/get-product-details',
        method: 'post'
    },
    updateProductDetails: {
        url: "http://localhost:8080/api/product/update-product-details",
        method: 'put'
    },
    deleteProduct: {
        url: "http://localhost:8080/api/product/delete-product",
        method: 'delete'
    },
    searchProduct: {
        url: 'http://localhost:8080/api/product/search-product',
        method: 'post'
    },
    addTocart: {
        url: 'http://localhost:8080/api/cart/create',
        method: 'POST',
        // Any other required configuration
    },
    getCartItem: {
        url: 'http://localhost:8080/api/cart/get',
        method: 'get'
    },
    updateCartItemQty: {
        url: 'http://localhost:8080/api/cart/update-qty',
        method: 'put'
    },
    deleteCartItem: {
        url: 'http://localhost:8080/api/cart/delete-cart-item',
        method: 'delete'
    },
    clearCart: {
        url: 'http://localhost:8080/api/cart/clear',
        method: 'delete'
    },
    createAddress: {
        url: 'http://localhost:8080/api/address/create',
        method: 'post'
    },
    getAddress: {
        url: 'http://localhost:8080/api/address/get',
        method: 'get'
    },
    updateAddress: {
        url: 'http://localhost:8080/api/address/update',
        method: 'put'
    },
    disableAddress: {
        url: 'http://localhost:8080/api/address/disable',
        method: 'delete'
    },
    CashOnDeliveryOrder: {
        url: "http://localhost:8080/api/order/cash-on-delivery",
        method: 'post'
    },
    payment_url: {
        url: "http://localhost:8080/api/order/checkout",
        method: 'post'
    },
    getOrderItems: {
        url: 'http://localhost:8080/api/order/order-list',
        method: 'get'
    },
    mpesaPayment: {
        url: "http://localhost:8080/api/mpesa/stk-push",
        method: 'post'
    },
    getAllProducts: {
        url: 'http://localhost:8080/api/product/get',
        method: 'POST',
        data: {
            // Add any required parameters
        }
    },
    getUserRoyalCard: {
        url: "http://localhost:8080/api/loyalty/card",
        method: 'get'
    },
    updateLoyaltyPoints: {
        url: "http://localhost:8080/api/loyalty/points",
        method: 'post'
    },
    validateLoyaltyCard: {
        url: "http://localhost:8080/api/loyalty/validate",
        method: 'get'
    },
    getLoyaltyCardApplePass: {
        url: "http://localhost:8080/api/loyalty/apple-wallet-pass",
        method: 'post'
    },
    getLoyaltyCardGooglePass: {
        url: "http://localhost:8080/api/loyalty/google-pay-pass",
        method: 'post'
    },
    getActiveCampaigns: {
        url: "http://localhost:8080/api/campaigns/active",
        method: 'get'
    },
    getUserCampaigns: {
        url: "http://localhost:8080/api/campaigns/user/:userId",
        method: 'get'
    },
    contributeToCampaign: {
        url: "http://localhost:8080/api/campaigns/:campaignId/contribute",
        method: 'post'
    },
    createCommunityPerk: {
        url: "http://localhost:8080/api/admin/perks",
        method: 'post'
    },
    getAllCampaigns: {
        url: "http://localhost:8080/api/admin/campaigns",
        method: 'get'
    },
    rateProduct: {
        url: "http://localhost:8080/api/product/rate", // Make sure this matches the endpoint in the route directory
        method: 'POST'
    }
};

export default SummaryApi;