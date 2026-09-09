import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IoClose } from "react-icons/io5";
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const EditDeliveryZone = ({ close, fetchData, data: ZoneData }) => {
    const [data, setData] = useState({
        _id: ZoneData._id,
        name: ZoneData.name,
        corridor: ZoneData.corridor,
        fare: ZoneData.fare,
        isActive: ZoneData.isActive
    })
    const [loading, setLoading] = useState(false)

    const handleOnChange = (e) => {
        const { name, value } = e.target

        setData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

    const isValid = String(data.name).trim() && String(data.corridor).trim() && Number(data.fare) > 0

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!isValid) {
            return
        }

        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.updateDeliveryZone,
                data: {
                    _id: data._id,
                    name: data.name.trim(),
                    corridor: data.corridor.trim(),
                    fare: Number(data.fare),
                    isActive: data.isActive
                }
            })
            const { data: responseData } = response

            if (responseData.success) {
                toast.success(responseData.message)
                close()
                fetchData()
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className='fixed top-0 bottom-0 left-0 right-0 p-4 bg-neutral-800 bg-opacity-60 z-50 flex items-center justify-center'>
            <div className='bg-white dark:bg-dm-card max-w-md w-full p-4 rounded transition-colors duration-200'>
                <div className='flex items-center justify-between'>
                    <h1 className='font-semibold text-charcoal dark:text-white transition-colors duration-200'>Update Delivery Zone</h1>
                    <button onClick={close} className='w-fit block ml-auto text-charcoal dark:text-white/70 hover:bg-brown-100 dark:hover:bg-dm-card-2 p-1 rounded-full transition-colors duration-200'>
                        <IoClose size={25} />
                    </button>
                </div>
                <form className='my-3 grid gap-3' onSubmit={handleSubmit}>
                    <div className='grid gap-1'>
                        <label htmlFor='zoneCorridor' className="text-charcoal dark:text-white transition-colors duration-200">Corridor</label>
                        <input
                            type='text'
                            id='zoneCorridor'
                            value={data.corridor}
                            name='corridor'
                            onChange={handleOnChange}
                            className='bg-plum-50 dark:bg-dm-card-2 p-2 border border-plum-100 dark:border-dm-border focus-within:border-plum-500 dark:focus-within:border-plum-400 outline-none rounded text-charcoal dark:text-white transition-colors duration-200'
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='zoneName' className="text-charcoal dark:text-white transition-colors duration-200">Zone Name</label>
                        <input
                            type='text'
                            id='zoneName'
                            value={data.name}
                            name='name'
                            onChange={handleOnChange}
                            className='bg-plum-50 dark:bg-dm-card-2 p-2 border border-plum-100 dark:border-dm-border focus-within:border-plum-500 dark:focus-within:border-plum-400 outline-none rounded text-charcoal dark:text-white transition-colors duration-200'
                        />
                    </div>
                    <div className='grid gap-1'>
                        <label htmlFor='zoneFare' className="text-charcoal dark:text-white transition-colors duration-200">Fare (KES)</label>
                        <input
                            type='number'
                            min='0'
                            id='zoneFare'
                            value={data.fare}
                            name='fare'
                            onChange={handleOnChange}
                            className='bg-plum-50 dark:bg-dm-card-2 p-2 border border-plum-100 dark:border-dm-border focus-within:border-plum-500 dark:focus-within:border-plum-400 outline-none rounded text-charcoal dark:text-white transition-colors duration-200'
                        />
                    </div>
                    <label className='flex items-center gap-2 text-charcoal dark:text-white transition-colors duration-200'>
                        <input
                            type='checkbox'
                            checked={!!data.isActive}
                            onChange={(e) => setData((preve) => ({ ...preve, isActive: e.target.checked }))}
                            className='accent-plum-600 dark:accent-plum-400'
                        />
                        Active (visible at checkout)
                    </label>

                    <button
                        disabled={!isValid || loading}
                        className={`
                        ${isValid
                            ? "bg-primary-200 hover:bg-primary-100 text-black dark:bg-primary-700 dark:hover:bg-primary-600 dark:text-white"
                            : "bg-brown-200 text-charcoal dark:bg-dm-card-2 dark:text-white/55"}
                        py-2 rounded transition-colors duration-200
                        font-semibold
                        `}
                    >{loading ? 'Updating...' : 'Update Zone'}</button>
                </form>
            </div>
        </section>
    )
}

export default EditDeliveryZone
