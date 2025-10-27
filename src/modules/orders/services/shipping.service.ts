import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArasCargoService } from './providers/aras-cargo.service';
import { YurticiCargoService } from './providers/yurtici-cargo.service';
import { MngCargoService } from './providers/mng-cargo.service';
import { UpsService } from './providers/ups.service';
import { DhlService } from './providers/dhl.service';

export interface ShippingProvider {
  name: string;
  code: string;
  isActive: boolean;
}

export interface ShippingRate {
  provider: string;
  service: string;
  price: number;
  currency: string;
  estimatedDays: number;
  trackingNumber?: string;
}

export interface ShippingLabel {
  provider: string;
  trackingNumber: string;
  labelData: string;
  labelFormat: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location: string;
}

export interface ShipmentData {
  orderId: string;
  recipient: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  sender: {
    name: string;
    company: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  };
  packages: PackageInfo[];
  payment: {
    method: 'sender' | 'recipient' | 'third_party';
    accountNumber?: string;
  };
}

export interface PackageInfo {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
  description: string;
  quantity: number;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private providers: Map<string, any> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly arasCargo: ArasCargoService,
    private readonly yurticiCargo: YurticiCargoService,
    private readonly mngCargo: MngCargoService,
    private readonly upsService: UpsService,
    private readonly dhlService: DhlService,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize all shipping providers
    this.providers.set('aras', this.arasCargo);
    this.providers.set('yurtici', this.yurticiCargo);
    this.providers.set('mng', this.mngCargo);
    this.providers.set('ups', this.upsService);
    this.providers.set('dhl', this.dhlService);

    this.logger.log(`Initialized ${this.providers.size} shipping providers`);
  }

  async getShippingRates(shipmentData: ShipmentData): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];

    for (const [providerCode, provider] of this.providers) {
      try {
        if (provider.isActive && provider.getRates) {
          const providerRates = await provider.getRates(shipmentData);
          rates.push(...providerRates.map((rate: any) => ({
            ...rate,
            provider: providerCode,
            currency: rate.currency || 'TRY',
          })));
        }
      } catch (error) {
        this.logger.error(`Error getting rates from ${providerCode}:`, error);
      }
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  async createShipment(providerCode: string, shipmentData: ShipmentData): Promise<ShippingLabel> {
    const provider = this.providers.get(providerCode);

    if (!provider) {
      throw new Error(`Shipping provider ${providerCode} not found`);
    }

    if (!provider.isActive) {
      throw new Error(`Shipping provider ${providerCode} is not active`);
    }

    try {
      return await provider.createShipment(shipmentData);
    } catch (error) {
      this.logger.error(`Error creating shipment with ${providerCode}:`, error);
      throw error;
    }
  }

  async trackShipment(providerCode: string, trackingNumber: string): Promise<TrackingInfo> {
    const provider = this.providers.get(providerCode);

    if (!provider) {
      throw new Error(`Shipping provider ${providerCode} not found`);
    }

    try {
      return await provider.trackShipment(trackingNumber);
    } catch (error) {
      this.logger.error(`Error tracking shipment with ${providerCode}:`, error);
      throw error;
    }
  }

  async cancelShipment(providerCode: string, trackingNumber: string): Promise<boolean> {
    const provider = this.providers.get(providerCode);

    if (!provider) {
      throw new Error(`Shipping provider ${providerCode} not found`);
    }

    try {
      return await provider.cancelShipment(trackingNumber);
    } catch (error) {
      this.logger.error(`Error cancelling shipment with ${providerCode}:`, error);
      return false;
    }
  }

  getAvailableProviders(): ShippingProvider[] {
    return Array.from(this.providers.entries()).map(([code, provider]) => ({
      name: provider.name || code.toUpperCase(),
      code,
      isActive: provider.isActive || false,
    }));
  }

  async validateAddress(address: any): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions?: any[];
  }> {
    const errors: string[] = [];
    const suggestions: any[] = [];

    // Basic validation rules
    if (!address.city) {
      errors.push('City is required');
    }

    if (!address.postalCode) {
      errors.push('Postal code is required');
    }

    if (!address.address || address.address.length < 10) {
      errors.push('Address must be at least 10 characters long');
    }

    // Provider-specific validation
    for (const [providerCode, provider] of this.providers) {
      try {
        if (provider.validateAddress) {
          const validation = await provider.validateAddress(address);
          if (!validation.isValid) {
            errors.push(...validation.errors);
          }
          if (validation.suggestions) {
            suggestions.push(...validation.suggestions);
          }
        }
      } catch (error) {
        this.logger.error(`Error validating address with ${providerCode}:`, error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  async getShippingZones(): Promise<any[]> {
    // Get shipping zones from all active providers
    const zones: any[] = [];

    for (const [providerCode, provider] of this.providers) {
      try {
        if (provider.getShippingZones) {
          const providerZones = await provider.getShippingZones();
          zones.push({
            provider: providerCode,
            zones: providerZones,
          });
        }
      } catch (error) {
        this.logger.error(`Error getting shipping zones from ${providerCode}:`, error);
      }
    }

    return zones;
  }
}
