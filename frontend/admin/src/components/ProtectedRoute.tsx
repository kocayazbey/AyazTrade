import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requiredPermission 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { user, hasRole, hasPermission } = useRole();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    if (typeof window !== 'undefined') router.replace('/unauthorized');
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (typeof window !== 'undefined') router.replace('/unauthorized');
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;