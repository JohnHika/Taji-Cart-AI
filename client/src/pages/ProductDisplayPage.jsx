import React, { useEffect, useRef, useState } from 'react'
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import image2 from '../assets/Best_Prices_Offers.png'
import image1 from '../assets/minute_delivery.png'
import image3 from '../assets/Wide_Assortment.png'
import SummaryApi from '../common/SummaryApi'
import AddToCartButton from '../components/AddToCartButton'
import Divider from '../components/Divider'
import StarRating from '../components/StarRating'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'

const ProductDisplayPage = () => {
  const params = useParams();
  const navigate = useNavigate();

  // Fix product ID extraction from URL
  const productParam = params.productId || '';
  const productId = productParam.split('-').pop();
  
  const [data, setData] = useState({
    name: "",
    image: []
  });
  const [image, setImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const imageContainer = useRef();

  // Get user for admin check and rating
  const user = useSelector(state => state.user);
  const userIsAdmin = user?.role === 'admin';
  const isLoggedIn = !!user?._id;

  // Rating state
  const [ratingData, setRatingData] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingUsers, setRatingUsers] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const handleRate = async (star) => {
    if (!isLoggedIn) {
      toast.info("Please login to rate this product");
      return;
    }
    
    try {
      setRatingSubmitting(true);
      
      // Use SummaryApi for consistent API endpoint management
      const response = await Axios({
        ...SummaryApi.rateProduct, // Use the endpoint from SummaryApi
        data: {
          productId,
          rating: star,
          userId: user._id
        }
      });
      
      if (response.data.success) {
        toast.success("Thank you for your rating!");
        setUserRating(star);
        // Refresh product details to get updated ratings
        fetchProductDetails();
      } else {
        toast.error(response.data.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      // For debugging, log more information about the error
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
        console.error(`Request URL: ${error.response.config.url}`);
        console.error(`Request method: ${error.response.config.method}`);
      }
      
      // Show a more specific error message for 404 errors
      if (error.response && error.response.status === 404) {
        toast.error("Rating service is currently unavailable. Our team has been notified.");
        console.error("Rating endpoint not found. Please verify the API route in SummaryApi.js matches your server route.");
      } else {
        AxiosToastError(error);
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!productId) {
        setError('Product ID not found in URL');
        return;
      }

      const response = await Axios({
        ...SummaryApi.getProductDetails,
        data: {
          productId: productId
        }
      });

      const { data: responseData } = response;

      if (responseData.success) {
        setData(responseData.data);
        
        // Set rating data from product response
        if (responseData.data.ratings && Array.isArray(responseData.data.ratings)) {
          setRatingData(responseData.data.ratings);
          
          // Calculate total ratings and average
          const totalRatings = responseData.data.ratings.length;
          setRatingCount(totalRatings);
          
          if (totalRatings > 0) {
            const ratingSum = responseData.data.ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
            const avgRating = ratingSum / totalRatings;
            setAverageRating(avgRating);
          }
          
          // Extract user information from ratings
          if (responseData.data.ratingUsers && Array.isArray(responseData.data.ratingUsers)) {
            setRatingUsers(responseData.data.ratingUsers);
          }
        } else {
          // Initialize empty arrays if no ratings exist
          setRatingData([]);
          setRatingCount(0);
          setAverageRating(0);
          setRatingUsers([]);
        }
        
        // Set user's previous rating if available
        if (isLoggedIn && responseData.data.userRating) {
          setUserRating(responseData.data.userRating);
        }
        
        if (!responseData.data || !responseData.data.name) {
          setError('Invalid product data received');
        }
      } else {
        setError(responseData.message || 'Failed to load product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      AxiosToastError(error);
      setError('An error occurred while loading the product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    } else {
      setError('Invalid product URL');
    }
  }, [productId]);

  const handleScrollRight = () => {
    if (imageContainer.current) {
      imageContainer.current.scrollLeft += 100;
    }
  };
  
  const handleScrollLeft = () => {
    if (imageContainer.current) {
      imageContainer.current.scrollLeft -= 100;
    }
  };

  // Function to format the rating percentage
  const getRatingPercentage = (rating) => {
    return Math.round((rating / 5) * 100);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-5 dark:bg-gray-900">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4 dark:text-red-400">
            Product Not Found
          </h1>
          <p className="text-gray-700 mb-5 dark:text-gray-300">{error}</p>
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No images available
  if (!data.image || data.image.length === 0) {
    data.image = ['https://via.placeholder.com/400?text=No+Image+Available'];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900">
      {/* Product Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Product Images */}
        <div className="flex flex-col">
          {/* Main Product Image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-4 aspect-square">
            <img
              src={data.image[image]}
              alt={data.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400?text=No+Image';
              }}
            />
          </div>
          
          {/* Image Navigation Dots (Mobile & Desktop) */}
          {data.image.length > 1 && (
            <div className="flex items-center justify-center gap-2 my-2">
              {data.image.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  onClick={() => setImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-colors duration-200 ${
                    index === image 
                      ? "bg-orange-500" 
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-orange-300 dark:hover:bg-orange-700"
                  }`}
                ></button>
              ))}
            </div>
          )}
          
          {/* Image Thumbnails with Scroll (Desktop & Tablet) */}
          {data.image.length > 1 && (
            <div className="relative mt-2 hidden sm:block">
              <div className="absolute inset-y-0 left-0 flex items-center">
                <button 
                  onClick={handleScrollLeft}
                  className="bg-white dark:bg-gray-700 shadow-md rounded-full p-2 z-10 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  aria-label="Scroll thumbnails left"
                >
                  <FaAngleLeft className="text-gray-700 dark:text-gray-200" />
                </button>
              </div>
              
              <div 
                ref={imageContainer} 
                className="flex gap-3 overflow-x-auto px-8 py-2 scrollbar-hide snap-x scroll-smooth"
              >
                {data.image.map((img, index) => (
                  <button
                    key={`thumb-${index}`}
                    onClick={() => setImage(index)}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded-md transition-all duration-200 ${
                      index === image 
                        ? "border-orange-500 shadow-md" 
                        : "border-transparent hover:border-orange-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${data.name || 'Product'} thumbnail ${index+1}`}
                      className="w-full h-full object-contain rounded-md"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                  </button>
                ))}
              </div>
              
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button 
                  onClick={handleScrollRight}
                  className="bg-white dark:bg-gray-700 shadow-md rounded-full p-2 z-10 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  aria-label="Scroll thumbnails right"
                >
                  <FaAngleRight className="text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            </div>
          )}

          {/* Product details for mobile screens */}
          <div className="mt-6 lg:hidden">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.name}</h1>
            
            {/* Price Display */}
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {DisplayPriceInShillings(pricewithDiscount(data.price, data.discount))}
                </span>
                
                {data.discount > 0 && (
                  <>
                    <span className="text-sm text-gray-500 line-through dark:text-gray-400">
                      {DisplayPriceInShillings(data.price)}
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      {data.discount}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Stock Status */}
            <div className="mt-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                data.stock === 0 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                  : data.stock < 5 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  data.stock === 0 
                    ? 'bg-red-500 animate-pulse' 
                    : data.stock < 5 
                      ? 'bg-orange-500 animate-pulse' 
                      : 'bg-green-500'
                }`}></span>
                {data.stock === 0 
                  ? 'Out of Stock' 
                  : data.stock < 5 
                    ? `Low Stock: ${data.stock} left` 
                    : `In Stock: ${data.stock}`
                }
              </div>
            </div>
            
            {/* Add to Cart Button */}
            {data.stock > 0 && (
              <div className="mt-4">
                <AddToCartButton data={data} />
              </div>
            )}
            
            {/* User Rating Section (Mobile) */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rate this Product</h3>
              {ratingSubmitting ? (
                <div className="flex justify-center my-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <StarRating 
                  ratingData={ratingData} 
                  onRate={handleRate} 
                  userRating={userRating}
                />
              )}
              
              {/* Display rating information */}
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                    {ratingCount > 0 ? ratingCount : 0} {ratingCount === 1 ? 'user has' : 'users have'} rated this product
                  </div>
                  {averageRating > 0 && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-orange-500">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        ({getRatingPercentage(averageRating)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isLoggedIn && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Please login to rate this product
                </p>
              )}
              
              {/* Show users who rated this product */}
              {ratingUsers.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent ratings:</h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400">
                    {ratingUsers.slice(0, 3).map((user, index) => (
                      <li key={`mobile-user-${index}`} className="mb-1">
                        <span className="font-medium">{user.name || 'Anonymous User'}</span> rated {user.rating} stars
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Product Details */}
        <div className="hidden lg:block">
          {/* Product Title & Unit */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{data.name}</h1>
          {data.unit && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{data.unit}</p>
          )}
          
          <Divider className="my-4" />
          
          {/* Price Section */}
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {DisplayPriceInShillings(pricewithDiscount(data.price, data.discount))}
              </span>
              
              {data.discount > 0 && (
                <>
                  <span className="text-base text-gray-500 line-through dark:text-gray-400">
                    {DisplayPriceInShillings(data.price)}
                  </span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                    {data.discount}% <span className="font-normal text-sm text-gray-500 dark:text-gray-400">Discount</span>
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Stock Status */}
          <div className="mt-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              data.stock === 0 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                : data.stock < 5 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                data.stock === 0 
                  ? 'bg-red-500 animate-pulse' 
                  : data.stock < 5 
                    ? 'bg-orange-500 animate-pulse' 
                    : 'bg-green-500'
              }`}></span>
              {data.stock === 0 
                ? 'Out of Stock' 
                : data.stock < 5 
                  ? `Low Stock: ${data.stock} left` 
                  : `In Stock: ${data.stock}`
              }
            </div>
            
            {/* Admin Inventory Alert */}
            {data.stock < 5 && userIsAdmin && (
              <div className="mt-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300">
                <div className="font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Inventory Alert
                </div>
                <p className="mt-1">Product "{data.name}" is running low on inventory ({data.stock} remaining). Consider restocking soon.</p>
              </div>
            )}
          </div>
          
          {/* Add to Cart Button */}
          {data.stock > 0 ? (
            <div className="mt-6">
              <AddToCartButton data={data} />
            </div>
          ) : (
            <p className="mt-6 text-lg text-red-500 dark:text-red-400">Out of Stock</p>
          )}
          
          {/* User Rating Section (Desktop) */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rate this Product</h3>
            {ratingSubmitting ? (
              <div className="flex justify-center my-2">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <StarRating 
                ratingData={ratingData} 
                onRate={handleRate} 
                userRating={userRating}
              />
            )}
            
            {/* Display rating information */}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  {ratingCount > 0 ? ratingCount : 0} {ratingCount === 1 ? 'user has' : 'users have'} rated this product
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-orange-500">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      ({getRatingPercentage(averageRating)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isLoggedIn && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Please login to rate this product
              </p>
            )}
            
            {/* Show users who rated this product */}
            {ratingUsers.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent ratings:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400">
                  {ratingUsers.slice(0, 3).map((user, index) => (
                    <li key={`desktop-user-${index}`} className="mb-1">
                      <span className="font-medium">{user.name || 'Anonymous User'}</span> rated {user.rating} stars
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Product Description & Details */}
          <div className="mt-8 space-y-6">
            {data.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Description</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{data.description}</p>
              </div>
            )}
            
            {data?.more_details && Object.keys(data.more_details).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Specifications</h3>
                <dl className="mt-2 grid grid-cols-1 gap-y-3">
                  {Object.entries(data.more_details).map(([key, value], index) => (
                    <div key={`detail-${index}`} className="grid grid-cols-2 gap-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{key}</dt>
                      <dd className="text-sm text-gray-600 dark:text-gray-300">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Product Details Section */}
      <div className="mt-8 block lg:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
          {data.description && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Description</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{data.description}</p>
            </div>
          )}
          
          {data?.more_details && Object.keys(data.more_details).length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Specifications</h3>
              <dl className="mt-2 space-y-2">
                {Object.entries(data.more_details).map(([key, value], index) => (
                  <div key={`m-detail-${index}`}>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{key}</dt>
                    <dd className="text-sm text-gray-600 dark:text-gray-300 ml-4">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Why Shop From Taji Cart Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Why shop from TAJI CART?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row md:flex-col items-center">
            <img
              src={image1}
              alt="Superfast Delivery"
              className="w-16 h-16 object-contain mb-4 sm:mb-0 md:mb-4 sm:mr-4 md:mr-0"
            />
            <div className="text-center sm:text-left md:text-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Superfast Delivery</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Get your order delivered to your doorstep at the earliest from dark stores near you.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row md:flex-col items-center">
            <img
              src={image2}
              alt="Best Prices & Offers"
              className="w-16 h-16 object-contain mb-4 sm:mb-0 md:mb-4 sm:mr-4 md:mr-0"
            />
            <div className="text-center sm:text-left md:text-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Best Prices & Offers</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Best price destination with offers directly from the manufacturers.</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row md:flex-col items-center">
            <img
              src={image3}
              alt="Wide Assortment"
              className="w-16 h-16 object-contain mb-4 sm:mb-0 md:mb-4 sm:mr-4 md:mr-0"
            />
            <div className="text-center sm:text-left md:text-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Wide Assortment</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Choose from 5000+ products across food, personal care, household & other categories.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDisplayPage;
