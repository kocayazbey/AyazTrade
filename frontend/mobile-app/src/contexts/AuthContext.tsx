import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  sendVerificationEmail: () => Promise<boolean>;
  sendVerificationSMS: () => Promise<boolean>;
  verifyEmail: (code: string) => Promise<boolean>;
  verifyPhone: (code: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app start
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('user')
      ]);
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, accessToken, refreshToken: refreshTokenValue } = data.data;
        
        setUser(userData);
        setToken(accessToken);
        
        // Store tokens and user data
        await Promise.all([
          AsyncStorage.setItem('authToken', accessToken),
          AsyncStorage.setItem('refreshToken', refreshTokenValue),
          AsyncStorage.setItem('user', JSON.stringify(userData))
        ]);
        
        return true;
      } else {
        throw new Error(data.message || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        const { user: newUser, accessToken, refreshToken: refreshTokenValue } = data.data;
        
        setUser(newUser);
        setToken(accessToken);
        
        // Store tokens and user data
        await Promise.all([
          AsyncStorage.setItem('authToken', accessToken),
          AsyncStorage.setItem('refreshToken', refreshTokenValue),
          AsyncStorage.setItem('user', JSON.stringify(newUser))
        ]);
        
        return true;
      } else {
        throw new Error(data.message || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('Register error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      
      // Clear stored data
      await Promise.all([
        AsyncStorage.removeItem('authToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('user')
      ]);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        
        setToken(accessToken);
        await Promise.all([
          AsyncStorage.setItem('authToken', accessToken),
          AsyncStorage.setItem('refreshToken', newRefreshToken)
        ]);
        
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      return false;
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const sendVerificationEmail = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Send verification email error:', error);
      return false;
    }
  };

  const sendVerificationSMS = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/send-verification-sms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Send verification SMS error:', error);
      return false;
    }
  };

  const verifyEmail = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (data.success) {
        await updateUser({ isEmailVerified: true });
      }
      
      return data.success;
    } catch (error) {
      console.error('Verify email error:', error);
      return false;
    }
  };

  const verifyPhone = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (data.success) {
        await updateUser({ isPhoneVerified: true });
      }
      
      return data.success;
    } catch (error) {
      console.error('Verify phone error:', error);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Reset password error:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    sendVerificationEmail,
    sendVerificationSMS,
    verifyEmail,
    verifyPhone,
    resetPassword,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
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
