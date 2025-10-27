import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { orders, orderItems } from '../../database/schema/orders.schema';
import { shippingRates } from '../../database/schema/shipping-rates.schema';
import { CacheService } from '../../core/cache/cache.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class ShippingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
    private readonly loggerService: LoggerService,
  ) {}

  async calculateShipping(orderData: any, tenantId: string) {
    try {
      const { weight, dimensions, destination, origin } = orderData;
      
      const rates = await this.getShippingRates(tenantId);
      const calculatedRates = [];

      for (const rate of rates) {
        const cost = this.calculateRate(rate, weight, dimensions, destination, origin);
        calculatedRates.push({
          ...rate,
          cost,
          estimatedDays: rate.estimatedDays
        });
      }

      return calculatedRates.sort((a, b) => a.cost - b.cost);
    } catch (error) {
      this.loggerService.error('Error calculating shipping', error);
      throw error;
    }
  }

  async createShipment(orderId: number, shippingMethod: string, tenantId: string, userId: number) {
    try {
      const orderRows = await this.databaseService.drizzleClient
        .select()
        .from(orders)
        .where(eq(orders.id, orderId as any))
        .limit(1);
      const order = orderRows[0];

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'confirmed') {
        throw new BadRequestException('Order must be confirmed to create shipment');
      }

      const trackingNumber = await this.generateTrackingNumber(tenantId);
      
      // Update order with shipping info
      await this.databaseService.drizzleClient
        .update(orders)
        .set({
          trackingNumber,
          shippingMethod,
          status: 'shipped',
          shippedAt: new Date(),
        })
        .where(eq(orders.id, orderId as any));

      // Emit shipment created event
      await this.eventBusService.publish({
        eventType: 'shipment.created',
        aggregateId: String(orderId),
        aggregateType: 'Shipping',
        eventData: { orderId, trackingNumber, shippingMethod, tenantId },
        timestamp: new Date(),
        version: 1,
      });

      return { order, trackingNumber };
    } catch (error) {
      this.loggerService.error('Error creating shipment', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string, tenantId: string) {
    try {
      const orderRows = await this.databaseService.drizzleClient
        .select()
        .from(orders)
        .where(eq(orders.trackingNumber, trackingNumber))
        .limit(1);
      const order = orderRows[0];

      if (!order) {
        throw new NotFoundException('Shipment not found');
      }

      // In real implementation, this would integrate with shipping carrier APIs
      const trackingInfo = {
        trackingNumber,
        status: order.status,
        estimatedDelivery: this.calculateEstimatedDelivery(order.shippedAt),
        currentLocation: 'In Transit',
        history: [
          {
            status: 'Shipped',
            timestamp: order.shippedAt,
            location: 'Origin Warehouse'
          }
        ]
      };

      return trackingInfo;
    } catch (error) {
      this.loggerService.error('Error tracking shipment', error);
      throw error;
    }
  }

  private async getShippingRates(tenantId: string) {
    return await this.databaseService.drizzleClient
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.tenantId, tenantId as any));
  }

  private calculateRate(rate: any, weight: number, dimensions: any, destination: any, origin: any) {
    let cost = rate.basePrice;
    
    // Add weight-based pricing
    if (weight > rate.freeWeightLimit) {
      cost += (weight - rate.freeWeightLimit) * rate.pricePerKg;
    }

    // Add distance-based pricing
    const distance = this.calculateDistance(origin, destination);
    if (distance > rate.freeDistanceLimit) {
      cost += (distance - rate.freeDistanceLimit) * rate.pricePerKm;
    }

    return Math.round(cost * 100) / 100;
  }

  private calculateDistance(origin: any, destination: any) {
    // Simplified distance calculation
    // In real implementation, use Google Maps API or similar
    return Math.abs(destination.lat - origin.lat) + Math.abs(destination.lng - origin.lng);
  }

  private async generateTrackingNumber(tenantId: string): Promise<string> {
    const prefix = 'TRK';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }

  private calculateEstimatedDelivery(shippedAt: Date): Date {
    const estimatedDays = 3; // Default 3 days
    const deliveryDate = new Date(shippedAt);
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
    return deliveryDate;
  }

  async getShipments(filters: any, tenantId: string) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = (page - 1) * limit;
      
      const conditions = [eq(orders.tenantId, tenantId as any)];
      
      if (filters.status) {
        conditions.push(eq(orders.status, filters.status as any));
      }
      
      if (filters.trackingNumber) {
        conditions.push(eq(orders.trackingNumber, filters.trackingNumber));
      }

      const whereClause = conditions.length > 1 ? conditions : conditions[0];

      const results = await this.databaseService.drizzleClient
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(orders.createdAt)
        .limit(limit)
        .offset(offset);

      const totalResults = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(whereClause);

      return {
        data: results,
        total: Number(totalResults[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResults[0].count) / limit)
      };
    } catch (error) {
      this.loggerService.error('Error getting shipments', error);
      throw error;
    }
  }

  async getCarriers(tenantId: string) {
    try {
      const cacheKey = `carriers:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const carriers = [
        { id: 'aras', name: 'Aras Kargo', status: 'active', apiKey: 'aras_api_key' },
        { id: 'yurtici', name: 'Yurtiçi Kargo', status: 'active', apiKey: 'yurtici_api_key' },
        { id: 'mng', name: 'MNG Kargo', status: 'active', apiKey: 'mng_api_key' },
        { id: 'ptt', name: 'PTT Kargo', status: 'active', apiKey: 'ptt_api_key' },
      ];

      await this.cacheService.set(cacheKey, JSON.stringify(carriers), 3600);
      return carriers;
    } catch (error) {
      this.loggerService.error('Error getting carriers', error);
      throw error;
    }
  }

  async getShippingStats(tenantId: string) {
    try {
      const cacheKey = `shipping_stats:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const stats = await this.databaseService.drizzleClient
        .select({
          totalShipments: sql<number>`count(*)`,
          activeShipments: sql<number>`count(*) filter (where ${orders.status} = 'shipped')`,
          deliveredToday: sql<number>`count(*) filter (where ${orders.status} = 'delivered' and date(${orders.deliveredAt}) = current_date)`,
          pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
        })
        .from(orders)
        .where(eq(orders.tenantId, tenantId as any));

      const result = {
        activeShipments: Number(stats[0]?.activeShipments || 0),
        inTransit: Number(stats[0]?.activeShipments || 0),
        deliveredToday: Number(stats[0]?.deliveredToday || 0),
        pending: Number(stats[0]?.pending || 0),
        avgDeliveryTime: 2.3, // This would be calculated from historical data
        totalShipments: Number(stats[0]?.totalShipments || 0)
      };

      await this.cacheService.set(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch (error) {
      this.loggerService.error('Error getting shipping stats', error);
      throw error;
    }
  }

  async getShippingRates(tenantId: string) {
    try {
      const cacheKey = `shipping_rates:${tenantId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const rates = await this.databaseService.drizzleClient
        .select()
        .from(shippingRates)
        .where(eq(shippingRates.tenantId, tenantId as any));

      await this.cacheService.set(cacheKey, JSON.stringify(rates), 3600);
      return rates;
    } catch (error) {
      this.loggerService.error('Error getting shipping rates', error);
      throw error;
    }
  }
}
