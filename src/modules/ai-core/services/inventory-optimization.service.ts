import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface InventoryOptimization {
  id: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTime: number;
  demandVariability: number;
  serviceLevel: number;
  abcCategory: 'A' | 'B' | 'C';
  optimizationMethod: 'abc_analysis' | 'reorder_point' | 'safety_stock' | 'ml_model';
  parameters: Record<string, any>;
  calculatedAt: Date;
  validUntil: Date;
}

interface ABCAnalysis {
  productId: string;
  category: 'A' | 'B' | 'C';
  annualValue: number;
  percentage: number;
  cumulativePercentage: number;
  recommendedStrategy: string;
  analyzedAt: Date;
}

interface ReorderPoint {
  productId: string;
  warehouseId: string;
  reorderPoint: number;
  reorderQuantity: number;
  leadTime: number;
  averageDemand: number;
  safetyStock: number;
  serviceLevel: number;
  calculatedAt: Date;
}

interface SafetyStock {
  productId: string;
  warehouseId: string;
  safetyStock: number;
  serviceLevel: number;
  leadTimeVariability: number;
  demandVariability: number;
  stockoutProbability: number;
  calculatedAt: Date;
}

interface InventoryAnalytics {
  totalProducts: number;
  totalValue: number;
  abcDistribution: Array<{
    category: string;
    count: number;
    value: number;
    percentage: number;
  }>;
  stockoutRisk: Array<{
    productId: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    daysUntilStockout: number;
  }>;
  optimizationOpportunities: Array<{
    productId: string;
    opportunity: string;
    potentialSavings: number;
  }>;
}

