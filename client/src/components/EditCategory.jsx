import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IoClose } from "react-icons/io5";
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import uploadImage from '../utils/UploadImage';

const EditCategory = ({close, fetchData,data : CategoryData}) => {
    const [data,setData] = useState({
        _id : CategoryData._id,
        name : CategoryData.name,
        image : CategoryData.image
    })
    const [loading,setLoading] = useState(false)

    const handleOnChange = (e)=>{
        const { name, value} = e.target

        setData((preve)=>{
            return{
                ...preve,
                [name] : value
            }
        })
    }
    const handleSubmit = async(e)=>{
        e.preventDefault()


        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.updateCategory,
                data : data
            })
            const { data : responseData } = response

            if(responseData.success){
                toast.success(responseData.message)
                close()
                fetchData()
            }
        } catch (error) {
            AxiosToastError(error)
        }finally{
            setLoading(false)
        }
    }
    const handleUploadCategoryImage = async(e)=>{
        const file = e.target.files[0]

        if(!file){
            return
        }
        setLoading(true)
        const response = await uploadImage(file)
        const { data : ImageResponse } = response
        setLoading(false)
        
        setData((preve)=>{
            return{
                ...preve,
                image : ImageResponse.data.url
            }
        })
    }
  return (
    <section className='fixed top-0 bottom-0 left-0 right-0 p-4 bg-neutral-800 bg-opacity-60 z-50 flex items-center justify-center'>
    <div className='bg-white dark:bg-dm-card max-w-4xl w-full p-4 rounded transition-colors duration-200'>
        <div className='flex items-center justify-between'>
            <h1 className='font-semibold text-charcoal dark:text-white transition-colors duration-200'>Update Category</h1>
            <button onClick={close} className='w-fit block ml-auto text-charcoal dark:text-white/70 hover:bg-brown-100 dark:hover:bg-dm-card-2 p-1 rounded-full transition-colors duration-200'>
                <IoClose size={25}/>
            </button>
        </div>
        <form className='my-3 grid gap-2' onSubmit={handleSubmit}>
            <div className='grid gap-1'>
                <label id='categoryName' className="text-charcoal dark:text-white transition-colors duration-200">Name</label>
                <input
                    type='text'
                    id='categoryName'
                    placeholder='Enter category name'
                    value={data.name}
                    name='name'
                    onChange={handleOnChange}
                    className='bg-plum-50 dark:bg-dm-card-2 p-2 border border-plum-100 dark:border-dm-border focus-within:border-plum-500 dark:focus-within:border-plum-400 outline-none rounded text-charcoal dark:text-white transition-colors duration-200'
                />
            </div>
            <div className='grid gap-1'>
                <p className="text-charcoal dark:text-white transition-colors duration-200">Image</p>
                <div className='flex gap-4 flex-col lg:flex-row items-center'>
                    <div className='border dark:border-dm-border bg-plum-50 dark:bg-dm-card-2 h-36 w-full lg:w-36 flex items-center justify-center rounded transition-colors duration-200'>
                        {
                            data.image ? (
                                <img
                                    alt='category'
                                    src={data.image}
                                    className='w-full h-full object-scale-down'
                                />
                            ) : (
                                <p className='text-sm text-neutral-500 dark:text-white/55 transition-colors duration-200'>No Image</p>
                            )
                        }
                        
                    </div>
                    <label htmlFor='uploadCategoryImage'>
                        <div  className={`
                        ${!data.name 
                            ? "bg-brown-200 dark:bg-dm-card-2 text-charcoal dark:text-white/55" 
                            : "border-primary-200 text-primary-700 dark:text-primary-300 hover:bg-primary-200 hover:text-neutral-900 dark:hover:bg-primary-300 dark:hover:text-black" }  
                            px-4 py-2 rounded cursor-pointer border font-medium transition-colors duration-200
                        `}>
                            {
                                loading ? "Loading..." : "Upload Image"
                            }
                           
                        </div>

                        <input disabled={!data.name} onChange={handleUploadCategoryImage} type='file' id='uploadCategoryImage' className='hidden'/>
                    </label>
                    
                </div>
            </div>

            <button
                className={`
                ${data.name && data.image 
                  ? "bg-primary-200 hover:bg-primary-100 text-black dark:bg-primary-700 dark:hover:bg-primary-600 dark:text-white" 
                  : "bg-brown-200 text-charcoal dark:bg-dm-card-2 dark:text-white/55"}
                py-2 rounded transition-colors duration-200 
                font-semibold 
                `}
            >Update Category</button>
        </form>
    </div>
    </section>
  )
}

export default EditCategory
