import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseShippingService, ShippingProviderConfig } from './base-shipping.service';
import {
  ShippingRate,
  ShippingLabel,
  TrackingInfo,
  ShipmentData,
} from '../shipping.service';

@Injectable()
export class ArasCargoService extends BaseShippingService {
  constructor(configService: ConfigService) {
    super(configService, {
      name: 'Aras Kargo',
      code: 'aras',
      baseUrl: configService.get('ARAS_API_URL', 'https://api.aras.com.tr'),
      username: configService.get('ARAS_USERNAME'),
      password: configService.get('ARAS_PASSWORD'),
      apiKey: configService.get('ARAS_API_KEY'),
      isActive: configService.get('ARAS_ENABLED', true),
    });
  }

  async getRates(shipmentData: ShipmentData): Promise<ShippingRate[]> {
    try {
      const validationErrors = this.validateShipmentData(shipmentData);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid shipment data: ${validationErrors.join(', ')}`);
      }

      const totalWeight = this.calculatePackageWeight(shipmentData.packages);

      // Aras Kargo API call for rates
      const requestData = {
        sender: {
          city: shipmentData.sender.city,
          district: shipmentData.sender.state,
        },
        receiver: {
          city: shipmentData.recipient.city,
          district: shipmentData.recipient.state,
        },
        weight: totalWeight,
        value: this.calculatePackageValue(shipmentData.packages),
        paymentType: this.mapPaymentMethod(shipmentData.payment.method),
      };

      const response = await this.makeApiRequest('/shipping/rates', 'POST', requestData);

      return response.rates?.map((rate: any) => ({
        provider: 'Aras Kargo',
        service: rate.serviceName || 'Standard',
        price: rate.price,
        currency: 'TRY',
        estimatedDays: rate.estimatedDays || 2,
      })) || [];

    } catch (error) {
      this.logger.error('Error getting Aras Kargo rates:', error);
      return [];
    }
  }

  async createShipment(shipmentData: ShipmentData): Promise<ShippingLabel> {
    try {
      const validationErrors = this.validateShipmentData(shipmentData);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid shipment data: ${validationErrors.join(', ')}`);
      }

      const requestData = {
        orderId: shipmentData.orderId,
        sender: {
          name: shipmentData.sender.name,
          company: shipmentData.sender.company,
          address: this.formatAddress(shipmentData.sender),
          phone: shipmentData.sender.phone,
          email: shipmentData.sender.email,
        },
        receiver: {
          name: shipmentData.recipient.name,
          company: shipmentData.recipient.company,
          address: this.formatAddress(shipmentData.recipient),
          phone: shipmentData.recipient.phone,
          email: shipmentData.recipient.email,
        },
        packages: shipmentData.packages.map(pkg => ({
          weight: pkg.weight,
          dimensions: pkg.dimensions,
          value: pkg.value,
          description: pkg.description,
          quantity: pkg.quantity,
        })),
        paymentType: this.mapPaymentMethod(shipmentData.payment.method),
        paymentAccount: shipmentData.payment.accountNumber,
      };

      const response = await this.makeApiRequest('/shipping/create', 'POST', requestData);

      return {
        provider: 'Aras Kargo',
        trackingNumber: response.trackingNumber,
        labelData: response.labelData || '',
        labelFormat: response.labelFormat || 'PDF',
      };

    } catch (error) {
      this.logger.error('Error creating Aras Kargo shipment:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const response = await this.makeApiRequest(`/tracking/${trackingNumber}`, 'GET');

      return {
        trackingNumber,
        status: this.mapStatus(response.status),
        statusDescription: response.statusDescription || response.status,
        estimatedDelivery: response.estimatedDelivery ? new Date(response.estimatedDelivery) : undefined,
        events: this.formatTrackingEvents(response.events || []),
      };

    } catch (error) {
      this.logger.error('Error tracking Aras Kargo shipment:', error);
      throw error;
    }
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      await this.makeApiRequest(`/shipping/${trackingNumber}/cancel`, 'DELETE');
      return true;
    } catch (error) {
      this.logger.error('Error cancelling Aras Kargo shipment:', error);
      return false;
    }
  }

  async validateAddress(address: any): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions?: any[];
  }> {
    try {
      const response = await this.makeApiRequest('/address/validate', 'POST', {
        address: this.formatAddress(address),
        city: address.city,
        district: address.state,
        postalCode: address.postalCode,
      });

      return {
        isValid: response.isValid,
        errors: response.errors || [],
        suggestions: response.suggestions || [],
      };
    } catch (error) {
      this.logger.error('Error validating Aras Kargo address:', error);
      return {
        isValid: false,
        errors: ['Address validation failed'],
      };
    }
  }

  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      'sender': 'SENDER_PAY',
      'recipient': 'RECEIVER_PAY',
      'third_party': 'THIRD_PARTY_PAY',
    };

    return mapping[method] || 'SENDER_PAY';
  }

  private mapStatus(status: string): string {
    const mapping: Record<string, string> = {
      'CREATED': 'created',
      'PICKED_UP': 'picked_up',
      'IN_TRANSIT': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'FAILED_DELIVERY': 'failed_delivery',
      'CANCELLED': 'cancelled',
      'RETURNED': 'returned',
    };

    return mapping[status] || status.toLowerCase();
  }
}
