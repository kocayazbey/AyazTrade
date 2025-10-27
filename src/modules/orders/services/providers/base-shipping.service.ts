import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShippingRate,
  ShippingLabel,
  TrackingInfo,
  ShipmentData,
  PackageInfo,
} from '../shipping.service';

export interface ShippingProviderConfig {
  name: string;
  code: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
  isActive: boolean;
  testMode: boolean;
}

export interface ProviderAddressValidation {
  isValid: boolean;
  errors: string[];
  suggestions?: any[];
}

@Injectable()
export abstract class BaseShippingService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly config: ShippingProviderConfig;

  constructor(
    protected readonly configService: ConfigService,
    config: Partial<ShippingProviderConfig>,
  ) {
    this.config = {
      name: config.name || 'Unknown',
      code: config.code || 'UNKNOWN',
      isActive: true,
      testMode: this.configService.get('NODE_ENV') !== 'production',
      ...config,
    };
  }

  abstract getRates(shipmentData: ShipmentData): Promise<ShippingRate[]>;
  abstract createShipment(shipmentData: ShipmentData): Promise<ShippingLabel>;
  abstract trackShipment(trackingNumber: string): Promise<TrackingInfo>;
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;

  // Optional methods
  validateAddress?(address: any): Promise<ProviderAddressValidation>;
  getShippingZones?(): Promise<any[]>;

  protected calculatePackageWeight(packages: PackageInfo[]): number {
    return packages.reduce((total, pkg) => total + (pkg.weight * pkg.quantity), 0);
  }

  protected calculatePackageValue(packages: PackageInfo[]): number {
    return packages.reduce((total, pkg) => total + (pkg.value * pkg.quantity), 0);
  }

  protected formatAddress(address: any): string {
    const parts = [
      address.address,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  protected async makeApiRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade/1.0',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    if (this.config.apiSecret) {
      headers['X-API-Secret'] = this.config.apiSecret;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`API request failed for ${method} ${url}:`, error);
      throw error;
    }
  }

  protected formatTrackingEvents(events: any[]): any[] {
    return events.map(event => ({
      timestamp: new Date(event.timestamp),
      status: event.status,
      description: event.description || event.statusDescription,
      location: event.location || event.city,
    }));
  }

  protected validateShipmentData(shipmentData: ShipmentData): string[] {
    const errors: string[] = [];

    // Validate recipient
    if (!shipmentData.recipient.name) {
      errors.push('Recipient name is required');
    }
    if (!shipmentData.recipient.address) {
      errors.push('Recipient address is required');
    }
    if (!shipmentData.recipient.city) {
      errors.push('Recipient city is required');
    }
    if (!shipmentData.recipient.postalCode) {
      errors.push('Recipient postal code is required');
    }
    if (!shipmentData.recipient.country) {
      errors.push('Recipient country is required');
    }

    // Validate sender
    if (!shipmentData.sender.name) {
      errors.push('Sender name is required');
    }
    if (!shipmentData.sender.address) {
      errors.push('Sender address is required');
    }

    // Validate packages
    if (!shipmentData.packages || shipmentData.packages.length === 0) {
      errors.push('At least one package is required');
    }

    shipmentData.packages.forEach((pkg, index) => {
      if (!pkg.weight || pkg.weight <= 0) {
        errors.push(`Package ${index + 1}: Weight must be greater than 0`);
      }
      if (!pkg.value || pkg.value < 0) {
        errors.push(`Package ${index + 1}: Value must be 0 or greater`);
      }
      if (!pkg.description) {
        errors.push(`Package ${index + 1}: Description is required`);
      }
    });

    return errors;
  }
}
