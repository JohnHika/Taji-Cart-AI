import React, { useEffect, useState } from 'react';
import fetchUserDetails from '../utils/fetchUserDetails';

const LoginButton = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkLoginStatus = async () => {
            const userDetails = await fetchUserDetails();
            if (userDetails && userDetails.success) {
                setIsLoggedIn(true);
            }
        };

        checkLoginStatus();
    }, []);

    return (
        <button>
            {isLoggedIn ? 'Logout' : 'Login'}
        </button>
    );
};

export default LoginButton;
