import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { IoClose } from "react-icons/io5"
import { FaMapMarkerAlt } from 'react-icons/fa'
import { useGlobalContext } from '../provider/GlobalProvider'
import LocationPicker from './LocationPicker'

const EditAddressDetails = ({ close, data }) => {
    const [selectedLocation, setSelectedLocation] = useState(
        data.coordinates?.lat && data.coordinates?.lng
            ? { lat: data.coordinates.lat, lng: data.coordinates.lng }
            : null
    )

    const { register, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            _id: data._id,
            userId: data.userId,
            address_line: data.address_line,
            city: data.city,
            state: data.state,
            country: data.country,
            pincode: data.pincode,
            mobile: data.mobile,
            deliveryInstructions: data.deliveryInstructions || ''
        }
    })
    const { fetchAddress } = useGlobalContext()

    const handleLocationSelect = (coords, displayName) => {
        setSelectedLocation(coords)
        if (displayName) {
            const firstPart = displayName.split(',')[0]?.trim()
            if (firstPart) setValue('address_line', firstPart)
        }
    }

    const onSubmit = async (formData) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateAddress,
                data: {
                    _id: formData._id,
                    address_line: formData.address_line,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    pincode: formData.pincode,
                    mobile: formData.mobile,
                    deliveryInstructions: formData.deliveryInstructions,
                    // Use newly picked pin; fall back to previously saved coords
                    coordinates: selectedLocation || data.coordinates || null
                }
            })

            const { data: responseData } = response

            if (responseData.success) {
                toast.success(responseData.message)
                if (close) {
                    close()
                    reset()
                    fetchAddress()
                }
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    return (
        <section className='bg-black fixed top-0 left-0 right-0 bottom-0 z-50 bg-opacity-70 h-[100dvh] overflow-auto'>
            <div className='bg-white p-4 w-full max-w-2xl mt-4 mx-auto rounded safe-area-bottom'>
                <div className='flex justify-between items-center gap-4 mb-4'>
                    <h2 className='font-semibold text-lg flex items-center gap-2'>
                        <FaMapMarkerAlt className="text-primary-200" />
                        Edit Address
                    </h2>
                    <button onClick={close} className='hover:text-red-500 p-1'>
                        <IoClose size={25} />
                    </button>
                </div>

                {/* Map location picker – optional update of the GPS pin */}
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        📍 Update your exact delivery pin on the map (optional)
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
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("address_line", { required: true })}
                            />
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='city' className='text-sm font-medium'>City / Area :</label>
                            <input
                                type='text'
                                id='city'
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("city", { required: true })}
                            />
                        </div>
                    </div>

                    <div className='grid sm:grid-cols-2 gap-3'>
                        <div className='grid gap-1'>
                            <label htmlFor='state' className='text-sm font-medium'>County :</label>
                            <input
                                type='text'
                                id='state'
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("state", { required: true })}
                            />
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='mobile' className='text-sm font-medium'>Phone Number :</label>
                            <input
                                type='tel'
                                id='mobile'
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("mobile", { required: true })}
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
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("pincode")}
                            />
                        </div>
                        <div className='grid gap-1'>
                            <label htmlFor='country' className='text-sm font-medium'>Country :</label>
                            <input
                                type='text'
                                id='country'
                                className='border bg-plum-50/80 p-3 rounded min-h-[44px] text-sm'
                                {...register("country", { required: true })}
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
                        className='bg-primary-200 w-full py-3 min-h-[44px] font-semibold mt-2 hover:bg-primary-100 rounded-lg flex items-center justify-center gap-2'
                    >
                        <FaMapMarkerAlt />
                        Save Changes
                    </button>
                </form>
            </div>
        </section>
    )
}

export default EditAddressDetails

