import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      // Add auth token if available
      const userStr = localStorage.getItem('b2b_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (config.headers) {
            config.headers.Authorization = `Bearer ${user.token}`;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        // Handle 401 errors - redirect to login
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          localStorage.removeItem('b2b_user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Transform error to unified format
        const apiError: ApiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private transformError(error: any): ApiError {
    if (error.response?.data?.error) {
      // Backend unified error format
      const backendError = error.response.data.error;
      return {
        code: backendError.code || 'API_ERROR',
        message: this.getUserFriendlyMessage(backendError.code, backendError.message),
        statusCode: backendError.statusCode || error.response.status,
        details: backendError.details,
      };
    } else if (error.response?.data?.message) {
      // Legacy error format
      return {
        code: 'API_ERROR',
        message: error.response.data.message,
        statusCode: error.response.status,
        details: error.response.data,
      };
    } else if (error.response?.data?.success === false) {
      // Response with success: false
      return {
        code: 'API_ERROR',
        message: error.response.data.message || 'Operation failed',
        statusCode: error.response.status,
        details: error.response.data,
      };
    } else {
      // Network or other errors
      return {
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        statusCode: error.status || 0,
        details: error,
      };
    }
  }

  private getUserFriendlyMessage(code: string, originalMessage: string): string {
    const friendlyMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Lütfen girdiğiniz bilgileri kontrol edin ve tekrar deneyin',
      UNAUTHORIZED: 'Devam etmek için lütfen giriş yapın',
      INVALID_TOKEN: 'Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın',
      TOKEN_EXPIRED: 'Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın',
      INSUFFICIENT_PERMISSIONS: 'Bu işlemi gerçekleştirmek için yetkiniz yok',
      RESOURCE_NOT_FOUND: 'İstenen öğe bulunamadı',
      RESOURCE_ALREADY_EXISTS: 'Bu öğe zaten mevcut',
      RATE_LIMIT_EXCEEDED: 'Çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin',
      SERVICE_UNAVAILABLE: 'Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin',
      DATABASE_ERROR: 'Sistem hatası oluştu. Lütfen tekrar deneyin',
      INTERNAL_SERVER_ERROR: 'Sistem hatası oluştu. Lütfen tekrar deneyin',
      NETWORK_ERROR: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin',
      API_ERROR: originalMessage || 'API hatası oluştu',
    };

    return friendlyMessages[code] || originalMessage;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  logout() {
    return this.client.post('/auth/logout');
  }

  get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: any, config?: any) {
    return this.client.put<T>(url, data, config);
  }

  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
