import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus } from "react-icons/fa";
import { MdDelete, MdEdit } from "react-icons/md";
import { useDispatch, useSelector } from 'react-redux';
import SummaryApi from '../common/SummaryApi';
import AddAddress from '../components/AddAddress';
import EditAddressDetails from '../components/EditAddressDetails';
import { useGlobalContext } from '../provider/GlobalProvider';
import { handleAddAddress } from '../store/addressSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const Address = () => {
  const addressList = useSelector(state => state.addresses.addressList)
  const [openAddress, setOpenAddress] = useState(false)
  const [OpenEdit, setOpenEdit] = useState(false)
  const [editData, setEditData] = useState({})
  const [loading, setLoading] = useState(true)
  const { fetchAddress } = useGlobalContext()
  const dispatch = useDispatch()

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      console.log("Fetching addresses...");
      const response = await Axios({
        ...SummaryApi.getAddress
      });
      
      console.log("Address response:", response.data);
      
      if (response.data.success) {
        const addresses = response.data.data || [];
        console.log("Addresses to dispatch:", addresses);
        dispatch(handleAddAddress(addresses));
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAddress = async(id) => {
    try {
      const response = await Axios({
        ...SummaryApi.disableAddress,
        data : {
          _id : id
        }
      })
      if(response.data.success){
        toast.success("Address Removed")
        if(fetchAddress){
          fetchAddress()
        } else {
          loadAddresses();
        }
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }
  
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200'>
        {/* Header section */}
        <div className='bg-white dark:bg-gray-800 shadow-lg px-4 py-3 flex justify-between gap-4 items-center transition-colors duration-200'>
            <h2 className='font-semibold text-ellipsis line-clamp-1 text-gray-800 dark:text-white transition-colors duration-200'>Address Book</h2>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  Loading...
                </span>
              )}
              <button 
                onClick={() => loadAddresses()} 
                className='text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white px-2 py-1 rounded transition-colors duration-200'
                title="Refresh addresses"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => setOpenAddress(true)} 
                className='border border-primary-200 dark:border-primary-300 text-primary-200 dark:text-primary-300 px-3 hover:bg-primary-200 dark:hover:bg-primary-300 hover:text-white dark:hover:text-gray-900 py-1.5 rounded-full transition-colors duration-200 flex items-center gap-1'
              >
                <FaPlus size={12} /> Add Address
              </button>
            </div>
        </div>
        
        {/* Status and Debug info */}
        {loading ? (
          <div className="p-4 bg-blue-50 dark:bg-gray-800 transition-colors duration-200">
            <div className="text-center p-8 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
              <div className="animate-pulse flex space-x-4 justify-center">
                <div className="h-4 w-4 bg-gray-300 dark:bg-gray-500 rounded-full"></div>
                <div className="h-4 w-4 bg-gray-300 dark:bg-gray-500 rounded-full"></div>
                <div className="h-4 w-4 bg-gray-300 dark:bg-gray-500 rounded-full"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300 transition-colors duration-200">Loading addresses...</p>
            </div>
          </div>
        ) : (
          <div className='bg-blue-50 dark:bg-gray-800 p-4 grid gap-4 transition-colors duration-200'>
              {/* Debug info */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="p-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                  <p>Total addresses: {addressList.length}</p>
                  <p>Active addresses: {addressList.filter(addr => addr.status).length}</p>
                </div>
              )}
              
              {/* Show message if no addresses */}
              {addressList.filter(addr => addr.status).length === 0 && (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
                  No addresses found. Add your first address to get started.
                </div>
              )}
              
              {/* List of addresses */}
              {
                addressList.map((address, index) => {
                  return(
                      <div 
                        key={address._id || index} 
                        className={`border dark:border-gray-700 rounded-lg p-4 flex gap-3 bg-white dark:bg-gray-700 shadow-sm transition-colors duration-200 ${!address.status && 'hidden'}`}
                      >
                          <div className='w-full dark:text-gray-200 transition-colors duration-200'>
                            <p className="font-medium text-gray-800 dark:text-white mb-2 transition-colors duration-200">{address.address_line}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                              <p>{address.city}</p>
                              <p>{address.state}</p>
                              <p>{address.country} - {address.pincode}</p>
                              <p>{address.mobile}</p>
                            </div>
                          </div>
                          <div className='grid gap-3'>
                            <button 
                              onClick={() => {
                                setOpenEdit(true)
                                setEditData(address)
                              }} 
                              className='bg-green-100 dark:bg-green-900/30 p-2 rounded hover:text-white hover:bg-green-600 dark:hover:bg-green-700 text-green-700 dark:text-green-400 transition-colors duration-200'
                              aria-label="Edit address"
                              title="Edit address"
                            >
                              <MdEdit size={18}/>
                            </button>
                            <button 
                              onClick={() => handleDisableAddress(address._id)}
                              className='bg-red-100 dark:bg-red-900/30 p-2 rounded hover:text-white hover:bg-red-600 dark:hover:bg-red-700 text-red-700 dark:text-red-400 transition-colors duration-200'
                              aria-label="Delete address"
                              title="Delete address"
                            >
                              <MdDelete size={18}/>  
                            </button>
                          </div>
                      </div>
                  )
                })
              }
              
              {/* Add address button */}
              <div 
                onClick={() => setOpenAddress(true)} 
                className='h-16 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex justify-center items-center cursor-pointer rounded-lg hover:border-primary-200 dark:hover:border-primary-300 transition-colors duration-200'
              >
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                  <FaPlus size={14} />
                  Add new address
                </span>
              </div>
          </div>
        )}

        {/* Modals */}
        {
          openAddress && (
            <AddAddress close={() => {
              setOpenAddress(false);
              setTimeout(loadAddresses, 500);
            }}/>
          )
        }

        {
          OpenEdit && (
            <EditAddressDetails data={editData} close={() => {
              setOpenEdit(false);
              setTimeout(loadAddresses, 500);
            }}/>
          )
        }
    </div>
  )
}

export default Address