@Injectable()
export class InventoryOptimizationService {
  private readonly logger = new Logger(InventoryOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async optimizeInventory(productId: string, warehouseId: string): Promise<InventoryOptimization> {
    this.logger.log(`Optimizing inventory for product ${productId} in warehouse ${warehouseId}`);
    
    const currentStock = await this.getCurrentStock(productId, warehouseId);
    const demandHistory = await this.getDemandHistory(productId, warehouseId);
    const leadTime = await this.getAverageLeadTime(productId, warehouseId);
    
    const abcCategory = await this.performABCAnalysis(productId);
    const reorderPoint = this.calculateReorderPoint(demandHistory, leadTime);
    const safetyStock = this.calculateSafetyStock(demandHistory, leadTime);
    const optimalStock = this.calculateOptimalStock(reorderPoint, safetyStock);
    
    const optimization: InventoryOptimization = {
      id: `optimization-${Date.now()}`,
      productId,
      warehouseId,
      currentStock,
      optimalStock,
      reorderPoint,
      safetyStock,
      leadTime,
      demandVariability: this.calculateDemandVariability(demandHistory),
      serviceLevel: 0.95,
      abcCategory,
      optimizationMethod: 'ml_model',
      parameters: {
        demandHistory: demandHistory.length,
        leadTime,
        abcCategory
      },
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    await this.saveInventoryOptimization(optimization);
    
    this.logger.log(`Inventory optimization completed for product ${productId}`);
    return optimization;
  }

  async performABCAnalysis(productId: string): Promise<'A' | 'B' | 'C'> {
    this.logger.log(`Performing ABC analysis for product ${productId}`);
    
    const annualValue = await this.getAnnualValue(productId);
    const totalValue = await this.getTotalInventoryValue();
    const percentage = (annualValue / totalValue) * 100;
    
    let category: 'A' | 'B' | 'C';
    if (percentage >= 80) category = 'A';
    else if (percentage >= 15) category = 'B';
    else category = 'C';
    
    const abcAnalysis: ABCAnalysis = {
      productId,
      category,
      annualValue,
      percentage,
      cumulativePercentage: percentage, // Simplified
      recommendedStrategy: this.getRecommendedStrategy(category),
      analyzedAt: new Date()
    };
    
    await this.saveABCAnalysis(abcAnalysis);
    
    this.logger.log(`ABC analysis completed for product ${productId}: Category ${category}`);
    return category;
  }

  async calculateReorderPoint(productId: string, warehouseId: string): Promise<ReorderPoint> {
    this.logger.log(`Calculating reorder point for product ${productId}`);
    
    const demandHistory = await this.getDemandHistory(productId, warehouseId);
    const leadTime = await this.getAverageLeadTime(productId, warehouseId);
    
    const averageDemand = this.calculateAverageDemand(demandHistory);
    const safetyStock = this.calculateSafetyStock(demandHistory, leadTime);
    const reorderPoint = Math.ceil(averageDemand * leadTime + safetyStock);
    const reorderQuantity = this.calculateReorderQuantity(demandHistory, leadTime);
    
    const reorderPointData: ReorderPoint = {
      productId,
      warehouseId,
      reorderPoint,
      reorderQuantity,
      leadTime,
      averageDemand,
      safetyStock,
      serviceLevel: 0.95,
      calculatedAt: new Date()
    };
    
    await this.saveReorderPoint(reorderPointData);
    
    this.logger.log(`Reorder point calculated for product ${productId}: ${reorderPoint}`);
    return reorderPointData;
  }

  async calculateSafetyStock(productId: string, warehouseId: string): Promise<SafetyStock> {
    this.logger.log(`Calculating safety stock for product ${productId}`);
    
    const demandHistory = await this.getDemandHistory(productId, warehouseId);
    const leadTime = await this.getAverageLeadTime(productId, warehouseId);
    
    const demandVariability = this.calculateDemandVariability(demandHistory);
    const leadTimeVariability = this.calculateLeadTimeVariability(productId, warehouseId);
    const serviceLevel = 0.95;
    const zScore = this.getZScore(serviceLevel);
    
    const safetyStock = Math.ceil(
      zScore * Math.sqrt(leadTime * demandVariability * demandVariability + 
                        leadTimeVariability * leadTimeVariability * demandVariability * demandVariability)
    );
    
    const stockoutProbability = 1 - serviceLevel;
    
    const safetyStockData: SafetyStock = {
      productId,
      warehouseId,
      safetyStock,
      serviceLevel,
      leadTimeVariability,
      demandVariability,
      stockoutProbability,
      calculatedAt: new Date()
    };
    
    await this.saveSafetyStock(safetyStockData);
    
    this.logger.log(`Safety stock calculated for product ${productId}: ${safetyStock}`);
    return safetyStockData;
  }

  async getInventoryAnalytics(warehouseId?: string): Promise<InventoryAnalytics> {
    const products = await this.getAllProducts(warehouseId);
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + product.value, 0);
    
    const abcDistribution = await this.getABCDistribution(warehouseId);
    const stockoutRisk = await this.analyzeStockoutRisk(warehouseId);
    const optimizationOpportunities = await this.identifyOptimizationOpportunities(warehouseId);
    
    return {
      totalProducts,
      totalValue,
      abcDistribution,
      stockoutRisk,
      optimizationOpportunities
    };
  }

  async optimizeInventoryLevels(warehouseId: string): Promise<{
    optimizedProducts: number;
    totalSavings: number;
    recommendations: Array<{
      productId: string;
      action: string;
      currentLevel: number;
      recommendedLevel: number;
      savings: number;
    }>;
  }> {
    this.logger.log(`Optimizing inventory levels for warehouse ${warehouseId}`);
    
    const products = await this.getAllProducts(warehouseId);
    const recommendations = [];
    let totalSavings = 0;
    
    for (const product of products) {
      const optimization = await this.optimizeInventory(product.id, warehouseId);
      const savings = this.calculateOptimizationSavings(product, optimization);
      
      if (savings > 0) {
        recommendations.push({
          productId: product.id,
          action: optimization.optimalStock > product.currentStock ? 'Increase' : 'Decrease',
          currentLevel: product.currentStock,
          recommendedLevel: optimization.optimalStock,
          savings
        });
        
        totalSavings += savings;
      }
    }
    
    this.logger.log(`Inventory optimization completed: ${recommendations.length} products optimized`);
    
    return {
      optimizedProducts: recommendations.length,
      totalSavings,
      recommendations
    };
  }

  private calculateAverageDemand(demandHistory: any[]): number {
    if (demandHistory.length === 0) return 0;
    
    const totalDemand = demandHistory.reduce((sum, d) => sum + d.quantity, 0);
    return totalDemand / demandHistory.length;
  }

  private calculateDemandVariability(demandHistory: any[]): number {
    if (demandHistory.length < 2) return 0;
    
    const demands = demandHistory.map(d => d.quantity);
    const mean = demands.reduce((sum, d) => sum + d, 0) / demands.length;
    const variance = demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length;
    
    return Math.sqrt(variance);
  }

  private calculateLeadTimeVariability(productId: string, warehouseId: string): number {
    // Mock lead time variability calculation
    return Math.random() * 2 + 1; // 1-3 days
  }

  private getZScore(serviceLevel: number): number {
    const zScores = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33
    };
    
    return zScores[serviceLevel] || 1.65;
  }

