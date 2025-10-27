import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AmazonTRService {
  private readonly logger = new Logger(AmazonTRService.name);
  private apiClient: AxiosInstance;
  private sellerId: string;
  private mwsAuthToken: string;
  private accessKey: string;
  private secretKey: string;
  private marketplaceId: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.sellerId = this.configService.get<string>('AMAZON_TR_SELLER_ID');
    this.mwsAuthToken = this.configService.get<string>('AMAZON_TR_MWS_AUTH_TOKEN');
    this.accessKey = this.configService.get<string>('AMAZON_TR_ACCESS_KEY');
    this.secretKey = this.configService.get<string>('AMAZON_TR_SECRET_KEY');
    this.marketplaceId = 'A33AVAJ2PDY3EV';
    this.baseUrl = 'https://mws-eu.amazonservices.com';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml',
      },
      timeout: 60000,
    });
  }

  async submitProductFeed(products: any[]): Promise<any> {
    try {
      this.logger.log(`Submitting product feed with ${products.length} products`);

      const feedContent = this.buildProductFeedXML(products);
      const feedMD5 = this.calculateMD5(feedContent);

      const params = this.buildBaseParams('SubmitFeed');
      params['FeedType'] = '_POST_PRODUCT_DATA_';
      params['PurgeAndReplace'] = 'false';
      params['MarketplaceIdList.Id.1'] = this.marketplaceId;
      params['ContentMD5Value'] = feedMD5;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('POST', '/Feeds/2009-01-01', queryString);

      const response = await this.apiClient.post(
        `/Feeds/2009-01-01?${queryString}&Signature=${encodeURIComponent(signature)}`,
        feedContent,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );

      const result = this.parseXMLResponse(response.data);
      
      if (result.SubmitFeedResponse?.SubmitFeedResult?.FeedSubmissionInfo?.FeedSubmissionId) {
        const feedSubmissionId = result.SubmitFeedResponse.SubmitFeedResult.FeedSubmissionInfo.FeedSubmissionId;
        this.logger.log(`Product feed submitted successfully: ${feedSubmissionId}`);
        return {
          success: true,
          feedSubmissionId,
        };
      } else {
        throw new BadRequestException('Failed to submit product feed');
      }
    } catch (error) {
      this.logger.error('Failed to submit product feed', error.response?.data || error.message);
      throw new BadRequestException('Failed to submit product feed to Amazon TR');
    }
  }

  async submitInventoryFeed(inventory: any[]): Promise<any> {
    try {
      this.logger.log(`Submitting inventory feed with ${inventory.length} items`);

      const feedContent = this.buildInventoryFeedXML(inventory);
      const feedMD5 = this.calculateMD5(feedContent);

      const params = this.buildBaseParams('SubmitFeed');
      params['FeedType'] = '_POST_INVENTORY_AVAILABILITY_DATA_';
      params['MarketplaceIdList.Id.1'] = this.marketplaceId;
      params['ContentMD5Value'] = feedMD5;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('POST', '/Feeds/2009-01-01', queryString);

      const response = await this.apiClient.post(
        `/Feeds/2009-01-01?${queryString}&Signature=${encodeURIComponent(signature)}`,
        feedContent,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );

      const result = this.parseXMLResponse(response.data);
      
      if (result.SubmitFeedResponse?.SubmitFeedResult?.FeedSubmissionInfo?.FeedSubmissionId) {
        const feedSubmissionId = result.SubmitFeedResponse.SubmitFeedResult.FeedSubmissionInfo.FeedSubmissionId;
        this.logger.log(`Inventory feed submitted successfully: ${feedSubmissionId}`);
        return {
          success: true,
          feedSubmissionId,
        };
      } else {
        throw new BadRequestException('Failed to submit inventory feed');
      }
    } catch (error) {
      this.logger.error('Failed to submit inventory feed', error.response?.data || error.message);
      throw new BadRequestException('Failed to submit inventory feed to Amazon TR');
    }
  }

  async submitPriceFeed(prices: any[]): Promise<any> {
    try {
      this.logger.log(`Submitting price feed with ${prices.length} items`);

      const feedContent = this.buildPriceFeedXML(prices);
      const feedMD5 = this.calculateMD5(feedContent);

      const params = this.buildBaseParams('SubmitFeed');
      params['FeedType'] = '_POST_PRODUCT_PRICING_DATA_';
      params['MarketplaceIdList.Id.1'] = this.marketplaceId;
      params['ContentMD5Value'] = feedMD5;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('POST', '/Feeds/2009-01-01', queryString);

      const response = await this.apiClient.post(
        `/Feeds/2009-01-01?${queryString}&Signature=${encodeURIComponent(signature)}`,
        feedContent,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );

      const result = this.parseXMLResponse(response.data);
      
      if (result.SubmitFeedResponse?.SubmitFeedResult?.FeedSubmissionInfo?.FeedSubmissionId) {
        const feedSubmissionId = result.SubmitFeedResponse.SubmitFeedResult.FeedSubmissionInfo.FeedSubmissionId;
        this.logger.log(`Price feed submitted successfully: ${feedSubmissionId}`);
        return {
          success: true,
          feedSubmissionId,
        };
      } else {
        throw new BadRequestException('Failed to submit price feed');
      }
    } catch (error) {
      this.logger.error('Failed to submit price feed', error.response?.data || error.message);
      throw new BadRequestException('Failed to submit price feed to Amazon TR');
    }
  }

  async getOrders(params?: {
    createdAfter?: string;
    createdBefore?: string;
    lastUpdatedAfter?: string;
    orderStatus?: string[];
  }): Promise<any> {
    try {
      this.logger.log('Fetching orders from Amazon TR');

      const requestParams = this.buildBaseParams('ListOrders');
      requestParams['MarketplaceId.Id.1'] = this.marketplaceId;
      
      if (params?.createdAfter) {
        requestParams['CreatedAfter'] = params.createdAfter;
      }
      if (params?.createdBefore) {
        requestParams['CreatedBefore'] = params.createdBefore;
      }
      if (params?.lastUpdatedAfter) {
        requestParams['LastUpdatedAfter'] = params.lastUpdatedAfter;
      }
      if (params?.orderStatus && params.orderStatus.length > 0) {
        params.orderStatus.forEach((status, index) => {
          requestParams[`OrderStatus.Status.${index + 1}`] = status;
        });
      }

      const queryString = this.buildQueryString(requestParams);
      const signature = this.generateSignature('GET', '/Orders/2013-09-01', queryString);

      const response = await this.apiClient.get(
        `/Orders/2013-09-01?${queryString}&Signature=${encodeURIComponent(signature)}`
      );

      const result = this.parseXMLResponse(response.data);
      
      this.logger.log('Orders fetched from Amazon TR');
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch orders', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch orders from Amazon TR');
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      this.logger.log(`Fetching order: ${orderId}`);

      const params = this.buildBaseParams('GetOrder');
      params['AmazonOrderId.Id.1'] = orderId;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('GET', '/Orders/2013-09-01', queryString);

      const response = await this.apiClient.get(
        `/Orders/2013-09-01?${queryString}&Signature=${encodeURIComponent(signature)}`
      );

      const result = this.parseXMLResponse(response.data);
      
      this.logger.log(`Order fetched: ${orderId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch order: ${orderId}`, error.response?.data || error.message);
      throw new NotFoundException(`Order ${orderId} not found on Amazon TR`);
    }
  }

  async getOrderItems(orderId: string): Promise<any> {
    try {
      this.logger.log(`Fetching order items: ${orderId}`);

      const params = this.buildBaseParams('ListOrderItems');
      params['AmazonOrderId'] = orderId;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('GET', '/Orders/2013-09-01', queryString);

      const response = await this.apiClient.get(
        `/Orders/2013-09-01?${queryString}&Signature=${encodeURIComponent(signature)}`
      );

      const result = this.parseXMLResponse(response.data);
      
      this.logger.log(`Order items fetched: ${orderId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch order items: ${orderId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch order items from Amazon TR');
    }
  }

  async confirmShipment(orderId: string, carrierName: string, trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Confirming shipment for order: ${orderId}`);

      const feedContent = this.buildOrderFulfillmentFeedXML([{
        orderId,
        carrierName,
        trackingNumber,
        shipDate: new Date().toISOString(),
      }]);

      const feedMD5 = this.calculateMD5(feedContent);

      const params = this.buildBaseParams('SubmitFeed');
      params['FeedType'] = '_POST_ORDER_FULFILLMENT_DATA_';
      params['MarketplaceIdList.Id.1'] = this.marketplaceId;
      params['ContentMD5Value'] = feedMD5;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('POST', '/Feeds/2009-01-01', queryString);

      const response = await this.apiClient.post(
        `/Feeds/2009-01-01?${queryString}&Signature=${encodeURIComponent(signature)}`,
        feedContent,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );

      const result = this.parseXMLResponse(response.data);
      
      this.logger.log(`Shipment confirmed for order: ${orderId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to confirm shipment: ${orderId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to confirm shipment on Amazon TR');
    }
  }

  async getFeedSubmissionResult(feedSubmissionId: string): Promise<any> {
    try {
      this.logger.log(`Fetching feed submission result: ${feedSubmissionId}`);

      const params = this.buildBaseParams('GetFeedSubmissionResult');
      params['FeedSubmissionId'] = feedSubmissionId;

      const queryString = this.buildQueryString(params);
      const signature = this.generateSignature('GET', '/Feeds/2009-01-01', queryString);

      const response = await this.apiClient.get(
        `/Feeds/2009-01-01?${queryString}&Signature=${encodeURIComponent(signature)}`
      );

      this.logger.log(`Feed submission result fetched: ${feedSubmissionId}`);
      return this.parseXMLResponse(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch feed result: ${feedSubmissionId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch feed submission result from Amazon TR');
    }
  }

  private buildBaseParams(action: string): Record<string, string> {
    return {
      AWSAccessKeyId: this.accessKey,
      Action: action,
      SellerId: this.sellerId,
      MWSAuthToken: this.mwsAuthToken,
      SignatureVersion: '2',
      SignatureMethod: 'HmacSHA256',
      Timestamp: new Date().toISOString(),
      Version: '2009-01-01',
    };
  }

  private buildQueryString(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  private generateSignature(method: string, path: string, queryString: string): string {
    const stringToSign = `${method}\nmws-eu.amazonservices.com\n${path}\n${queryString}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64');
  }

  private calculateMD5(content: string): string {
    return crypto.createHash('md5').update(content).digest('base64');
  }

  private buildProductFeedXML(products: any[]): string {
    const messages = products.map((product, index) => `
    <Message>
      <MessageID>${index + 1}</MessageID>
      <OperationType>Update</OperationType>
      <Product>
        <SKU>${product.sku}</SKU>
        <StandardProductID>
          <Type>ASIN</Type>
          <Value>${product.asin}</Value>
        </StandardProductID>
        <ProductTaxCode>${product.taxCode || ''}</ProductTaxCode>
        <DescriptionData>
          <Title>${this.escapeXml(product.title)}</Title>
          <Brand>${this.escapeXml(product.brand)}</Brand>
          <Description>${this.escapeXml(product.description)}</Description>
          <BulletPoint>${this.escapeXml(product.bulletPoint || '')}</BulletPoint>
          <ItemDimensions>
            <Length unitOfMeasure="CM">${product.length || 0}</Length>
            <Width unitOfMeasure="CM">${product.width || 0}</Width>
            <Height unitOfMeasure="CM">${product.height || 0}</Height>
            <Weight unitOfMeasure="KG">${product.weight || 0}</Weight>
          </ItemDimensions>
        </DescriptionData>
      </Product>
    </Message>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>Product</MessageType>
  ${messages}
</AmazonEnvelope>`;
  }

  private buildInventoryFeedXML(inventory: any[]): string {
    const messages = inventory.map((item, index) => `
    <Message>
      <MessageID>${index + 1}</MessageID>
      <OperationType>Update</OperationType>
      <Inventory>
        <SKU>${item.sku}</SKU>
        <Quantity>${item.quantity}</Quantity>
        <FulfillmentLatency>${item.fulfillmentLatency || 2}</FulfillmentLatency>
      </Inventory>
    </Message>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>Inventory</MessageType>
  ${messages}
</AmazonEnvelope>`;
  }

  private buildPriceFeedXML(prices: any[]): string {
    const messages = prices.map((item, index) => `
    <Message>
      <MessageID>${index + 1}</MessageID>
      <OperationType>Update</OperationType>
      <Price>
        <SKU>${item.sku}</SKU>
        <StandardPrice currency="TRY">${item.price}</StandardPrice>
      </Price>
    </Message>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>Price</MessageType>
  ${messages}
</AmazonEnvelope>`;
  }

  private buildOrderFulfillmentFeedXML(shipments: any[]): string {
    const messages = shipments.map((shipment, index) => `
    <Message>
      <MessageID>${index + 1}</MessageID>
      <OrderFulfillment>
        <AmazonOrderID>${shipment.orderId}</AmazonOrderID>
        <FulfillmentDate>${shipment.shipDate}</FulfillmentDate>
        <FulfillmentData>
          <CarrierName>${shipment.carrierName}</CarrierName>
          <ShippingMethod>Standard</ShippingMethod>
          <ShipperTrackingNumber>${shipment.trackingNumber}</ShipperTrackingNumber>
        </FulfillmentData>
      </OrderFulfillment>
    </Message>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${this.sellerId}</MerchantIdentifier>
  </Header>
  <MessageType>OrderFulfillment</MessageType>
  ${messages}
</AmazonEnvelope>`;
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
    return parser.parse(xml, {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }
}

