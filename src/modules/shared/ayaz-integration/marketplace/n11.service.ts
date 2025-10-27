import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface N11Product {
  productSellerCode: string;
  title: string;
  subtitle?: string;
  description: string;
  categoryId: number;
  price: number;
  currencyType: string;
  images: Array<{ url: string; order: number }>;
  approvalStatus?: number;
  preparingDay: number;
  stockItems: Array<{
    sellerStockCode: string;
    attributes: Array<{
      name: string;
      value: string;
    }>;
    quantity: number;
    optionPrice?: number;
  }>;
  productCondition: number;
  preparingDayType?: string;
  shipmentTemplate?: string;
  domesticShipmentPrice?: number;
  productionDate?: string;
  expirationDate?: string;
  productVideo?: string;
  brand?: string;
  mpn?: string;
  gtin?: string;
}

export interface N11Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  buyer: {
    fullName: string;
    email: string;
    phoneNumber: string;
    taxNumber?: string;
    taxOffice?: string;
  };
  items: Array<{
    id: number;
    productId: number;
    productSellerCode: string;
    productName: string;
    quantity: number;
    price: number;
    commission: number;
    commissionRate: number;
    status: string;
  }>;
  shipmentAddress: {
    fullName: string;
    address: string;
    district: string;
    city: string;
    postalCode: string;
    phoneNumber: string;
    country: string;
  };
  billingAddress: {
    fullName: string;
    address: string;
    district: string;
    city: string;
    postalCode: string;
    phoneNumber: string;
    taxNumber?: string;
    taxOffice?: string;
    country: string;
  };
  totalAmount: number;
  totalDiscount: number;
  shipmentAmount: number;
}

