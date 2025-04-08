import React from 'react';

const LoadingSpinner = ({ fullScreen = false }) => {
  // Simplify the component to rule out styling issues
  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: fullScreen ? '100vh' : 'auto',
      padding: '20px'
    }}>
      <div>Loading...</div>
    </div>
  );
};

export default LoadingSpinner;
