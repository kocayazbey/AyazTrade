import { Injectable } from '@nestjs/common';

interface ShippingRate {
  carrier: string;
  service: string;
  price: number;
  estimatedDays: number;
  description: string;
}

@Injectable()
export class ShippingRatesService {
  private readonly carriers = {
    'aras-kargo': {
      name: 'Aras Kargo',
      services: {
        standard: { baseRate: 15, perKg: 2, days: 2 },
        express: { baseRate: 25, perKg: 3, days: 1 },
      },
    },
    'yurtici-kargo': {
      name: 'Yurtiçi Kargo',
      services: {
        standard: { baseRate: 18, perKg: 2.5, days: 3 },
        express: { baseRate: 28, perKg: 3.5, days: 1 },
      },
    },
    'mng-kargo': {
      name: 'MNG Kargo',
      services: {
        standard: { baseRate: 16.5, perKg: 2.2, days: 2 },
        express: { baseRate: 26, perKg: 3.2, days: 1 },
      },
    },
    'ptt-kargo': {
      name: 'PTT Kargo',
      services: {
        standard: { baseRate: 14, perKg: 1.8, days: 4 },
        economy: { baseRate: 10, perKg: 1.5, days: 5 },
      },
    },
  };

  async getRates(weight: number, destination: any, origin?: any): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];

    for (const [carrierId, carrier] of Object.entries(this.carriers)) {
      for (const [serviceId, service] of Object.entries(carrier.services)) {
        const price = this.calculatePrice(service, weight, destination);
        
        rates.push({
          carrier: carrier.name,
          service: serviceId,
          price,
          estimatedDays: service.days,
          description: `${carrier.name} - ${serviceId}`,
        });
      }
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  async calculateRate(carrier: string, service: string, weight: number, destination: any): Promise<number> {
    const carrierData = this.carriers[carrier.toLowerCase().replace(/\s+/g, '-')];
    if (!carrierData) {
      throw new Error(`Carrier ${carrier} not found`);
    }

    const serviceData = carrierData.services[service.toLowerCase()];
    if (!serviceData) {
      throw new Error(`Service ${service} not found for carrier ${carrier}`);
    }

    return this.calculatePrice(serviceData, weight, destination);
  }

  async getEstimatedDeliveryDate(carrier: string, service: string): Promise<Date> {
    const carrierData = this.carriers[carrier.toLowerCase().replace(/\s+/g, '-')];
    if (!carrierData) {
      throw new Error(`Carrier ${carrier} not found`);
    }

    const serviceData = carrierData.services[service.toLowerCase()];
    if (!serviceData) {
      throw new Error(`Service ${service} not found`);
    }

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + serviceData.days);

    return estimatedDate;
  }

  private calculatePrice(service: any, weight: number, destination: any): number {
    let price = service.baseRate + service.perKg * weight;

    // Add distance-based pricing
    if (destination.isRemote) {
      price *= 1.5;
    }

    // Add volumetric weight if applicable
    if (destination.volumetricWeight && destination.volumetricWeight > weight) {
      const additionalWeight = destination.volumetricWeight - weight;
      price += additionalWeight * service.perKg * 0.5;
    }

    return Math.round(price * 100) / 100;
  }

  async validateAddress(address: any): Promise<{ isValid: boolean; suggestion?: any }> {
    // In real implementation, use address validation API
    if (!address.city || !address.postalCode) {
      return { isValid: false };
    }

    return { isValid: true };
  }

  async calculateVolumetricWeight(dimensions: { length: number; width: number; height: number }): Promise<number> {
    // Standard formula: (L x W x H) / 5000
    return (dimensions.length * dimensions.width * dimensions.height) / 5000;
  }
}
