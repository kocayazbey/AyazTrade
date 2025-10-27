import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { sanitizeFormData } from '../utils/sanitization';

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor() {
    // Proxy all requests through Next API to leverage httpOnly cookies and same-origin
    const base = '/api/proxy';
    this.client = axios.create({
      baseURL: base,
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      // Sanitize request data if it's an object
      if (config.data && typeof config.data === 'object') {
        config.data = sanitizeFormData(config.data);
      }

      // Sanitize URL parameters
      if (config.params && typeof config.params === 'object') {
        config.params = sanitizeFormData(config.params);
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        // Handle 401 errors - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.client.request(originalRequest);
          }
        }

        // Transform error to unified format
        const apiError: ApiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private transformError(error: any): ApiError {
    // Handle different error response formats
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

  private getAccessToken(): null { return null; }
  private getRefreshToken(): null { return null; }
  private setTokens(_a: string, _r: string) { /* cookies via server */ }

  private async refreshToken(): Promise<boolean> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise.then(() => true);
    }

    this.tokenRefreshPromise = axios
      .post(`/api/auth/refresh`)
      .then((res) => {
        return res.data?.success ? 'ok' : '';
      })
      .finally(() => {
        this.tokenRefreshPromise = null;
      });

    try {
      await this.tokenRefreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  async login(email: string, password: string) {
    const response = await axios.post('/api/auth/login', { email, password });
    return response.data;
  }

  logout() {
    return axios.post('/api/auth/logout');
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
