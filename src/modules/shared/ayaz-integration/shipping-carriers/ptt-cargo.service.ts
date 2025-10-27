import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PTTCargoService {
  private readonly logger = new Logger(PTTCargoService.name);
  private apiClient: AxiosInstance;
  private username: string;
  private password: string;
  private customerId: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.username = this.configService.get<string>('PTT_CARGO_USERNAME');
    this.password = this.configService.get<string>('PTT_CARGO_PASSWORD');
    this.customerId = this.configService.get<string>('PTT_CARGO_CUSTOMER_ID');
    this.baseUrl = 'https://entegrasyon.ptt.gov.tr/webservis';

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

  async createShipment(request: any): Promise<any> {
    try {
      this.logger.log(`Creating PTT Kargo shipment for order: ${request.orderId}`);

      const payload = {
        kullaniciAdi: this.username,
        sifre: this.password,
        musteriKodu: this.customerId,
        gonderiTuru: request.shipmentType || 1,
        odemeSekli: request.paymentType || 1,
        gonderiNumarasi: request.orderId,
        alici: {
          adi: request.receiver.name,
          adresi: request.receiver.address,
          ilKodu: request.receiver.cityCode,
          ilceKodu: request.receiver.districtCode,
          telefon: request.receiver.phone,
          postaKodu: request.receiver.postalCode || '',
        },
        gonderici: {
          adi: request.sender.name,
          adresi: request.sender.address,
          ilKodu: request.sender.cityCode,
          ilceKodu: request.sender.districtCode,
          telefon: request.sender.phone,
          postaKodu: request.sender.postalCode || '',
        },
        koli: {
          adet: request.packageCount,
          desi: request.desi,
          kg: request.weight || 0,
        },
        icerik: request.description,
        deger: request.price || 0,
      };

      const response = await this.apiClient.post('/GonderiKabul', payload);

      if (response.data.sonuc === '1') {
        this.logger.log(`Shipment created successfully: ${response.data.gonderiNo}`);
        return {
          success: true,
          trackingNumber: response.data.gonderiNo,
          barcode: response.data.barkodNo,
          rawResponse: response.data,
        };
      } else {
        throw new BadRequestException(response.data.aciklama || 'Failed to create shipment');
      }
    } catch (error) {
      this.logger.error('PTT Kargo shipment creation error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create PTT Kargo shipment');
    }
  }

  async getTracking(trackingNumber: string): Promise<any> {
    try {
      this.logger.log(`Fetching tracking info: ${trackingNumber}`);

      const payload = {
        kullaniciAdi: this.username,
        sifre: this.password,
        gonderiNo: trackingNumber,
      };

      const response = await this.apiClient.post('/GonderiTakip', payload);

      if (response.data.sonuc === '1') {
        return {
          trackingNumber: response.data.gonderiNo,
          status: response.data.durum,
          statusDescription: response.data.durumAciklama,
          currentLocation: response.data.guncelKonum,
          movements: response.data.hareketler || [],
        };
      } else {
        throw new BadRequestException('Failed to fetch tracking');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch tracking: ${trackingNumber}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch PTT Kargo tracking');
    }
  }

  async getCities(): Promise<any[]> {
    try {
      const payload = {
        kullaniciAdi: this.username,
        sifre: this.password,
      };

      const response = await this.apiClient.post('/IlListesi', payload);

      if (response.data.sonuc === '1') {
        return response.data.iller;
      } else {
        throw new BadRequestException('Failed to fetch cities');
      }
    } catch (error) {
      this.logger.error('Failed to fetch cities', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch PTT Kargo cities');
    }
  }

  async getDistricts(cityCode: string): Promise<any[]> {
    try {
      const payload = {
        kullaniciAdi: this.username,
        sifre: this.password,
        ilKodu: cityCode,
      };

      const response = await this.apiClient.post('/IlceListesi', payload);

      if (response.data.sonuc === '1') {
        return response.data.ilceler;
      } else {
        throw new BadRequestException('Failed to fetch districts');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch districts for city: ${cityCode}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch PTT Kargo districts');
    }
  }

  async calculatePrice(params: {
    senderCityCode: string;
    receiverCityCode: string;
    desi: number;
    weight: number;
    shipmentType: number;
  }): Promise<number> {
    try {
      const payload = {
        kullaniciAdi: this.username,
        sifre: this.password,
        cikisIlKodu: params.senderCityCode,
        varisIlKodu: params.receiverCityCode,
        desi: params.desi,
        kg: params.weight,
        gonderiTuru: params.shipmentType,
      };

      const response = await this.apiClient.post('/UcretHesapla', payload);

      if (response.data.sonuc === '1') {
        return response.data.ucret;
      } else {
        throw new BadRequestException('Failed to calculate price');
      }
    } catch (error) {
      this.logger.error('Failed to calculate price', error.response?.data || error.message);
      throw new BadRequestException('Failed to calculate PTT Kargo price');
    }
  }
}

