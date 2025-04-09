import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
    _id : "",
    name : "",
    email : "",
    avatar : "",
    mobile : "",
    verify_email : "",
    last_login_date : "",
    status : "",
    address_details : [],
    shopping_cart : [],
    orderHistory : [],
    role : "",
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
            
            if (userRole === 'staff') {
                console.log("STAFF ROLE DETECTED - Setting isStaff flag");
                userData.isStaff = true;
                userData.accountType = 'staff';
            } else if (userRole === 'admin') {
                userData.isAdmin = true;
                userData.accountType = 'admin';
            } else if (userRole === 'delivery') {
                userData.isDelivery = true;
                userData.accountType = 'delivery';
            } else {
                // Default to customer/regular user
                userData.accountType = 'customer';
            }
            
            console.log("Final user data with processed roles:", userData);

            state._id = userData?._id
            state.name  = userData?.name
            state.email = userData?.email
            state.avatar = userData?.avatar
            state.mobile = userData?.mobile
            state.verify_email = userData?.verify_email
            state.last_login_date = userData?.last_login_date
            state.status = userData?.status
            state.address_details = userData?.address_details
            state.shopping_cart = userData?.shopping_cart
            state.orderHistory = userData?.orderHistory
            state.role = userData?.role
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
            state.mobile = ""
            state.verify_email = ""
            state.last_login_date = ""
            state.status = ""
            state.address_details = []
            state.shopping_cart = []
            state.orderHistory = []
            state.role = ""
            state.isAuthenticated = false;
        },
        logoutSuccess: (state) => {
            state.isAuthenticated = false;
            state.name = '';
            state.email = '';
            state.avatar = '';
            state.role = '';
        },
    }
})

export const { setUserDetails, logout ,updatedAvatar, logoutSuccess } = userSlice.actions

export default userSlice.reducer