import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface PriceOptimization {
  id: string;
  productId: string;
  currentPrice: number;
  optimalPrice: number;
  elasticity: number;
  demandForecast: number;
  revenueImpact: number;
  confidence: number;
  method: 'elasticity' | 'competitor' | 'ml_model' | 'hybrid';
  parameters: Record<string, any>;
  calculatedAt: Date;
  validUntil: Date;
}

interface PriceElasticity {
  productId: string;
  elasticity: number;
  confidence: number;
  priceRange: {
    min: number;
    max: number;
  };
  demandCurve: Array<{
    price: number;
    demand: number;
  }>;
  calculatedAt: Date;
}

interface CompetitorAnalysis {
  productId: string;
  competitors: Array<{
    name: string;
    price: number;
    url: string;
    lastUpdated: Date;
  }>;
  marketPosition: 'lowest' | 'below_average' | 'average' | 'above_average' | 'highest';
  recommendedPrice: number;
  priceGap: number;
  analyzedAt: Date;
}

interface DynamicPricingRule {
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

@Injectable()
export class PriceOptimizationService {
  private readonly logger = new Logger(PriceOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async optimizeProductPrice(
    productId: string,
    method: 'elasticity' | 'competitor' | 'ml_model' | 'hybrid' = 'hybrid'
  ): Promise<PriceOptimization> {
    this.logger.log(`Optimizing price for product ${productId} using ${method}`);
    
    const product = await this.getProduct(productId);
    const salesHistory = await this.getProductSalesHistory(productId);
    const competitorPrices = await this.getCompetitorPrices(productId);
    
    let optimization: PriceOptimization;
    
    switch (method) {
      case 'elasticity':
        optimization = await this.optimizeByElasticity(product, salesHistory);
        break;
      case 'competitor':
        optimization = await this.optimizeByCompetitor(product, competitorPrices);
        break;
      case 'ml_model':
        optimization = await this.optimizeByMLModel(product, salesHistory, competitorPrices);
        break;
      case 'hybrid':
        optimization = await this.optimizeByHybrid(product, salesHistory, competitorPrices);
        break;
    }
    
    await this.savePriceOptimization(optimization);
    
    this.logger.log(`Price optimization completed for product ${productId}: ${optimization.optimalPrice}`);
    return optimization;
  }

  async calculatePriceElasticity(productId: string): Promise<PriceElasticity> {
    this.logger.log(`Calculating price elasticity for product ${productId}`);
    
    const salesHistory = await this.getProductSalesHistory(productId);
    const elasticity = this.calculateElasticity(salesHistory);
    const demandCurve = this.generateDemandCurve(salesHistory, elasticity);
    
    const priceElasticity: PriceElasticity = {
      productId,
      elasticity,
      confidence: this.calculateElasticityConfidence(salesHistory),
      priceRange: this.calculatePriceRange(salesHistory),
      demandCurve,
      calculatedAt: new Date()
    };
    
    await this.savePriceElasticity(priceElasticity);
    
    this.logger.log(`Price elasticity calculated for product ${productId}: ${elasticity}`);
    return priceElasticity;
  }

  async analyzeCompetitors(productId: string): Promise<CompetitorAnalysis> {
    this.logger.log(`Analyzing competitors for product ${productId}`);
    
    const competitors = await this.getCompetitorPrices(productId);
    const product = await this.getProduct(productId);
    
    const marketPosition = this.determineMarketPosition(product.price, competitors);
    const recommendedPrice = this.calculateRecommendedPrice(competitors, product);
    const priceGap = Math.abs(product.price - recommendedPrice);
    
    const analysis: CompetitorAnalysis = {
      productId,
      competitors,
      marketPosition,
      recommendedPrice,
      priceGap,
      analyzedAt: new Date()
    };
    
    await this.saveCompetitorAnalysis(analysis);
    
    this.logger.log(`Competitor analysis completed for product ${productId}`);
    return analysis;
  }

  async createDynamicPricingRule(rule: Omit<DynamicPricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<DynamicPricingRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: DynamicPricingRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDynamicPricingRule(newRule);
    
    this.logger.log(`Created dynamic pricing rule: ${ruleId}`);
    return newRule;
  }

  async getDynamicPricingRules(productId?: string): Promise<DynamicPricingRule[]> {
    let query = 'SELECT * FROM dynamic_pricing_rules WHERE is_active = true';
    const params = [];
    
    if (productId) {
      query += ' AND (product_id = $1 OR product_id IS NULL)';
      params.push(productId);
    }
    
    query += ' ORDER BY priority DESC, created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]')
    }));
  }

  async applyDynamicPricing(productId: string, context: Record<string, any>): Promise<{
    originalPrice: number;
    dynamicPrice: number;
    appliedRules: string[];
    priceChange: number;
  }> {
    this.logger.log(`Applying dynamic pricing for product ${productId}`);
    
    const product = await this.getProduct(productId);
    const rules = await this.getDynamicPricingRules(productId);
    
    let dynamicPrice = product.price;
    const appliedRules: string[] = [];
    
    for (const rule of rules) {
      if (this.evaluateRuleConditions(rule, context)) {
        dynamicPrice = this.applyRuleActions(dynamicPrice, rule);
        appliedRules.push(rule.name);
      }
    }
    
    const priceChange = dynamicPrice - product.price;
    
    this.logger.log(`Dynamic pricing applied for product ${productId}: ${priceChange} change`);
    
    return {
      originalPrice: product.price,
      dynamicPrice,
      appliedRules,
      priceChange
    };
  }

  async getPriceOptimizationAnalytics(period: string = '30d'): Promise<{
    totalOptimizations: number;
    averageRevenueImpact: number;
    methodPerformance: Array<{
      method: string;
      count: number;
      averageImpact: number;
    }>;
    topProducts: Array<{
      productId: string;
      revenueImpact: number;
      priceChange: number;
    }>;
    elasticityDistribution: Array<{
      range: string;
      count: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_optimizations,
        AVG(revenue_impact) as average_revenue_impact
      FROM price_optimizations
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    
    const methodResult = await this.db.execute(`
      SELECT 
        method,
        COUNT(*) as count,
        AVG(revenue_impact) as average_impact
      FROM price_optimizations
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
      GROUP BY method
    `);
    
    const methodPerformance = methodResult.rows.map(row => ({
      method: row.method,
      count: parseInt(row.count) || 0,
      averageImpact: parseFloat(row.average_impact) || 0
    }));
    
    const topProductsResult = await this.db.execute(`
      SELECT 
        product_id,
        revenue_impact,
        (optimal_price - current_price) as price_change
      FROM price_optimizations
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
      ORDER BY revenue_impact DESC
      LIMIT 10
    `);
    
    const topProducts = topProductsResult.rows.map(row => ({
      productId: row.product_id,
      revenueImpact: parseFloat(row.revenue_impact) || 0,
      priceChange: parseFloat(row.price_change) || 0
    }));
    
    const elasticityResult = await this.db.execute(`
      SELECT 
        CASE 
          WHEN elasticity < -2 THEN 'Highly Elastic (< -2)'
          WHEN elasticity < -1 THEN 'Elastic (-2 to -1)'
          WHEN elasticity < -0.5 THEN 'Moderately Elastic (-1 to -0.5)'
          WHEN elasticity < 0 THEN 'Inelastic (-0.5 to 0)'
          ELSE 'Positive (> 0)'
        END as range,
        COUNT(*) as count
      FROM price_elasticity
      WHERE calculated_at >= NOW() - INTERVAL '${period}'
      GROUP BY range
    `);
    
    const elasticityDistribution = elasticityResult.rows.map(row => ({
      range: row.range,
      count: parseInt(row.count) || 0
    }));
    
    return {
      totalOptimizations: parseInt(stats.total_optimizations) || 0,
      averageRevenueImpact: parseFloat(stats.average_revenue_impact) || 0,
      methodPerformance,
      topProducts,
      elasticityDistribution
    };
  }

  private async optimizeByElasticity(product: any, salesHistory: any[]): Promise<PriceOptimization> {
    const elasticity = this.calculateElasticity(salesHistory);
    const cost = product.cost || product.price * 0.6;
    
    const optimalPrice = cost / (1 + 1/elasticity);
    const demandForecast = this.forecastDemand(product.price, optimalPrice, elasticity);
    const revenueImpact = this.calculateRevenueImpact(product.price, optimalPrice, demandForecast);
    
    return {
      id: `optimization-${Date.now()}`,
      productId: product.id,
      currentPrice: product.price,
      optimalPrice,
      elasticity,
      demandForecast,
      revenueImpact,
      confidence: this.calculateElasticityConfidence(salesHistory),
      method: 'elasticity',
      parameters: { elasticity, cost },
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async optimizeByCompetitor(product: any, competitors: any[]): Promise<PriceOptimization> {
    const competitorAverage = competitors.length > 0 
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length 
      : product.price;
    
    const optimalPrice = competitorAverage * 0.95; // 5% below average
    const elasticity = -1.5; // Default elasticity
    const demandForecast = this.forecastDemand(product.price, optimalPrice, elasticity);
    const revenueImpact = this.calculateRevenueImpact(product.price, optimalPrice, demandForecast);
    
    return {
      id: `optimization-${Date.now()}`,
      productId: product.id,
      currentPrice: product.price,
      optimalPrice,
      elasticity,
      demandForecast,
      revenueImpact,
      confidence: 0.8,
      method: 'competitor',
      parameters: { competitorAverage, competitorCount: competitors.length },
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async optimizeByMLModel(product: any, salesHistory: any[], competitors: any[]): Promise<PriceOptimization> {
    const features = this.extractMLFeatures(product, salesHistory, competitors);
    const model = this.trainMLModel(features);
    const optimalPrice = this.predictOptimalPrice(model, features);
    
    const elasticity = this.calculateElasticity(salesHistory);
    const demandForecast = this.forecastDemand(product.price, optimalPrice, elasticity);
    const revenueImpact = this.calculateRevenueImpact(product.price, optimalPrice, demandForecast);
    
    return {
      id: `optimization-${Date.now()}`,
      productId: product.id,
      currentPrice: product.price,
      optimalPrice,
      elasticity,
      demandForecast,
      revenueImpact,
      confidence: 0.9,
      method: 'ml_model',
      parameters: { model_type: 'neural_network', features: Object.keys(features) },
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async optimizeByHybrid(product: any, salesHistory: any[], competitors: any[]): Promise<PriceOptimization> {
    const elasticityOptimization = await this.optimizeByElasticity(product, salesHistory);
    const competitorOptimization = await this.optimizeByCompetitor(product, competitors);
    const mlOptimization = await this.optimizeByMLModel(product, salesHistory, competitors);
    
    const weights = { elasticity: 0.4, competitor: 0.3, ml: 0.3 };
    const optimalPrice = 
      elasticityOptimization.optimalPrice * weights.elasticity +
      competitorOptimization.optimalPrice * weights.competitor +
      mlOptimization.optimalPrice * weights.ml;
    
    const elasticity = elasticityOptimization.elasticity;
    const demandForecast = this.forecastDemand(product.price, optimalPrice, elasticity);
    const revenueImpact = this.calculateRevenueImpact(product.price, optimalPrice, demandForecast);
    
    return {
      id: `optimization-${Date.now()}`,
      productId: product.id,
      currentPrice: product.price,
      optimalPrice,
      elasticity,
      demandForecast,
      revenueImpact,
      confidence: 0.85,
      method: 'hybrid',
      parameters: { weights, elasticity, competitorAverage: competitorOptimization.optimalPrice },
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  private calculateElasticity(salesHistory: any[]): number {
    if (salesHistory.length < 2) return -1.5;
    
    const priceChanges = [];
    const quantityChanges = [];
    
    for (let i = 1; i < salesHistory.length; i++) {
      const priceChange = (salesHistory[i].price - salesHistory[i-1].price) / salesHistory[i-1].price;
      const quantityChange = (salesHistory[i].quantity - salesHistory[i-1].quantity) / salesHistory[i-1].quantity;
      
      if (priceChange !== 0) {
        priceChanges.push(priceChange);
        quantityChanges.push(quantityChange);
      }
    }
    
    if (priceChanges.length === 0) return -1.5;
    
    const elasticity = quantityChanges.reduce((sum, q) => sum + q, 0) / priceChanges.reduce((sum, p) => sum + p, 0);
    return Math.max(elasticity, -3);
  }

  private generateDemandCurve(salesHistory: any[], elasticity: number): Array<{ price: number; demand: number }> {
    const basePrice = salesHistory[salesHistory.length - 1]?.price || 100;
    const baseDemand = salesHistory.reduce((sum, s) => sum + s.quantity, 0) / salesHistory.length;
    
    const curve = [];
    for (let price = basePrice * 0.5; price <= basePrice * 1.5; price += basePrice * 0.05) {
      const demand = baseDemand * Math.pow(price / basePrice, elasticity);
      curve.push({ price, demand: Math.max(0, demand) });
    }
    
    return curve;
  }

  private calculateElasticityConfidence(salesHistory: any[]): number {
    if (salesHistory.length < 5) return 0.6;
    if (salesHistory.length < 20) return 0.8;
    return 0.95;
  }

  private calculatePriceRange(salesHistory: any[]): { min: number; max: number } {
    const prices = salesHistory.map(s => s.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  private determineMarketPosition(price: number, competitors: any[]): 'lowest' | 'below_average' | 'average' | 'above_average' | 'highest' {
    if (competitors.length === 0) return 'average';
    
    const prices = competitors.map(c => c.price);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    if (price <= min) return 'lowest';
    if (price < average) return 'below_average';
    if (price === average) return 'average';
    if (price < max) return 'above_average';
    return 'highest';
  }

  private calculateRecommendedPrice(competitors: any[], product: any): number {
    if (competitors.length === 0) return product.price;
    
    const average = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
    return average * 0.95; // 5% below average
  }

  private forecastDemand(currentPrice: number, newPrice: number, elasticity: number): number {
    const priceChange = (newPrice - currentPrice) / currentPrice;
    const demandChange = elasticity * priceChange;
    return 1 + demandChange;
  }

  private calculateRevenueImpact(currentPrice: number, optimalPrice: number, demandForecast: number): number {
    const currentRevenue = currentPrice * 1; // Base demand
    const optimalRevenue = optimalPrice * demandForecast;
    return optimalRevenue - currentRevenue;
  }

  private extractMLFeatures(product: any, salesHistory: any[], competitors: any[]): any {
    return {
      currentPrice: product.price,
      cost: product.cost,
      category: product.category,
      averageQuantity: salesHistory.reduce((sum, s) => sum + s.quantity, 0) / salesHistory.length,
      priceVariance: this.calculatePriceVariance(salesHistory),
      competitorAverage: competitors.length > 0 ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length : product.price,
      competitorCount: competitors.length
    };
  }

  private calculatePriceVariance(salesHistory: any[]): number {
    if (salesHistory.length < 2) return 0;
    
    const prices = salesHistory.map(s => s.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance);
  }

  private trainMLModel(features: any): any {
    // Mock ML model training
    return {
      type: 'neural_network',
      weights: Array.from({ length: Object.keys(features).length }, () => Math.random()),
      bias: Math.random()
    };
  }

  private predictOptimalPrice(model: any, features: any): number {
    // Mock ML prediction
    const weights = model.weights;
    const bias = model.bias;
    const featureValues = Object.values(features);
    
    let prediction = bias;
    for (let i = 0; i < featureValues.length && i < weights.length; i++) {
      prediction += weights[i] * (featureValues[i] as number);
    }
    
    return Math.max(prediction, 0);
  }

  private evaluateRuleConditions(rule: DynamicPricingRule, context: Record<string, any>): boolean {
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

  private applyRuleActions(price: number, rule: DynamicPricingRule): number {
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
    
    return Math.max(0, newPrice);
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

  private async getProductSalesHistory(productId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT oi.price, oi.quantity, o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
      ORDER BY o.created_at ASC
    `, [productId]);
    
    return result.rows;
  }

  private async getCompetitorPrices(productId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM competitor_prices WHERE product_id = $1
    `, [productId]);
    
    return result.rows;
  }

  private async savePriceOptimization(optimization: PriceOptimization): Promise<void> {
    await this.db.execute(`
      INSERT INTO price_optimizations (id, product_id, current_price, optimal_price, elasticity, demand_forecast, revenue_impact, confidence, method, parameters, calculated_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      optimization.id,
      optimization.productId,
      optimization.currentPrice,
      optimization.optimalPrice,
      optimization.elasticity,
      optimization.demandForecast,
      optimization.revenueImpact,
      optimization.confidence,
      optimization.method,
      JSON.stringify(optimization.parameters),
      optimization.calculatedAt,
      optimization.validUntil
    ]);
  }

  private async savePriceElasticity(elasticity: PriceElasticity): Promise<void> {
    await this.db.execute(`
      INSERT INTO price_elasticity (product_id, elasticity, confidence, price_range, demand_curve, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (product_id) DO UPDATE SET
        elasticity = EXCLUDED.elasticity,
        confidence = EXCLUDED.confidence,
        price_range = EXCLUDED.price_range,
        demand_curve = EXCLUDED.demand_curve,
        calculated_at = EXCLUDED.calculated_at
    `, [
      elasticity.productId,
      elasticity.elasticity,
      elasticity.confidence,
      JSON.stringify(elasticity.priceRange),
      JSON.stringify(elasticity.demandCurve),
      elasticity.calculatedAt
    ]);
  }

  private async saveCompetitorAnalysis(analysis: CompetitorAnalysis): Promise<void> {
    await this.db.execute(`
      INSERT INTO competitor_analysis (product_id, competitors, market_position, recommended_price, price_gap, analyzed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (product_id) DO UPDATE SET
        competitors = EXCLUDED.competitors,
        market_position = EXCLUDED.market_position,
        recommended_price = EXCLUDED.recommended_price,
        price_gap = EXCLUDED.price_gap,
        analyzed_at = EXCLUDED.analyzed_at
    `, [
      analysis.productId,
      JSON.stringify(analysis.competitors),
      analysis.marketPosition,
      analysis.recommendedPrice,
      analysis.priceGap,
      analysis.analyzedAt
    ]);
  }

  private async saveDynamicPricingRule(rule: DynamicPricingRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO dynamic_pricing_rules (id, name, product_id, category_id, conditions, actions, priority, is_active, created_at, updated_at)
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
}