  private getRecommendedStrategy(category: 'A' | 'B' | 'C'): string {
    const strategies = {
      'A': 'High priority - frequent monitoring, low safety stock',
      'B': 'Medium priority - regular monitoring, moderate safety stock',
      'C': 'Low priority - periodic monitoring, higher safety stock'
    };
    
    return strategies[category];
  }

  private calculateOptimizationSavings(product: any, optimization: InventoryOptimization): number {
    const currentValue = product.currentStock * product.cost;
    const optimalValue = optimization.optimalStock * product.cost;
    const holdingCostRate = 0.2; // 20% annual holding cost
    
    return Math.abs(currentValue - optimalValue) * holdingCostRate / 365; // Daily savings
  }

  private async getCurrentStock(productId: string, warehouseId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT SUM(quantity) as current_stock
      FROM inventory
      WHERE product_id = $1 AND warehouse_id = $2
    `, [productId, warehouseId]);
    
    return parseFloat(result.rows[0]?.current_stock) || 0;
  }

  private async getDemandHistory(productId: string, warehouseId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT oi.quantity, o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
        AND o.warehouse_id = $2
        AND o.created_at >= NOW() - INTERVAL '90 days'
      ORDER BY o.created_at ASC
    `, [productId, warehouseId]);
    
    return result.rows;
  }

  private async getAverageLeadTime(productId: string, warehouseId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT AVG(EXTRACT(EPOCH FROM (received_at - ordered_at))) as avg_lead_time
      FROM inventory_transactions
      WHERE product_id = $1 AND warehouse_id = $2
        AND transaction_type = 'receipt'
        AND received_at IS NOT NULL
    `, [productId, warehouseId]);
    
    const leadTimeSeconds = parseFloat(result.rows[0]?.avg_lead_time) || 0;
    return Math.ceil(leadTimeSeconds / (24 * 60 * 60)); // Convert to days
  }

  private async getAnnualValue(productId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT SUM(oi.quantity * oi.price) as annual_value
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
        AND o.created_at >= NOW() - INTERVAL '1 year'
    `, [productId]);
    
    return parseFloat(result.rows[0]?.annual_value) || 0;
  }

  private async getTotalInventoryValue(): Promise<number> {
    const result = await this.db.execute(`
      SELECT SUM(quantity * cost) as total_value
      FROM inventory
    `);
    
    return parseFloat(result.rows[0]?.total_value) || 0;
  }

  private async getAllProducts(warehouseId?: string): Promise<any[]> {
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (warehouseId) {
      query += ' WHERE id IN (SELECT DISTINCT product_id FROM inventory WHERE warehouse_id = $1)';
      params.push(warehouseId);
    }
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  private async getABCDistribution(warehouseId?: string): Promise<Array<{
    category: string;
    count: number;
    value: number;
    percentage: number;
  }>> {
    const result = await this.db.execute(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(annual_value) as value
      FROM abc_analysis
      ${warehouseId ? 'WHERE warehouse_id = $1' : ''}
      GROUP BY category
    `, warehouseId ? [warehouseId] : []);
    
    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.value), 0);
    
    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count) || 0,
      value: parseFloat(row.value) || 0,
      percentage: totalValue > 0 ? (parseFloat(row.value) / totalValue) * 100 : 0
    }));
  }

  private async analyzeStockoutRisk(warehouseId?: string): Promise<Array<{
    productId: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    daysUntilStockout: number;
  }>> {
    // Mock stockout risk analysis
    const products = await this.getAllProducts(warehouseId);
    const risks = [];
    
    for (const product of products) {
      const daysUntilStockout = Math.floor(Math.random() * 30) + 1;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      
      if (daysUntilStockout > 14) riskLevel = 'low';
      else if (daysUntilStockout > 7) riskLevel = 'medium';
      else if (daysUntilStockout > 3) riskLevel = 'high';
      else riskLevel = 'critical';
      
      risks.push({
        productId: product.id,
        riskLevel,
        daysUntilStockout
      });
    }
    
    return risks;
  }

  private async identifyOptimizationOpportunities(warehouseId?: string): Promise<Array<{
    productId: string;
    opportunity: string;
    potentialSavings: number;
  }>> {
    // Mock optimization opportunities
    const products = await this.getAllProducts(warehouseId);
    const opportunities = [];
    
    for (const product of products) {
      const savings = Math.random() * 1000 + 100;
      opportunities.push({
        productId: product.id,
        opportunity: 'Reduce safety stock',
        potentialSavings: savings
      });
    }
    
    return opportunities;
  }

  private calculateReorderQuantity(demandHistory: any[], leadTime: number): number {
    const averageDemand = this.calculateAverageDemand(demandHistory);
    return Math.ceil(averageDemand * leadTime * 2); // 2x lead time demand
  }

  private async saveInventoryOptimization(optimization: InventoryOptimization): Promise<void> {
    await this.db.execute(`
      INSERT INTO inventory_optimizations (id, product_id, warehouse_id, current_stock, optimal_stock, reorder_point, safety_stock, lead_time, demand_variability, service_level, abc_category, optimization_method, parameters, calculated_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      optimization.id,
      optimization.productId,
      optimization.warehouseId,
      optimization.currentStock,
      optimization.optimalStock,
      optimization.reorderPoint,
      optimization.safetyStock,
      optimization.leadTime,
      optimization.demandVariability,
      optimization.serviceLevel,
      optimization.abcCategory,
      optimization.optimizationMethod,
      JSON.stringify(optimization.parameters),
      optimization.calculatedAt,
      optimization.validUntil
    ]);
  }

  private async saveABCAnalysis(analysis: ABCAnalysis): Promise<void> {
    await this.db.execute(`
      INSERT INTO abc_analysis (product_id, category, annual_value, percentage, cumulative_percentage, recommended_strategy, analyzed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (product_id) DO UPDATE SET
        category = EXCLUDED.category,
        annual_value = EXCLUDED.annual_value,
        percentage = EXCLUDED.percentage,
        cumulative_percentage = EXCLUDED.cumulative_percentage,
        recommended_strategy = EXCLUDED.recommended_strategy,
        analyzed_at = EXCLUDED.analyzed_at
    `, [
      analysis.productId,
      analysis.category,
      analysis.annualValue,
      analysis.percentage,
      analysis.cumulativePercentage,
      analysis.recommendedStrategy,
      analysis.analyzedAt
    ]);
  }

  private async saveReorderPoint(reorderPoint: ReorderPoint): Promise<void> {
    await this.db.execute(`
      INSERT INTO reorder_points (product_id, warehouse_id, reorder_point, reorder_quantity, lead_time, average_demand, safety_stock, service_level, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        reorder_point = EXCLUDED.reorder_point,
        reorder_quantity = EXCLUDED.reorder_quantity,
        lead_time = EXCLUDED.lead_time,
        average_demand = EXCLUDED.average_demand,
        safety_stock = EXCLUDED.safety_stock,
        service_level = EXCLUDED.service_level,
        calculated_at = EXCLUDED.calculated_at
    `, [
      reorderPoint.productId,
      reorderPoint.warehouseId,
      reorderPoint.reorderPoint,
      reorderPoint.reorderQuantity,
      reorderPoint.leadTime,
      reorderPoint.averageDemand,
      reorderPoint.safetyStock,
      reorderPoint.serviceLevel,
      reorderPoint.calculatedAt
    ]);
  }

  private async saveSafetyStock(safetyStock: SafetyStock): Promise<void> {
    await this.db.execute(`
      INSERT INTO safety_stocks (product_id, warehouse_id, safety_stock, service_level, lead_time_variability, demand_variability, stockout_probability, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        safety_stock = EXCLUDED.safety_stock,
        service_level = EXCLUDED.service_level,
        lead_time_variability = EXCLUDED.lead_time_variability,
        demand_variability = EXCLUDED.demand_variability,
        stockout_probability = EXCLUDED.stockout_probability,
        calculated_at = EXCLUDED.calculated_at
    `, [
      safetyStock.productId,
      safetyStock.warehouseId,
      safetyStock.safetyStock,
      safetyStock.serviceLevel,
      safetyStock.leadTimeVariability,
      safetyStock.demandVariability,
      safetyStock.stockoutProbability,
      safetyStock.calculatedAt
    ]);
  }
}