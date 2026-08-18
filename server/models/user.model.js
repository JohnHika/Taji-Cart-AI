import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,"Provide name"]
    },
    email : {
        type : String,
        required : [true, "provide email"],
        unique : true
    },
    password : {
        type : String,
        required : function() { return !this.googleId; }
    },
    avatar : {
        type : String,
        default : ""
    },
    mobile : {
        type : String,
        default : "",
        trim: true
    },
    mobile_verified: {
        type: Boolean,
        default: false
    },
    mobile_verification_otp: {
        type: String,
        default: null
    },
    mobile_verification_expiry: {
        type: Date,
        default: null
    },
    refresh_token : {
        type : String,
        default : ""
    },
    // The refresh token this one just replaced, plus when it was rotated out.
    // A grace window (see authSession.js) lets it still be accepted briefly
    // after rotation — closes a multi-tab/multi-device race where one tab
    // refreshes first and a second tab's still-in-flight request would
    // otherwise get hard-rejected and force an unexpected logout, even
    // though the user never signed out anywhere.
    previous_refresh_token : {
        type : String,
        default : ""
    },
    previous_refresh_token_rotated_at : {
        type : Date,
        default : null
    },
    verify_email : {
        type : Boolean,
        default : false
    },
    last_login_date : {
        type : Date,
        default : null
    },
    status : {
        type : String,
        enum : ["Active","Inactive","Suspended"],
        default : "Active"
    },
    address_details : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'address'
        }
    ],
    shopping_cart : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'cartProduct'
        }
    ],
    wishlist : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'product'
        }
    ],
    orderHistory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'order'
        }
    ],
    forgot_password_otp : {
        type : String,
        default : null
    },
    forgot_password_expiry : {
        type : Date,
        default : ""
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    role : {
        type : String,
        enum : ['user', 'admin', 'delivery', 'staff'],  // Added 'staff' role
        default : 'user'
    },
    isDelivery: {
        type: Boolean,
        default: false
    },
    isStaff: {  // Added isStaff boolean flag for consistency
        type: Boolean,
        default: false
    },
    // Extra capabilities granted to this individual by an administrator.
    // Every staff member retains the baseline staff permissions in staffPermissions.js.
    staffPermissions: {
        type: [String],
        default: []
    },
    staffPermissionAudit: [{
        permissions: [String],
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now }
    }],
    // Exclusive access to the loyalty/Royal Card program for this individual
    // customer, independent of the global LoyaltySettings master switch.
    // See server/utils/loyaltySettings.js: hasLoyaltyAccess().
    loyaltyAccessGranted: {
        type: Boolean,
        default: false
    },
    googleId: {
        type: String,
        sparse: true,  // Allow null values but enforce uniqueness when present
    },
    authType: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    lastLogin: {
        type: Date,
    },
    delivery_assigned_areas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryArea'
    }],
    staff_branch: {
        type: String,
        default: ""
    },
    notification_preferences: {
        email: {
            type: Boolean,
            default: true
        },
        push: {
            type: Boolean,
            default: true
        },
        sms: {
            type: Boolean,
            default: false
        }
    },
    passwordLastChanged: {
        type: Date
    }
},{
    timestamps : true
})

const UserModel = mongoose.model("User",userSchema)

export default UserModel
