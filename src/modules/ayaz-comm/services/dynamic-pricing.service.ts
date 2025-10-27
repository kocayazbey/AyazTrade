import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface PricingRule {
  id: string;
  name: string;
  productId?: string;
  categoryId?: string;
  conditions: PricingCondition[];
  actions: PricingAction[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PricingCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface PricingAction {
  type: 'adjust_price' | 'set_discount' | 'set_markup' | 'set_fixed_price';
  value: number;
  unit: 'percentage' | 'fixed';
}

interface CompetitorPrice {
  id: string;
  productId: string;
  competitor: string;
  price: number;
  currency: string;
  url: string;
  lastUpdated: Date;
}

interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  changedBy: string;
  timestamp: Date;
}

interface PricingAnalytics {
  productId: string;
  currentPrice: number;
  competitorPrices: CompetitorPrice[];
  pricePosition: 'lowest' | 'middle' | 'highest';
  recommendedPrice: number;
  priceChange: number;
  elasticity: number;
  demandForecast: number;
}

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createPricingRule(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: PricingRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.savePricingRule(newRule);
    
    this.logger.log(`Created pricing rule: ${ruleId}`);
    return newRule;
  }

  async getPricingRules(productId?: string): Promise<PricingRule[]> {
    const result = await this.db.execute(`
      SELECT * FROM pricing_rules
      ${productId ? 'WHERE product_id = $1 OR product_id IS NULL' : ''}
      AND is_active = true
      ORDER BY priority DESC, created_at DESC
    `, productId ? [productId] : []);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]')
    }));
  }

  async calculateDynamicPrice(productId: string, context: Record<string, any> = {}): Promise<{
    originalPrice: number;
    dynamicPrice: number;
    appliedRules: string[];
    priceChange: number;
  }> {
    const product = await this.getProduct(productId);
    const rules = await this.getPricingRules(productId);
    
    let dynamicPrice = product.price;
    const appliedRules: string[] = [];
    
    for (const rule of rules) {
      if (this.evaluateRuleConditions(rule, context)) {
        dynamicPrice = this.applyRuleActions(dynamicPrice, rule);
        appliedRules.push(rule.name);
      }
    }
    
    const priceChange = dynamicPrice - product.price;
    
    // Log price change
    await this.logPriceChange(productId, product.price, dynamicPrice, 'Dynamic pricing', 'system');
    
    return {
      originalPrice: product.price,
      dynamicPrice,
      appliedRules,
      priceChange
    };
  }

  async updateCompetitorPrice(price: Omit<CompetitorPrice, 'id' | 'lastUpdated'>): Promise<CompetitorPrice> {
    const priceId = `competitor-${Date.now()}`;
    
    const newPrice: CompetitorPrice = {
      id: priceId,
      ...price,
      lastUpdated: new Date()
    };

    await this.saveCompetitorPrice(newPrice);
    
    this.logger.log(`Updated competitor price: ${priceId}`);
    return newPrice;
  }

  async getCompetitorPrices(productId: string): Promise<CompetitorPrice[]> {
    const result = await this.db.execute(`
      SELECT * FROM competitor_prices
      WHERE product_id = $1
      ORDER BY last_updated DESC
    `, [productId]);
    
    return result.rows;
  }

  async getPricingAnalytics(productId: string): Promise<PricingAnalytics> {
    const product = await this.getProduct(productId);
    const competitorPrices = await this.getCompetitorPrices(productId);
    
    const competitorPriceValues = competitorPrices.map(cp => cp.price);
    const minPrice = Math.min(...competitorPriceValues);
    const maxPrice = Math.max(...competitorPriceValues);
    const avgPrice = competitorPriceValues.reduce((sum, price) => sum + price, 0) / competitorPriceValues.length;
    
    let pricePosition: 'lowest' | 'middle' | 'highest' = 'middle';
    if (product.price <= minPrice) pricePosition = 'lowest';
    else if (product.price >= maxPrice) pricePosition = 'highest';
    
    const recommendedPrice = this.calculateRecommendedPrice(product.price, competitorPrices);
    const priceChange = recommendedPrice - product.price;
    
    return {
      productId,
      currentPrice: product.price,
      competitorPrices,
      pricePosition,
      recommendedPrice,
      priceChange,
      elasticity: this.calculatePriceElasticity(productId),
      demandForecast: this.calculateDemandForecast(productId)
    };
  }

  async optimizePrices(): Promise<void> {
    const products = await this.getAllProducts();
    
    for (const product of products) {
      try {
        const analytics = await this.getPricingAnalytics(product.id);
        
        if (Math.abs(analytics.priceChange) > product.price * 0.05) { // 5% threshold
          await this.updateProductPrice(product.id, analytics.recommendedPrice, 'Price optimization');
        }
      } catch (error) {
        this.logger.error(`Failed to optimize price for product ${product.id}:`, error);
      }
    }
  }

  async getPriceHistory(productId: string, limit: number = 100): Promise<PriceHistory[]> {
    const result = await this.db.execute(`
      SELECT * FROM price_history
      WHERE product_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [productId, limit]);
    
    return result.rows;
  }

  private async getProduct(productId: string): Promise<any> {
    const result = await this.db.execute(`
      SELECT * FROM products WHERE id = $1
    `, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    return result.rows[0];
  }

  private async getAllProducts(): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM products WHERE status = 'active'
    `);
    
    return result.rows;
  }

  private evaluateRuleConditions(rule: PricingRule, context: Record<string, any>): boolean {
    if (rule.conditions.length === 0) return true;
    
    let result = true;
    let logicalOperator = 'AND';
    
    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, context);
      
      if (logicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      logicalOperator = condition.logicalOperator || 'AND';
    }
    
    return result;
  }

  private evaluateCondition(condition: PricingCondition, context: Record<string, any>): boolean {
    const value = this.getContextValue(condition.field, context);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'in_range':
        return Array.isArray(condition.value) && 
               value >= condition.value[0] && 
               value <= condition.value[1];
      default:
        return false;
    }
  }

  private getContextValue(field: string, context: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], context);
  }

  private applyRuleActions(price: number, rule: PricingRule): number {
    let newPrice = price;
    
    for (const action of rule.actions) {
      switch (action.type) {
        case 'adjust_price':
          if (action.unit === 'percentage') {
            newPrice = newPrice * (1 + action.value / 100);
          } else {
            newPrice = newPrice + action.value;
          }
          break;
        case 'set_discount':
          if (action.unit === 'percentage') {
            newPrice = newPrice * (1 - action.value / 100);
          } else {
            newPrice = newPrice - action.value;
          }
          break;
        case 'set_markup':
          if (action.unit === 'percentage') {
            newPrice = newPrice * (1 + action.value / 100);
          } else {
            newPrice = newPrice + action.value;
          }
          break;
        case 'set_fixed_price':
          newPrice = action.value;
          break;
      }
    }
    
    return Math.max(0, newPrice); // Ensure price is not negative
  }

  private calculateRecommendedPrice(currentPrice: number, competitorPrices: CompetitorPrice[]): number {
    if (competitorPrices.length === 0) return currentPrice;
    
    const competitorPriceValues = competitorPrices.map(cp => cp.price);
    const avgCompetitorPrice = competitorPriceValues.reduce((sum, price) => sum + price, 0) / competitorPriceValues.length;
    
    // Strategy: Price 5% below average competitor price
    return avgCompetitorPrice * 0.95;
  }

  private calculatePriceElasticity(productId: string): number {
    // Mock elasticity calculation - in real implementation, this would use historical data
    return -1.5; // Negative elasticity (price increase leads to demand decrease)
  }

  private calculateDemandForecast(productId: string): number {
    // Mock demand forecast - in real implementation, this would use ML models
    return 100; // Units forecasted
  }

  private async updateProductPrice(productId: string, newPrice: number, reason: string): Promise<void> {
    const product = await this.getProduct(productId);
    
    await this.db.execute(`
      UPDATE products SET price = $2, updated_at = NOW() WHERE id = $1
    `, [productId, newPrice]);
    
    await this.logPriceChange(productId, product.price, newPrice, reason, 'system');
    
    this.logger.log(`Updated product price: ${productId} from ${product.price} to ${newPrice}`);
  }

  private async logPriceChange(productId: string, oldPrice: number, newPrice: number, reason: string, changedBy: string): Promise<void> {
    const historyId = `history-${Date.now()}`;
    
    await this.db.execute(`
      INSERT INTO price_history (id, product_id, old_price, new_price, reason, changed_by, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      historyId,
      productId,
      oldPrice,
      newPrice,
      reason,
      changedBy,
      new Date()
    ]);
  }

  private async savePricingRule(rule: PricingRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO pricing_rules (id, name, product_id, category_id, conditions, actions, priority, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      rule.id,
      rule.name,
      rule.productId,
      rule.categoryId,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.priority,
      rule.isActive,
      rule.createdAt,
      rule.updatedAt
    ]);
  }

  private async saveCompetitorPrice(price: CompetitorPrice): Promise<void> {
    await this.db.execute(`
      INSERT INTO competitor_prices (id, product_id, competitor, price, currency, url, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (product_id, competitor) DO UPDATE SET
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        url = EXCLUDED.url,
        last_updated = EXCLUDED.last_updated
    `, [
      price.id,
      price.productId,
      price.competitor,
      price.price,
      price.currency,
      price.url,
      price.lastUpdated
    ]);
  }
}
