import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface YurticiCargoShipmentRequest {
  orderId: string;
  sender: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  paymentType: 1 | 2 | 3;
  serviceType?: number;
  packageCount: number;
  desi: number;
  cargoPrice: number;
  description: string;
}

@Injectable()
export class YurticiCargoService {
  private readonly logger = new Logger(YurticiCargoService.name);
  private apiClient: AxiosInstance;
  private customerId: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.customerId = this.configService.get<string>('YURTICI_CARGO_CUSTOMER_ID');
    this.username = this.configService.get<string>('YURTICI_CARGO_USERNAME');
    this.password = this.configService.get<string>('YURTICI_CARGO_PASSWORD');
    this.baseUrl = 'https://api.yurtiicikargo.com:20443';

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
  }

  async createShipment(request: YurticiCargoShipmentRequest): Promise<any> {
    try {
      this.logger.log(`Creating Yurtiçi Kargo shipment for order: ${request.orderId}`);

      const token = await this.getAuthToken();

      const payload = {
        customerNumber: this.customerId,
        invoiceKey: request.orderId,
        receiverCityName: request.receiver.city,
        receiverTownName: request.receiver.district,
        receiverAddress: request.receiver.address,
        receiverPhone1: request.receiver.phone,
        receiverName: request.receiver.name,
        senderCityName: request.sender.city,
        senderTownName: request.sender.district,
        senderAddress: request.sender.address,
        senderPhone1: request.sender.phone,
        senderName: request.sender.name,
        paymentType: request.paymentType,
        serviceType: request.serviceType || 2,
        desi: request.desi,
        cargoPrice: request.cargoPrice,
        description: request.description,
        pieceCount: request.packageCount,
      };

      const response = await this.apiClient.post('/api/ShippingOrder/InsertShippingOrder', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.isSuccessful) {
        this.logger.log(`Shipment created successfully: ${response.data.shippingOrderId}`);
        return {
          success: true,
          trackingNumber: response.data.shippingOrderId,
          barcode: response.data.shippingOrderBarcode,
          rawResponse: response.data,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to create shipment');
      }
    } catch (error) {
      this.logger.error('Yurtiçi Kargo shipment creation error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create Yurtiçi Kargo shipment');
    }
  }

  async getTracking(trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Fetching tracking info: ${trackingNumber}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.get(`/api/Tracking/GetTracking`, {
        params: {
          shippingOrderId: trackingNumber,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.isSuccessful) {
        return {
          trackingNumber: response.data.shippingOrderId,
          status: response.data.status,
          statusDescription: response.data.statusDescription,
          currentLocation: response.data.currentBranchName,
          movements: response.data.trackingOperations || [],
        };
      } else {
        throw new BadRequestException('Failed to fetch tracking');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch tracking: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Yurtiçi Kargo tracking');
    }
  }

  async cancelShipment(trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Cancelling shipment: ${trackingNumber}`);

      const token = await this.getAuthToken();

      const response = await this.apiClient.post('/api/ShippingOrder/CancelShippingOrder', {
        shippingOrderId: trackingNumber,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.isSuccessful) {
        this.logger.log(`Shipment cancelled: ${trackingNumber}`);
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to cancel shipment');
      }
    } catch (error) {
      this.logger.error(`Failed to cancel shipment: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to cancel Yurtiçi Kargo shipment');
    }
  }

  async getCities(): Promise<any[]> {
    try {
      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/api/City/GetCities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.isSuccessful) {
        return response.data.cities;
      } else {
        throw new BadRequestException('Failed to fetch cities');
      }
    } catch (error) {
      this.logger.error('Failed to fetch cities', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Yurtiçi Kargo cities');
    }
  }

  async getDistricts(cityCode: number): Promise<any[]> {
    try {
      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/api/Town/GetTowns', {
        params: {
          cityCode,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.isSuccessful) {
        return response.data.towns;
      } else {
        throw new BadRequestException('Failed to fetch districts');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch districts for city: ${cityCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch Yurtiçi Kargo districts');
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/Login/Login', {
        username: this.username,
        password: this.password,
      });

      if (response.data.isSuccessful) {
        return response.data.token;
      } else {
        throw new BadRequestException('Authentication failed');
      }
    } catch (error) {
      this.logger.error('Yurtiçi Kargo authentication failed', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with Yurtiçi Kargo');
    }
  }
}

