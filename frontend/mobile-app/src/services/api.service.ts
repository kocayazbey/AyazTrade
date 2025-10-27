import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await this.refreshToken();
          if (refreshed) {
            const token = await AsyncStorage.getItem('accessToken');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client.request(originalRequest);
            }
          }
          // Token refresh failed, logout user
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        }

        // Transform error to user-friendly format
        const apiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private transformError(error: any) {
    if (error.response?.data?.error) {
      // Backend unified error format
      const backendError = error.response.data.error;
      return {
        code: backendError.code,
        message: this.getUserFriendlyMessage(backendError.code, backendError.message),
        statusCode: backendError.statusCode,
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
    } else {
      // Network or other errors
      return {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred. Please check your connection.',
        statusCode: 0,
        details: error,
      };
    }
  }

  private getUserFriendlyMessage(code: string, originalMessage: string): string {
    const friendlyMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again',
      UNAUTHORIZED: 'Please log in to continue',
      INVALID_TOKEN: 'Your session has expired. Please log in again',
      TOKEN_EXPIRED: 'Your session has expired. Please log in again',
      INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
      RESOURCE_NOT_FOUND: 'The requested item was not found',
      RESOURCE_ALREADY_EXISTS: 'This item already exists',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again',
      SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later',
      DATABASE_ERROR: 'A system error occurred. Please try again',
      INTERNAL_SERVER_ERROR: 'A system error occurred. Please try again',
      NETWORK_ERROR: 'Please check your internet connection and try again',
    };

    return friendlyMessages[code] || originalMessage;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await axios.post(`${this.baseURL}/auth/refresh`, { refreshToken });
      if (response.data.accessToken && response.data.refreshToken) {
        await AsyncStorage.multiSet([
          ['accessToken', response.data.accessToken],
          ['refreshToken', response.data.refreshToken],
        ]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getProducts(params?: any) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async searchProducts(query: string) {
    const response = await this.client.get('/products/search', { params: { q: query } });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.accessToken && response.data.refreshToken) {
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  }

  async register(data: any) {
    const response = await this.client.post('/auth/register', data);
    // Some backends may return tokens on register; store if present
    if (response.data.accessToken && response.data.refreshToken) {
      await AsyncStorage.multiSet([
        ['accessToken', response.data.accessToken],
        ['refreshToken', response.data.refreshToken],
      ]);
    }
    return response.data;
  }

  async logout() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  }

  // Enhanced Cart API
  async getCart() {
    const response = await this.client.get('/cart');
    return response.data;
  }

  async addToCart(productId: string, quantity: number, variant?: any) {
    const response = await this.client.post('/cart/add', { productId, quantity, variant });
    return response.data;
  }

  async updateCartItem(itemId: string, quantity: number) {
    const response = await this.client.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
  }

  async removeFromCart(itemId: string) {
    const response = await this.client.delete(`/cart/items/${itemId}`);
    return response.data;
  }

  async clearCart() {
    const response = await this.client.delete('/cart');
    return response.data;
  }

  async applyCoupon(code: string) {
    const response = await this.client.post('/cart/coupon', { code });
    return response.data;
  }

  async removeCoupon() {
    const response = await this.client.delete('/cart/coupon');
    return response.data;
  }

  async applyPromotion(promotionId: string) {
    const response = await this.client.post('/cart/promotions', { promotionId });
    return response.data;
  }

  async removePromotion(promotionId: string) {
    const response = await this.client.delete(`/cart/promotions/${promotionId}`);
    return response.data;
  }

  async saveForLater(itemId: string) {
    const response = await this.client.post(`/cart/save-for-later/${itemId}`);
    return response.data;
  }

  async moveToCart(itemId: string) {
    const response = await this.client.post(`/cart/move-to-cart/${itemId}`);
    return response.data;
  }

  async shareCart() {
    const response = await this.client.post('/cart/share');
    return response.data;
  }

  async getSharedCart(token: string) {
    const response = await this.client.get(`/cart/shared/${token}`);
    return response.data;
  }

  // Enhanced Order API
  async createOrder(orderData: any) {
    const response = await this.client.post('/orders', orderData);
    return response.data;
  }

  async createGuestOrder(orderData: any) {
    const response = await this.client.post('/orders/guest', orderData);
    return response.data;
  }

  async getOrder(id: string) {
    const response = await this.client.get(`/orders/${id}`);
    return response.data;
  }

  // Enhanced Orders API
  async getOrders(params?: any) {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrder(id: string) {
    const response = await this.client.get(`/orders/${id}`);
    return response.data;
  }

  async getOrderTracking(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}/tracking`);
    return response.data;
  }

  async getOrderStatusHistory(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}/status-history`);
    return response.data;
  }

  async getOrderLocation(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}/location`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string, data?: any) {
    const response = await this.client.patch(`/orders/${orderId}/status`, { status, ...data });
    return response.data;
  }

  async trackOrder(orderId: string) {
    const response = await this.client.post(`/orders/${orderId}/track`);
    return response.data;
  }

  async cancelOrder(orderId: string, reason?: string) {
    const response = await this.client.patch(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  }

  async reorderOrder(orderId: string, items?: any[]) {
    const response = await this.client.post(`/orders/${orderId}/reorder`, { items });
    return response.data;
  }

  async getOrderEvents(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}/events`);
    return response.data;
  }

  async enableRealTimeTracking(orderId: string) {
    const response = await this.client.post(`/orders/${orderId}/tracking/enable`);
    return response.data;
  }

  async disableRealTimeTracking(orderId: string) {
    const response = await this.client.post(`/orders/${orderId}/tracking/disable`);
    return response.data;
  }

  // Push Notifications API
  async registerDevice(deviceData: any) {
    const response = await this.client.post('/notifications/register-device', deviceData);
    return response.data;
  }

  async updateNotificationPreferences(preferences: any) {
    const response = await this.client.put('/notifications/preferences', preferences);
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await this.client.get('/notifications/preferences');
    return response.data;
  }

  async subscribeToTopic(topic: string) {
    const response = await this.client.post('/notifications/subscribe', { topic });
    return response.data;
  }

  async unsubscribeFromTopic(topic: string) {
    const response = await this.client.post('/notifications/unsubscribe', { topic });
    return response.data;
  }

  async trackNotificationInteraction(data: any) {
    const response = await this.client.post('/notifications/track', data);
    return response.data;
  }

  async scheduleNotification(data: any) {
    const response = await this.client.post('/notifications/schedule', data);
    return response.data;
  }

  async cancelScheduledNotification(id: string) {
    const response = await this.client.delete(`/notifications/schedule/${id}`);
    return response.data;
  }

  async getWishlist() {
    const response = await this.client.get('/customers/wishlist');
    return response.data;
  }

  async addToWishlist(productId: string) {
    const response = await this.client.post('/customers/wishlist', { productId });
    return response.data;
  }

  async removeFromWishlist(productId: string) {
    const response = await this.client.delete(`/customers/wishlist/${productId}`);
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/customers/me');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/customers/profile', data);
    return response.data;
  }

  async getAddresses() {
    const response = await this.client.get('/customers/addresses');
    return response.data;
  }

  async addAddress(address: any) {
    const response = await this.client.post('/customers/addresses', address);
    return response.data;
  }

  async updateAddress(id: string, address: any) {
    const response = await this.client.put(`/customers/me/addresses/${id}`, address);
    return response.data;
  }

  async deleteAddress(id: string) {
    const response = await this.client.delete(`/customers/me/addresses/${id}`);
    return response.data;
  }
}

export default new ApiService();

