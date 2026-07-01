import { createSlice } from "@reduxjs/toolkit";

const parseBooleanFlag = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off', 'null', 'undefined', ''].includes(normalized)) return false;
    }
    return Boolean(value);
}

const initialValue = {
    _id : "",
    name : "",
    email : "",
    avatar : "",
    createdAt : "",
    updatedAt : "",
    lastLogin : "",
    mobile : "",
    deliveryProfile: null,
    mobile_verified: false,
    verify_email : false,
    last_login_date : "",
    status : "",
    address_details : [],
    shopping_cart : [],
    orderHistory : [],
    role : "",
    isAdmin: false,
    isStaff: false,
    isDelivery: false,
    accountType: "",
    isAuthenticated: false,
}

const userSlice  = createSlice({
    name : 'user',
    initialState : initialValue,
    reducers : {
        setUserDetails : (state,action) =>{
            console.log("Setting user details in Redux:", action.payload);
            
            // Create a new user object with enhanced role detection
            const userData = { ...action.payload };
            
            // EXPLICITLY handle staff role detection - with extensive logging
            console.log("Checking user role:", userData.role);
            
            // Convert role to lowercase for case-insensitive comparison
            const userRole = (userData.role || '').toLowerCase();
            const parsedIsAdmin = parseBooleanFlag(userData?.isAdmin);
            const parsedIsStaff = parseBooleanFlag(userData?.isStaff);
            const parsedIsDelivery = parseBooleanFlag(userData?.isDelivery);
            
            if (userRole === 'staff') {
                console.log("STAFF ROLE DETECTED - Setting isStaff flag");
                userData.isStaff = true;
                userData.isAdmin = false;
                userData.isDelivery = false;
                userData.accountType = 'staff';
            } else if (userRole === 'admin') {
                userData.isAdmin = true;
                userData.isStaff = true;
                userData.isDelivery = false;
                userData.accountType = 'admin';
            } else if (userRole === 'delivery') {
                userData.isDelivery = true;
                userData.isAdmin = false;
                userData.isStaff = false;
                userData.accountType = 'delivery';
            } else {
                // Default to customer/regular user
                userData.isAdmin = parsedIsAdmin;
                userData.isStaff = parsedIsStaff;
                userData.isDelivery = parsedIsDelivery;
                userData.accountType = 'customer';
            }
            
            console.log("Final user data with processed roles:", userData);

            state._id = userData?._id
            state.name  = userData?.name
            state.email = userData?.email
            state.avatar = userData?.avatar
            state.createdAt = userData?.createdAt || ''
            state.updatedAt = userData?.updatedAt || ''
            state.lastLogin = userData?.lastLogin || userData?.last_login_date || ''
            state.mobile = userData?.mobile
            state.deliveryProfile = userData?.deliveryProfile || null
            state.mobile_verified = Boolean(userData?.mobile_verified)
            state.verify_email = userData?.verify_email
            state.last_login_date = userData?.last_login_date
            state.status = userData?.status
            state.address_details = userData?.address_details
            state.shopping_cart = userData?.shopping_cart
            state.orderHistory = userData?.orderHistory
            state.role = userData?.role
            state.isAdmin = parseBooleanFlag(userData?.isAdmin)
            state.isStaff = parseBooleanFlag(userData?.isStaff)
            state.isDelivery = parseBooleanFlag(userData?.isDelivery)
            state.accountType = userData?.accountType || ''
            state.isAuthenticated = true;
        },
        updatedAvatar : (state,action)=>{
            state.avatar = action.payload
        },
        logout : (state)=>{
            state._id = ""
            state.name  = ""
            state.email = ""
            state.avatar = ""
            state.createdAt = ""
            state.updatedAt = ""
            state.lastLogin = ""
            state.mobile = ""
            state.deliveryProfile = null
            state.mobile_verified = false
            state.verify_email = false
            state.last_login_date = ""
            state.status = ""
            state.address_details = []
            state.shopping_cart = []
            state.orderHistory = []
            state.role = ""
            state.isAdmin = false
            state.isStaff = false
            state.isDelivery = false
            state.accountType = ""
            state.isAuthenticated = false;
        },
        logoutSuccess: (state) => {
            state.isAuthenticated = false;
            state.name = '';
            state.email = '';
            state.avatar = '';
            state.createdAt = '';
            state.updatedAt = '';
            state.lastLogin = '';
            state.mobile = '';
            state.deliveryProfile = null;
            state.mobile_verified = false;
            state.role = '';
            state.isAdmin = false;
            state.isStaff = false;
            state.isDelivery = false;
            state.accountType = '';
        },
    }
})

export const { setUserDetails, logout ,updatedAvatar, logoutSuccess } = userSlice.actions

export default userSlice.reducer
