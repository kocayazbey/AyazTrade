import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseShippingService } from './base-shipping.service';
import { ShippingRate, ShippingLabel, TrackingInfo, ShipmentData } from '../shipping.service';

@Injectable()
export class YurticiCargoService extends BaseShippingService {
  constructor(configService: ConfigService) {
    super(configService, {
      name: 'Yurtiçi Kargo',
      code: 'yurtici',
      baseUrl: configService.get('YURTICI_API_URL', 'https://api.yurtici.com.tr'),
      username: configService.get('YURTICI_USERNAME'),
      password: configService.get('YURTICI_PASSWORD'),
      apiKey: configService.get('YURTICI_API_KEY'),
      isActive: configService.get('YURTICI_ENABLED', true),
    });
  }

  async getRates(shipmentData: ShipmentData): Promise<ShippingRate[]> {
    try {
      const totalWeight = this.calculatePackageWeight(shipmentData.packages);

      const requestData = {
        senderCity: shipmentData.sender.city,
        receiverCity: shipmentData.recipient.city,
        weight: totalWeight,
        value: this.calculatePackageValue(shipmentData.packages),
      };

      const response = await this.makeApiRequest('/rates', 'POST', requestData);

      return response.services?.map((service: any) => ({
        provider: 'Yurtiçi Kargo',
        service: service.name || 'Standard',
        price: service.price,
        currency: 'TRY',
        estimatedDays: service.estimatedDays || 1,
      })) || [];

    } catch (error) {
      this.logger.error('Error getting Yurtiçi Kargo rates:', error);
      return [];
    }
  }

  async createShipment(shipmentData: ShipmentData): Promise<ShippingLabel> {
    try {
      const requestData = {
        orderId: shipmentData.orderId,
        sender: shipmentData.sender,
        receiver: shipmentData.recipient,
        packages: shipmentData.packages,
        paymentMethod: shipmentData.payment.method,
      };

      const response = await this.makeApiRequest('/shipment', 'POST', requestData);

      return {
        provider: 'Yurtiçi Kargo',
        trackingNumber: response.trackingNumber,
        labelData: response.labelData || '',
        labelFormat: 'PDF',
      };
    } catch (error) {
      this.logger.error('Error creating Yurtiçi Kargo shipment:', error);
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
      this.logger.error('Error tracking Yurtiçi Kargo shipment:', error);
      throw error;
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      await this.makeApiRequest(`/shipment/${trackingNumber}/cancel`, 'DELETE');
      return true;
    } catch (error) {
      this.logger.error('Error cancelling Yurtiçi Kargo shipment:', error);
      return false;
    }
  }
}
