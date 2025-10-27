import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface ArasCargoShipmentRequest {
  orderId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderDistrict: string;
  senderPostalCode?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  receiverDistrict: string;
  receiverPostalCode?: string;
  paymentType: 'sender' | 'receiver';
  serviceType?: 'normal' | 'express';
  packageCount: number;
  desi: number;
  description: string;
  price?: number;
  content?: string;
}

export interface ArasCargoShipmentResponse {
  success: boolean;
  trackingNumber: string;
  barcode: string;
  error?: string;
  rawResponse?: any;
}

export interface ArasCargoTracking {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  currentLocation: string;
  movements: Array<{
    date: string;
    description: string;
    location: string;
    explanation?: string;
  }>;
}

@Injectable()
export class ArasCargoService {
  private readonly logger = new Logger(ArasCargoService.name);
  private apiClient: AxiosInstance;
  private customerId: string;
  private username: string;
  private password: string;
  private baseUrl: string;
  private testMode: boolean;

  constructor(private configService: ConfigService) {
    this.customerId = this.configService.get<string>('ARAS_CARGO_CUSTOMER_ID');
    this.username = this.configService.get<string>('ARAS_CARGO_USERNAME');
    this.password = this.configService.get<string>('ARAS_CARGO_PASSWORD');
    this.testMode = this.configService.get<boolean>('ARAS_CARGO_TEST_MODE', true);
    
    this.baseUrl = this.testMode
      ? 'https://testapi.araskargo.com.tr'
      : 'https://api.araskargo.com.tr';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Aras Kargo API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Aras Kargo API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Aras Kargo API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Aras Kargo API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createShipment(request: ArasCargoShipmentRequest): Promise<ArasCargoShipmentResponse> {
    try {
      this.logger.log(`Creating Aras Kargo shipment for order: ${request.orderId}`);

      const token = await this.getAuthToken();

      const payload = {
        CustomerCode: this.customerId,
        SenderName: request.senderName,
        SenderPhone: request.senderPhone,
        SenderAddress: request.senderAddress,
        SenderCity: request.senderCity,
        SenderDistrict: request.senderDistrict,
        SenderPostalCode: request.senderPostalCode || '',
        ReceiverName: request.receiverName,
        ReceiverPhone: request.receiverPhone,
        ReceiverAddress: request.receiverAddress,
        ReceiverCity: request.receiverCity,
        ReceiverDistrict: request.receiverDistrict,
        ReceiverPostalCode: request.receiverPostalCode || '',
        PaymentType: request.paymentType === 'sender' ? 1 : 2,
        ServiceType: request.serviceType === 'express' ? 2 : 1,
        PackageCount: request.packageCount,
        Desi: request.desi,
        Description: request.description,
        Price: request.price || 0,
        Content: request.content || request.description,
        ReferenceNo: request.orderId,
      };

      const response = await this.apiClient.post('/api/Shipment/Create', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        this.logger.log(`Shipment created successfully: ${response.data.TrackingNumber}`);
        return {
          success: true,
          trackingNumber: response.data.TrackingNumber,
          barcode: response.data.Barcode,
          rawResponse: response.data,
        };
      } else {
        this.logger.error(`Failed to create shipment: ${response.data.ErrorMessage}`);
        return {
          success: false,
          trackingNumber: '',
          barcode: '',
          error: response.data.ErrorMessage,
          rawResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error('Aras Kargo shipment creation error:', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to create Aras Kargo shipment');
    }
  }

  async getTracking(trackingNumber: string): Promise<ArasCargoTracking> {
    try {
      this.logger.log(`Fetching tracking info: ${trackingNumber}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.get(`/api/Tracking/GetTracking`, {
        params: {
          trackingNumber,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        const tracking: ArasCargoTracking = {
          trackingNumber: response.data.TrackingNumber,
          status: response.data.Status,
          statusDescription: response.data.StatusDescription,
          currentLocation: response.data.CurrentLocation,
          movements: response.data.Movements.map((m: any) => ({
            date: m.Date,
            description: m.Description,
            location: m.Location,
            explanation: m.Explanation,
          })),
        };

        this.logger.log(`Tracking info fetched: ${trackingNumber}`);
        return tracking;
      } else {
        throw new BadRequestException(response.data.ErrorMessage || 'Failed to fetch tracking');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch tracking: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Aras Kargo tracking information');
    }
  }

  async bulkTracking(trackingNumbers: string[]): Promise<ArasCargoTracking[]> {
    try {
      this.logger.log(`Fetching bulk tracking for ${trackingNumbers.length} shipments`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.post('/api/Tracking/BulkTracking', {
        TrackingNumbers: trackingNumbers,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        const trackings = response.data.Trackings.map((t: any) => ({
          trackingNumber: t.TrackingNumber,
          status: t.Status,
          statusDescription: t.StatusDescription,
          currentLocation: t.CurrentLocation,
          movements: t.Movements.map((m: any) => ({
            date: m.Date,
            description: m.Description,
            location: m.Location,
            explanation: m.Explanation,
          })),
        }));

        this.logger.log(`Bulk tracking fetched: ${trackings.length} shipments`);
        return trackings;
      } else {
        throw new BadRequestException(response.data.ErrorMessage || 'Failed to fetch bulk tracking');
      }
    } catch (error) {
      this.logger.error('Failed to fetch bulk tracking', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Aras Kargo bulk tracking');
    }
  }

  async cancelShipment(trackingNumber: string, reason: string): Promise<any> {
    try {
      this.logger.log(`Cancelling shipment: ${trackingNumber}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.post('/api/Shipment/Cancel', {
        TrackingNumber: trackingNumber,
        Reason: reason,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        this.logger.log(`Shipment cancelled: ${trackingNumber}`);
        return {
          success: true,
          message: response.data.Message,
        };
      } else {
        throw new BadRequestException(response.data.ErrorMessage || 'Failed to cancel shipment');
      }
    } catch (error) {
      this.logger.error(`Failed to cancel shipment: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to cancel Aras Kargo shipment');
    }
  }

  async getCities(): Promise<Array<{ code: string; name: string }>> {
    try {
      this.logger.log('Fetching city list');

      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/api/Location/GetCities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        return response.data.Cities.map((c: any) => ({
          code: c.Code,
          name: c.Name,
        }));
      } else {
        throw new BadRequestException('Failed to fetch cities');
      }
    } catch (error) {
      this.logger.error('Failed to fetch cities', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Aras Kargo cities');
    }
  }

  async getDistricts(cityCode: string): Promise<Array<{ code: string; name: string }>> {
    try {
      this.logger.log(`Fetching districts for city: ${cityCode}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/api/Location/GetDistricts', {
        params: {
          cityCode,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        return response.data.Districts.map((d: any) => ({
          code: d.Code,
          name: d.Name,
        }));
      } else {
        throw new BadRequestException('Failed to fetch districts');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch districts for city: ${cityCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Aras Kargo districts');
    }
  }

  async calculateShippingCost(params: {
    senderCity: string;
    receiverCity: string;
    desi: number;
    paymentType: 'sender' | 'receiver';
  }): Promise<number> {
    try {
      this.logger.log('Calculating shipping cost');

      const token = await this.getAuthToken();

      const response = await this.apiClient.post('/api/Price/Calculate', {
        SenderCity: params.senderCity,
        ReceiverCity: params.receiverCity,
        Desi: params.desi,
        PaymentType: params.paymentType === 'sender' ? 1 : 2,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        this.logger.log(`Shipping cost calculated: ${response.data.Price}`);
        return response.data.Price;
      } else {
        throw new BadRequestException(response.data.ErrorMessage || 'Failed to calculate shipping cost');
      }
    } catch (error) {
      this.logger.error('Failed to calculate shipping cost', error.response?.data || error.message);
      throw new BadRequestException('Failed to calculate Aras Kargo shipping cost');
    }
  }

  async getShipmentLabel(trackingNumber: string): Promise<Buffer> {
    try {
      this.logger.log(`Fetching shipment label: ${trackingNumber}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/api/Label/GetLabel', {
        params: {
          trackingNumber,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'arraybuffer',
      });

      this.logger.log(`Shipment label fetched: ${trackingNumber}`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch shipment label: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Aras Kargo shipment label');
    }
  }

  async bulkCreateShipments(shipments: ArasCargoShipmentRequest[]): Promise<ArasCargoShipmentResponse[]> {
    try {
      this.logger.log(`Bulk creating ${shipments.length} shipments`);

      const token = await this.getAuthToken();

      const payload = shipments.map((request) => ({
        CustomerCode: this.customerId,
        SenderName: request.senderName,
        SenderPhone: request.senderPhone,
        SenderAddress: request.senderAddress,
        SenderCity: request.senderCity,
        SenderDistrict: request.senderDistrict,
        SenderPostalCode: request.senderPostalCode || '',
        ReceiverName: request.receiverName,
        ReceiverPhone: request.receiverPhone,
        ReceiverAddress: request.receiverAddress,
        ReceiverCity: request.receiverCity,
        ReceiverDistrict: request.receiverDistrict,
        ReceiverPostalCode: request.receiverPostalCode || '',
        PaymentType: request.paymentType === 'sender' ? 1 : 2,
        ServiceType: request.serviceType === 'express' ? 2 : 1,
        PackageCount: request.packageCount,
        Desi: request.desi,
        Description: request.description,
        Price: request.price || 0,
        Content: request.content || request.description,
        ReferenceNo: request.orderId,
      }));

      const response = await this.apiClient.post('/api/Shipment/BulkCreate', {
        Shipments: payload,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.Success) {
        const results = response.data.Results.map((r: any) => ({
          success: r.Success,
          trackingNumber: r.TrackingNumber || '',
          barcode: r.Barcode || '',
          error: r.ErrorMessage,
          rawResponse: r,
        }));

        this.logger.log(`Bulk shipment creation completed: ${results.length} shipments`);
        return results;
      } else {
        throw new BadRequestException(response.data.ErrorMessage || 'Failed to bulk create shipments');
      }
    } catch (error) {
      this.logger.error('Failed to bulk create shipments', error.response?.data || error.message);
      throw new BadRequestException('Failed to bulk create Aras Kargo shipments');
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/Auth/Login', {
        Username: this.username,
        Password: this.password,
      });

      if (response.data.Success) {
        return response.data.Token;
      } else {
        throw new BadRequestException('Authentication failed');
      }
    } catch (error) {
      this.logger.error('Aras Kargo authentication failed', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with Aras Kargo');
    }
  }
}

