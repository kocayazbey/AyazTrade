import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface PriceOptimization {
  productId: string;
  productName: string;
  sku: string;
  currentPrice: number;
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number;
  strategy: 'cost_plus' | 'market_based' | 'value_based' | 'competition_based' | 'dynamic';
  factors: {
    costBased: number;
    marketBased: number;
    competitionBased: number;
    demandBased: number;
    seasonalityBased: number;
  };
  sensitivity: {
    priceElasticity: number;
    crossElasticity: number;
    incomeElasticity: number;
  };
  competitorAnalysis: {
    avgCompetitorPrice: number;
    pricePosition: 'premium' | 'competitive' | 'discount';
    marketShare: number;
    priceGap: number;
  };
  profitability: {
    margin: number;
    profitPerUnit: number;
    breakEvenPrice: number;
    targetMargin: number;
  };
  recommendations: string[];
  nextReviewDate: Date;
}

export interface DynamicPricingRule {
  id: string;
  name: string;
  description: string;
  productId?: string;
  categoryId?: string;
  conditions: {
    timeRange?: { start: string; end: string };
    dayOfWeek?: number[];
    inventoryLevel?: { min: number; max: number };
    demandLevel?: 'low' | 'medium' | 'high';
    competitorAction?: 'price_increase' | 'price_decrease' | 'promotion';
    season?: string;
  };
  pricingAction: {
    type: 'fixed' | 'percentage' | 'formula';
    value: number;
    operation: 'increase' | 'decrease' | 'set';
  };
  priority: number;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitorAnalysis {
  productId: string;
  competitors: Array<{
    competitorId: string;
    competitorName: string;
    price: number;
    lastUpdated: Date;
    marketShare: number;
    priceHistory: Array<{
      date: Date;
      price: number;
      change: number;
    }>;
  }>;
  marketMetrics: {
    avgMarketPrice: number;
    minMarketPrice: number;
    maxMarketPrice: number;
    priceVariance: number;
    marketLeader: string;
  };
  recommendations: string[];
}

export interface PricingExperiment {
  id: string;
  name: string;
  description: string;
  productId: string;
  hypothesis: string;
  variants: Array<{
    variantId: string;
    price: number;
    discount?: number;
    conditions: Record<string, any>;
  }>;
  metrics: {
    conversionRate: number;
    revenuePerVisitor: number;
    profitMargin: number;
    customerSatisfaction: number;
  };
  status: 'draft' | 'running' | 'completed' | 'paused';
  startDate: Date;
  endDate?: Date;
  results: Record<string, any>;
  tenantId: string;
  createdBy: string;
}

@Injectable()
export class AIPriceOptimizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async optimizePrice(
    productId: string,
    strategy: string = 'dynamic',
    tenantId: string = 'default'
  ): Promise<PriceOptimization> {
    const cacheKey = `price_optimization:${tenantId}:${productId}:${strategy}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Optimizing price for product ${productId} using ${strategy} strategy`, 'AIPriceOptimizationService');

