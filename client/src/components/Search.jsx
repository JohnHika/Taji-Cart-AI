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
    <div className='w-full min-w-0 xl:min-w-[360px] 2xl:min-w-[420px] h-11 xl:h-12 rounded-lg border overflow-hidden flex items-center text-neutral-500 bg-slate-50 group focus-within:border-primary-200 '>
        <div>
            {
                (isMobile && isSearchPage ) ? (
                    <Link to={"/"} className='flex justify-center items-center h-full p-2 m-1 group-focus-within:text-primary-200 bg-white rounded-full shadow-md'>
                        <FaArrowLeft size={20}/>
                    </Link>
                ) :(
                    <button className='flex justify-center items-center h-full p-3 group-focus-within:text-primary-200'>
                        <IoSearch size={22}/>
                    </button>
                )
            }
        </div>
        <div className='w-full h-full'>
            {
                !isSearchPage ? (
                     //not in search page
                     <div onClick={redirectToSearchPage} className='w-full h-full flex items-center'>
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
                            />
                     </div>
                ) : (
                    //when i was search page
                    <div className='w-full h-full'>
                        <input
                            type='text'
                            placeholder='Search wigs, bundles, care products, and more.'
                            autoFocus
                            defaultValue={searchText}
                            className='bg-transparent w-full h-full outline-none'
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
