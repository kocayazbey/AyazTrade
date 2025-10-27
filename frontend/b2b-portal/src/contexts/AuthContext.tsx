import React, { createContext, useContext, useState, useEffect } from 'react';

export interface B2BUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyName?: string;
  customerType: 'retail' | 'wholesale' | 'b2b';
  permissions: string[];
  avatar?: string;
  lastLogin?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface AuthContextType {
  user: B2BUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  updateUser: (user: Partial<B2BUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<B2BUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = () => {
    try {
      const savedUser = localStorage.getItem('b2b_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      localStorage.removeItem('b2b_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          const userData = data.data.user;
          const b2bUser: B2BUser = {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'customer',
            companyName: userData.companyName,
            customerType: userData.customerType || 'retail',
            permissions: userData.permissions || [],
            avatar: userData.avatar,
            lastLogin: new Date().toISOString(),
            isEmailVerified: userData.isEmailVerified || false,
            isPhoneVerified: userData.isPhoneVerified || false,
          };

          setUser(b2bUser);
          localStorage.setItem('b2b_user', JSON.stringify(b2bUser));
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
    localStorage.removeItem('b2b_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  };

  const updateUser = (userData: Partial<B2BUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('b2b_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      hasPermission,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
