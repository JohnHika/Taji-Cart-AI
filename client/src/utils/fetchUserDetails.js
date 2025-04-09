import SummaryApi from "../common/SummaryApi";
import Axios from "./Axios";

const fetchUserDetails = async() => {
    try {
        console.log("Fetching user details...");
        const response = await Axios({
            ...SummaryApi.userDetails
        });
        
        // Process user data to ensure role properties are properly set
        if (response.data.success && response.data.data) {
            const userData = { ...response.data.data };
            
            console.log("Raw user data from server:", userData);
            
            // CRITICAL: Explicitly check for staff role in lowercase
            const userRole = (userData.role || '').toLowerCase();
            
            if (userRole === 'staff') {
                console.log("STAFF ROLE DETECTED in fetchUserDetails");
                userData.isStaff = true;
                userData.accountType = 'staff';
            }
            
            console.log("Processed user data:", userData);
            response.data.data = userData;
        }
        
        return response.data;
    } catch (error) {
        console.error("Error fetching user details:", error);
        throw error;
    }
}

export default fetchUserDetails