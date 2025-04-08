import React, { useEffect, useState } from 'react';
import { FaEdit, FaEye, FaFilter, FaPlus, FaSearch, FaSortAmountDown, FaSortAmountUp, FaTrash } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const DashboardProduct = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [isMobileView, setIsMobileView] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  
  // Function to calculate price with discount
  const pricewithDiscount = (price, discount) => {
    if (!discount || discount <= 0) return price;
    const discountAmount = (price * discount) / 100;
    return price - discountAmount;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const response = await Axios({
        ...SummaryApi.getAllProducts
      });
      
      if (response.data.success) {
        const productData = response.data.data || [];
        setProducts(productData);
        
        setStats({
          total: productData.length,
          inStock: productData.filter(p => p.stock > 10).length,
          lowStock: productData.filter(p => p.stock > 0 && p.stock <= 10).length,
          outOfStock: productData.filter(p => p.stock === 0).length
        });
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.getAllCategory
      });
      
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Get the saved preference from localStorage, or use defaults
    const savedViewMode = localStorage.getItem('preferredViewMode');
    if (savedViewMode) {
      setViewMode(savedViewMode);
    } else {
      // Only set a default on first load - don't override user preference
      const defaultMode = window.innerWidth < 768 ? 'grid' : 'table';
      setViewMode(defaultMode);
      localStorage.setItem('preferredViewMode', defaultMode);
    }
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await Axios({
        ...SummaryApi.deleteProduct,
        data: { productId }
      });
      
      if (response.data.success) {
        setProducts(products.filter(p => p._id !== productId));
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      setProducts(products.filter(p => !selectedProducts.includes(p._id)));
      setSelectedProducts([]);
    } catch (error) {
      console.error("Error bulk deleting products:", error);
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filterCategory || 
                             (product.category && 
                              product.category.some(cat => 
                                cat._id === filterCategory || cat.name === filterCategory
                              ));
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const getValue = (obj, path) => {
        if (path === 'category.name') {
          return (obj.category && obj.category[0]?.name) || '';
        }
        return obj[path];
      };
      
      const aValue = getValue(a, sortBy);
      const bValue = getValue(b, sortBy);
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handleSelectAll = () => {
    if (selectedProducts.length === currentProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentProducts.map(p => p._id));
    }
  };

  const handleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'table' ? 'grid' : 'table';
    setViewMode(newMode);
    localStorage.setItem('preferredViewMode', newMode);
  };

  return (
    <div className="p-2 sm:p-4 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Manage Products</h1>
        <div className="flex gap-2">
          {!isMobileView && (
            <button
              onClick={toggleViewMode}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-md flex items-center transition-colors duration-200"
              title={viewMode === 'table' ? 'Switch to Grid View' : 'Switch to Table View'}
            >
              {viewMode === 'table' ? 'Grid View' : 'Table View'}
            </button>
          )}
          <Link 
            to="/dashboard/upload-product" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md flex items-center transition-colors duration-200"
          >
            <FaPlus className="mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border-l-4 border-blue-500 dark:border-blue-400 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Total Products</p>
          <p className="text-xl sm:text-2xl font-bold dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500 dark:border-green-400 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">In Stock</p>
          <p className="text-xl sm:text-2xl font-bold dark:text-white">{stats.inStock}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border-l-4 border-yellow-500 dark:border-yellow-400 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Low Stock</p>
          <p className="text-xl sm:text-2xl font-bold dark:text-white">{stats.lowStock}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border-l-4 border-red-500 dark:border-red-400 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Out of Stock</p>
          <p className="text-xl sm:text-2xl font-bold dark:text-white">{stats.outOfStock}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 transition-colors duration-200">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <FaFilter className="absolute left-3 top-3 text-gray-400" />
          <select
            className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-colors duration-200"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedProducts.length > 0 && (
          <div className="flex items-center justify-end">
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              Delete Selected ({selectedProducts.length})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Product grid view for mobile/small screens */}
          {(viewMode === 'grid' || isMobileView) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentProducts.length === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                  No products found
                </div>
              ) : (
                currentProducts.map(product => (
                  <div 
                    key={product._id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
                      <img
                        src={product.image && product.image[0] ? product.image[0] : 'https://via.placeholder.com/300'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Always show discount badge */}
                      <div className={`absolute top-2 left-2 text-sm font-bold px-2 py-0.5 rounded-full shadow-sm ${
                        product.discount > 0 
                          ? "bg-red-500 text-white" 
                          : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {product.discount || 0}% off
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h3>
                        <div className="flex items-center mt-1">
                          {product.category && product.category.length > 0 && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {Array.isArray(product.category) 
                                ? product.category[0]?.name 
                                : product.category?.name || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          {/* Always show original price */}
                          <div className={`${product.discount > 0 ? 'text-xs text-gray-500 dark:text-gray-400 line-through' : 'text-xs text-gray-500 dark:text-gray-400'}`}>
                            {DisplayPriceInShillings(product.price)}
                          </div>
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            {DisplayPriceInShillings(pricewithDiscount(product.price, product.discount))}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.stock === 0 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : product.stock <= 10 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <Link 
                          to={`/product/${encodeURIComponent(product.name.replace(/\s+/g, '-').toLowerCase())}-${product._id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <FaEye className="inline mr-1" /> View
                        </Link>
                        <div>
                          <Link 
                            to={`/dashboard/upload-product?edit=${product._id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <FaEdit className="inline" />
                          </Link>
                          <button 
                            onClick={() => handleDeleteProduct(product._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <FaTrash className="inline" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {viewMode === 'table' && !isMobileView && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors duration-200">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left" width="40">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === currentProducts.length && currentProducts.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" width="70">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" width="35%">
                        <div className="flex items-center" onClick={() => handleToggleSort('name')}>
                          <span>Name</span>
                          {sortBy === 'name' && (
                            sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" width="15%">
                        <div className="flex items-center" onClick={() => handleToggleSort('category.name')}>
                          <span>Category</span>
                          {sortBy === 'category.name' && (
                            sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" width="15%">
                        <div className="flex items-center" onClick={() => handleToggleSort('price')}>
                          <span>Price</span>
                          {sortBy === 'price' && (
                            sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" width="15%">
                        <div className="flex items-center" onClick={() => handleToggleSort('stock')}>
                          <span>Stock</span>
                          {sortBy === 'stock' && (
                            sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" width="120">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentProducts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      currentProducts.map(product => (
                        <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product._id)}
                              onChange={() => handleSelectProduct(product._id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                              <img
                                src={product.image && product.image[0] ? product.image[0] : 'https://via.placeholder.com/150'}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={product.name}>
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {product._id.substring(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {product.category && product.category.length > 0 ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {Array.isArray(product.category) 
                                  ? product.category[0]?.name 
                                  : product.category?.name || 'N/A'}
                              </span>
                            ) : 'Uncategorized'}
                          </td>
                          <td className="px-4 py-4">
                            {product.discount > 0 ? (
                              <>
                                <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                  {DisplayPriceInShillings(product.price)}
                                </div>
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                  {DisplayPriceInShillings(pricewithDiscount(product.price, product.discount))}
                                  <span className="ml-1 text-xs">({product.discount}% off)</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {DisplayPriceInShillings(product.price)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              product.stock === 0 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : product.stock <= 10 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {product.stock === 0 ? 'Out of Stock' : product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Link
                                to={`/product/${encodeURIComponent(product.name.replace(/\s+/g, '-').toLowerCase())}-${product._id}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title="View Product"
                              >
                                <FaEye />
                              </Link>
                              <Link 
                                to={`/dashboard/upload-product?edit=${product._id}`}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit Product"
                              >
                                <FaEdit />
                              </Link>
                              <button 
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Product"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {filteredProducts.length > productsPerPage && (
            <div className="mt-4 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{indexOfFirstProduct + 1}</span> to <span className="font-medium">{Math.min(indexOfLastProduct, filteredProducts.length)}</span> of{' '}
                    <span className="font-medium">{filteredProducts.length}</span> results
                  </p>
                </div>
                <div>
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardProduct;
