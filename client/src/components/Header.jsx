import React, { useState } from 'react';
import { BsCart4 } from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Import both logo versions
import logoLight from '../assets/Taji_Cart_Ai.png'; // Your existing logo (dark version)
import logoDark from '../assets/Taji_Cart_Ai_Light.png'; // Add your light version logo
import { useTheme } from '../context/ThemeContext'; // Import the theme hook
import useMobile from '../hooks/useMobile';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import DisplayCartItem from './DisplayCartItem';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

// Modified helper function to check if user is staff but not admin
const isUserStaffNotAdmin = (user) => {
    // Check if the user is staff but NOT admin
    const isStaff = (
        user.isStaff === true || 
        user.role === 'staff' || 
        user.userType === 'staff' ||
        user.accountType === 'staff'
    );
    
    // Check if user is admin
    const isAdmin = user.role === 'admin';
    
    // Return true only if user is staff but not admin
    return isStaff && !isAdmin;
};

const Header = () => {
    const [isMobile] = useMobile();
    const location = useLocation();
    const isSearchPage = location.pathname === "/search";
    const navigate = useNavigate();
    const user = useSelector((state) => state?.user);
    const [openUserMenu, setOpenUserMenu] = useState(false);
    const cart = useSelector((state) => state.cartItem?.cart || []);
    const { totalPrice, totalQty } = useGlobalContext();
    const [openCartSection, setOpenCartSection] = useState(false);
    // Get the current theme
    const { darkMode } = useTheme();

    // Use the appropriate logo based on theme
    const currentLogo = darkMode ? logoLight : logoDark;

    // Your existing functions
    const redirectToLoginPage = () => {
        navigate("/login");
    };

    const handleCloseUserMenu = () => {
        setOpenUserMenu(false);
    };

    const handleMobileUser = () => {
        if (!user._id) {
            navigate("/login");
            return;
        }

        navigate("/user");
    };

    return (
        <header className='h-24 lg:h-26 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white dark:bg-gray-800 dark:text-white transition-colors duration-200'>
            {
                !(isSearchPage && isMobile) && (
                    <div className='container mx-auto flex items-center px-2 justify-between'>
                        {/* Logo - Improved positioning */}
                        <div className='flex items-center h-full py-2'>
                            <Link to={"/"} className='flex items-center justify-center'>
                                <img
                                    src={currentLogo} // Use dynamic logo based on theme
                                    alt='Taji Cart Logo'
                                    className='h-auto w-auto max-h-14 lg:max-h-16 object-contain transition-all duration-300'
                                    style={{ maxWidth: isMobile ? '120px' : '150px' }}
                                />
                            </Link>
                        </div>

                        {/* Search */}
                        <div className='hidden lg:block'>
                            <Search />
                        </div>

                        {/* Login, theme toggle, and my cart */}
                        <div className='flex items-center gap-3'>
                            {/* User icons display in only mobile version */}
                            <button className='text-neutral-600 dark:text-gray-200 lg:hidden' onClick={handleMobileUser}>
                                <FaRegCircleUser size={26} />
                            </button>

                            {/* Theme toggle button - visible on all screens */}
                            <ThemeToggle className="mx-2" />

                            {/* Desktop */}
                            <div className='hidden lg:flex items-center gap-10'>
                                {
                                    user?._id ? (
                                        <div className='relative'>
                                            <div onClick={() => setOpenUserMenu(preve => !preve)} className='flex select-none items-center gap-1 cursor-pointer'>
                                                <p>Account</p>
                                                {
                                                    openUserMenu ? (
                                                        <GoTriangleUp size={25} />
                                                    ) : (
                                                        <GoTriangleDown size={25} />
                                                    )
                                                }

                                            </div>
                                            {
                                                openUserMenu && (
                                                    <div className='absolute right-0 top-12'>
                                                        <div className='bg-white dark:bg-gray-700 rounded p-4 min-w-52 lg:shadow-lg'>
                                                            <UserMenu close={handleCloseUserMenu} />
                                                            {isUserStaffNotAdmin(user) && (
                                                                <Link 
                                                                    to="/staff/dashboard" 
                                                                    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                                                    onClick={handleCloseUserMenu}
                                                                >
                                                                    <FaUserTie className="mr-2" />
                                                                    Staff Dashboard
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            }

                                        </div>
                                    ) : (
                                        <button onClick={redirectToLoginPage} className='text-lg px-2 dark:text-white'>Login</button>
                                    )
                                }
                                <button onClick={() => setOpenCartSection(true)} className='flex items-center gap-2 bg-green-800 hover:bg-green-700 px-3 py-2 rounded text-white transition-colors'>
                                    {/* Add to cart icons */}
                                    <div className='animate-bounce'>
                                        <BsCart4 size={26} />
                                    </div>
                                    <div className='font-semibold text-sm'>
                                        {
                                            cart.length > 0 ? (
                                                <div>
                                                    <p>{totalQty} Items</p>
                                                    <p>{DisplayPriceInShillings(totalPrice)}</p>
                                                </div>
                                            ) : (
                                                <p>My Cart</p>
                                            )
                                        }
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className='container mx-auto px-2 lg:hidden'>
                <Search />
            </div>

            {
                openCartSection && (
                    <DisplayCartItem close={() => setOpenCartSection(false)} />
                )
            }
        </header>
    );
};

export default Header;