      // Get product current data
      const product = await this.getProductDetails(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate cost-based price
      const costBasedPrice = await this.calculateCostBasedPrice(productId, tenantId);

      // Calculate market-based price
      const marketBasedPrice = await this.calculateMarketBasedPrice(productId, tenantId);

      // Calculate competition-based price
      const competitionBasedPrice = await this.calculateCompetitionBasedPrice(productId, tenantId);

      // Calculate demand-based price
      const demandBasedPrice = await this.calculateDemandBasedPrice(productId, tenantId);

      // Calculate seasonality-based price
      const seasonalityBasedPrice = await this.calculateSeasonalityBasedPrice(productId, tenantId);

      // Get price sensitivity
      const sensitivity = await this.calculatePriceSensitivity(productId, tenantId);

      // Get competitor analysis
      const competitorAnalysis = await this.getCompetitorAnalysis(productId, tenantId);

      // Calculate recommended price based on strategy
      let recommendedPrice = product.price;
      let strategyUsed = 'current';

      switch (strategy) {
        case 'cost_plus':
          recommendedPrice = costBasedPrice;
          strategyUsed = 'cost_plus';
          break;
        case 'market_based':
          recommendedPrice = marketBasedPrice;
          strategyUsed = 'market_based';
          break;
        case 'competition_based':
          recommendedPrice = competitionBasedPrice;
          strategyUsed = 'competition_based';
          break;
        case 'dynamic':
          // Weighted average based on various factors
          recommendedPrice = this.calculateDynamicPrice({
            costBased: costBasedPrice,
            marketBased: marketBasedPrice,
            competitionBased: competitionBasedPrice,
            demandBased: demandBasedPrice,
            seasonalityBased: seasonalityBasedPrice
          }, sensitivity);
          strategyUsed = 'dynamic';
          break;
      }

      // Ensure price is within acceptable bounds
      const priceRange = await this.calculatePriceRange(productId, tenantId);
      recommendedPrice = Math.max(priceRange.min, Math.min(priceRange.max, recommendedPrice));

      // Calculate confidence based on data quality and consistency
      const confidence = await this.calculateOptimizationConfidence(productId, tenantId);

      // Generate recommendations
      const recommendations = await this.generatePriceRecommendations(
        product,
        recommendedPrice,
        competitorAnalysis,
        sensitivity
      );

      const optimization: PriceOptimization = {
        productId,
        productName: product.name,
        sku: product.sku,
        currentPrice: product.price,
        recommendedPrice: Math.round(recommendedPrice * 100) / 100,
        priceRange,
        confidence,
        strategy: strategyUsed as any,
        factors: {
          costBased: costBasedPrice,
          marketBased: marketBasedPrice,
          competitionBased: competitionBasedPrice,
          demandBased: demandBasedPrice,
          seasonalityBased: seasonalityBasedPrice
        },
        sensitivity,
        competitorAnalysis,
        profitability: await this.calculateProfitability(productId, recommendedPrice, tenantId),
        recommendations,
        nextReviewDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // Review in 7 days
      };

      await this.cacheService.set(cacheKey, optimization, 3600); // Cache for 1 hour
      return optimization;

    } catch (error) {
      this.loggerService.error(`Error optimizing price for ${productId}`, error, 'AIPriceOptimizationService');
      return {
        productId,
        productName: 'Unknown',
        sku: '',
        currentPrice: 0,
        recommendedPrice: 0,
        priceRange: { min: 0, max: 0, optimal: 0 },
        confidence: 0,
        strategy: 'dynamic',
        factors: { costBased: 0, marketBased: 0, competitionBased: 0, demandBased: 0, seasonalityBased: 0 },
        sensitivity: { priceElasticity: 0, crossElasticity: 0, incomeElasticity: 0 },
        competitorAnalysis: {
          avgCompetitorPrice: 0,
          pricePosition: 'competitive',
          marketShare: 0,
          priceGap: 0
        },
        profitability: { margin: 0, profitPerUnit: 0, breakEvenPrice: 0, targetMargin: 0 },
        recommendations: ['Error calculating price optimization'],
        nextReviewDate: new Date()
      };
    }
  }

  async createDynamicPricingRule(ruleData: {
    name: string;
    description: string;
    productId?: string;
    categoryId?: string;
    conditions: any;
    pricingAction: any;
    priority: number;
  }, tenantId: string, userId: string): Promise<DynamicPricingRule> {

    const ruleId = `dpr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [rule] = await this.databaseService.drizzleClient
      .insert(this.getDynamicPricingRulesTable())
      .values({
        id: ruleId,
        ...ruleData,
        isActive: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear pricing cache
    await this.cacheService.del(`dynamic_pricing_rules:${tenantId}`);
    await this.cacheService.del(`product_pricing:${tenantId}:${ruleData.productId || 'all'}`);

    this.loggerService.log(`Dynamic pricing rule created: ${rule.name}`, 'AIPriceOptimizationService');
    return rule;
  }

  async applyDynamicPricingRules(productId: string, tenantId: string): Promise<{
    originalPrice: number;
    adjustedPrice: number;
    appliedRules: DynamicPricingRule[];
    adjustments: Array<{
      ruleId: string;
      ruleName: string;
      adjustment: number;
      reason: string;
    }>;
  }> {
    const cacheKey = `applied_dynamic_pricing:${tenantId}:${productId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get product current price
      const product = await this.getProductDetails(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get applicable rules
      const applicableRules = await this.getApplicablePricingRules(productId, product.categoryId, tenantId);

      let adjustedPrice = product.price;
      const adjustments = [];

      // Apply rules in priority order
      for (const rule of applicableRules.sort((a, b) => b.priority - a.priority)) {
        const adjustment = this.calculateRuleAdjustment(rule, adjustedPrice);

        if (adjustment !== 0) {
          adjustedPrice += adjustment;
          adjustments.push({
            ruleId: rule.id,
            ruleName: rule.name,
            adjustment,
            reason: `Applied ${rule.pricingAction.type} ${rule.pricingAction.operation}`
          });
        }
      }

      const result = {
        originalPrice: product.price,
        adjustedPrice: Math.max(0, adjustedPrice), // Ensure non-negative price
        appliedRules: applicableRules,
        adjustments
      };

      await this.cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
      return result;

    } catch (error) {
      this.loggerService.error(`Error applying dynamic pricing rules for ${productId}`, error, 'AIPriceOptimizationService');
      return {
        originalPrice: 0,
        adjustedPrice: 0,
        appliedRules: [],
        adjustments: []
      };
    }
  }

  async getCompetitorAnalysis(productId: string, tenantId: string): Promise<CompetitorAnalysis> {
    const cacheKey = `competitor_analysis:${tenantId}:${productId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get competitor pricing data
      const competitors = await this.getCompetitorPrices(productId, tenantId);

      if (competitors.length === 0) {
        return {
          productId,
          competitors: [],
          marketMetrics: {
            avgMarketPrice: 0,
            minMarketPrice: 0,
            maxMarketPrice: 0,
            priceVariance: 0,
            marketLeader: ''
          },
          recommendations: ['No competitor data available']
        };
      }

      // Calculate market metrics
      const prices = competitors.map(c => c.price);
      const avgMarketPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minMarketPrice = Math.min(...prices);
      const maxMarketPrice = Math.max(...prices);
      const priceVariance = this.calculateVariance(prices);

      // Determine price position
      const product = await this.getProductDetails(productId);
      let pricePosition: 'premium' | 'competitive' | 'discount';
      if (product.price > avgMarketPrice * 1.1) {
        pricePosition = 'premium';
      } else if (product.price < avgMarketPrice * 0.9) {
        pricePosition = 'discount';
      } else {
        pricePosition = 'competitive';
      }

      // Calculate market share (simplified)
      const marketShare = this.calculateMarketShare(productId, competitors, tenantId);

      // Generate recommendations
      const recommendations = this.generateCompetitorRecommendations(
        product.price,
        avgMarketPrice,
        pricePosition,
        competitors
      );

      const result: CompetitorAnalysis = {
        productId,
        competitors,
        marketMetrics: {
          avgMarketPrice,
          minMarketPrice,
          maxMarketPrice,
          priceVariance,
          marketLeader: competitors.find(c => c.price === minMarketPrice)?.competitorName || ''
        },
        recommendations
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error(`Error getting competitor analysis for ${productId}`, error, 'AIPriceOptimizationService');
      return {
        productId,
        competitors: [],
        marketMetrics: {
          avgMarketPrice: 0,
          minMarketPrice: 0,
          maxMarketPrice: 0,
          priceVariance: 0,
          marketLeader: ''
        },
        recommendations: ['Error retrieving competitor data']
      };
    }
  }

  async createPricingExperiment(experimentData: {
    name: string;
    description: string;
    productId: string;
    hypothesis: string;
    variants: any[];
    startDate: Date;
    endDate?: Date;
  }, tenantId: string, userId: string): Promise<PricingExperiment> {

    const experimentId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const [experiment] = await this.databaseService.drizzleClient
      .insert(this.getPricingExperimentsTable())
      .values({
        id: experimentId,
        ...experimentData,
        status: 'draft',
        metrics: {
          conversionRate: 0,
          revenuePerVisitor: 0,
          profitMargin: 0,
          customerSatisfaction: 0
        },
        results: {},
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    this.loggerService.log(`Pricing experiment created: ${experiment.name}`, 'AIPriceOptimizationService');
    return experiment;
  }

  async getPricingAnalytics(tenantId: string, days: number = 30): Promise<{
    totalProducts: number;
    optimizedProducts: number;
    averageMargin: number;
    priceElasticity: number;
    competitorTracking: {
      productsTracked: number;
      avgPriceDifference: number;
      marketPosition: Record<string, number>;
    };
    dynamicPricing: {
      rulesActive: number;
      avgAdjustment: number;
      revenueImpact: number;
    };
    experiments: {
      total: number;
      running: number;
      completed: number;
      successRate: number;
    };
  }> {
    const cacheKey = `pricing_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get pricing metrics
      const pricingData = await this.databaseService.drizzleClient
        .select({
          totalProducts: sql<number>`count(DISTINCT product_id)`,
          optimizedProducts: sql<number>`count(DISTINCT product_id) FILTER (WHERE optimized_at >= ${startDate})`,
          averageMargin: sql<number>`AVG((price - cost_price) / price * 100)`,
          totalRevenue: sql<number>`SUM(price * quantity_sold)`
        })
        .from(sql`products`)
        .where(and(
          sql`tenant_id = ${tenantId}`,
          sql`status = 'active'`
        ));

      // Get competitor tracking data
      const competitorData = await this.getCompetitorTrackingMetrics(tenantId);

      // Get dynamic pricing data
      const dynamicPricingData = await this.getDynamicPricingMetrics(tenantId, startDate);

      // Get experiment data
      const experimentData = await this.getExperimentMetrics(tenantId, startDate);

      const result = {
        totalProducts: Number(pricingData[0].totalProducts) || 0,
        optimizedProducts: Number(pricingData[0].optimizedProducts) || 0,
        averageMargin: Number(pricingData[0].averageMargin) || 0,
        priceElasticity: 0, // Would calculate from historical price changes
        competitorTracking: competitorData,
        dynamicPricing: dynamicPricingData,
        experiments: experimentData
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error('Error getting pricing analytics', error, 'AIPriceOptimizationService');
      return {
        totalProducts: 0,
        optimizedProducts: 0,
        averageMargin: 0,
        priceElasticity: 0,
        competitorTracking: {
          productsTracked: 0,
          avgPriceDifference: 0,
          marketPosition: {}
        },
        dynamicPricing: {
          rulesActive: 0,
          avgAdjustment: 0,
          revenueImpact: 0
        },
        experiments: {
          total: 0,
          running: 0,
          completed: 0,
          successRate: 0
        }
      };
    }
  }

  // Private helper methods
  private async calculateCostBasedPrice(productId: string, tenantId: string): Promise<number> {
    const product = await this.getProductDetails(productId);
    if (!product) return 0;

    // Cost-plus pricing: Cost + markup
    const markup = 0.3; // 30% markup
    return product.costPrice * (1 + markup);
  }

  private async calculateMarketBasedPrice(productId: string, tenantId: string): Promise<number> {
    // Market-based pricing using competitor analysis
    const competitorAnalysis = await this.getCompetitorAnalysis(productId, tenantId);
    return competitorAnalysis.marketMetrics.avgMarketPrice;
  }

  private async calculateCompetitionBasedPrice(productId: string, tenantId: string): Promise<number> {
    // Competition-based pricing: Match or undercut competitors
    const competitorAnalysis = await this.getCompetitorAnalysis(productId, tenantId);
    const product = await this.getProductDetails(productId);

    // 5% below average competitor price
    return competitorAnalysis.marketMetrics.avgMarketPrice * 0.95;
  }

  private async calculateDemandBasedPrice(productId: string, tenantId: string): Promise<number> {
    // Demand-based pricing using elasticity and demand forecasting
    const elasticity = await this.calculatePriceSensitivity(productId, tenantId);
    const forecast = await this.getDemandForecast(productId, tenantId);

    // Adjust price based on demand elasticity
    const product = await this.getProductDetails(productId);
    const demandAdjustment = elasticity.priceElasticity < -1 ? 1.1 : 0.95; // Increase if inelastic

    return product.price * demandAdjustment;
  }

  private async calculateSeasonalityBasedPrice(productId: string, tenantId: string): Promise<number> {
    // Seasonality-based pricing adjustments
    const seasonalTrends = await this.getSeasonalTrends(productId, tenantId);
    const currentMonth = new Date().getMonth();

    // Adjust price based on seasonal demand
    const seasonalMultiplier = seasonalTrends.seasonalPatterns.monthly[currentMonth] || 1;

    const product = await this.getProductDetails(productId);
    return product.price * seasonalMultiplier;
  }

  private calculateDynamicPrice(factors: any, sensitivity: any): number {
    // Weighted calculation of different pricing factors
    const weights = {
      costBased: 0.3,
      marketBased: 0.25,
      competitionBased: 0.2,
      demandBased: 0.15,
      seasonalityBased: 0.1
    };

    const weightedPrice =
      factors.costBased * weights.costBased +
      factors.marketBased * weights.marketBased +
      factors.competitionBased * weights.competitionBased +
      factors.demandBased * weights.demandBased +
      factors.seasonalityBased * weights.seasonalityBased;

    return weightedPrice;
  }

  private async calculatePriceSensitivity(productId: string, tenantId: string): Promise<any> {
    // Calculate price elasticity based on historical price and demand changes
    const priceHistory = await this.getPriceHistory(productId, tenantId, 90);

    if (priceHistory.length < 5) {
      return {
        priceElasticity: -1.2, // Default moderate elasticity
        crossElasticity: 0.3,
        incomeElasticity: 1.1
      };
    }

    // Simplified elasticity calculation
    const priceChanges = [];
    const demandChanges = [];

    for (let i = 1; i < priceHistory.length; i++) {
      const priceChange = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
      const demandChange = (priceHistory[i].demand - priceHistory[i-1].demand) / priceHistory[i-1].demand;

      if (priceChange !== 0) {
        priceChanges.push(priceChange);
        demandChanges.push(demandChange);
      }
    }

    const priceElasticity = priceChanges.length > 0
      ? demandChanges.reduce((sum, change, i) => sum + (change / priceChanges[i]), 0) / priceChanges.length
      : -1.2;

    return {
      priceElasticity,
      crossElasticity: 0.3, // Would calculate from related products
      incomeElasticity: 1.1 // Would calculate from customer data
    };
  }

  private async calculateOptimizationConfidence(productId: string, tenantId: string): Promise<number> {
    // Calculate confidence based on data quality and consistency
    const factors = [];

    // Historical data availability
    const dataAvailability = await this.getDataAvailability(productId, tenantId);
    factors.push(dataAvailability.score);

    // Competitor data availability
    const competitorData = await this.getCompetitorAnalysis(productId, tenantId);
    factors.push(competitorData.competitors.length > 0 ? 0.9 : 0.5);

    // Price stability
    const priceStability = await this.getPriceStability(productId, tenantId);
    factors.push(priceStability);

    // Demand predictability
    const demandPredictability = await this.getDemandPredictability(productId, tenantId);
    factors.push(demandPredictability);

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private async calculateProfitability(productId: string, price: number, tenantId: string): Promise<any> {
    const product = await this.getProductDetails(productId);
    if (!product) return { margin: 0, profitPerUnit: 0, breakEvenPrice: 0, targetMargin: 0 };

    const costPrice = product.costPrice;
    const margin = ((price - costPrice) / price) * 100;
    const profitPerUnit = price - costPrice;
    const breakEvenPrice = costPrice * 1.1; // 10% margin break-even
    const targetMargin = 25; // Target 25% margin

    return {
      margin,
      profitPerUnit,
      breakEvenPrice,
      targetMargin
    };
  }

  private async generatePriceRecommendations(
    product: any,
    recommendedPrice: number,
    competitorAnalysis: any,
    sensitivity: any
  ): Promise<string[]> {
    const recommendations = [];

    if (recommendedPrice > product.price * 1.1) {
      recommendations.push('Consider price increase - market conditions support higher pricing');
    } else if (recommendedPrice < product.price * 0.9) {
      recommendations.push('Consider price reduction - competitive pressure detected');
    }

    if (competitorAnalysis.pricePosition === 'premium') {
      recommendations.push('Maintain premium positioning with value-added services');
    } else if (competitorAnalysis.pricePosition === 'discount') {
      recommendations.push('Consider competitive pricing strategy');
    }

    if (Math.abs(sensitivity.priceElasticity) < 1) {
      recommendations.push('Price inelastic product - can support price increases');
    } else {
      recommendations.push('Price elastic product - monitor competitor actions closely');
    }

    return recommendations.length > 0 ? recommendations : ['Current pricing strategy is optimal'];
  }

  private async getCompetitorPrices(productId: string, tenantId: string): Promise<any[]> {
    // Get competitor pricing data
    // In real implementation, this would integrate with competitor monitoring systems
    return [
      {
        competitorId: 'comp-1',
        competitorName: 'Competitor A',
        price: 95.00,
        lastUpdated: new Date(),
        marketShare: 0.3,
        priceHistory: []
      },
      {
        competitorId: 'comp-2',
        competitorName: 'Competitor B',
        price: 105.00,
        lastUpdated: new Date(),
        marketShare: 0.25,
        priceHistory: []
      }
    ];
  }

  private async getApplicablePricingRules(productId: string, categoryId: string, tenantId: string): Promise<DynamicPricingRule[]> {
    const rules = await this.databaseService.drizzleClient
      .select()
      .from(this.getDynamicPricingRulesTable())
      .where(and(
        this.getDynamicPricingRulesTable().tenantId.eq(tenantId),
        this.getDynamicPricingRulesTable().isActive.eq(true),
        or(
          this.getDynamicPricingRulesTable().productId.eq(productId),
          this.getDynamicPricingRulesTable().categoryId.eq(categoryId),
          and(
            this.getDynamicPricingRulesTable().productId.isNull(),
            this.getDynamicPricingRulesTable().categoryId.isNull()
          )
        )
      ));

    // Filter rules based on conditions
    return rules.filter(rule => this.evaluateRuleConditions(rule));
  }

  private calculateRuleAdjustment(rule: DynamicPricingRule, currentPrice: number): number {
    switch (rule.pricingAction.type) {
      case 'fixed':
        return rule.pricingAction.operation === 'increase'
          ? rule.pricingAction.value
          : -rule.pricingAction.value;

      case 'percentage':
        const percentageAmount = (currentPrice * rule.pricingAction.value) / 100;
        return rule.pricingAction.operation === 'increase'
          ? percentageAmount
          : -percentageAmount;

      case 'formula':
        // Would evaluate custom formula
        return 0;

      default:
        return 0;
    }
  }

  private evaluateRuleConditions(rule: DynamicPricingRule): boolean {
    // Evaluate if rule conditions are met
    // Simplified implementation
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    if (rule.conditions.timeRange) {
      const hour = currentHour;
      if (hour < parseInt(rule.conditions.timeRange.start) || hour > parseInt(rule.conditions.timeRange.end)) {
        return false;
      }
    }

    if (rule.conditions.dayOfWeek && !rule.conditions.dayOfWeek.includes(currentDay)) {
      return false;
    }

    return true;
  }

  private async calculatePriceRange(productId: string, tenantId: string): Promise<{
    min: number;
    max: number;
    optimal: number;
  }> {
    const product = await this.getProductDetails(productId);
    const costPrice = product.costPrice;

    // Calculate price bounds based on cost and market
    const minPrice = costPrice * 1.05; // 5% above cost
    const maxPrice = costPrice * 3; // 200% above cost

    // Optimal price between min and current market price
    const competitorAnalysis = await this.getCompetitorAnalysis(productId, tenantId);
    const optimalPrice = (minPrice + competitorAnalysis.marketMetrics.avgMarketPrice) / 2;

    return {
      min: minPrice,
      max: maxPrice,
      optimal: optimalPrice
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateMarketShare(productId: string, competitors: any[], tenantId: string): number {
    // Simplified market share calculation
    // In real implementation, would use actual market data
    return 0.2; // 20% market share
  }

  private generateCompetitorRecommendations(
    currentPrice: number,
    avgMarketPrice: number,
    pricePosition: string,
    competitors: any[]
  ): string[] {
    const recommendations = [];

    if (pricePosition === 'premium') {
      recommendations.push('Consider value-based pricing strategy');
    } else if (pricePosition === 'discount') {
      recommendations.push('Monitor for price wars and consider differentiation');
    }

    if (currentPrice > avgMarketPrice * 1.2) {
      recommendations.push('Price significantly above market - consider competitive adjustments');
    }

    return recommendations.length > 0 ? recommendations : ['Competitive positioning is optimal'];
  }

  private async getCompetitorTrackingMetrics(tenantId: string): Promise<any> {
    // Get competitor tracking metrics
    return {
      productsTracked: 50,
      avgPriceDifference: -2.5, // -2.5% below competitors
      marketPosition: {
        premium: 10,
        competitive: 25,
        discount: 15
      }
    };
  }

  private async getDynamicPricingMetrics(tenantId: string, startDate: Date): Promise<any> {
    // Get dynamic pricing performance metrics
    return {
      rulesActive: 15,
      avgAdjustment: -1.2,
      revenueImpact: 12500
    };
  }

  private async getExperimentMetrics(tenantId: string, startDate: Date): Promise<any> {
    // Get pricing experiment metrics
    return {
      total: 8,
      running: 3,
      completed: 5,
      successRate: 0.75
    };
  }

  private async getProductDetails(productId: string): Promise<any> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(sql`products`)
      .where(sql`id = ${productId}`)
      .limit(1);

    return products[0] || null;
  }

  private async getDemandForecast(productId: string, tenantId: string): Promise<any> {
    // Get demand forecast for price optimization
    // This would integrate with demand forecasting service
    return {
      currentDemand: 100,
      priceElasticity: -1.2,
      optimalPrice: 95
    };
  }

  private async getSeasonalTrends(productId: string, tenantId: string): Promise<any> {
    // Get seasonal trends for price adjustment
    // This would integrate with demand forecasting service
    return {
      seasonalPatterns: {
        monthly: Array.from({ length: 12 }, (_, i) => 0.9 + (i * 0.02))
      }
    };
  }

  private async getDataAvailability(productId: string, tenantId: string): Promise<{ score: number }> {
    // Check data availability for confidence calculation
    const dataPoints = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(sql`order_items`)
      .where(and(
        sql`product_id = ${productId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '90 days'`
      ));

    const count = Number(dataPoints[0].count) || 0;
    const score = Math.min(1, count / 100); // Score based on data volume

    return { score };
  }

  private async getPriceStability(productId: string, tenantId: string): Promise<number> {
    // Calculate price stability over time
    const priceHistory = await this.getPriceHistory(productId, tenantId, 30);
    if (priceHistory.length < 2) return 1;

    const priceChanges = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const change = Math.abs(priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
      priceChanges.push(change);
    }

    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    return Math.max(0, 1 - avgChange); // Higher stability = higher score
  }

  private async getDemandPredictability(productId: string, tenantId: string): Promise<number> {
    // Calculate demand predictability
    const salesData = await this.getHistoricalSalesData(productId, tenantId, 90);
    if (salesData.length < 10) return 0.5;

    const demands = salesData.map(d => d.demand);
    const volatility = this.calculateVolatility(demands);
    return Math.max(0, 1 - volatility);
  }

  private calculateVolatility(demands: number[]): number {
    const mean = demands.reduce((sum, val) => sum + val, 0) / demands.length;
    const variance = demands.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / demands.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  private async getHistoricalSalesData(productId: string, tenantId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.databaseService.drizzleClient
      .select({
        date: sql`DATE(created_at)`,
        demand: sql<number>`SUM(quantity)`,
        price: sql<number>`AVG(price)`
      })
      .from(sql`order_items`)
      .where(and(
        sql`product_id = ${productId}`,
        sql`created_at >= ${startDate}`
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);
  }

  private async getPriceHistory(productId: string, tenantId: string, days: number): Promise<any[]> {
    // Get price history for elasticity calculation
    // In real implementation, would track price changes over time
    return [
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), price: 90, demand: 120 },
      { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), price: 100, demand: 100 },
      { date: new Date(), price: 95, demand: 110 }
    ];
  }

  private getDynamicPricingRulesTable() {
    return sql`dynamic_pricing_rules`;
  }

  private getPricingExperimentsTable() {
    return sql`pricing_experiments`;
  }
}
