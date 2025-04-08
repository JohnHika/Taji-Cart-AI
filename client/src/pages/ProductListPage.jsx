import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import Loading from '../components/Loading'
import Axios from '../utils/Axios'
import { valideURLConvert } from '../utils/valideURLConvert'

const ProductListPage = () => {
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState(null)
  const params = useParams()
  const navigate = useNavigate()
  const AllSubCategory = useSelector(state => state.product.allSubCategory)
  const [DisplaySubCatory, setDisplaySubCategory] = useState([])

  console.log("URL Parameters:", params)

  // Parse category and subcategory IDs with better error handling
  const parseParams = () => {
    try {
      // Extract category ID from URL parameters
      const categoryId = params.categoryId || null;
      
      // Extract subcategory ID from URL parameters
      // If no subcategory specified, we'll use all subcategories from this category
      const subCategoryId = params.subCategoryId || null;
      
      console.log("Parsed IDs:", { categoryId, subCategoryId });
      
      return { categoryId, subCategoryId };
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
      setError("Invalid category or subcategory in URL");
      return { categoryId: null, subCategoryId: null };
    }
  }
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { categoryId, subCategoryId } = parseParams();
      
      if (!categoryId) {
        setError("Category not found");
        setLoading(false);
        return;
      }
      
      // Find matching subcategories for this category
      const matchingSubCategories = AllSubCategory.filter(
        subCat => subCat.category === categoryId
      );
      
      setDisplaySubCategory(matchingSubCategories);
      
      // If no specific subcategory was provided, use all subcategories from this category
      const subCategoryToUse = subCategoryId || 
        (matchingSubCategories.length > 0 ? matchingSubCategories.map(sc => sc._id) : []);
      
      console.log("Fetching products with params:", { 
        categoryId, 
        subCategoryId: subCategoryToUse,
        page 
      });
      
      const response = await Axios({
        ...SummaryApi.getProductByCategoryAndSubCategory,
        data: {
          categoryId,
          subCategoryId: subCategoryToUse,
          page,
          limit: 10
        }
      });
      
      if (response.data.success) {
        setData(response.data.data || []);
        setTotalPage(response.data.totalPage || 1);
      } else {
        setError(response.data.message || "Failed to fetch products");
        setData([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Something went wrong while fetching products");
      setData([]);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchProducts();
  }, [params.categoryId, params.subCategoryId, page]);
  
  // Handle loading, error, and empty states
  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-5 dark:bg-gray-900">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4 dark:text-red-400">
            Error Loading Products
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
    )
  }

  return (
    <section className='min-h-screen w-full dark:bg-gray-900'>
      <div className='mx-auto max-w-7xl p-2'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='w-full shadow-sm p-2 bg-white dark:bg-gray-800'>
            <h2 className='font-semibold mb-4 dark:text-gray-100'>Sub Categories</h2>
            <div className='w-full grid gap-2'>
              {
                DisplaySubCatory.length > 0 ? 
                  DisplaySubCatory.map(s => (
                    <Link 
                      key={s._id}
                      to={`/products/category/${params.categoryName || params.category}/${valideURLConvert(s.name)}-${s._id}`}
                      className="group"
                    >
                      <div className='p-2 rounded flex justify-between items-center bg-gray-100 group-hover:bg-primary-200 dark:bg-gray-700 dark:group-hover:bg-primary-300 dark:text-white text-sm'>
                        <p>{s.name}</p>
                        <p>
                          {
                            params.subcategoryName ? params.subcategoryName.includes(s._id) ? '✓' : '' : ''
                          }
                        </p>
                      </div>
                    </Link>
                  ))
                : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    No subcategories available
                  </div>
                )
              }
            </div>
          </div>

          {/**Product **/}
          <div className='sticky top-20 md:col-span-3'>
            <div className='bg-white dark:bg-gray-800 shadow-md p-4 z-10'>
              <h3 className='font-semibold dark:text-gray-100'>Products</h3>
            </div>
            <div>
              <div className='min-h-[80vh] max-h-[80vh] overflow-y-auto relative dark:bg-gray-900'>
                {loading ? (
                  <Loading />
                ) : data.length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 p-4 gap-4'>
                    {
                      data.map((p, index) => (
                        <CardProduct
                          data={p}
                          key={p._id + "productSubCategory" + index}
                        />
                      ))
                    }
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full py-20">
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No products found in this category</p>
                      <Link 
                        to="/"
                        className="inline-block px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                      >
                        Browse All Products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductListPage
