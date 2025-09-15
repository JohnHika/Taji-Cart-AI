import React, { useState } from 'react';
import { BsCart4 } from "react-icons/bs";
import { FaRegCircleUser } from "react-icons/fa6";
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Import both logo versions
import logoLight from '../assets/hair-logo-light.png'; // Hair logo for light theme
import logoDark from '../assets/hair-logo-dark.png'; // Hair logo for dark theme
import { useTheme } from '../context/ThemeContext'; // Import the theme hook
import useMobile from '../hooks/useMobile';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import DisplayCartItem from './DisplayCartItem';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

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

    // Invert the logo usage per request: when dark mode is ON show the *dark* logo background-friendly variant
    // (Previously darkMode ? light : dark). Now darkMode gets logoDark, light mode gets logoLight.
    const currentLogo = darkMode ? logoDark : logoLight;

    const handleLogoError = (e) => {
        // Simple fallback: if dark mode asset fails, try light; else if light fails, try dark once.
        if (e.target.dataset.fallback) return; // avoid infinite loop
        e.target.dataset.fallback = 'true';
        e.target.src = darkMode ? logoLight : logoDark;
    };

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
    <header className='h-16 md:h-20 xl:h-24 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white dark:bg-gray-800 dark:text-white transition-colors duration-200'>
            {
                !(isSearchPage && isMobile) && (
                    <div className='container mx-auto flex items-center px-2 md:px-4 justify-between gap-2'>
                        {/* Logo - Improved positioning */}
                        <div className='flex items-center h-full py-2 pr-2 md:pr-4'>
                            <Link to={"/"} className='flex items-center justify-center'>
                                <img
                                    src={currentLogo} // Use dynamic logo based on theme
                                    alt='Nawiri Hair Logo'
                                    className='h-auto w-auto max-h-12 sm:max-h-14 md:max-h-16 xl:max-h-18 object-contain transition-all duration-300 drop-shadow'
                                    style={{ maxWidth: isMobile ? '135px' : '200px' }}
                                    onError={handleLogoError}
                                />
                            </Link>
                        </div>

                        {/* Search */}
                        <div className='hidden lg:block'>
                            <Search />
                        </div>

                        {/* Login, theme toggle, and my cart */}
                        <div className='flex items-center gap-2 md:gap-4'>
                            {/* User icons display in only mobile version */}
                            <button className='text-neutral-600 dark:text-gray-200 lg:hidden' onClick={handleMobileUser}>
                                <FaRegCircleUser size={26} />
                            </button>

                            {/* Theme toggle button - visible on all screens */}
                            <ThemeToggle className="mx-2" />

                            {/* Desktop */}
                            <div className='hidden lg:flex items-center gap-8 xl:gap-12'>
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
                                                        </div>
                                                    </div>
                                                )
                                            }

                                        </div>
                                    ) : (
                                        <button onClick={redirectToLoginPage} className='text-lg px-2 dark:text-white'>Login</button>
                                    )
                                }
                                <button onClick={() => setOpenCartSection(true)} className='flex items-center gap-2 bg-green-800 hover:bg-green-700 px-3 py-2 rounded text-white transition-colors min-h-12'>
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
