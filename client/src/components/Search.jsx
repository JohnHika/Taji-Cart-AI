import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { IoSearch } from 'react-icons/io5';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import useMobile from '../hooks/useMobile';

/** Navigate on keystroke with a tiny delay to batch ultra-fast typing; feels instant */
const SEARCH_DEBOUNCE_MS = 48;

const Search = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchPage, setIsSearchPage] = useState(false);
  const [isMobile] = useMobile();
  const searchParams = new URLSearchParams(location.search);
  const searchText = searchParams.get('q') || '';
  const [query, setQuery] = useState(searchText);
  const debounceRef = useRef(null);

  useEffect(() => {
    setIsSearchPage(location.pathname === '/search');
  }, [location.pathname]);

  useEffect(() => {
    setQuery(searchText);
  }, [searchText]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const redirectToSearchPage = () => {
    navigate('/search');
  };

  const handleOnChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(value)}`, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="w-full min-w-[300px] lg:min-w-[420px] h-11 lg:h-12 rounded-lg border border-brown-200 dark:border-dm-border overflow-hidden flex items-center text-brown-400 dark:text-white/45 bg-white dark:bg-dm-card shadow-sm group focus-within:border-plum-400 dark:focus-within:border-plum-600 focus-within:ring-1 focus-within:ring-plum-200 dark:focus-within:ring-plum-800 transition-colors">
      <div>
        {isMobile && isSearchPage ? (
          <Link
            to="/"
            className="flex justify-center items-center h-full p-2 m-1 text-plum-700 dark:text-plum-200 bg-ivory dark:bg-dm-surface rounded-full shadow-sm hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
            aria-label="Back to home"
          >
            <FaArrowLeft size={18} />
          </Link>
        ) : (
          <span className="flex justify-center items-center h-full p-3 text-plum-600 dark:text-plum-300" aria-hidden>
            <IoSearch size={22} />
          </span>
        )}
      </div>
      <div className="w-full h-full min-w-0">
        {!isSearchPage ? (
          <button
            type="button"
            onClick={redirectToSearchPage}
            className="w-full h-full flex items-center px-2 text-left text-sm truncate hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
          >
            <TypeAnimation
              sequence={[
                'Search lace front wigs…',
                2200,
                'Search satin bonnets…',
                2200,
                'Search hair oil & serum…',
                2200,
                'Search clip-in extensions…',
                2200,
                'Search edge control…',
                2200,
                'Search deep conditioner…',
                2200,
                'Search crochet hair…',
                2200,
                'Search silk press tools…',
                2200,
              ]}
              wrapper="span"
              speed={55}
              repeat={Infinity}
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center pr-3">
            <input
              type="search"
              placeholder="Search wigs, care, tools…"
              autoFocus
              value={query}
              className="bg-transparent w-full h-full outline-none text-sm text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30"
              onChange={handleOnChange}
              aria-label="Search products"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
