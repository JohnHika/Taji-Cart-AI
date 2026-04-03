import React, { useState, useRef, useEffect } from 'react';
import { BsCart4 } from "react-icons/bs";
import { FaRegCircleUser, FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { FiMenu, FiX } from "react-icons/fi";
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoLight from '../assets/hair-logo-light.png';
import logoDark from '../assets/hair-logo-dark.png';
import { useTheme } from '../context/ThemeContext';
import useMobile from '../hooks/useMobile';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import DisplayCartItem from './DisplayCartItem';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const navLinks = [
    { label: 'Shop',     path: '/' },
    { label: 'Collections', path: '/collections' },
    { label: 'Campaigns', path: '/campaigns' },
    { label: 'My Orders', path: '/dashboard/myorders' },
    { label: 'Loyalty Program',  path: '/dashboard/loyalty-program' },
];

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { darkMode } = useTheme();
    const userMenuRef = useRef(null);

    const currentLogo = darkMode ? logoDark : logoLight;

    const handleLogoError = (e) => {
        if (e.target.dataset.fallback) return;
        e.target.dataset.fallback = 'true';
        e.target.src = darkMode ? logoLight : logoDark;
    };

    const redirectToLoginPage = () => navigate("/login");
    const handleCloseUserMenu = () => setOpenUserMenu(false);
    const handleMobileUser = () => {
        if (!user._id) { navigate("/login"); return; }
        navigate("/mobile/profile");
    };
    const handleMobileCart = () => navigate("/mobile/cart");

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setOpenUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <>
            {/* ── Announcement Bar ─────────────────────────────────────────── */}
            <div className="bg-plum-700 text-white text-xs py-2 px-4 text-center hidden sm:block">
                <span className="font-display italic text-gold-300">Nawiri Hair</span>
                <span className="mx-2 opacity-50">·</span>
                Free delivery on orders over <span className="font-semibold text-gold-300">KES 3,500</span>
                <span className="mx-2 opacity-50">·</span>
                <a
                    href="https://www.instagram.com/nawiri_hairke/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gold-300 transition-colors"
                >
                    Follow us on Instagram
                </a>
            </div>

            <header className="sticky top-0 z-40 bg-ivory dark:bg-dm-surface border-b border-brown-100 dark:border-dm-border shadow-sm transition-colors duration-200">

                {/* ── Row 1: Logo · Search · Utilities ───────────────────── */}
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-4 h-16 md:h-20">

                        {/* Logo */}
                        {!(isSearchPage && isMobile) && (
                            <Link to="/" className="flex-shrink-0">
                                <img
                                    src={currentLogo}
                                    alt="Nawiri Hair"
                                    className="h-auto object-contain drop-shadow-md transition-all duration-300"
                                    style={{ maxHeight: isMobile ? '50px' : '64px', maxWidth: isMobile ? '150px' : '220px' }}
                                    onError={handleLogoError}
                                />
                            </Link>
                        )}

                        {/* Search — desktop only, center-expanded */}
                        <div className="hidden lg:flex flex-1 max-w-xl mx-auto">
                            <Search />
                        </div>

                        {/* Right utilities */}
                        <div className="flex items-center gap-2 ml-auto">

                            {/* Mobile icon row */}
                            {isMobile && (
                                <>
                                    <button
                                        onClick={handleMobileCart}
                                        className="relative p-1.5 text-charcoal dark:text-white/80 hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
                                        aria-label="Cart"
                                    >
                                        <BsCart4 size={22} />
                                        {totalQty > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-gold-500 text-charcoal rounded-pill w-4 h-4 flex items-center justify-center text-[10px] font-bold leading-none">
                                                {totalQty > 9 ? '9+' : totalQty}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleMobileUser}
                                        className="p-1.5 text-charcoal dark:text-white/80 hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
                                        aria-label="Profile"
                                    >
                                        <FaRegCircleUser size={22} />
                                    </button>
                                </>
                            )}

                            {/* Theme toggle — all breakpoints */}
                            <ThemeToggle />

                            {/* Desktop: Account dropdown */}
                            <div className="hidden lg:block relative" ref={userMenuRef}>
                                {user?._id ? (
                                    <>
                                        <button
                                            onClick={() => setOpenUserMenu(p => !p)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-charcoal dark:text-white/80 hover:text-plum-700 dark:hover:text-plum-200 hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors select-none"
                                        >
                                            <div className="w-7 h-7 rounded-pill bg-plum-700 text-white flex items-center justify-center text-xs font-semibold">
                                                {(user.name || 'U')[0].toUpperCase()}
                                            </div>
                                            <span className="hidden xl:inline max-w-[96px] truncate">
                                                {user.name?.split(' ')[0] || 'Account'}
                                            </span>
                                            {openUserMenu ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                                        </button>
                                        {openUserMenu && (
                                            <div className="absolute right-0 top-full mt-2 animate-slide-down">
                                                <div className="bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-card shadow-hover p-3 min-w-56 max-h-[min(70vh,calc(100vh-5rem))] overflow-y-auto overscroll-contain">
                                                    <UserMenu close={handleCloseUserMenu} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={redirectToLoginPage}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-plum-700 dark:text-plum-200 border border-plum-200 dark:border-plum-700 hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
                                    >
                                        Sign in
                                    </button>
                                )}
                            </div>

                            {/* Desktop: Cart button */}
                            <button
                                onClick={() => setOpenCartSection(true)}
                                className="hidden lg:flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-4 py-2 rounded-pill text-sm transition-all duration-200 press shadow-sm hover:shadow-gold"
                            >
                                <BsCart4 size={18} />
                                <span>
                                    {cart.length > 0
                                        ? `${totalQty} · ${DisplayPriceInShillings(totalPrice)}`
                                        : 'Cart'
                                    }
                                </span>
                            </button>

                            {/* Mobile hamburger */}
                            <button
                                onClick={() => setMobileMenuOpen(p => !p)}
                                className="lg:hidden p-1.5 rounded-lg text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
                                aria-label="Menu"
                            >
                                {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile search row */}
                    {!(isSearchPage && isMobile) && (
                        <div className="lg:hidden pb-2.5">
                            <Search />
                        </div>
                    )}
                </div>

                {/* ── Row 2: Navigation strip (desktop only, guests only) ──── */}
                {!user?._id && (
                    <nav className="hidden lg:block border-t border-brown-100 dark:border-dm-border bg-ivory dark:bg-dm-surface">
                        <div className="container mx-auto px-6">
                            <ul className="flex items-center gap-1 h-10">
                                {navLinks.map((link) => (
                                    <li key={link.path}>
                                        <Link
                                            to={link.path}
                                            className={`relative px-4 py-2 text-sm transition-colors duration-150 rounded-lg font-medium ${
                                                isActive(link.path)
                                                    ? 'text-plum-700 dark:text-plum-200'
                                                    : 'text-brown-500 dark:text-white/60 hover:text-plum-700 dark:hover:text-plum-200 hover:bg-plum-50 dark:hover:bg-plum-900/20'
                                            }`}
                                        >
                                            {link.label}
                                            {isActive(link.path) && (
                                                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-plum-700 dark:bg-plum-300 rounded-pill" />
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>
                )}
            </header>

            {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-plum-900/50 z-40 lg:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-dm-card z-50 flex flex-col shadow-hover animate-slide-in-left lg:hidden">
                        {/* Drawer header */}
                        <div className="bg-plum-700 px-5 py-4 flex items-center justify-between">
                            <img
                                src={logoDark}
                                alt="Nawiri Hair"
                                className="h-9 object-contain"
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <FiX size={22} />
                            </button>
                        </div>

                        {/* Drawer nav links */}
                        <nav className="flex-1 overflow-y-auto py-4 px-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                                        isActive(link.path)
                                            ? 'bg-plum-50 dark:bg-plum-900/30 text-plum-700 dark:text-plum-200'
                                            : 'text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:text-plum-700 dark:hover:text-plum-200'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <div className="my-3 section-divider" />

                            {user?._id ? (
                                <Link
                                    to="/dashboard/profile"
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-pill bg-plum-700 text-white flex items-center justify-center text-xs font-semibold">
                                        {(user.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-xs text-brown-400">{user.email}</p>
                                    </div>
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="block w-full text-center bg-plum-700 text-white font-semibold py-3 rounded-card mt-2 hover:bg-plum-600 transition-colors"
                                >
                                    Sign in
                                </Link>
                            )}
                        </nav>

                        {/* Drawer cart CTA */}
                        <div className="p-4 border-t border-brown-100 dark:border-dm-border">
                            <button
                                onClick={() => { setMobileMenuOpen(false); navigate('/mobile/cart'); }}
                                className="flex items-center justify-center gap-2 w-full bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-4 py-3 rounded-pill text-sm transition-colors press"
                            >
                                <BsCart4 size={18} />
                                {cart.length > 0
                                    ? `${totalQty} items · ${DisplayPriceInShillings(totalPrice)}`
                                    : 'View Cart'
                                }
                            </button>
                        </div>
                    </div>
                </>
            )}

            {openCartSection && (
                <DisplayCartItem close={() => setOpenCartSection(false)} />
            )}
        </>
    );
};

export default Header;
