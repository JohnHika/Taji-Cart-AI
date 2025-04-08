import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IoClose } from "react-icons/io5";
import { useSelector } from 'react-redux';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import uploadImage from '../utils/UploadImage';

const UploadSubCategoryModel = ({close, fetchData}) => {
    const [subCategoryData,setSubCategoryData] = useState({
        name : "",
        image : "",
        category : []
    })
    const allCategory = useSelector(state => state.product.allCategory)

    const handleChange = (e)=>{
        const { name, value} = e.target 

        setSubCategoryData((preve)=>{
            return{
                ...preve,
                [name] : value
            }
        })
    }

    const handleUploadSubCategoryImage = async(e)=>{
        const file = e.target.files[0]

        if(!file){
            return
        }

        const response = await uploadImage(file)
        const { data : ImageResponse } = response

        setSubCategoryData((preve)=>{
            return{
                ...preve,
                image : ImageResponse.data.url
            }
        })
    }

    const handleRemoveCategorySelected = (categoryId)=>{
        const index = subCategoryData.category.findIndex(el => el._id === categoryId )
        subCategoryData.category.splice(index,1)
        setSubCategoryData((preve)=>{
            return{
                ...preve
            }
        })
    }

    const handleSubmitSubCategory = async(e) => {
        e.preventDefault()
        
        try {
            const response = await Axios({
                ...SummaryApi.createSubCategory,
                data: subCategoryData
            })

            const { data: responseData } = response

            console.log("Subcategory create response:", responseData)
            
            if(responseData.success){
                toast.success(responseData.message)
                
                // Immediately fetch updated data
                if(fetchData) {
                    await fetchData() // Wait for fetch to complete
                }
                
                // Then close the modal after data is refreshed
                if(close) {
                    close()
                }
            } else {
                toast.error(responseData.message || "Failed to create subcategory")
            }
        } catch (error) {
            console.error("Error creating subcategory:", error)
            AxiosToastError(error)
        }
    }

  return (
    <section className='fixed top-0 right-0 bottom-0 left-0 bg-neutral-800 bg-opacity-70 z-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-5xl bg-white dark:bg-gray-800 p-4 rounded transition-colors duration-200'>
            <div className='flex items-center justify-between gap-3'>
                <h1 className='font-semibold text-gray-900 dark:text-white transition-colors duration-200'>Add Sub Category</h1>
                <button onClick={close} className="text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full transition-colors duration-200">
                    <IoClose size={25}/>
                </button>
            </div>
            <form className='my-3 grid gap-3' onSubmit={handleSubmitSubCategory}>
                    <div className='grid gap-1'>
                        <label htmlFor='name' className="text-gray-800 dark:text-white transition-colors duration-200">Name</label>
                        <input 
                            id='name'
                            name='name'
                            value={subCategoryData.name}
                            onChange={handleChange}
                            className='p-3 bg-blue-50 dark:bg-gray-700 border dark:border-gray-600 text-gray-900 outline-none focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
                        />
                    </div>
                    <div className='grid gap-1'>
                        <p className="text-gray-800 dark:text-white transition-colors duration-200">Image</p>
                        <div className='flex flex-col lg:flex-row items-center gap-3'>
                            <div className='border dark:border-gray-600 h-36 w-full lg:w-36 bg-blue-50 dark:bg-gray-700 flex items-center justify-center transition-colors duration-200'>
                                {
                                    !subCategoryData.image ? (
                                        <p className='text-sm text-neutral-500 dark:text-gray-300 transition-colors duration-200'>No Image</p>
                                    ) : (
                                        <img
                                            alt='subCategory'
                                            src={subCategoryData.image}
                                            className='w-full h-full object-scale-down'
                                        />
                                    )
                                }
                            </div>
                            <label htmlFor='uploadSubCategoryImage'>
                                <div className='px-4 py-1 border border-primary-100 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 hover:text-neutral-900 dark:hover:bg-primary-300 dark:hover:text-black cursor-pointer transition-colors duration-200'>
                                    Upload Image
                                </div>
                                <input 
                                    type='file'
                                    id='uploadSubCategoryImage'
                                    className='hidden'
                                    onChange={handleUploadSubCategoryImage}
                                />
                            </label>
                            
                        </div>
                    </div>
                    <div className='grid gap-1'>
                        <label className="text-gray-800 dark:text-white transition-colors duration-200">Select Category</label>
                        <div className='border dark:border-gray-600 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded transition-colors duration-200'>
                            {/*display value**/}
                            <div className='flex flex-wrap gap-2'>
                                {
                                    subCategoryData.category.map((cat,index)=>{
                                        return(
                                            <span key={cat._id+"selectedValue"} className='bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md px-1 m-1 flex items-center gap-2 transition-colors duration-200'>
                                                {cat.name}
                                                <span className='cursor-pointer text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors duration-200' onClick={()=>handleRemoveCategorySelected(cat._id)}>
                                                    <IoClose size={20}/>
                                                </span>
                                            </span>
                                        )
                                    })
                                }
                            </div>

                            {/*select category**/}
                            <select
                                className='w-full p-2 bg-transparent text-gray-800 dark:text-white outline-none border dark:border-gray-600 transition-colors duration-200'
                                onChange={(e)=>{
                                    const value = e.target.value
                                    const categoryDetails = allCategory.find(el => el._id == value)
                                    
                                    setSubCategoryData((preve)=>{
                                        return{
                                            ...preve,
                                            category : [...preve.category,categoryDetails]
                                        }
                                    })
                                }}
                            >
                                <option value="" className="text-gray-800 bg-white dark:text-white dark:bg-gray-700">Select Category</option>
                                {
                                    allCategory.map((category,index)=>{
                                        return(
                                            <option 
                                                value={category?._id} 
                                                key={category._id+"subcategory"} 
                                                className="text-gray-800 bg-white hover:bg-gray-100 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600"
                                            >
                                                {category?.name}
                                            </option>
                                        )
                                    })
                                }
                            </select>
                        </div>
                    </div>

                    <button
                        className={`px-4 py-2 border transition-colors duration-200
                            ${subCategoryData?.name && subCategoryData?.image && subCategoryData?.category[0] ? 
                            "bg-primary-200 hover:bg-primary-100 text-black dark:bg-primary-700 dark:hover:bg-primary-600 dark:text-white" : 
                            "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"}    
                            font-semibold
                        `}
                    >
                        Submit
                    </button>
                    
            </form>
        </div>
    </section>
  )
}

export default UploadSubCategoryModel
