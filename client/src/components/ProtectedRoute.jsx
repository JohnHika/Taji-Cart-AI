import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const user = useSelector(state => state.user);
  const token = localStorage.getItem('accesstoken');

  useEffect(() => {
    if (!token || !user?._id) {
      // do something
    }
  }, [token, user]);

  if (!token || !user?._id) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;