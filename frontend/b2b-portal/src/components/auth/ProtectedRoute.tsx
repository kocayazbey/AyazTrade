import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = []
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If no user, redirect to login
      if (!user) {
        router.push('/login');
        return;
      }

      // Check role-based access
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.customerType)) {
        router.push('/unauthorized');
        return;
      }

      // Check permission-based access
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission =>
          hasPermission(permission)
        );

        if (!hasAllPermissions) {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [user, loading, router, requiredPermissions, requiredRoles, hasPermission]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (!user) {
    return null;
  }

  // Check role access
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.customerType)) {
    return null;
  }

  // Check permission access
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return null;
    }
  }

  return <>{children}</>;
}
