import React, { useRef, useState } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { IoClose } from "react-icons/io5";
import { useGlobalContext } from '../provider/GlobalProvider'
import LocationPicker from './LocationPicker'
import { FaMapMarkerAlt } from 'react-icons/fa'

const AddAddress = ({close}) => {
    const { register, handleSubmit, reset, setValue } = useForm()
    const { fetchAddress } = useGlobalContext()
    const [submitting, setSubmitting] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState(null)
    const [showMap, setShowMap] = useState(true)
    const submitLockRef = useRef(false)

    // Handle location selection from map
    const handleLocationSelect = (coords, displayName) => {
        setSelectedLocation(coords)
        if (displayName) {
            // Auto-fill address line from search result
            setValue('addressline', displayName.split(',')[0])
        }
    }

    const onSubmit = async(data)=>{
        if (submitLockRef.current || submitting) {
            return
        }

        // Require location selection
        if (!selectedLocation) {
            toast.error('Please select your delivery location on the map')
            return
        }
    
        try {
            submitLockRef.current = true
            setSubmitting(true)
            const response = await Axios({
                ...SummaryApi.createAddress,
                data : {
                    address_line : data.addressline,
                    city : data.city,
                    state : data.state,
                    country : data.country,
                    pincode : data.pincode,
                    mobile : data.mobile,
                    coordinates: selectedLocation,
                    deliveryInstructions: data.deliveryInstructions || ''
                },
                requestLockKey : `address:create:${data.addressline}:${data.city}:${data.mobile}`
            })

            const { data : responseData } = response
            
            if(responseData.success){
                toast.success(responseData.message)
                if(close){
                    close()
                    reset()
                    setSelectedLocation(null)
                    fetchAddress()
                }
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setSubmitting(false)
            submitLockRef.current = false
        }
    }

  return (
    <section className='bg-black fixed top-0 left-0 right-0 bottom-0 z-50 bg-opacity-70 h-[100dvh] overflow-auto'>
        <div className='bg-white p-4 w-full max-w-2xl mt-4 mx-auto rounded safe-area-bottom'>
            <div className='flex justify-between items-center gap-4 mb-4'>
                <h2 className='font-semibold text-lg flex items-center gap-2'>
                    <FaMapMarkerAlt className="text-primary-200" />
                    Add Delivery Address
                </h2>
                <button onClick={close} className='hover:text-red-500 p-1'>
                    <IoClose size={25}/>
                </button>
            </div>

            {/* Uber-like location picker */}
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                    📍 Select your exact delivery location on the map (like Uber)
                </p>
                <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    initialPosition={selectedLocation}
                />
            </div>

            <form className='grid gap-3' onSubmit={handleSubmit(onSubmit)}>
                <div className='grid sm:grid-cols-2 gap-3'>
                    <div className='grid gap-1'>
                        <label htmlFor='addressline' className='text-sm font-medium'>Address / Building Name :</label>
                        <input
                            type='text'
                            id='addressline' 
                            placeholder="e.g., Kencom House, 2nd Floor"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("addressline",{required : true})}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='city' className='text-sm font-medium'>City / Area :</label>
                        <input
                            type='text'
                            id='city'
                            placeholder="e.g., Nairobi CBD"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("city",{required : true})}
                        />
                    </div>
                </div>

                <div className='grid sm:grid-cols-2 gap-3'>
                    <div className='grid gap-1'>
                        <label htmlFor='state' className='text-sm font-medium'>County :</label>
                        <input
                            type='text'
                            id='state' 
                            placeholder="e.g., Nairobi"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("state",{required : true})}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='mobile' className='text-sm font-medium'>Phone Number :</label>
                        <input
                            type='tel'
                            id='mobile' 
                            placeholder="e.g., 0712345678"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("mobile",{required : true})}
                        />
                    </div>
                </div>

                <div className='grid sm:grid-cols-2 gap-3'>
                    <div className='grid gap-1'>
                        <label htmlFor='pincode' className='text-sm font-medium'>Postal Code (optional) :</label>
                        <input
                            type='text'
                            inputMode='numeric'
                            id='pincode' 
                            placeholder="e.g., 00100"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("pincode")}
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='country' className='text-sm font-medium'>Country :</label>
                        <input
                            type='text'
                            id='country' 
                            defaultValue="Kenya"
                            className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                            {...register("country",{required : true})}
                        />
                    </div>
                </div>

                <div className='grid gap-1'>
                    <label htmlFor='deliveryInstructions' className='text-sm font-medium'>Delivery Instructions (optional) :</label>
                    <textarea
                        id='deliveryInstructions' 
                        placeholder="e.g., Gate code is 1234, call when you arrive, leave with security..."
                        rows={2}
                        className='border bg-plum-50/80 p-3 rounded min-h-[60px] text-sm resize-none'
                        {...register("deliveryInstructions")}
                    />
                </div>

                <button
                    type='submit'
                    disabled={submitting || !selectedLocation}
                    className='bg-primary-200 w-full py-3 min-h-[44px] font-semibold mt-2 hover:bg-primary-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2'
                >
                    {submitting ? (
                        'Saving...'
                    ) : !selectedLocation ? (
                        <>
                            <FaMapMarkerAlt />
                            Select Location on Map First
                        </>
                    ) : (
                        <>
                            <FaMapMarkerAlt />
                            Save Address
                        </>
                    )}
                </button>
            </form>
        </div>
    </section>
  )
}

export default AddAddress
