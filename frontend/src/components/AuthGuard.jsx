import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AuthGuard = ({ children, allowedRoles }) => {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();

  if (!token || !user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Optionally redirect to a forbidden page, or back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AuthGuard;
