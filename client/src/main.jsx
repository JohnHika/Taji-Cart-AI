import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import router from './route/index';
import { store } from './store/store.js';

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