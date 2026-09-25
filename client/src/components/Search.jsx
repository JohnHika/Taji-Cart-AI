import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { IoSearch } from 'react-icons/io5';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import useMobile from '../hooks/useMobile';

/**
 * Wait for a pause in typing before navigating. Must be longer than a normal
 * keystroke gap, otherwise every key press triggers its own search request.
 */
const SEARCH_DEBOUNCE_MS = 300;

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
    <div className='flex h-11 w-full min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-brown-200/80 bg-slate-50 text-xs text-neutral-500 transition-colors dark:border-dm-border dark:bg-dm-card-2 group focus-within:border-primary-200'>
        <div className="shrink-0">
            {
                (isMobile && isSearchPage ) ? (
                    <Link to={"/"} className='customer-touch-target m-0.5 rounded-full bg-white shadow-sm group-focus-within:text-primary-200 dark:bg-dm-card'>
                        <FaArrowLeft size={16}/>
                    </Link>
                ) :(
                    <button type="button" onClick={redirectToSearchPage} className='customer-touch-target group-focus-within:text-primary-200' aria-label="Search">
                        <IoSearch size={17}/>
                    </button>
                )
            }
        </div>
        <div className='h-full min-w-0 flex-1 pr-2'>
            {
                !isSearchPage ? (
                     //not in search page
                     <button type="button" onClick={redirectToSearchPage} className='flex h-full w-full cursor-pointer items-center text-left text-xs text-neutral-500 dark:text-white/50'>
                        <TypeAnimation
                                sequence={[
                                    'Search "HD lace wigs"',
                                    1000,
                                    'Search "Human hair bundles"',
                                    1000,
                                    'Search "Closure wigs"',
                                    1000,
                                    'Search "Frontal installs"',
                                    1000,
                                    'Search "Deep wave bundles"',
                                    1000,
                                    'Search "Bone straight wigs"',
                                    1000,
                                    'Search "Hair care products"',
                                    1000,
                                    'Search "Edge control"',
                                    1000,
                                    'Search "Natural texture wigs"',
                                    1000,
                                    'Search "Glueless wigs"',
                                    1000,
                                    'Search "Hair mousse"',
                                    1000,
                                    'Search "Wig caps"',
                                    1000,
                                    'Search "Silk press essentials"',
                                    1000,
                                    'Search "Curly lace fronts"',
                                    1000,
                                    'Search "Hair serum"',
                                    1000,
                                    'Search "Brazilian straight"',
                                    1000,
                                    'Search "Raw hair bundles"',
                                    1000,
                                    'Search "Hair glue remover"',
                                    1000,
                                    'Search "Scalp care products"',
                                    1000,
                                    'Search "Tape-in extensions"',
                                    1000,
                                    'Search "Hair tools"',
                                ]}
                                wrapper="span"
                                speed={50}
                                repeat={Infinity}
                                className="truncate"
                            />
                     </button>
                ) : (
                    //when i was search page
                    <div className='h-full w-full'>
                        <input
                            type='text'
                            placeholder='Search products…'
                            autoFocus
                            defaultValue={searchText}
                            className='h-full w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-neutral-400 dark:text-white dark:placeholder:text-white/35'
                            onChange={handleOnChange}
                        />
                    </div>
                )
            }
        </div>
        
    </div>
  );
};

export default Search;
