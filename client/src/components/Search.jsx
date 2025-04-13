import React, { useEffect, useState } from 'react';
import { FaArrowLeft } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import useMobile from '../hooks/useMobile';


const Search = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [isSearchPage,setIsSearchPage] = useState(false)
    const [ isMobile ] = useMobile()
    
    // Fix search parameter parsing
    const searchParams = new URLSearchParams(location.search);
    const searchText = searchParams.get('q') || '';

    useEffect(()=>{
        const isSearch = location.pathname === "/search"
        setIsSearchPage(isSearch)
    },[location])


    const redirectToSearchPage = ()=>{
        navigate("/search")
    }

    const handleOnChange = (e)=>{
        const value = e.target.value
        const url = `/search?q=${value}`
        navigate(url)
    }

  return (
    <div className='w-full  min-w-[300px] lg:min-w-[420px] h-11 lg:h-12 rounded-lg border overflow-hidden flex items-center text-neutral-500 bg-slate-50 group focus-within:border-primary-200 '>
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
                                    'Search "Gaming PC Setup"',
                                    1000,
                                    'Search "Mechanical Keyboards"',
                                    1000,
                                    'Search "RGB Mouse and Pad"',
                                    1000,
                                    'Search "High Refresh Rate Monitors"',
                                    1000,
                                    'Search "Gaming Headsets"',
                                    1000,
                                    'Search "Streaming Microphones"',
                                    1000,
                                    'Search "Ergonomic Gaming Chairs"',
                                    1000,
                                    'Search "Gaming Console Area"',
                                    1000,
                                    'Search "LAN Cable Management"',
                                    1000,
                                    'Search "Capture Cards"',
                                    1000,
                                    'Search "4K Streaming Cameras"',
                                    1000,
                                    'Search "Soundproof Foam Panels"',
                                    1000,
                                    'Search "Elgato Stream Deck"',
                                    1000,
                                    'Search "VR Headsets"',
                                    1000,
                                    'Search "LED Ambient Lighting"',
                                    1000,
                                    'Search "Gaming Desk with Cable Ports"',
                                    1000,
                                    'Search "Game Controller Rack"',
                                    1000,
                                    'Search "External SSDs for Game Storage"',
                                    1000,
                                    'Search "Multi-Port USB Hubs"',
                                    1000,
                                    'Search "Dual Monitor Arms"',
                                    1000,
                                    'Search "Cloud Backup for Game Projects"',
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
                            placeholder='Search for atta dal and more.'
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
  )
}

export default Search
