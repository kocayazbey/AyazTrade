import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TrendyolProduct {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId: number;
  images: Array<{ url: string }>;
  attributes: Array<{
    attributeId: number;
    attributeValueId: number;
    customAttributeValue?: string;
  }>;
}

export interface TrendyolOrder {
  orderNumber: string;
  orderDate: number;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  lines: Array<{
    orderLineId: string;
    productName: string;
    barcode: string;
    quantity: number;
    price: number;
    discount: number;
    taxRate: number;
  }>;
  shipmentAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
    phoneNumber: string;
  };
  invoiceAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
    phoneNumber: string;
  };
}

export interface TrendyolStockUpdate {
  items: Array<{
    barcode: string;
    quantity: number;
  }>;
}

export interface TrendyolPriceUpdate {
  items: Array<{
    barcode: string;
    salePrice: number;
    listPrice?: number;
  }>;
}

@Injectable()
export class TrendyolService {
  private readonly logger = new Logger(TrendyolService.name);
  private apiClient: AxiosInstance;
  private supplierId: string;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.supplierId = this.configService.get<string>('TRENDYOL_SUPPLIER_ID');
    this.apiKey = this.configService.get<string>('TRENDYOL_API_KEY');
    this.apiSecret = this.configService.get<string>('TRENDYOL_API_SECRET');
    this.baseUrl = 'https://api.trendyol.com/sapigw';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    const authString = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AyazComm/1.0',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Trendyol API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Trendyol API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Trendyol API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Trendyol API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createProduct(product: TrendyolProduct): Promise<any> {
    try {
      this.logger.log(`Creating product on Trendyol: ${product.barcode}`);

      const payload = {
        items: [
          {
            barcode: product.barcode,
            title: product.title,
            productMainId: product.productMainId,
            brandId: product.brandId,
            categoryId: product.categoryId,
            quantity: product.quantity,
            stockCode: product.stockCode,
            dimensionalWeight: product.dimensionalWeight,
            description: product.description,
            currencyType: product.currencyType,
            listPrice: product.listPrice,
            salePrice: product.salePrice,
            vatRate: product.vatRate,
            cargoCompanyId: product.cargoCompanyId,
            deliveryDuration: 3,
            images: product.images,
            attributes: product.attributes,
          },
        ],
      };

      const response = await this.apiClient.post(
        `/suppliers/${this.supplierId}/v2/products`,
        payload
      );

      this.logger.log(`Product created successfully: ${product.barcode}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create product: ${product.barcode}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to create product on Trendyol');
    }
  }

  async updateProduct(barcode: string, updates: Partial<TrendyolProduct>): Promise<any> {
    try {
      this.logger.log(`Updating product on Trendyol: ${barcode}`);

      const response = await this.apiClient.put(
        `/suppliers/${this.supplierId}/v2/products`,
        {
          items: [
            {
              barcode,
              ...updates,
            },
          ],
        }
      );

      this.logger.log(`Product updated successfully: ${barcode}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update product: ${barcode}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update product on Trendyol');
    }
  }

  async updateStock(stockUpdates: TrendyolStockUpdate): Promise<any> {
    try {
      this.logger.log(`Updating stock for ${stockUpdates.items.length} products`);

      const response = await this.apiClient.post(
        `/suppliers/${this.supplierId}/products/price-and-inventory`,
        stockUpdates
      );

      this.logger.log(`Stock updated successfully`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to update stock', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update stock on Trendyol');
    }
  }

  async updatePrice(priceUpdates: TrendyolPriceUpdate): Promise<any> {
    try {
      this.logger.log(`Updating prices for ${priceUpdates.items.length} products`);

      const response = await this.apiClient.post(
        `/suppliers/${this.supplierId}/products/price-and-inventory`,
        priceUpdates
      );

      this.logger.log(`Prices updated successfully`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to update prices', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update prices on Trendyol');
    }
  }

