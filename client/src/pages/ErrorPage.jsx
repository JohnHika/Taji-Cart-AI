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
    <div className="min-h-[70vh] bg-ivory dark:bg-dm-surface flex items-start justify-center px-3 sm:px-6 py-12 sm:py-16">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-white mb-2">Page Not Found</h1>
        <p className="text-brown-500 dark:text-white/55 mb-4">The URL you requested could not be found.</p>

        <p className="text-sm text-brown-400 dark:text-white/40 mb-6">
          Current path:{' '}
          <code className="bg-plum-50 dark:bg-dm-card-2 text-plum-700 dark:text-plum-200 px-2 py-0.5 rounded text-xs font-mono break-all">
            {currentPath}
          </code>
        </p>

        {categoryId && (
          <div className="p-4 sm:p-5 bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-700/30 rounded-card mb-6">
            <p className="font-medium text-charcoal dark:text-white text-sm mb-3">
              This looks like a category page with ID:{' '}
              <code className="font-mono text-plum-700 dark:text-plum-300">{categoryId}</code>
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={testServerConnection}
                disabled={loading}
                className="px-4 py-2 bg-plum-700 hover:bg-plum-600 text-white rounded-pill text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Server Connection"}
              </button>
              <button
                onClick={attemptRecovery}
                disabled={loading}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal rounded-pill text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Recovering..." : "Attempt Recovery"}
              </button>
            </div>

            {testResults && (
              <div className={`mt-3 p-3 rounded-card text-sm ${testResults.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                <p>{testResults.message}</p>
                {testResults.success && testResults.data?.data?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Found {testResults.data.data.length} products!</p>
                    <button
                      onClick={() => navigate(`/product-category/${categoryId}`, {
                        state: { recoveredData: testResults.data.data }
                      })}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-pill text-xs font-medium transition-colors"
                    >
                      View Products
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-plum-700 hover:bg-plum-600 text-white font-semibold px-5 py-2.5 rounded-pill text-sm transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;