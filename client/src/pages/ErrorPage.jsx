import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Axios from '../utils/Axios';

// Helper to extract MongoDB ObjectID
const extractMongoId = (path) => {
  const matches = path.match(/[a-f0-9]{24}/g);
  return matches ? matches[0] : null;
};

const ErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  
  const currentPath = location.pathname;
  const categoryId = extractMongoId(currentPath);
  
  // Function to test the server directly
  const testServerConnection = async () => {
    setLoading(true);
    
    try {
      const response = await Axios({
        url: '/api/product/get-product-by-category',
        method: 'post',
        data: { id: categoryId }
      });
      
      setTestResults({
        success: true,
        message: `Found ${response.data.data?.length || 0} products!`,
        data: response.data
      });
      
      return response.data;
    } catch (error) {
      setTestResults({
        success: false,
        message: error.message,
        error
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Try to recover
  const attemptRecovery = async () => {
    setLoading(true);
    
    try {
      const result = await testServerConnection();
      
      if (result && result.success && result.data?.length > 0) {
        // If we found products, navigate to a simpler URL that our routes can handle
        navigate(`/product-category/${categoryId}`, {
          state: {
            recoveredData: result.data,
            originalPath: currentPath
          }
        });
      } else {
        alert("Sorry, we couldn't find any products for this category.");
      }
    } catch (error) {
      alert("Recovery attempt failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8 mt-10">
      <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
      <p className="mb-4">The URL you requested could not be found.</p>
      
      <p className="text-gray-600 mb-4">
        Current path: <code className="bg-gray-100 px-2 py-1 rounded">{currentPath}</code>
      </p>
      
      {categoryId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-6">
          <p className="font-medium">This looks like a category page with ID: <code>{categoryId}</code></p>
          
          <div className="mt-3 space-y-3">
            <button 
              onClick={testServerConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test Server Connection"}
            </button>
            
            <button 
              onClick={attemptRecovery}
              disabled={loading}
              className="ml-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Recovering..." : "Attempt Recovery"}
            </button>
          </div>
          
          {testResults && (
            <div className={`mt-3 p-3 rounded ${testResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={testResults.success ? 'text-green-700' : 'text-red-700'}>
                {testResults.message}
              </p>
              
              {testResults.success && testResults.data?.data?.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Found {testResults.data.data.length} products!</p>
                  <button
                    onClick={() => navigate(`/product-category/${categoryId}`, {
                      state: { recoveredData: testResults.data.data }
                    })}
                    className="mt-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    View Products
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6">
        <Link to="/" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;