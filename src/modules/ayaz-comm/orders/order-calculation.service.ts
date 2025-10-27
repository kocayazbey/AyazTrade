import { Injectable } from '@nestjs/common';

export interface OrderCalculations {
  subtotal: number;
  tax: number;
  taxRate: number;
  shippingCost: number;
  discount: number;
  total: number;
}

@Injectable()
export class OrderCalculationService {
  async calculate(orderData: any): Promise<OrderCalculations> {
    // Calculate subtotal from items
    const subtotal = this.calculateSubtotal(orderData.items);

    // Calculate discount
    const discount = await this.calculateDiscount(orderData);

    // Calculate tax
    const taxRate = await this.getTaxRate(orderData.shippingAddress?.country);
    const tax = this.calculateTax(subtotal - discount, taxRate);

    // Calculate shipping
    const shippingCost = await this.calculateShipping(orderData);

    // Calculate total
    const total = subtotal - discount + tax + shippingCost;

    return {
      subtotal,
      tax,
      taxRate,
      shippingCost,
      discount,
      total,
    };
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }

  private async calculateDiscount(orderData: any): Promise<number> {
    let discount = 0;

    // Apply coupon discount
    if (orderData.couponCode) {
      const couponDiscount = await this.getCouponDiscount(
        orderData.couponCode,
        orderData.items,
      );
      discount += couponDiscount;
    }

    // Apply customer group discount
    if (orderData.customerGroupId) {
      const groupDiscount = await this.getCustomerGroupDiscount(
        orderData.customerGroupId,
        orderData.items,
      );
      discount += groupDiscount;
    }

    // Apply item-level discounts
    const itemDiscounts = this.calculateItemDiscounts(orderData.items);
    discount += itemDiscounts;

    return discount;
  }

  private calculateTax(taxableAmount: number, taxRate: number): number {
    return (taxableAmount * taxRate) / 100;
  }

  private async calculateShipping(orderData: any): Promise<number> {
    // Get shipping method rate
    // This would integrate with shipping service
    return 0;
  }

  private async getTaxRate(country: string): Promise<number> {
    // Tax rates by country
    const taxRates: Record<string, number> = {
      Turkey: 18,
      Germany: 19,
      France: 20,
      UK: 20,
      USA: 0, // Varies by state
    };

    return taxRates[country] || 0;
  }

  private async getCouponDiscount(
    couponCode: string,
    items: any[],
  ): Promise<number> {
    // Placeholder - implement actual coupon validation
    return 0;
  }

  private async getCustomerGroupDiscount(
    groupId: string,
    items: any[],
  ): Promise<number> {
    // Placeholder - implement actual group discount
    return 0;
  }

  private calculateItemDiscounts(items: any[]): number {
    return items.reduce((sum, item) => {
      const itemDiscount = item.compareAtPrice
        ? (item.compareAtPrice - item.price) * item.quantity
        : 0;
      return sum + itemDiscount;
    }, 0);
  }
}

