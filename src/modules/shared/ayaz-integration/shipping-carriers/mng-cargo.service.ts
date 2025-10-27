import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class MNGCargoService {
  private readonly logger = new Logger(MNGCargoService.name);
  private apiClient: AxiosInstance;
  private customerId: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.customerId = this.configService.get<string>('MNG_CARGO_CUSTOMER_ID');
    this.username = this.configService.get<string>('MNG_CARGO_USERNAME');
    this.password = this.configService.get<string>('MNG_CARGO_PASSWORD');
    this.baseUrl = 'https://selfservis.mngkargo.com.tr/mngapi';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      timeout: 30000,
    });
  }

  async createShipment(request: any): Promise<any> {
    try {
      this.logger.log(`Creating MNG Kargo shipment for order: ${request.orderId}`);

      const payload = {
        mngCustomerId: this.customerId,
        referansNo: request.orderId,
        gonderiTipi: 1,
        odemeSekli: request.paymentType === 'sender' ? 0 : 1,
        aliciAdi: request.receiver.name,
        aliciAdresi: request.receiver.address,
        aliciIlKodu: request.receiver.cityCode,
        aliciIlceKodu: request.receiver.districtCode,
        aliciTelefon: request.receiver.phone,
        gonderenAdi: request.sender.name,
        gonderenAdresi: request.sender.address,
        gonderenIlKodu: request.sender.cityCode,
        gonderenIlceKodu: request.sender.districtCode,
        gonderenTelefon: request.sender.phone,
        paketSayisi: request.packageCount,
        desi: request.desi,
        aciklama: request.description,
        icerik: request.content,
        tahminiDeger: request.price || 0,
      };

      const response = await this.apiClient.post('/standardcargo/insertStandardCargo', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.success) {
        this.logger.log(`Shipment created successfully: ${response.data.data.kargoTakipNo}`);
        return {
          success: true,
          trackingNumber: response.data.data.kargoTakipNo,
          barcode: response.data.data.kargoTakipNo,
          rawResponse: response.data,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to create shipment');
      }
    } catch (error) {
      this.logger.error('MNG Kargo shipment creation error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create MNG Kargo shipment');
    }
  }

  async getTracking(trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Fetching tracking info: ${trackingNumber}`);

      const response = await this.apiClient.post('/standardcargo/getCargoTracking', {
        kargoTakipNo: trackingNumber,
      }, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.success) {
        return {
          trackingNumber: response.data.data.kargoTakipNo,
          status: response.data.data.durumKodu,
          statusDescription: response.data.data.durumAciklama,
          currentLocation: response.data.data.guncelSube,
          movements: response.data.data.hareketler || [],
        };
      } else {
        throw new BadRequestException('Failed to fetch tracking');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch tracking: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch MNG Kargo tracking');
    }
  }

  async getCities(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/location/getCities', {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new BadRequestException('Failed to fetch cities');
      }
    } catch (error) {
      this.logger.error('Failed to fetch cities', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch MNG Kargo cities');
    }
  }

  async getDistricts(cityCode: number): Promise<any[]> {
    try {
      const response = await this.apiClient.post('/location/getDistricts', {
        ilKodu: cityCode,
      }, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new BadRequestException('Failed to fetch districts');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch districts for city: ${cityCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch MNG Kargo districts');
    }
  }

  async calculatePrice(params: {
    senderCityCode: number;
    receiverCityCode: number;
    desi: number;
    paymentType: 0 | 1;
  }): Promise<number> {
    try {
      const response = await this.apiClient.post('/standardcargo/getPriceCalculation', {
        cikisSehirKodu: params.senderCityCode,
        varisSehirKodu: params.receiverCityCode,
        desi: params.desi,
        odemeSekli: params.paymentType,
      }, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.success) {
        return response.data.data.ucret;
      } else {
        throw new BadRequestException('Failed to calculate price');
      }
    } catch (error) {
      this.logger.error('Failed to calculate price', error.response?.data || error.message);
      throw new BadRequestException('Failed to calculate MNG Kargo price');
    }
  }
}

