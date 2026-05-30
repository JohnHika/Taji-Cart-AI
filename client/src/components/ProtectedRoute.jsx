import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getStoredAccessToken } from '../utils/authStorage';

const ProtectedRoute = ({ children }) => {
  const user = useSelector(state => state.user);
  // Use the shared helper so both sessionStorage and localStorage are checked
  const token = getStoredAccessToken();

  if (!token || !user?._id) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
