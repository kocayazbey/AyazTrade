import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseShippingService } from './base-shipping.service';
import { ShippingRate, ShippingLabel, TrackingInfo, ShipmentData } from '../shipping.service';

@Injectable()
export class MngCargoService extends BaseShippingService {
  constructor(configService: ConfigService) {
    super(configService, {
      name: 'MNG Kargo',
      code: 'mng',
      baseUrl: configService.get('MNG_API_URL', 'https://api.mng.com.tr'),
      apiKey: configService.get('MNG_API_KEY'),
      isActive: configService.get('MNG_ENABLED', true),
    });
  }

  async getRates(shipmentData: ShipmentData): Promise<ShippingRate[]> {
    try {
      const totalWeight = this.calculatePackageWeight(shipmentData.packages);
      const requestData = {
        fromCity: shipmentData.sender.city,
        toCity: shipmentData.recipient.city,
        weight: totalWeight,
        value: this.calculatePackageValue(shipmentData.packages),
      };

      const response = await this.makeApiRequest('/rates', 'POST', requestData);

      return response.services?.map((service: any) => ({
        provider: 'MNG Kargo',
        service: service.name || 'Standard',
        price: service.price,
        currency: 'TRY',
        estimatedDays: service.estimatedDays || 1,
      })) || [];
    } catch (error) {
      this.logger.error('Error getting MNG Kargo rates:', error);
      return [];
    }
  }

  async createShipment(shipmentData: ShipmentData): Promise<ShippingLabel> {
    try {
      const response = await this.makeApiRequest('/shipment', 'POST', shipmentData);
      return {
        provider: 'MNG Kargo',
        trackingNumber: response.trackingNumber,
        labelData: response.labelData || '',
        labelFormat: 'PDF',
      };
    } catch (error) {
      this.logger.error('Error creating MNG Kargo shipment:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const response = await this.makeApiRequest(`/track/${trackingNumber}`, 'GET');
      return {
        trackingNumber,
        status: response.status.toLowerCase(),
        statusDescription: response.statusDescription,
        events: this.formatTrackingEvents(response.history || []),
      };
    } catch (error) {
      this.logger.error('Error tracking MNG Kargo shipment:', error);
      throw error;
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      await this.makeApiRequest(`/shipment/${trackingNumber}/cancel`, 'DELETE');
      return true;
    } catch (error) {
      this.logger.error('Error cancelling MNG Kargo shipment:', error);
      return false;
    }
  }
}
