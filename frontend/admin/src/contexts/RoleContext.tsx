import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
  description: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatar?: string;
  lastLogin?: string;
}

interface RoleContextType {
  user: User | null;
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Backend-driven roles and permissions
export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRolesAndPermissions();
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const loadRolesAndPermissions = async () => {
    try {
      setLoading(true);

      // Load roles from backend
      const rolesResponse = await fetch('/api/proxy/admin/roles');
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        if (rolesData.success) {
          setRoles(rolesData.data || []);
        }
      }

      // Load permissions from backend
      const permissionsResponse = await fetch('/api/proxy/admin/permissions');
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        if (permissionsData.success) {
          setPermissions(permissionsData.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading roles and permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (!user.role?.permissions) return false;
    if (user.role.permissions.includes('*') || user.role.permissions.includes('all')) return true;
    return user.role.permissions.includes(permission);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.role.name === roleName;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try actual API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          const user = {
            id: data.data.user.id,
            email: data.data.user.email,
            firstName: data.data.user.firstName,
            lastName: data.data.user.lastName,
            role: {
              id: '1',
              name: data.data.user.role,
              displayName: data.data.user.role.charAt(0).toUpperCase() + data.data.user.role.slice(1),
              permissions: data.data.user.permissions || [],
              description: `${data.data.user.role} role`
            },
            avatar: data.data.user.avatar,
            lastLogin: new Date().toISOString()
          };
          setUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <RoleContext.Provider value={{
      user,
      roles,
      permissions,
      loading,
      hasPermission,
      hasRole,
      login,
      logout,
      updateUser
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
