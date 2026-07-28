import { useEffect, useRef, useState } from 'react';
import { BsCart4 } from 'react-icons/bs';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { FiHeart, FiLogOut, FiMenu, FiSearch, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import useMobile from '../hooks/useMobile';
import { useGlobalContext } from '../provider/GlobalProvider';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { clearAuthStorage } from '../utils/authStorage';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { logout } from '../store/userSlice';
import { clearWishlist } from '../store/wishlistSlice';
import DisplayCartItem from './DisplayCartItem';
import Search from './Search';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const navLinks = [
  { label: 'Shop', path: '/' },
  { label: 'Collections', path: '/collections' },
  { label: 'Best Sellers', path: '/search?q=' },
];

const Header = () => {
  const [isMobile] = useMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.user);
  const cart = useSelector((state) => state.cartItem?.cart || []);
  const wishlistCount = useSelector((state) => state.wishlist?.items?.length || 0);
  const { totalPrice, totalQty } = useGlobalContext();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openCartSection, setOpenCartSection] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isSearchPage = location.pathname === '/search';
  const redirectToLoginPage = () => navigate('/login');

  const isActive = (path) => {
    if (path === '/search?q=') {
      return location.pathname === '/search';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout });
      if (response.data.success) {
        setMobileMenuOpen(false);
        dispatch(logout());
        dispatch(clearWishlist());
        clearAuthStorage();
        toast.success(response.data.message);
        navigate('/');
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

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
      <header className="sticky top-0 z-40 border-b border-brown-100/80 bg-white shadow-sm transition-colors duration-200 dark:border-dm-border dark:bg-dm-card dark:text-white">
        {isSearchPage && isMobile ? (
          <div className="container mx-auto flex justify-center px-2 py-2 md:px-4">
            <div className="w-full max-w-md">
              <Search />
            </div>
          </div>
        ) : (
          <div className="container mx-auto flex h-14 min-w-0 items-center gap-2 px-2 sm:gap-3 sm:px-3 md:gap-4 md:px-4">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1.5 py-1 sm:gap-2"
              aria-label={nawiriBrand.shortName}
            >
              <img
                src={nawiriBrand.logo}
                alt=""
                className="h-8 w-auto max-h-9 max-w-[38px] object-contain sm:max-w-[42px] md:h-10 md:max-w-[46px]"
              />
              <span className="whitespace-nowrap font-display text-sm font-bold leading-none tracking-tight text-plum-800 dark:text-white sm:text-[0.95rem] md:text-lg">
                Nawiri Hair
              </span>
            </Link>

            {/* Public navigation — hidden on small mobile, visible sm+ */}
            <nav className="hidden items-center gap-1 sm:flex md:gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors md:px-3 md:text-sm ${
                    isActive(link.path)
                      ? 'text-plum-700 dark:text-plum-200'
                      : 'text-brown-500 hover:bg-plum-50 hover:text-plum-700 dark:text-white/60 dark:hover:bg-plum-900/20 dark:hover:text-plum-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex min-w-0 flex-1 items-center justify-center sm:px-1">
              <div className="hidden w-full max-w-xs sm:block md:max-w-sm lg:max-w-md xl:max-w-lg">
                <Search />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
              <button
                className="p-1 text-neutral-600 dark:text-white/80 sm:hidden"
                onClick={() => navigate('/search')}
                aria-label="Search"
              >
                <FiSearch size={22} />
              </button>

              <ThemeToggle />

              <button
                className="relative p-1 text-neutral-600 dark:text-white/80 lg:hidden"
                onClick={() => navigate('/mobile/cart')}
                aria-label="Cart"
              >
                <BsCart4 size={22} />
                {totalQty > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                    {totalQty > 99 ? '99+' : totalQty}
                  </span>
                )}
              </button>

              <div className="hidden items-center gap-3 lg:flex">
                {user?._id && (
                  <button
                    onClick={() => navigate('/wishlist')}
                    className="relative rounded-lg p-2 text-charcoal transition-colors hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200"
                    aria-label="Wishlist"
                  >
                    <FiHeart size={20} />
                    {wishlistCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blush-500 px-1 text-xs text-white">
                        {wishlistCount > 99 ? '99+' : wishlistCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="relative" ref={userMenuRef}>
                  {user?._id ? (
                    <>
                      <button
                        onClick={() => setOpenUserMenu((prev) => !prev)}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-xs font-semibold text-white">
                          {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="hidden xl:inline">Account</span>
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
                  className="flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  <BsCart4 size={18} />
                  <span>{cart.length > 0 ? `${totalQty} · ${DisplayPriceInShillings(totalPrice)}` : 'Cart'}</span>
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="rounded-lg p-1.5 text-charcoal transition-colors hover:bg-plum-50 dark:text-white/80 dark:hover:bg-plum-900/30 lg:hidden"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </button>
            </div>
          </div>
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
                <span className="font-display text-base font-bold leading-none tracking-tight text-white">
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

              {user?._id && (
                <>
                  <div className="my-3 section-divider" />
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
                </>
              )}

              <div className="my-3 section-divider" />

              {user?._id ? (
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <FiLogOut size={18} />
                  Log out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="mt-2 block w-full rounded-lg bg-plum-700 py-3 text-center font-semibold text-white transition-colors hover:bg-plum-600"
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