  async getOrders(params?: {
    status?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    size?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching orders from Trendyol');

      const queryParams = {
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.status && { status: params.status }),
        ...(params?.startDate && { startDate: params.startDate }),
        ...(params?.endDate && { endDate: params.endDate }),
      };

      const response = await this.apiClient.get(
        `/suppliers/${this.supplierId}/orders`,
        { params: queryParams }
      );

      this.logger.log(`Fetched ${response.data.content?.length || 0} orders`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch orders', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to fetch orders from Trendyol');
    }
  }

  async getOrderDetails(orderNumber: string): Promise<TrendyolOrder> {
    try {
      this.logger.log(`Fetching order details: ${orderNumber}`);

      const response = await this.apiClient.get(
        `/suppliers/${this.supplierId}/orders/${orderNumber}`
      );

      this.logger.log(`Order details fetched: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch order: ${orderNumber}`, error.response?.data || error.message);
      throw new NotFoundException(`Order ${orderNumber} not found on Trendyol`);
    }
  }

  async shipOrder(orderNumber: string, packageNumber: string, trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Shipping order: ${orderNumber}`);

      const response = await this.apiClient.post(
        `/suppliers/${this.supplierId}/orders/${orderNumber}/ship`,
        {
          packageNumber,
          trackingNumber,
        }
      );

      this.logger.log(`Order shipped successfully: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to ship order: ${orderNumber}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to ship order on Trendyol');
    }
  }

  async cancelOrder(orderNumber: string, lineIds: string[], reason: string): Promise<any> {
    try {
      this.logger.log(`Cancelling order lines: ${orderNumber}`);

      const response = await this.apiClient.post(
        `/suppliers/${this.supplierId}/orders/${orderNumber}/cancel`,
        {
          lineIds,
          reason,
        }
      );

      this.logger.log(`Order cancelled successfully: ${orderNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel order: ${orderNumber}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to cancel order on Trendyol');
    }
  }

  async getCategories(parentId?: number): Promise<any> {
    try {
      this.logger.log('Fetching categories from Trendyol');

      const params = parentId ? { id: parentId } : {};
      const response = await this.apiClient.get('/product-categories', { params });

      this.logger.log(`Fetched ${response.data.categories?.length || 0} categories`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch categories from Trendyol');
    }
  }

  async getCategoryAttributes(categoryId: number): Promise<any> {
    try {
      this.logger.log(`Fetching attributes for category: ${categoryId}`);

      const response = await this.apiClient.get(
        `/product-categories/${categoryId}/attributes`
      );

      this.logger.log(`Fetched attributes for category: ${categoryId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch category attributes: ${categoryId}`, error.response?.data || error.message);
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
  }

  async getBrands(params?: { page?: number; size?: number; name?: string }): Promise<any> {
    try {
      this.logger.log('Fetching brands from Trendyol');

      const queryParams = {
        page: params?.page || 0,
        size: params?.size || 100,
        ...(params?.name && { name: params.name }),
      };

      const response = await this.apiClient.get('/brands', { params: queryParams });

      this.logger.log(`Fetched ${response.data.brands?.length || 0} brands`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch brands', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch brands from Trendyol');
    }
  }

  async getProduct(barcode: string): Promise<any> {
    try {
      this.logger.log(`Fetching product: ${barcode}`);

      const response = await this.apiClient.get(
        `/suppliers/${this.supplierId}/products`,
        {
          params: {
            barcode,
          },
        }
      );

      if (response.data.content && response.data.content.length > 0) {
        this.logger.log(`Product found: ${barcode}`);
        return response.data.content[0];
      } else {
        throw new NotFoundException(`Product ${barcode} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch product: ${barcode}`, error.response?.data || error.message);
      throw new NotFoundException(`Product ${barcode} not found on Trendyol`);
    }
  }

  async deleteProduct(barcode: string): Promise<any> {
    try {
      this.logger.log(`Deleting product: ${barcode}`);

      const response = await this.apiClient.delete(
        `/suppliers/${this.supplierId}/products`,
        {
          data: {
            barcodes: [barcode],
          },
        }
      );

      this.logger.log(`Product deleted successfully: ${barcode}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete product: ${barcode}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to delete product from Trendyol');
    }
  }

  async bulkCreateProducts(products: TrendyolProduct[]): Promise<any> {
    try {
      this.logger.log(`Bulk creating ${products.length} products`);

      const batchSize = 100;
      const results = [];

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const payload = {
          items: batch.map((product) => ({
            barcode: product.barcode,
            title: product.title,
            productMainId: product.productMainId,
            brandId: product.brandId,
            categoryId: product.categoryId,
            quantity: product.quantity,
            stockCode: product.stockCode,
            dimensionalWeight: product.dimensionalWeight,
            description: product.description,
            currencyType: product.currencyType,
            listPrice: product.listPrice,
            salePrice: product.salePrice,
            vatRate: product.vatRate,
            cargoCompanyId: product.cargoCompanyId,
            deliveryDuration: 3,
            images: product.images,
            attributes: product.attributes,
          })),
        };

        const response = await this.apiClient.post(
          `/suppliers/${this.supplierId}/v2/products`,
          payload
        );

        results.push(response.data);
        
        await this.sleep(1000);
      }

      this.logger.log(`Bulk product creation completed: ${products.length} products`);
      return results;
    } catch (error) {
      this.logger.error('Bulk product creation failed', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to bulk create products on Trendyol');
    }
  }

  async getClaimItems(params?: {
    page?: number;
    size?: number;
    claimItemStatus?: string;
  }): Promise<any> {
    try {
      this.logger.log('Fetching claim items from Trendyol');

      const queryParams = {
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.claimItemStatus && { claimItemStatus: params.claimItemStatus }),
      };

      const response = await this.apiClient.get(
        `/suppliers/${this.supplierId}/claims`,
        { params: queryParams }
      );

      this.logger.log(`Fetched ${response.data.content?.length || 0} claim items`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch claim items', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch claim items from Trendyol');
    }
  }

  async respondToClaim(claimId: string, response: {
    approved: boolean;
    reason?: string;
    refundAmount?: number;
  }): Promise<any> {
    try {
      this.logger.log(`Responding to claim: ${claimId}`);

      const payload = {
        approved: response.approved,
        ...(response.reason && { reason: response.reason }),
        ...(response.refundAmount && { refundAmount: response.refundAmount }),
      };

      const apiResponse = await this.apiClient.post(
        `/suppliers/${this.supplierId}/claims/${claimId}/respond`,
        payload
      );

      this.logger.log(`Claim response submitted: ${claimId}`);
      return apiResponse.data;
    } catch (error) {
      this.logger.error(`Failed to respond to claim: ${claimId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to respond to claim on Trendyol');
    }
  }

  async getInvoices(params?: {
    startDate?: number;
    endDate?: number;
    page?: number;
    size?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching invoices from Trendyol');

      const queryParams = {
        page: params?.page || 0,
        size: params?.size || 50,
        ...(params?.startDate && { startDate: params.startDate }),
        ...(params?.endDate && { endDate: params.endDate }),
      };

      const response = await this.apiClient.get(
        `/suppliers/${this.supplierId}/invoices`,
        { params: queryParams }
      );

      this.logger.log(`Fetched ${response.data.content?.length || 0} invoices`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch invoices', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch invoices from Trendyol');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

