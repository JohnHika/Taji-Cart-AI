import React, { useEffect, useRef, useState } from 'react';
import { BsCart4 } from 'react-icons/bs';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { useStoreCompact } from '../context/StoreLayoutContext';
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
  const [isMobileSearchLayout] = useMobile(768);
  const isCompact = useStoreCompact();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state?.user);
  const cart = useSelector((state) => state.cartItem?.cart || []);
  const { totalPrice, totalQty } = useGlobalContext();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openCartSection, setOpenCartSection] = useState(false);
  const userMenuRef = useRef(null);
  const isSearchPage = location.pathname === '/search';
  const redirectToLoginPage = () => navigate('/login');

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
    setOpenUserMenu(false);
  }, [location.pathname]);

  if (isCompact) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-brown-100/80 bg-white dark:border-dm-border dark:bg-dm-card dark:text-white shadow-sm transition-colors duration-200">
        {isSearchPage && isMobileSearchLayout ? (
          <div className="container mx-auto flex justify-center px-2 py-2 md:px-4">
            <div className="w-full max-w-md">
              <Search />
            </div>
          </div>
        ) : (
          <div className="container mx-auto flex min-w-0 items-center gap-2 px-2 py-2 md:gap-3 md:px-4">
            <Link to="/" className="flex shrink-0 items-center py-1" aria-label={nawiriBrand.shortName}>
              <img
                src={nawiriBrand.logo}
                alt=""
                className="h-8 w-auto max-h-9 max-w-[120px] object-contain object-left sm:max-w-[140px] md:h-10 md:max-w-[180px]"
              />
            </Link>

            <div className="flex min-w-0 flex-1 justify-center px-1">
              <div className="w-full max-w-[min(100%,14rem)] sm:max-w-[16rem] md:max-w-xs lg:max-w-sm xl:max-w-md">
                <Search />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <ThemeToggle />

              <div className="flex items-center gap-4">
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
            </div>
          </div>
        )}

        {!user?._id && (
          <nav className="border-t border-brown-100 bg-ivory dark:border-dm-border dark:bg-dm-surface">
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

      {openCartSection && <DisplayCartItem close={() => setOpenCartSection(false)} />}
    </>
  );
};

export default Header;
