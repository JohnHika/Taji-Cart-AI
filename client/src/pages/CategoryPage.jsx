import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaPen, FaPlus, FaSearch, FaTrash } from 'react-icons/fa'
import SummaryApi from '../common/SummaryApi'
import CofirmBox from '../components/CofirmBox'
import EditCategory from '../components/EditCategory'
import Loading from '../components/Loading'
import NoData from '../components/NoData'
import UploadCategoryModel from '../components/UploadCategoryModel'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const CategoryPage = () => {
    const [openUploadCategory, setOpenUploadCategory] = useState(false)
    const [loading, setLoading] = useState(false)
    const [categoryData, setCategoryData] = useState([])
    const [openEdit, setOpenEdit] = useState(false)
    const [editData, setEditData] = useState({
        name: "",
        image: "",
    })
    const [openConfimBoxDelete, setOpenConfirmBoxDelete] = useState(false)
    const [deleteCategory, setDeleteCategory] = useState({
        _id: ""
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [categories, setCategories] = useState([]);  // Added categories state
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    const fetchCategory = async() => {
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getCategory
            })
            const { data: responseData } = response

            if(responseData.success){
                setCategoryData(responseData.data)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCategory()
    }, [])

    useEffect(() => {
        // Add debug logging to help troubleshoot
        console.log("CategoryPage mounted");
        console.log("Categories from store:", categories);
        
        // If categories are empty, fetch them
        if (!categories || categories.length === 0) {
          console.log("Categories not found in store, fetching...");
          fetchCategories();
        }
    }, [categories]);

    const fetchCategories = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const response = await Axios({
            url: '/api/category/get',  // Changed from '/api/categories' to '/api/category/get'
            method: 'GET'
          });
          
          if (response.data.success) {
            setCategories(response.data.data || []);
          } else {
            setError(response.data.message || 'Failed to fetch categories');
            toast.error('Failed to fetch categories');
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          setError('An error occurred while fetching categories');
          AxiosToastError(error);
        } finally {
          setLoading(false);
        }
    };

    const handleDeleteCategory = async() => {
        try {
            const response = await Axios({
                ...SummaryApi.deleteCategory,
                data: deleteCategory
            })

            const { data: responseData } = response

            if(responseData.success){
                toast.success(responseData.message)
                fetchCategory()
                setOpenConfirmBoxDelete(false)
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    // Filter categories based on search term
    const filteredCategories = categoryData.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <section className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
            {/* Header with title, search and add button */}
            <div className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-10 transition-colors duration-200">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold dark:text-white transition-colors duration-200">Categories</h2>
                    
                    {/* Search input */}
                    <div className="relative flex-grow max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400 dark:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search categories..."
                            className="pl-10 pr-4 py-2 w-full border dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-300 transition-colors duration-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={() => setOpenUploadCategory(true)} 
                        className="flex items-center gap-2 bg-primary-200 hover:bg-primary-100 dark:bg-primary-300 dark:hover:bg-primary-200 text-white px-4 py-2 rounded-md transition-colors duration-200"
                    >
                        <FaPlus /> Add Category
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto p-4">
                {!loading && filteredCategories.length === 0 && <NoData />}

                {/* Grid layout for cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredCategories.map((category) => (
                        <div 
                            key={category._id} 
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-800/30 overflow-hidden flex flex-col h-full transition-colors duration-200"
                        >
                            {/* Card image with fixed height container */}
                            <div className="h-44 overflow-hidden bg-gray-100 dark:bg-gray-700 p-2 transition-colors duration-200">
                                <img 
                                    src={category.image} 
                                    alt={category.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://via.placeholder.com/150?text=No+Image";
                                    }}
                                />
                            </div>
                            
                            {/* Card content */}
                            <div className="p-3 flex-grow">
                                <h3 className="font-medium text-center text-gray-800 dark:text-white transition-colors duration-200">{category.name}</h3>
                            </div>
                            
                            {/* Card actions - always at the bottom */}
                            <div className="flex border-t border-gray-100 dark:border-gray-700 transition-colors duration-200">
                                <button 
                                    onClick={() => {
                                        setOpenEdit(true)
                                        setEditData(category)
                                    }} 
                                    className="flex items-center justify-center gap-1 flex-1 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-600 dark:text-green-400 transition-colors duration-200"
                                >
                                    <FaPen size={14} /> Edit
                                </button>
                                <button 
                                    onClick={() => {
                                        setOpenConfirmBoxDelete(true)
                                        setDeleteCategory(category)
                                    }} 
                                    className="flex items-center justify-center gap-1 flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 transition-colors duration-200"
                                >
                                    <FaTrash size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {loading && <Loading />}

            {/* Modals */}
            {openUploadCategory && (
                <UploadCategoryModel 
                    fetchData={fetchCategory} 
                    close={() => setOpenUploadCategory(false)}
                />
            )}

            {openEdit && (
                <EditCategory 
                    data={editData} 
                    close={() => setOpenEdit(false)} 
                    fetchData={fetchCategory}
                />
            )}

            {openConfimBoxDelete && (
                <CofirmBox 
                    close={() => setOpenConfirmBoxDelete(false)} 
                    cancel={() => setOpenConfirmBoxDelete(false)} 
                    confirm={handleDeleteCategory}
                />
            )}
        </section>
    )
}

export default CategoryPage
