import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface HepsiburadaProduct {
  merchantSku: string;
  HBSku?: string;
  productName: string;
  productDescription: string;
  categoryId: string;
  brandName: string;
  barcode: string;
  attributes: Array<{
    attributeName: string;
    attributeValue: string;
  }>;
  merchantId: string;
  vatRate: number;
  quantity: number;
  images: Array<{ url: string }>;
  availableStock: number;
  price: number;
  listPrice?: number;
}

export interface HepsiburadaOrder {
  orderNumber: string;
  customerId: string;
  orderDate: string;
  status: string;
  totalPrice: number;
  taxPrice: number;
  shippingPrice: number;
  items: Array<{
    lineItemId: string;
    merchantSku: string;
    hbSku: string;
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
    vatRate: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
    zipCode: string;
    phone: string;
  };
  invoiceAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
    zipCode: string;
    phone: string;
    taxNumber?: string;
    taxOffice?: string;
  };
}

@Injectable()
export class HepsiburadaService {
  private readonly logger = new Logger(HepsiburadaService.name);
  private apiClient: AxiosInstance;
  private merchantId: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get<string>('HEPSIBURADA_MERCHANT_ID');
    this.username = this.configService.get<string>('HEPSIBURADA_USERNAME');
    this.password = this.configService.get<string>('HEPSIBURADA_PASSWORD');
    this.baseUrl = 'https://mpop-sit.hepsiburada.com/api';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    const authString = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AyazComm/1.0',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Hepsiburada API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Hepsiburada API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Hepsiburada API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Hepsiburada API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createProduct(product: HepsiburadaProduct): Promise<any> {
    try {
      this.logger.log(`Creating product on Hepsiburada: ${product.merchantSku}`);

      const payload = {
        merchantSku: product.merchantSku,
        productName: product.productName,
        productDescription: product.productDescription,
        categoryId: product.categoryId,
        brandName: product.brandName,
        barcode: product.barcode,
        attributes: product.attributes,
        merchantId: this.merchantId,
        vatRate: product.vatRate,
        quantity: product.quantity,
        images: product.images,
      };

      const response = await this.apiClient.post('/products', payload);

      this.logger.log(`Product created successfully: ${product.merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create product: ${product.merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to create product on Hepsiburada');
    }
  }

  async updateProduct(merchantSku: string, updates: Partial<HepsiburadaProduct>): Promise<any> {
    try {
      this.logger.log(`Updating product on Hepsiburada: ${merchantSku}`);

      const response = await this.apiClient.put(`/products/${merchantSku}`, updates);

      this.logger.log(`Product updated successfully: ${merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update product: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update product on Hepsiburada');
    }
  }

  async updateStock(merchantSku: string, quantity: number): Promise<any> {
    try {
      this.logger.log(`Updating stock for product: ${merchantSku}`);

      const response = await this.apiClient.put(`/products/${merchantSku}/stock`, {
        merchantSku,
        availableStock: quantity,
      });

      this.logger.log(`Stock updated successfully: ${merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update stock: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update stock on Hepsiburada');
    }
  }

  async bulkUpdateStock(updates: Array<{ merchantSku: string; quantity: number }>): Promise<any> {
    try {
      this.logger.log(`Bulk updating stock for ${updates.length} products`);

      const payload = updates.map((update) => ({
        merchantSku: update.merchantSku,
        availableStock: update.quantity,
      }));

      const response = await this.apiClient.put('/products/stock/bulk', { items: payload });

      this.logger.log(`Bulk stock update completed`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to bulk update stock', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to bulk update stock on Hepsiburada');
    }
  }

  async updatePrice(merchantSku: string, price: number, listPrice?: number): Promise<any> {
    try {
      this.logger.log(`Updating price for product: ${merchantSku}`);

      const response = await this.apiClient.put(`/products/${merchantSku}/price`, {
        merchantSku,
        price,
        ...(listPrice && { listPrice }),
      });

      this.logger.log(`Price updated successfully: ${merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update price: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update price on Hepsiburada');
    }
  }

  async bulkUpdatePrice(updates: Array<{ merchantSku: string; price: number; listPrice?: number }>): Promise<any> {
    try {
      this.logger.log(`Bulk updating prices for ${updates.length} products`);

      const response = await this.apiClient.put('/products/price/bulk', { items: updates });

      this.logger.log(`Bulk price update completed`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to bulk update prices', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to bulk update prices on Hepsiburada');
    }
  }

  async getOrders(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching orders from Hepsiburada');

      const queryParams = {
        merchantId: this.merchantId,
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.status && { status: params.status }),
        ...(params?.startDate && { beginDate: params.startDate }),
        ...(params?.endDate && { endDate: params.endDate }),
      };

      const response = await this.apiClient.get('/orders', { params: queryParams });

      this.logger.log(`Fetched ${response.data.items?.length || 0} orders`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch orders', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to fetch orders from Hepsiburada');
    }
  }

  async getOrderDetails(orderNumber: string): Promise<HepsiburadaOrder> {
    try {
      this.logger.log(`Fetching order details: ${orderNumber}`);

      const response = await this.apiClient.get(`/orders/${orderNumber}`);

      this.logger.log(`Order details fetched: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch order: ${orderNumber}`, error.response?.data || error.message);
      throw new NotFoundException(`Order ${orderNumber} not found on Hepsiburada`);
    }
  }

  async acknowledgeOrder(orderNumber: string): Promise<any> {
    try {
      this.logger.log(`Acknowledging order: ${orderNumber}`);

      const response = await this.apiClient.post(`/orders/${orderNumber}/acknowledge`);

      this.logger.log(`Order acknowledged: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to acknowledge order: ${orderNumber}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to acknowledge order on Hepsiburada');
    }
  }

  async shipOrder(orderNumber: string, packageInfo: {
    packageNumber: string;
    trackingNumber: string;
    cargoCompany: string;
  }): Promise<any> {
    try {
      this.logger.log(`Shipping order: ${orderNumber}`);

      const response = await this.apiClient.post(`/orders/${orderNumber}/ship`, {
        orderNumber,
        packageNumber: packageInfo.packageNumber,
        trackingNumber: packageInfo.trackingNumber,
        cargoCompany: packageInfo.cargoCompany,
      });

      this.logger.log(`Order shipped successfully: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to ship order: ${orderNumber}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to ship order on Hepsiburada');
    }
  }

  async cancelOrderItem(orderNumber: string, lineItemId: string, reason: string): Promise<any> {
    try {
      this.logger.log(`Cancelling order item: ${orderNumber}/${lineItemId}`);

      const response = await this.apiClient.post(`/orders/${orderNumber}/items/${lineItemId}/cancel`, {
        reason,
      });

      this.logger.log(`Order item cancelled: ${orderNumber}/${lineItemId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel order item: ${orderNumber}/${lineItemId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to cancel order item on Hepsiburada');
    }
  }

  async getCategories(): Promise<any> {
    try {
      this.logger.log('Fetching categories from Hepsiburada');

      const response = await this.apiClient.get('/categories');

      this.logger.log(`Fetched ${response.data.length || 0} categories`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch categories from Hepsiburada');
    }
  }

  async getCategoryAttributes(categoryId: string): Promise<any> {
    try {
      this.logger.log(`Fetching attributes for category: ${categoryId}`);

      const response = await this.apiClient.get(`/categories/${categoryId}/attributes`);

      this.logger.log(`Fetched attributes for category: ${categoryId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch category attributes: ${categoryId}`, error.response?.data || error.message);
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
  }

  async getProduct(merchantSku: string): Promise<any> {
    try {
      this.logger.log(`Fetching product: ${merchantSku}`);

      const response = await this.apiClient.get(`/products/${merchantSku}`);

      this.logger.log(`Product found: ${merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch product: ${merchantSku}`, error.response?.data || error.message);
      throw new NotFoundException(`Product ${merchantSku} not found on Hepsiburada`);
    }
  }

  async deleteProduct(merchantSku: string): Promise<any> {
    try {
      this.logger.log(`Deleting product: ${merchantSku}`);

      const response = await this.apiClient.delete(`/products/${merchantSku}`);

      this.logger.log(`Product deleted successfully: ${merchantSku}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete product: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to delete product from Hepsiburada');
    }
  }

  async getProductQuestions(merchantSku: string): Promise<any> {
    try {
      this.logger.log(`Fetching questions for product: ${merchantSku}`);

      const response = await this.apiClient.get(`/products/${merchantSku}/questions`);

      this.logger.log(`Fetched ${response.data.length || 0} questions`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch product questions: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch product questions from Hepsiburada');
    }
  }

  async answerProductQuestion(questionId: string, answer: string): Promise<any> {
    try {
      this.logger.log(`Answering product question: ${questionId}`);

      const response = await this.apiClient.post(`/questions/${questionId}/answer`, {
        answer,
      });

      this.logger.log(`Question answered: ${questionId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to answer question: ${questionId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to answer question on Hepsiburada');
    }
  }

  async getProductReviews(merchantSku: string, params?: { page?: number; size?: number }): Promise<any> {
    try {
      this.logger.log(`Fetching reviews for product: ${merchantSku}`);

      const queryParams = {
        page: params?.page || 0,
        size: params?.size || 50,
      };

      const response = await this.apiClient.get(`/products/${merchantSku}/reviews`, { params: queryParams });

      this.logger.log(`Fetched ${response.data.items?.length || 0} reviews`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch product reviews: ${merchantSku}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch product reviews from Hepsiburada');
    }
  }

  async respondToReview(reviewId: string, response: string): Promise<any> {
    try {
      this.logger.log(`Responding to review: ${reviewId}`);

      const apiResponse = await this.apiClient.post(`/reviews/${reviewId}/respond`, {
        response,
      });

      this.logger.log(`Review response submitted: ${reviewId}`);
      return apiResponse.data;
    } catch (error) {
      this.logger.error(`Failed to respond to review: ${reviewId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to respond to review on Hepsiburada');
    }
  }

  async getClaims(params?: { status?: string; page?: number; size?: number }): Promise<any> {
    try {
      this.logger.log('Fetching claims from Hepsiburada');

      const queryParams = {
        merchantId: this.merchantId,
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.status && { status: params.status }),
      };

      const response = await this.apiClient.get('/claims', { params: queryParams });

      this.logger.log(`Fetched ${response.data.items?.length || 0} claims`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch claims', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch claims from Hepsiburada');
    }
  }

  async respondToClaim(claimId: string, response: {
    accept: boolean;
    explanation?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Responding to claim: ${claimId}`);

      const apiResponse = await this.apiClient.post(`/claims/${claimId}/respond`, {
        accept: response.accept,
        explanation: response.explanation,
      });

      this.logger.log(`Claim response submitted: ${claimId}`);
      return apiResponse.data;
    } catch (error) {
      this.logger.error(`Failed to respond to claim: ${claimId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to respond to claim on Hepsiburada');
    }
  }

  async getSettlements(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching settlements from Hepsiburada');

      const queryParams = {
        merchantId: this.merchantId,
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.startDate && { startDate: params.startDate }),
        ...(params?.endDate && { endDate: params.endDate }),
      };

      const response = await this.apiClient.get('/settlements', { params: queryParams });

      this.logger.log(`Fetched ${response.data.items?.length || 0} settlements`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch settlements', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch settlements from Hepsiburada');
    }
  }

  async getPerformanceMetrics(startDate: string, endDate: string): Promise<any> {
    try {
      this.logger.log('Fetching performance metrics from Hepsiburada');

      const response = await this.apiClient.get('/performance/metrics', {
        params: {
          merchantId: this.merchantId,
          startDate,
          endDate,
        },
      });

      this.logger.log('Performance metrics fetched successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch performance metrics', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch performance metrics from Hepsiburada');
    }
  }
}

