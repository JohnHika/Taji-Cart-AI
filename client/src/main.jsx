import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import router from './route/index';
import { store } from './store/store.js';

// Verify DOM is ready before attempting to mount
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, ready to render React');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; color: red;">
        <h1>Critical Error</h1>
        <p>Unable to find root element to mount React application.</p>
      </div>
    `;
    console.error('Critical: Root element #root not found in DOM');
    return;
  }

  console.log('Found root element, proceeding with React initialization');
});

// Global error handler
const originalConsoleError = console.error;
console.error = function(...args) {
  // Log original error
  originalConsoleError.apply(console, args);
  
  // Check if this is a React error
  const errorText = args.join(' ');
  if (
    errorText.includes('React') || 
    errorText.includes('Error:') || 
    errorText.includes('Exception:')
  ) {
    // Alert the user with a toast if possible
    try {
      if (window.toast) {
        window.toast.error("An error occurred. Check console for details.");
      }
    } catch (e) {
      // Don't crash if toast fails
    }
  }
};

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Add this for debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2>An error occurred:</h2>
      <pre>${event.error?.stack || 'Unknown error'}</pre>
    </div>
  `;
});

// Basic render without any providers to test if React works
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  );
  console.log('React rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2>Failed to render React app:</h2>
      <pre>${error?.stack || error}</pre>
    </div>
  `;
}