@Injectable()
export class N11Service {
  private readonly logger = new Logger(N11Service.name);
  private apiClient: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('N11_API_KEY');
    this.apiSecret = this.configService.get<string>('N11_API_SECRET');
    this.baseUrl = 'https://api.n11.com/ws';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`N11 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('N11 API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`N11 API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('N11 API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createProduct(product: N11Product): Promise<any> {
    try {
      this.logger.log(`Creating product on N11: ${product.productSellerCode}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<saveProductRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <product>
    <productSellerCode>${this.escapeXml(product.productSellerCode)}</productSellerCode>
    <title>${this.escapeXml(product.title)}</title>
    ${product.subtitle ? `<subtitle>${this.escapeXml(product.subtitle)}</subtitle>` : ''}
    <description>${this.escapeXml(product.description)}</description>
    <category>
      <id>${product.categoryId}</id>
    </category>
    <price>${product.price}</price>
    <currencyType>${product.currencyType}</currencyType>
    <images>
      ${product.images.map(img => `<image>
        <url>${img.url}</url>
        <order>${img.order}</order>
      </image>`).join('')}
    </images>
    <preparingDay>${product.preparingDay}</preparingDay>
    <stockItems>
      ${product.stockItems.map(stock => `<stockItem>
        <sellerStockCode>${stock.sellerStockCode}</sellerStockCode>
        <quantity>${stock.quantity}</quantity>
        ${stock.attributes.length > 0 ? `<attributes>
          ${stock.attributes.map(attr => `<attribute>
            <name>${attr.name}</name>
            <value>${attr.value}</value>
          </attribute>`).join('')}
        </attributes>` : ''}
        ${stock.optionPrice ? `<optionPrice>${stock.optionPrice}</optionPrice>` : ''}
      </stockItem>`).join('')}
    </stockItems>
    <productCondition>${product.productCondition}</productCondition>
    ${product.brand ? `<brand>${this.escapeXml(product.brand)}</brand>` : ''}
    ${product.mpn ? `<mpn>${this.escapeXml(product.mpn)}</mpn>` : ''}
    ${product.gtin ? `<gtin>${product.gtin}</gtin>` : ''}
  </product>
</saveProductRequest>`;

      const response = await this.apiClient.post('/ProductService.wsdl', xmlPayload);

      const result = this.parseXMLResponse(response.data);
      
      if (result.result?.status === 'success') {
        this.logger.log(`Product created successfully: ${product.productSellerCode}`);
        return result;
      } else {
        throw new BadRequestException(result.result?.errorMessage || 'Failed to create product');
      }
    } catch (error) {
      this.logger.error(`Failed to create product: ${product.productSellerCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to create product on N11');
    }
  }

  async updateProduct(productSellerCode: string, updates: Partial<N11Product>): Promise<any> {
    try {
      this.logger.log(`Updating product on N11: ${productSellerCode}`);

      const product = await this.getProduct(productSellerCode);
      const mergedProduct = { ...product, ...updates };

      return await this.createProduct(mergedProduct);
    } catch (error) {
      this.logger.error(`Failed to update product: ${productSellerCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to update product on N11');
    }
  }

  async updateStock(sellerStockCode: string, quantity: number): Promise<any> {
    try {
      this.logger.log(`Updating stock for: ${sellerStockCode}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<updateStockByStockSellerCodeRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <stockItems>
    <stockItem>
      <sellerStockCode>${sellerStockCode}</sellerStockCode>
      <quantity>${quantity}</quantity>
    </stockItem>
  </stockItems>
</updateStockByStockSellerCodeRequest>`;

      const response = await this.apiClient.post('/StockService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      if (result.result?.status === 'success') {
        this.logger.log(`Stock updated successfully: ${sellerStockCode}`);
        return result;
      } else {
        throw new BadRequestException(result.result?.errorMessage || 'Failed to update stock');
      }
    } catch (error) {
      this.logger.error(`Failed to update stock: ${sellerStockCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to update stock on N11');
    }
  }

  async bulkUpdateStock(updates: Array<{ sellerStockCode: string; quantity: number }>): Promise<any> {
    try {
      this.logger.log(`Bulk updating stock for ${updates.length} items`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<updateStockByStockSellerCodeRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <stockItems>
    ${updates.map(update => `<stockItem>
      <sellerStockCode>${update.sellerStockCode}</sellerStockCode>
      <quantity>${update.quantity}</quantity>
    </stockItem>`).join('')}
  </stockItems>
</updateStockByStockSellerCodeRequest>`;

      const response = await this.apiClient.post('/StockService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Bulk stock update completed`);
      return result;
    } catch (error) {
      this.logger.error('Failed to bulk update stock', error.response?.data || error.message);
      throw new BadRequestException('Failed to bulk update stock on N11');
    }
  }

  async updatePrice(sellerStockCode: string, price: number): Promise<any> {
    try {
      this.logger.log(`Updating price for: ${sellerStockCode}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<updatePriceBySellerStockCodeRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <priceItems>
    <priceItem>
      <sellerStockCode>${sellerStockCode}</sellerStockCode>
      <price>${price}</price>
    </priceItem>
  </priceItems>
</updatePriceBySellerStockCodeRequest>`;

      const response = await this.apiClient.post('/ProductPriceService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      if (result.result?.status === 'success') {
        this.logger.log(`Price updated successfully: ${sellerStockCode}`);
        return result;
      } else {
        throw new BadRequestException(result.result?.errorMessage || 'Failed to update price');
      }
    } catch (error) {
      this.logger.error(`Failed to update price: ${sellerStockCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to update price on N11');
    }
  }

  async getOrders(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching orders from N11');

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<orderListRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <searchData>
    ${params?.status ? `<status>${params.status}</status>` : ''}
    ${params?.startDate ? `<startDate>${params.startDate}</startDate>` : ''}
    ${params?.endDate ? `<endDate>${params.endDate}</endDate>` : ''}
  </searchData>
  <pagingData>
    <currentPage>${params?.page || 0}</currentPage>
    <pageSize>100</pageSize>
  </pagingData>
</orderListRequest>`;

      const response = await this.apiClient.post('/OrderService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Fetched orders from N11`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch orders', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch orders from N11');
    }
  }

  async getOrderDetails(orderNumber: string): Promise<N11Order> {
    try {
      this.logger.log(`Fetching order details: ${orderNumber}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<orderDetailRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <orderRequest>
    <orderNumber>${orderNumber}</orderNumber>
  </orderRequest>
</orderDetailRequest>`;

      const response = await this.apiClient.post('/OrderService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Order details fetched: ${orderNumber}`);
      return result.orderDetail;
    } catch (error) {
      this.logger.error(`Failed to fetch order: ${orderNumber}`, error.response?.data || error.message);
      throw new NotFoundException(`Order ${orderNumber} not found on N11`);
    }
  }

  async acceptOrder(orderItemId: number): Promise<any> {
    try {
      this.logger.log(`Accepting order item: ${orderItemId}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<orderItemAcceptRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <orderItemList>
    <orderItem>
      <id>${orderItemId}</id>
    </orderItem>
  </orderItemList>
</orderItemAcceptRequest>`;

      const response = await this.apiClient.post('/OrderService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Order item accepted: ${orderItemId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to accept order item: ${orderItemId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to accept order item on N11');
    }
  }

  async rejectOrder(orderItemId: number, reason: string, reasonType: number): Promise<any> {
    try {
      this.logger.log(`Rejecting order item: ${orderItemId}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<orderItemRejectRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <orderItemList>
    <orderItem>
      <id>${orderItemId}</id>
      <rejectReason>${this.escapeXml(reason)}</rejectReason>
      <rejectReasonType>${reasonType}</rejectReasonType>
    </orderItem>
  </orderItemList>
</orderItemRejectRequest>`;

      const response = await this.apiClient.post('/OrderService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Order item rejected: ${orderItemId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to reject order item: ${orderItemId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to reject order item on N11');
    }
  }

  async shipOrder(orderItemId: number, shipmentInfo: {
    shipmentCompanyId: number;
    trackingNumber: string;
  }): Promise<any> {
    try {
      this.logger.log(`Shipping order item: ${orderItemId}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<orderItemShipmentRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <orderItemList>
    <orderItem>
      <id>${orderItemId}</id>
      <shipmentInfo>
        <shipmentCompanyId>${shipmentInfo.shipmentCompanyId}</shipmentCompanyId>
        <trackingNumber>${shipmentInfo.trackingNumber}</trackingNumber>
      </shipmentInfo>
    </orderItem>
  </orderItemList>
</orderItemShipmentRequest>`;

      const response = await this.apiClient.post('/OrderService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Order item shipped: ${orderItemId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to ship order item: ${orderItemId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to ship order item on N11');
    }
  }

  async getCategories(parentCategoryId?: number): Promise<any> {
    try {
      this.logger.log('Fetching categories from N11');

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<GetTopLevelCategoriesRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  ${parentCategoryId ? `<parentCategoryId>${parentCategoryId}</parentCategoryId>` : ''}
</GetTopLevelCategoriesRequest>`;

      const response = await this.apiClient.post('/CategoryService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log('Categories fetched from N11');
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch categories from N11');
    }
  }

  async getCategoryAttributes(categoryId: number): Promise<any> {
    try {
      this.logger.log(`Fetching attributes for category: ${categoryId}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<GetCategoryAttributesRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <categoryId>${categoryId}</categoryId>
</GetCategoryAttributesRequest>`;

      const response = await this.apiClient.post('/CategoryService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Attributes fetched for category: ${categoryId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch category attributes: ${categoryId}`, error.response?.data || error.message);
      throw new NotFoundException(`Category ${categoryId} attributes not found`);
    }
  }

  async getProduct(productSellerCode: string): Promise<any> {
    try {
      this.logger.log(`Fetching product: ${productSellerCode}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<GetProductBySellerCodeRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <productSellerCode>${productSellerCode}</productSellerCode>
</GetProductBySellerCodeRequest>`;

      const response = await this.apiClient.post('/ProductService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Product found: ${productSellerCode}`);
      return result.product;
    } catch (error) {
      this.logger.error(`Failed to fetch product: ${productSellerCode}`, error.response?.data || error.message);
      throw new NotFoundException(`Product ${productSellerCode} not found on N11`);
    }
  }

  async deleteProduct(productId: number): Promise<any> {
    try {
      this.logger.log(`Deleting product: ${productId}`);

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<DeleteProductRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
  <productId>${productId}</productId>
</DeleteProductRequest>`;

      const response = await this.apiClient.post('/ProductService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log(`Product deleted: ${productId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete product: ${productId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to delete product from N11');
    }
  }

  async getShipmentCompanies(): Promise<any> {
    try {
      this.logger.log('Fetching shipment companies');

      const auth = this.generateAuth();
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<GetShipmentCompaniesRequest>
  <auth>
    <appKey>${auth.appKey}</appKey>
    <appSecret>${auth.appSecret}</appSecret>
  </auth>
</GetShipmentCompaniesRequest>`;

      const response = await this.apiClient.post('/ShipmentService.wsdl', xmlPayload);
      const result = this.parseXMLResponse(response.data);

      this.logger.log('Shipment companies fetched');
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch shipment companies', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch shipment companies from N11');
    }
  }

  private generateAuth(): { appKey: string; appSecret: string } {
    return {
      appKey: this.apiKey,
      appSecret: this.apiSecret,
    };
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private parseXMLResponse(xml: string): any {
    const parser = require('fast-xml-parser');
    const result = parser.parse(xml, {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    return result;
  }
}

