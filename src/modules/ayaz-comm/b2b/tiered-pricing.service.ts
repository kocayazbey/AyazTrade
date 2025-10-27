import { Injectable, Logger } from '@nestjs/common';

interface PriceTier {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercentage?: number;
  customerGroupId?: string;
  customerId?: string;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
}

interface PriceCalculation {
  basePrice: number;
  tierPrice: number;
  quantity: number;
  discount: number;
  finalPrice: number;
  totalPrice: number;
  tierApplied?: PriceTier;
  savings: number;
}

@Injectable()
export class TieredPricingService {
  private readonly logger = new Logger(TieredPricingService.name);
  private priceTiers: Map<string, PriceTier[]> = new Map();

  constructor() {
    this.initializeDefaultTiers();
  }

  private initializeDefaultTiers(): void {
    const defaultTiers: PriceTier[] = [
      { id: '1', productId: 'all', minQuantity: 1, maxQuantity: 10, price: 100, discountPercentage: 0, isActive: true },
      { id: '2', productId: 'all', minQuantity: 11, maxQuantity: 50, price: 90, discountPercentage: 10, isActive: true },
      { id: '3', productId: 'all', minQuantity: 51, maxQuantity: 100, price: 80, discountPercentage: 20, isActive: true },
      { id: '4', productId: 'all', minQuantity: 101, price: 70, discountPercentage: 30, isActive: true },
    ];

    this.priceTiers.set('all', defaultTiers);
  }

  async calculatePrice(productId: string, quantity: number, customerId?: string, customerGroupId?: string): Promise<PriceCalculation> {
    const basePrice = 100;
    const tiers = await this.getApplicableTiers(productId, customerId, customerGroupId);
    const applicableTier = this.findApplicableTier(tiers, quantity);

    if (!applicableTier) {
      return {
        basePrice,
        tierPrice: basePrice,
        quantity,
        discount: 0,
        finalPrice: basePrice,
        totalPrice: basePrice * quantity,
        savings: 0,
      };
    }

    const tierPrice = applicableTier.price;
    const discount = applicableTier.discountPercentage || ((basePrice - tierPrice) / basePrice) * 100;
    const totalPrice = tierPrice * quantity;
    const savings = (basePrice - tierPrice) * quantity;

    return {
      basePrice,
      tierPrice,
      quantity,
      discount,
      finalPrice: tierPrice,
      totalPrice,
      tierApplied: applicableTier,
      savings,
    };
  }

  async bulkCalculatePrice(items: Array<{ productId: string; quantity: number }>, customerId?: string, customerGroupId?: string): Promise<PriceCalculation[]> {
    const calculations: PriceCalculation[] = [];

    for (const item of items) {
      const calc = await this.calculatePrice(item.productId, item.quantity, customerId, customerGroupId);
      calculations.push(calc);
    }

    return calculations;
  }

  private async getApplicableTiers(productId: string, customerId?: string, customerGroupId?: string): Promise<PriceTier[]> {
    let tiers = this.priceTiers.get(productId) || [];
    
    if (tiers.length === 0) {
      tiers = this.priceTiers.get('all') || [];
    }

    const now = new Date();
    return tiers.filter((tier) => {
      if (!tier.isActive) return false;
      if (tier.customerId && tier.customerId !== customerId) return false;
      if (tier.customerGroupId && tier.customerGroupId !== customerGroupId) return false;
      if (tier.validFrom && tier.validFrom > now) return false;
      if (tier.validUntil && tier.validUntil < now) return false;
      return true;
    });
  }

  private findApplicableTier(tiers: PriceTier[], quantity: number): PriceTier | null {
    const sortedTiers = tiers.sort((a, b) => a.minQuantity - b.minQuantity);

    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i];
      if (quantity >= tier.minQuantity) {
        if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
          return tier;
        }
      }
    }

    return null;
  }

  async createTier(tier: Partial<PriceTier>): Promise<PriceTier> {
    const newTier: PriceTier = {
      id: `tier_${Date.now()}`,
      productId: tier.productId || '',
      minQuantity: tier.minQuantity || 1,
      maxQuantity: tier.maxQuantity,
      price: tier.price || 0,
      discountPercentage: tier.discountPercentage,
      customerGroupId: tier.customerGroupId,
      customerId: tier.customerId,
      validFrom: tier.validFrom,
      validUntil: tier.validUntil,
      isActive: tier.isActive !== false,
    };

    let tiers = this.priceTiers.get(newTier.productId) || [];
    tiers.push(newTier);
    tiers.sort((a, b) => a.minQuantity - b.minQuantity);
    this.priceTiers.set(newTier.productId, tiers);

    this.logger.log(`Price tier created for product ${newTier.productId}`);
    return newTier;
  }

  async updateTier(id: string, updates: Partial<PriceTier>): Promise<PriceTier> {
    for (const [productId, tiers] of this.priceTiers.entries()) {
      const index = tiers.findIndex((t) => t.id === id);
      if (index !== -1) {
        tiers[index] = { ...tiers[index], ...updates };
        this.priceTiers.set(productId, tiers);
        this.logger.log(`Price tier updated: ${id}`);
        return tiers[index];
      }
    }
    throw new Error(`Tier ${id} not found`);
  }

  async deleteTier(id: string): Promise<void> {
    for (const [productId, tiers] of this.priceTiers.entries()) {
      const filtered = tiers.filter((t) => t.id !== id);
      if (filtered.length !== tiers.length) {
        this.priceTiers.set(productId, filtered);
        this.logger.log(`Price tier deleted: ${id}`);
        return;
      }
    }
    throw new Error(`Tier ${id} not found`);
  }

  async getTiersForProduct(productId: string): Promise<PriceTier[]> {
    return this.priceTiers.get(productId) || this.priceTiers.get('all') || [];
  }

  async bulkCreateTiers(tiers: Partial<PriceTier>[]): Promise<PriceTier[]> {
    const created: PriceTier[] = [];
    for (const tier of tiers) {
      created.push(await this.createTier(tier));
    }
    return created;
  }
}

