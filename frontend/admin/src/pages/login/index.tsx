import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AyuCard, AyuButton, AyuInput } from '../../components';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: 'admin@ayaztrade.com',
    password: 'admin123'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Direct API call instead of using AuthContext
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.success && data.data) {
        // Store token and user data
        const token = data.data.token || '';
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        console.log('Login successful, redirecting to dashboard...');
        console.log('Token:', token);
        
        // Set cookie manually for middleware
        document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
        
        // Immediate redirect without timeout
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            AyazTrade Admin
          </h2>
          <p className="mt-2 text-gray-600">
            Yönetim paneline giriş yapın
          </p>
        </div>

        {/* Login Form */}
        <AyuCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error bg-opacity-10 border border-error border-opacity-20 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <AyuInput
                label="E-posta Adresi"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@ayaztrade.com"
                required
                error={error && formData.email === '' ? 'E-posta adresi gerekli' : ''}
                className="w-full"
              />
            </div>

            <div>
              <AyuInput
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                error={error && formData.password === '' ? 'Şifre gerekli' : ''}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Beni hatırla
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:text-primary-dark">
                  Şifremi unuttum
                </a>
              </div>
            </div>

            <div>
              <AyuButton
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
                disabled={!formData.email || !formData.password}
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </AyuButton>
            </div>
          </form>
        </AyuCard>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2024 AyazTrade. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
