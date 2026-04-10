import React, { useEffect, useRef, useState } from 'react';
import { BsCart4 } from 'react-icons/bs';
import { FaChevronDown, FaChevronUp, FaRegCircleUser } from 'react-icons/fa6';
import { FiMenu, FiX } from 'react-icons/fi';
import { IoSearch } from 'react-icons/io5';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import useMobile from '../hooks/useMobile';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import DisplayCartItem from './DisplayCartItem';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const navLinks = [
  { label: 'Shop', path: '/' },
  { label: 'My Orders', path: '/dashboard/myorders' },
  { label: 'Community Perks', path: '/dashboard/community-perks' },
  { label: 'Active Campaigns', path: '/dashboard/active-campaigns' }
];

const Header = () => {
  const [isMobile] = useMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state?.user);
  const cart = useSelector((state) => state.cartItem?.cart || []);
  const { totalPrice, totalQty } = useGlobalContext();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openCartSection, setOpenCartSection] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isSearchPage = location.pathname === '/search';
  const redirectToLoginPage = () => navigate('/login');

  const handleMobileUser = () => {
    if (!user?._id) {
      navigate('/login');
      return;
    }

    navigate('/dashboard/profile');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpenUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenUserMenu(false);
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-brown-100/80 bg-white dark:border-dm-border dark:bg-dm-card dark:text-white shadow-sm transition-colors duration-200">
        {isSearchPage && isMobile ? (
          <div className="container mx-auto flex justify-center px-2 py-2 md:px-4">
            <div className="w-full max-w-md">
              <Search />
            </div>
          </div>
        ) : (
          <div className="container mx-auto flex min-w-0 items-center gap-2 px-2 py-2 md:gap-3 md:px-4">
            <Link to="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2 py-1" aria-label={nawiriBrand.shortName}>
              <img
                src={nawiriBrand.logo}
                alt=""
                className="h-8 w-auto max-h-9 max-w-[38px] object-contain sm:max-w-[42px] md:h-10 md:max-w-[46px]"
              />
              <span className="hidden sm:block font-display font-bold text-plum-800 dark:text-white leading-none tracking-tight whitespace-nowrap text-[0.95rem] md:text-lg">
                Nawiri Hair
              </span>
            </Link>

            {/* Search icon — only on xs screens */}
            <button
              className="flex sm:hidden shrink-0 text-neutral-600 dark:text-white/80"
              onClick={() => navigate('/search')}
              aria-label="Search"
            >
              <IoSearch size={22} />
            </button>

            {/* Full search bar — sm and up */}
            <div className="hidden sm:flex min-w-0 flex-1 justify-center px-1">
              <div className="w-full sm:max-w-[16rem] md:max-w-xs lg:max-w-sm xl:max-w-md">
                <Search />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <ThemeToggle />

              <button
                className="relative text-neutral-600 dark:text-white/80 xl:hidden"
                onClick={() => navigate('/mobile/cart')}
                aria-label="Cart"
              >
                <BsCart4 size={24} />
                {totalQty > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                    {totalQty > 99 ? '99+' : totalQty}
                  </span>
                )}
              </button>

              <button
                className="text-neutral-600 dark:text-white/80 xl:hidden"
                onClick={handleMobileUser}
                aria-label="Profile"
              >
                <FaRegCircleUser size={24} />
              </button>

              <div className="hidden xl:flex items-center gap-4">
                <div className="relative" ref={userMenuRef}>
                  {user?._id ? (
                    <>
                      <button
                        onClick={() => setOpenUserMenu((prev) => !prev)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-xs font-semibold text-white">
                          {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                        <span>Account</span>
                        {openUserMenu ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                      </button>

                      {openUserMenu && (
                        <div className="absolute right-0 top-12 z-50 min-w-72 rounded-2xl border border-brown-100 bg-white p-4 shadow-xl dark:border-dm-border dark:bg-dm-card-2">
                          <UserMenu close={() => setOpenUserMenu(false)} />
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={redirectToLoginPage}
                      className="rounded-lg border border-plum-200 px-4 py-2 text-sm font-medium text-plum-700 transition-colors hover:bg-plum-50 dark:border-plum-700 dark:text-plum-200 dark:hover:bg-plum-900/30"
                    >
                      Sign in
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setOpenCartSection(true)}
                  className="flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400"
                >
                  <BsCart4 size={18} />
                  <span>
                    {cart.length > 0 ? `${totalQty} · ${DisplayPriceInShillings(totalPrice)}` : 'Cart'}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="rounded-lg p-1.5 text-charcoal transition-colors hover:bg-plum-50 dark:text-white/80 dark:hover:bg-plum-900/30 lg:hidden"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            </div>
          </div>
        )}

        {!user?._id && (
          <nav className="hidden border-t border-brown-100 bg-ivory dark:border-dm-border dark:bg-dm-surface lg:block">
            <div className="container mx-auto px-6">
              <ul className="flex h-10 items-center gap-1">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                        isActive(link.path)
                          ? 'text-plum-700 dark:text-plum-200'
                          : 'text-brown-500 hover:bg-plum-50 hover:text-plum-700 dark:text-white/60 dark:hover:bg-plum-900/20 dark:hover:text-plum-200'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-plum-900/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-xl dark:bg-dm-card lg:hidden">
            <div className="flex items-center justify-between bg-plum-800/95 px-5 py-4">
              <div className="flex items-center gap-2">
                <img
                  src={nawiriBrand.logo}
                  alt=""
                  className="h-9 max-w-[40px] object-contain object-left drop-shadow-sm"
                />
                <span className="font-display text-base font-bold text-white leading-none tracking-tight">
                  Nawiri Hair
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 transition-colors hover:text-white"
              >
                <FiX size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mb-1 flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-plum-50 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200'
                      : 'text-charcoal hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-3 section-divider" />

              {user?._id ? (
                <Link
                  to="/dashboard/profile"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-plum-50 dark:text-white/80 dark:hover:bg-plum-900/30"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-xs font-semibold text-white">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-brown-400 dark:text-white/50">{user?.email}</p>
                  </div>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="mt-2 block w-full rounded-card bg-plum-700 py-3 text-center font-semibold text-white transition-colors hover:bg-plum-600"
                >
                  Sign in
                </Link>
              )}
            </nav>

            <div className="border-t border-brown-100 p-4 dark:border-dm-border">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/mobile/cart');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-4 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400"
              >
                <BsCart4 size={18} />
                {cart.length > 0 ? `${totalQty} items · ${DisplayPriceInShillings(totalPrice)}` : 'View Cart'}
              </button>
            </div>
          </div>
        </>
      )}

      {openCartSection && <DisplayCartItem close={() => setOpenCartSection(false)} />}
    </>
  );
};

export default Header;
