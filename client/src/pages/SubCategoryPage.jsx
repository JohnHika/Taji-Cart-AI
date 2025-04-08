import { createColumnHelper } from '@tanstack/react-table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa"
import { HiPencil, HiViewGrid, HiViewList } from "react-icons/hi"
import { MdDelete } from "react-icons/md"
import SummaryApi from '../common/SummaryApi'
import CofirmBox from '../components/CofirmBox'
import DisplayTable from '../components/DisplayTable'
import EditSubCategory from '../components/EditSubCategory'
import UploadSubCategoryModel from '../components/UploadSubCategoryModel'
import ViewImage from '../components/ViewImage'
import '../styles/TableStyles.css'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const SubCategoryPage = () => {
  // Add view mode state - toggle between 'table' and 'grid'
  const [viewMode, setViewMode] = useState('table')
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
  // Existing state variables
  const [openAddSubCategory,setOpenAddSubCategory] = useState(false)
  const [data,setData] = useState([])
  const [loading,setLoading] = useState(false)
  const columnHelper = createColumnHelper()
  const [ImageURL,setImageURL] = useState("")
  const [openEdit,setOpenEdit] = useState(false)
  const [editData,setEditData] = useState({
    _id : ""
  })
  const [deleteSubCategory,setDeleteSubCategory] = useState({
      _id : ""
  })
  const [openDeleteConfirmBox,setOpenDeleteConfirmBox] = useState(false)

  const fetchSubCategory = useCallback(async () => {
    try {
        setLoading(true)
        const response = await Axios({
            ...SummaryApi.getAllSubCategory,
            params: { _t: new Date().getTime() }
        })
        
        const { data: responseData } = response
        
        if (responseData.success) {
            setData([...responseData.data])
            // Reset to first page when data changes
            setCurrentPage(1)
        } else {
            toast.error("Failed to load subcategories")
        }
    } catch (error) {
        AxiosToastError(error)
    } finally {
        setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubCategory()
  }, [fetchSubCategory])

  // Add filtered data using useMemo to optimize performance
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    return data.filter(item => {
      // Search in subcategory name
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Search in categories
      const categoryMatch = item.category.some(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return nameMatch || categoryMatch;
    });
  }, [data, searchTerm]);

  // Calculate pagination data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  // Get current items for the current page
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredData.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredData, currentPage, itemsPerPage]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search term changes
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Change items per page
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  // Toggle view mode between table and grid
  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'table' ? 'grid' : 'table');
  };

  // Table columns configuration
  const column = [
    columnHelper.accessor('name', {
      header: () => <span className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Name</span>,
      cell: info => (
        <div className="name-cell">
          <span className="font-medium text-gray-800 dark:text-white transition-colors duration-200">{info.getValue()}</span>
        </div>
      )
    }),
    columnHelper.accessor('image', {
      header: () => <span className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Image</span>,
      cell: ({row}) => {
        return (
          <div className='image-cell flex justify-center items-center'>
            <img 
              src={row.original.image}
              alt={row.original.name}
              className='w-10 h-10 object-cover rounded cursor-pointer hover:scale-110 transition-transform duration-200 bg-white dark:bg-gray-700'
              onClick={() => {
                setImageURL(row.original.image)
              }}      
            />
          </div>
        )
      }
    }),
    columnHelper.accessor("category", {
      header: () => <span className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Category</span>,
      cell: ({row}) => {
        return(
          <div className="flex flex-wrap gap-1">
            {
              row.original.category.map((c, index) => {
                return(
                  <span 
                    key={c._id+"table"} 
                    className='bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs rounded-full shadow-sm transition-colors duration-200'
                  >
                    {c.name}
                  </span>
                )
              })
            }
          </div>
        )
      }
    }),
    columnHelper.accessor("_id", {
      header: () => <span className="font-medium text-gray-800 text-center block dark:text-white transition-colors duration-200">Actions</span>,
      cell: ({row}) => {
        return(
          <div className='actions-cell flex items-center justify-center gap-2'>
            <button 
              onClick={() => {
                setOpenEdit(true)
                setEditData(row.original)
              }} 
              className='p-2 bg-green-100 dark:bg-green-900/40 rounded-full hover:bg-green-200 dark:hover:bg-green-800/60 transition-colors duration-200 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
              title="Edit"
            >
              <HiPencil size={18}/>
            </button>
            <button 
              onClick={() => {
                setOpenDeleteConfirmBox(true)
                setDeleteSubCategory(row.original)
              }} 
              className='p-2 bg-red-100 dark:bg-red-900/40 rounded-full hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors duration-200 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
              title="Delete"
            >
              <MdDelete size={18}/>
            </button>
          </div>
        )
      }
    })
  ]

  const handleDeleteSubCategory = async() => {
      try {
          const response = await Axios({
              ...SummaryApi.deleteSubCategory,
              data: deleteSubCategory
          })

          const { data: responseData } = response

          if(responseData.success){
             toast.success(responseData.message)
             fetchSubCategory()
             setOpenDeleteConfirmBox(false)
             setDeleteSubCategory({_id: ""})
          }
      } catch (error) {
        AxiosToastError(error)
      }
  }

  // Render subcategory card for grid view
  const renderSubCategoryCard = (item) => (
    <div key={item._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg overflow-hidden transform hover:scale-[1.02] transition-all duration-200 flex flex-col">
      {/* Image header */}
      <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setImageURL(item.image)}
        />
        
        {/* Action buttons positioned at top right */}
        <div className="absolute top-2 right-2 flex gap-2">
          <button 
            onClick={() => {
              setOpenEdit(true);
              setEditData(item);
            }} 
            className="p-2 bg-green-100/90 dark:bg-green-900/90 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 backdrop-blur-sm"
            title="Edit"
          >
            <HiPencil size={18}/>
          </button>
          <button 
            onClick={() => {
              setOpenDeleteConfirmBox(true);
              setDeleteSubCategory(item);
            }} 
            className="p-2 bg-red-100/90 dark:bg-red-900/90 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 backdrop-blur-sm"
            title="Delete"
          >
            <MdDelete size={18}/>
          </button>
        </div>
      </div>
      
      {/* Card content */}
      <div className="p-4 flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 transition-colors duration-200">{item.name}</h3>
        
        {/* Categories */}
        <div className="mt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-200">Categories:</p>
          <div className="flex flex-wrap gap-1">
            {item.category.map(c => (
              <span 
                key={c._id} 
                className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs rounded-full shadow-sm transition-colors duration-200"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render pagination controls
  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 transition-colors duration-200">
      <div className="flex items-center mb-3 sm:mb-0">
        <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">
          Showing {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
        </span>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="ml-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-300 transition-colors duration-200"
        >
          <option value={8}>8 per page</option>
          <option value={12}>12 per page</option>
          <option value={24}>24 per page</option>
          <option value={48}>48 per page</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md ${
            currentPage === 1
              ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          } border border-gray-300 dark:border-gray-600 transition-colors duration-200`}
        >
          <FaChevronLeft size={14} />
        </button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          // Logic to show relevant page numbers
          let pageNum;
          if (totalPages <= 5) {
            // If 5 or fewer pages, show all
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            // If current page is 1, 2, or 3, show pages 1-5
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            // If current page is among the last 3, show the last 5 pages
            pageNum = totalPages - 4 + i;
          } else {
            // Otherwise, show 2 pages before and 2 pages after current page
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <button
              key={pageNum}
              onClick={() => goToPage(pageNum)}
              className={`px-3 py-1 rounded-md ${
                currentPage === pageNum
                  ? 'bg-primary-200 dark:bg-primary-700 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              } border border-gray-300 dark:border-gray-600 transition-colors duration-200`}
            >
              {pageNum}
            </button>
          );
        })}
        
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`px-3 py-1 rounded-md ${
            currentPage === totalPages || totalPages === 0
              ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          } border border-gray-300 dark:border-gray-600 transition-colors duration-200`}
        >
          <FaChevronRight size={14} />
        </button>
      </div>
    </div>
  );
  
  return (
    <section className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200'>
      {/* Header with search and view options */}
      <div className='p-4 bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-800/30 rounded-lg flex flex-col sm:flex-row items-center justify-between mb-6 transition-colors duration-200'>
        <h2 className='text-xl font-semibold text-gray-800 mb-3 sm:mb-0 dark:text-white transition-colors duration-200'>Sub Categories</h2>
        
        <div className='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto'>
          {/* Search bar */}
          <div className='relative w-full sm:w-auto sm:mx-4 flex-grow max-w-md'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FaSearch className='text-gray-400 dark:text-gray-500 transition-colors duration-200' />
            </div>
            <input
              type='text'
              placeholder='Search by name or category...'
              value={searchTerm}
              onChange={handleSearchChange}
              className='w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-300 focus:border-transparent transition-colors duration-200'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200'
              >
                ×
              </button>
            )}
          </div>
          
          {/* View mode toggle */}
          <button
            onClick={toggleViewMode}
            className='px-3 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/60 flex items-center gap-2 transition-colors duration-200'
            title={viewMode === 'table' ? "Switch to grid view" : "Switch to table view"}
          >
            {viewMode === 'table' ? (
              <>
                <HiViewGrid size={20} />
                <span className="hidden sm:inline">Grid View</span>
              </>
            ) : (
              <>
                <HiViewList size={20} />
                <span className="hidden sm:inline">Table View</span>
              </>
            )}
          </button>
          
          {/* Add button */}
          <button 
            onClick={() => setOpenAddSubCategory(true)} 
            className='px-4 py-2 bg-primary-200 dark:bg-primary-300 text-white rounded-md hover:bg-primary-100 dark:hover:bg-primary-200 transition-colors duration-200 font-medium w-full sm:w-auto'
          >
            Add Sub Category
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className='bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-800/30 rounded-lg mx-auto overflow-hidden transition-colors duration-200'>
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-200 dark:border-primary-300 mb-4"></div>
                <p>Loading subcategories...</p>
              </div>
            ) : data.length === 0 ? (
              "No subcategories found. Create your first one by clicking \"Add Sub Category\"."
            ) : (
              "No subcategories match your search. Try a different search term or clear the search."
            )}
          </div>
        ) : (
          <div className='relative'>
            {/* Display result count */}
            {searchTerm && (
              <div className="p-2 bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 transition-colors duration-200">
                Found {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} for "{searchTerm}"
              </div>
            )}
            
            {/* Conditional rendering based on view mode */}
            {viewMode === 'table' ? (
              // Table View
              <div className='overflow-x-auto w-full'>
                <div className='overflow-y-auto max-h-[70vh]'>
                  <div className="custom-table">
                    <DisplayTable
                      data={currentItems}
                      column={column}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Grid View
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {currentItems.map(item => renderSubCategoryCard(item))}
                </div>
              </div>
            )}
            
            {/* Pagination */}
            {filteredData.length > 0 && renderPagination()}
          </div>
        )}
      </div>

      {/* Modals */}
      {openAddSubCategory && (
        <UploadSubCategoryModel 
          close={() => {
            setOpenAddSubCategory(false)
            fetchSubCategory()
          }}
          fetchData={fetchSubCategory}
        />
      )}

      {ImageURL && (
        <ViewImage url={ImageURL} close={() => setImageURL("")}/>
      )}

      {openEdit && (
        <EditSubCategory 
          data={editData} 
          close={() => setOpenEdit(false)}
          fetchData={fetchSubCategory}
        />
      )}

      {openDeleteConfirmBox && (
        <CofirmBox 
          cancel={() => setOpenDeleteConfirmBox(false)}
          close={() => setOpenDeleteConfirmBox(false)}
          confirm={handleDeleteSubCategory}
        />
      )}

      {/* Refresh Button */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={fetchSubCategory}
          className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200"
          title="Refresh data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </section>
  )
}

export default SubCategoryPage
