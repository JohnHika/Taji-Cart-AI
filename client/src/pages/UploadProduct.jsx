import React, { useEffect, useState } from 'react';
import { FaCloudUploadAlt, FaImages } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { MdDelete } from "react-icons/md";
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import AddFieldComponent from '../components/AddFieldComponent';
import Loading from '../components/Loading';
import ViewImage from '../components/ViewImage';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/SuccessAlert';
import uploadImage, { uploadMultipleImages } from '../utils/UploadImage';

const UploadProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editProductId = queryParams.get('edit');
  const isEditMode = !!editProductId;

  const [data, setData] = useState({
      name: "",
      image: [],
      category: [],
      subCategory: [],
      unit: "",
      stock: "",
      price: "",
      discount: "",
      description: "",
      more_details: {},
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, uploaded: 0 });
  const [ViewImageURL, setViewImageURL] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const allCategory = useSelector(state => state.product.allCategory);
  const [selectCategory, setSelectCategory] = useState("");
  const [selectSubCategory, setSelectSubCategory] = useState("");
  const allSubCategory = useSelector(state => state.product.allSubCategory);

  const [openAddField, setOpenAddField] = useState(false);
  const [fieldName, setFieldName] = useState("");

  // Fetch product details when in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchProductDetails();
    }
  }, [editProductId]);

  // Fetch product details from API
  const fetchProductDetails = async () => {
    try {
      setFormLoading(true);
      const response = await Axios({
        ...SummaryApi.getProductDetails,
        data: { productId: editProductId }
      });
      
      if (response.data.success) {
        const productData = response.data.data;
        // Transform the data to match our form structure
        setData({
          ...productData,
          // Ensure these are arrays even if API returns objects or null
          image: Array.isArray(productData.image) ? productData.image : [],
          category: Array.isArray(productData.category) ? productData.category : [],
          subCategory: Array.isArray(productData.subCategory) ? productData.subCategory : [],
          // Ensure more_details is an object even if API returns null
          more_details: productData.more_details || {},
        });
      } else {
        successAlert("Product not found", "error");
        navigate('/dashboard/product');
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      AxiosToastError(error);
      navigate('/dashboard/product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Single image upload handler (kept for backward compatibility)
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageLoading(true);
    try {
      const response = await uploadImage(file);
      const { data: ImageResponse } = response;
      const imageUrl = ImageResponse.data.url;

      setData((prev) => ({
        ...prev,
        image: [...prev.image, imageUrl]
      }));
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setImageLoading(false);
    }
  };

  // New handler for multiple image uploads
  const handleUploadMultipleImages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setImageLoading(true);
    setUploadProgress({ total: files.length, uploaded: 0 });
    
    try {
      const imageUrls = await uploadMultipleImages(files);
      
      if (imageUrls && imageUrls.length > 0) {
        setData((prev) => ({
          ...prev,
          image: [...prev.image, ...imageUrls]
        }));
      }
    } catch (error) {
      console.error("Multiple uploads failed:", error);
      AxiosToastError(error);
    } finally {
      setImageLoading(false);
      setUploadProgress({ total: 0, uploaded: 0 });
    }
  };

  const handleDeleteImage = (index) => {
    const updatedImages = [...data.image];
    updatedImages.splice(index, 1);
    setData((prev) => ({
      ...prev,
      image: updatedImages
    }));
  };

  const handleRemoveCategory = (index) => {
    const updatedCategories = [...data.category];
    updatedCategories.splice(index, 1);
    setData((prev) => ({
      ...prev,
      category: updatedCategories
    }));
  };

  const handleRemoveSubCategory = (index) => {
    const updatedSubCategories = [...data.subCategory];
    updatedSubCategories.splice(index, 1);
    setData((prev) => ({
      ...prev,
      subCategory: updatedSubCategories
    }));
  };

  const handleAddField = () => {
    if (!fieldName.trim()) return;
    
    setData((prev) => ({
      ...prev,
      more_details: {
        ...prev.more_details,
        [fieldName]: ""
      }
    }));
    setFieldName("");
    setOpenAddField(false);
  };

  const handleDeleteField = (field) => {
    const updatedDetails = { ...data.more_details };
    delete updatedDetails[field];
    
    setData((prev) => ({
      ...prev,
      more_details: updatedDetails
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (data.category.length === 0) {
      successAlert("Please select at least one category", "error");
      return;
    }
    
    if (data.subCategory.length === 0) {
      successAlert("Please select at least one subcategory", "error");
      return;
    }
    
    if (data.image.length === 0) {
      successAlert("Please upload at least one image", "error");
      return;
    }
    
    try {
      setFormLoading(true);
      
      // For edit mode, structure the request properly with productId
      const apiEndpoint = isEditMode 
        ? { 
            ...SummaryApi.updateProductDetails,  // Using correct API endpoint name
            data: { 
              ...data, 
              _id: editProductId  // Using _id instead of productId to match controller expectation
            } 
          }
        : { ...SummaryApi.createProduct, data };
      
      // Add some debug logging
      console.log("Submitting product data:", isEditMode ? "UPDATE" : "CREATE", apiEndpoint.data);
      
      const response = await Axios(apiEndpoint);
      const { data: responseData } = response;

      if (responseData.success) {
        successAlert(responseData.message || (isEditMode ? "Product updated successfully" : "Product created successfully"));
        
        if (!isEditMode) {
          // Clear form only for new products
          setData({
            name: "",
            image: [],
            category: [],
            subCategory: [],
            unit: "",
            stock: "",
            price: "",
            discount: "",
            description: "",
            more_details: {},
          });
        } else {
          // Navigate back to products page after update
          navigate('/dashboard/product');
        }
      }
    } catch (error) {
      console.error("Error saving product:", error);
      AxiosToastError(error);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    navigate('/dashboard/product');
  };

  // Batch delete all images
  const handleDeleteAllImages = () => {
    if (data.image.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete all ${data.image.length} images?`)) {
      setData(prev => ({
        ...prev,
        image: []
      }));
    }
  };

  if (formLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <Loading />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {isEditMode ? "Loading product details..." : "Processing request..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className='transition-colors duration-200 dark:bg-gray-900'>
      <div className='p-2 bg-white dark:bg-gray-800 shadow-md flex items-center justify-between transition-colors duration-200'>
        <h2 className='font-semibold dark:text-white'>{isEditMode ? "Edit Product" : "Upload Product"}</h2>
      </div>
      <div className='grid p-3'>
        <form className='grid gap-4' onSubmit={handleSubmit}>
          <div className='grid gap-1'>
            <label htmlFor='name' className='font-medium dark:text-gray-200'>Name</label>
            <input 
              id='name'
              type='text'
              placeholder='Enter product name'
              name='name'
              value={data.name}
              onChange={handleChange}
              required
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
            />
          </div>
          <div className='grid gap-1'>
            <label htmlFor='description' className='font-medium dark:text-gray-200'>Description</label>
            <textarea 
              id='description'
              placeholder='Enter product description'
              name='description'
              value={data.description}
              onChange={handleChange}
              required
              rows={3}
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded resize-none dark:text-white transition-colors duration-200'
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className='font-medium dark:text-gray-200'>
                Images {data.image.length > 0 && 
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    ({data.image.length} {data.image.length === 1 ? 'image' : 'images'})
                  </span>
                }
              </p>
              
              {data.image.length > 0 && (
                <button 
                  type="button"
                  onClick={handleDeleteAllImages}
                  className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                >
                  Delete All
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Single image upload */}
              <label htmlFor='productImage' className='bg-blue-50 dark:bg-gray-800 h-24 border dark:border-gray-700 rounded flex justify-center items-center cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors duration-200 flex-1'>
                <div className='text-center flex justify-center items-center flex-col dark:text-gray-300'>
                  {
                    imageLoading ? <Loading /> : (
                      <>
                        <FaCloudUploadAlt size={35}/>
                        <p>Upload Image</p>
                      </>
                    )
                  }
                </div>
                <input 
                  type='file'
                  id='productImage'
                  className='hidden'
                  accept='image/*'
                  onChange={handleUploadImage}
                />
              </label>

              {/* Multiple image upload */}
              <label htmlFor='multipleProductImages' className='bg-blue-50 dark:bg-gray-800 h-24 border dark:border-gray-700 rounded flex justify-center items-center cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors duration-200 flex-1'>
                <div className='text-center flex justify-center items-center flex-col dark:text-gray-300'>
                  {
                    imageLoading && uploadProgress.total > 0 ? (
                      <>
                        <Loading />
                        <p className="text-sm mt-1">
                          Uploading {uploadProgress.total} images...
                        </p>
                      </>
                    ) : (
                      <>
                        <FaImages size={35}/>
                        <p>Upload Multiple Images</p>
                      </>
                    )
                  }
                </div>
                <input 
                  type='file'
                  id='multipleProductImages'
                  className='hidden'
                  accept='image/*'
                  multiple
                  onChange={handleUploadMultipleImages}
                  disabled={imageLoading}
                />
              </label>
            </div>
            
            {/* Display uploaded images */}
            {data.image.length > 0 && (
              <div className='mt-4'>
                <div className='flex flex-wrap gap-4'>
                  {
                    data.image.map((img, index) => (
                      <div key={`img-${index}`} className='h-20 w-20 min-w-20 bg-blue-50 dark:bg-gray-800 border dark:border-gray-700 relative group transition-colors duration-200'>
                        <img
                          src={img}
                          alt={`Product ${index+1}`}
                          className='w-full h-full object-scale-down cursor-pointer' 
                          onClick={() => setViewImageURL(img)}
                        />
                        <div 
                          onClick={() => handleDeleteImage(index)} 
                          className='absolute bottom-0 right-0 p-1 bg-red-600 hover:bg-red-700 rounded text-white hidden group-hover:block cursor-pointer'
                          title="Remove this image"
                        >
                          <MdDelete />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          
          <div className='grid gap-1'>
            <label className='font-medium dark:text-gray-200'>
              Category {data.category.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">({data.category.length} selected)</span>}
            </label>
            <div>
              <select
                className='bg-blue-50 dark:bg-gray-800 border dark:border-gray-700 w-full p-2 rounded dark:text-white transition-colors duration-200'
                value={selectCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  
                  const category = allCategory.find(el => el._id === value);
                  // Check if category is already selected
                  const isAlreadySelected = data.category.some(c => c._id === category._id);
                  
                  if (!isAlreadySelected) {
                    setData((prev) => ({
                      ...prev,
                      category: [...prev.category, category],
                    }));
                  }
                  setSelectCategory("");
                }}
              >
                <option value="">Select Category</option>
                {
                  allCategory.map((c) => (
                    <option key={c?._id} value={c?._id}>{c.name}</option>
                  ))
                }
              </select>
              <div className='flex flex-wrap gap-3 mt-2'>
                {
                  data.category.map((c, index) => (
                    <div key={`cat-${c._id || index}`} className='text-sm flex items-center gap-1 bg-blue-50 dark:bg-gray-700 dark:text-white p-1 rounded transition-colors duration-200'>
                      <p>{c.name}</p>
                      <div className='hover:text-red-500 cursor-pointer' onClick={() => handleRemoveCategory(index)}>
                        <IoClose size={20}/>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          <div className='grid gap-1'>
            <label className='font-medium dark:text-gray-200'>
              Sub Category {data.subCategory.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">({data.subCategory.length} selected)</span>}
            </label>
            <div>
              <select
                className='bg-blue-50 dark:bg-gray-800 border dark:border-gray-700 w-full p-2 rounded dark:text-white transition-colors duration-200'
                value={selectSubCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  
                  const subCategory = allSubCategory.find(el => el._id === value);
                  // Check if subcategory is already selected
                  const isAlreadySelected = data.subCategory.some(c => c._id === subCategory._id);
                  
                  if (!isAlreadySelected) {
                    setData((prev) => ({
                      ...prev,
                      subCategory: [...prev.subCategory, subCategory]
                    }));
                  }
                  setSelectSubCategory("");
                }}
              >
                <option value="">Select Sub Category</option>
                {
                  allSubCategory.map((c) => (
                    <option key={c?._id} value={c?._id}>{c.name}</option>
                  ))
                }
              </select>
              <div className='flex flex-wrap gap-3 mt-2'>
                {
                  data.subCategory.map((c, index) => (
                    <div key={`subcat-${c._id || index}`} className='text-sm flex items-center gap-1 bg-blue-50 dark:bg-gray-700 dark:text-white p-1 rounded transition-colors duration-200'>
                      <p>{c.name}</p>
                      <div className='hover:text-red-500 cursor-pointer' onClick={() => handleRemoveSubCategory(index)}>
                        <IoClose size={20}/>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className='grid gap-1'>
            <label htmlFor='unit' className='font-medium dark:text-gray-200'>Unit</label>
            <input 
              id='unit'
              type='text'
              placeholder='Enter product unit (e.g., kg, piece, box)'
              name='unit'
              value={data.unit}
              onChange={handleChange}
              required
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
            />
          </div>

          <div className='grid gap-1'>
            <label htmlFor='stock' className='font-medium dark:text-gray-200'>Number of Stock</label>
            <input 
              id='stock'
              type='number'
              placeholder='Enter product stock'
              name='stock'
              value={data.stock}
              onChange={handleChange}
              required
              min="0"
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
            />
          </div>

          <div className='grid gap-1'>
            <label htmlFor='price' className='font-medium dark:text-gray-200'>Price (KSh)</label>
            <input 
              id='price'
              type='number'
              placeholder='Enter product price'
              name='price'
              value={data.price}
              onChange={handleChange}
              required
              min="0"
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
            />
          </div>

          <div className='grid gap-1'>
            <label htmlFor='discount' className='font-medium dark:text-gray-200'>Discount (%)</label>
            <input 
              id='discount'
              type='number'
              placeholder='Enter product discount'
              name='discount'
              value={data.discount}
              onChange={handleChange}
              required
              min="0"
              max="100"
              className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
            />
          </div>

          {/* Additional Product Details */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium dark:text-gray-200">Additional Details</h3>
              <button
                type="button"
                onClick={() => setOpenAddField(true)}
                className="text-sm hover:bg-primary-200 bg-white dark:bg-gray-800 dark:hover:bg-primary-300 py-1 px-3 text-center font-medium border border-primary-200 dark:border-primary-300 hover:text-neutral-900 dark:text-white dark:hover:text-white cursor-pointer rounded transition-colors duration-200"
              >
                Add Field
              </button>
            </div>
            
            {Object.keys(data?.more_details || {}).length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                No additional details. Click "Add Field" to add product specifications.
              </p>
            )}
            
            <div className="mt-3 space-y-3">
              {
                Object.keys(data?.more_details || {}).map((key) => (
                  <div className='grid gap-1' key={`field-${key}`}>
                    <div className="flex items-center justify-between">
                      <label htmlFor={key} className='font-medium dark:text-gray-200'>{key}</label>
                      <button 
                        type="button"
                        onClick={() => handleDeleteField(key)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <input 
                      id={key}
                      type='text'
                      value={data?.more_details[key]}
                      onChange={(e) => {
                        const value = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          more_details: {
                            ...prev.more_details,
                            [key]: value
                          }
                        }));
                      }}
                      className='bg-blue-50 dark:bg-gray-800 p-2 outline-none border dark:border-gray-700 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded dark:text-white transition-colors duration-200'
                    />
                  </div>
                ))
              }
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded font-medium text-gray-800 dark:text-white transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="bg-primary-100 hover:bg-primary-200 dark:bg-primary-300 dark:hover:bg-primary-400 px-6 py-2 rounded font-semibold dark:text-white transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {formLoading ? "Processing..." : (isEditMode ? "Update Product" : "Submit")}
            </button>
          </div>
        </form>
      </div>

      {ViewImageURL && (
        <ViewImage url={ViewImageURL} close={() => setViewImageURL("")}/>
      )}

      {openAddField && (
        <AddFieldComponent 
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          submit={handleAddField}
          close={() => setOpenAddField(false)} 
        />
      )}
    </section>
  );
};

export default UploadProduct;
