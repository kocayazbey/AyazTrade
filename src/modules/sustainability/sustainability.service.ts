import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { carbonFootprint } from '../../database/schema/carbon-footprint.schema';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class SustainabilityService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async calculateCarbonFootprint(orderData: any, tenantId: string) {
    try {
      const { weight, distance, shippingMethod } = orderData;
      
      // Calculate carbon footprint based on shipping method and distance
      let carbonPerKm = 0;
      switch (shippingMethod) {
        case 'express':
          carbonPerKm = 0.3;
          break;
        case 'overnight':
          carbonPerKm = 0.4;
          break;
        case 'standard':
        default:
          carbonPerKm = 0.2; // kg CO2 per km
      }

      const totalCarbon = distance * carbonPerKm;
      
      // Save carbon footprint record
      await this.databaseService.drizzleClient
        .insert(carbonFootprint)
        .values({
          orderId: orderData.orderId as any,
          weight,
          distance,
          shippingMethod,
          carbonFootprint: totalCarbon as any,
          tenantId,
          createdAt: new Date(),
        })
        .returning();

      return {
        carbonFootprint: totalCarbon,
        offsetCost: this.calculateOffsetCost(totalCarbon),
        recommendations: this.getSustainabilityRecommendations(totalCarbon)
      };
    } catch (error) {
      this.loggerService.error('Error calculating carbon footprint', (error as Error).stack);
      throw error;
    }
  }

  async getSustainabilityMetrics(tenantId: string, period: string = '30d') {
    try {
      const cacheKey = `sustainability_metrics:${tenantId}:${period}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const metrics = {
        totalCarbonFootprint: 0,
        averageCarbonPerOrder: 0,
        carbonByShippingMethod: {},
        sustainabilityScore: 0,
        recommendations: [] as string[]
      };

      await this.cacheService.set(cacheKey, metrics, 3600);
      return metrics;
    } catch (error) {
      this.loggerService.error('Error getting sustainability metrics', (error as Error).stack);
      throw error;
    }
  }

  async suggestOffsetOptions(carbonFootprint: number) {
    try {
      const offsetOptions = [
        {
          type: 'tree_planting',
          cost: carbonFootprint * 0.1,
          description: 'Plant trees to offset carbon',
          impact: `${carbonFootprint * 0.5} kg CO2 offset`
        },
        {
          type: 'renewable_energy',
          cost: carbonFootprint * 0.15,
          description: 'Support renewable energy projects',
          impact: `${carbonFootprint * 0.8} kg CO2 offset`
        },
        {
          type: 'carbon_credits',
          cost: carbonFootprint * 0.2,
          description: 'Purchase verified carbon credits',
          impact: `${carbonFootprint} kg CO2 offset`
        }
      ];

      return offsetOptions;
    } catch (error) {
      this.loggerService.error('Error suggesting offset options', (error as Error).stack);
      throw error;
    }
  }

  private calculateOffsetCost(carbonFootprint: number): number {
    return carbonFootprint * 0.1; // $0.10 per kg CO2
  }

  private getSustainabilityRecommendations(carbonFootprint: number): string[] {
    const recommendations: string[] = [];
    
    if (carbonFootprint > 10) {
      recommendations.push('Consider using local suppliers to reduce shipping distance');
    }
    
    if (carbonFootprint > 5) {
      recommendations.push('Use eco-friendly packaging materials');
    }
    
    recommendations.push('Offer carbon offset options to customers');
    
    return recommendations;
  }
}
