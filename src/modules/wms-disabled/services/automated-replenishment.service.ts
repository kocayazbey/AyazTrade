import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface ReplenishmentRule {
  id: string;
  productId: string;
  warehouseId: string;
  trigger: {
    type: 'stock_level' | 'demand_forecast' | 'seasonal' | 'manual';
    threshold: number;
    conditions: Record<string, any>;
  };
  action: {
    type: 'auto_order' | 'transfer' | 'alert';
    supplierId?: string;
    quantity: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReplenishmentOrder {
  id: string;
  productId: string;
  warehouseId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: 'pending' | 'ordered' | 'shipped' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAt: Date;
  orderedAt?: Date;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  metadata: Record<string, any>;
}

interface DemandForecast {
  id: string;
  productId: string;
  warehouseId: string;
  period: string;
  forecastedDemand: number;
  confidence: number;
  method: 'arima' | 'exponential_smoothing' | 'seasonal' | 'ml_model';
  generatedAt: Date;
  validUntil: Date;
}

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
  calculatedAt: Date;
}

interface ReplenishmentAnalytics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  averageLeadTime: number;
  totalCost: number;
  costSavings: number;
  stockoutPrevention: number;
  efficiency: number;
}

@Injectable()
export class AutomatedReplenishmentService {
  private readonly logger = new Logger(AutomatedReplenishmentService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createReplenishmentRule(rule: Omit<ReplenishmentRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReplenishmentRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: ReplenishmentRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveReplenishmentRule(newRule);
    
    this.logger.log(`Created replenishment rule: ${ruleId}`);
    return newRule;
  }

  async getReplenishmentRules(productId?: string, warehouseId?: string): Promise<ReplenishmentRule[]> {
    let query = 'SELECT * FROM replenishment_rules WHERE is_active = true';
    const params = [];
    
    if (productId) {
      query += ' AND product_id = $1';
      params.push(productId);
    }
    
    if (warehouseId) {
      query += productId ? ' AND warehouse_id = $2' : ' AND warehouse_id = $1';
      params.push(warehouseId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      trigger: JSON.parse(row.trigger || '{}'),
      action: JSON.parse(row.action || '{}')
    }));
  }

  async processReplenishmentChecks(): Promise<void> {
    const rules = await this.getReplenishmentRules();
    
    for (const rule of rules) {
      try {
        const shouldReplenish = await this.evaluateReplenishmentRule(rule);
        
        if (shouldReplenish) {
          await this.executeReplenishment(rule);
        }
      } catch (error) {
        this.logger.error(`Failed to process replenishment rule ${rule.id}:`, error);
      }
    }
  }

  async generateDemandForecast(productId: string, warehouseId: string, period: string = '30d'): Promise<DemandForecast> {
    const forecastId = `forecast-${Date.now()}`;
    
    // Mock demand forecasting - in real implementation, this would use ML models
    const historicalData = await this.getHistoricalDemand(productId, warehouseId, period);
    const forecastedDemand = this.calculateDemandForecast(historicalData);
    
    const forecast: DemandForecast = {
      id: forecastId,
      productId,
      warehouseId,
      period,
      forecastedDemand,
      confidence: 0.85,
      method: 'ml_model',
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    await this.saveDemandForecast(forecast);
    
    this.logger.log(`Generated demand forecast for product ${productId}: ${forecastedDemand} units`);
    return forecast;
  }

  async optimizeInventory(productId: string, warehouseId: string): Promise<InventoryOptimization> {
    const optimizationId = `optimization-${Date.now()}`;
    
    const currentStock = await this.getCurrentStock(productId, warehouseId);
    const demandForecast = await this.getLatestDemandForecast(productId, warehouseId);
    const leadTime = await this.getAverageLeadTime(productId, warehouseId);
    
    // Calculate optimal stock levels
    const optimalStock = this.calculateOptimalStock(demandForecast, leadTime);
    const reorderPoint = this.calculateReorderPoint(demandForecast, leadTime);
    const safetyStock = this.calculateSafetyStock(demandForecast, leadTime);
    
    const optimization: InventoryOptimization = {
      id: optimizationId,
      productId,
      warehouseId,
      currentStock,
      optimalStock,
      reorderPoint,
      safetyStock,
      leadTime,
      demandVariability: 0.2, // Mock variability
      serviceLevel: 0.95,
      calculatedAt: new Date()
    };
    
    await this.saveInventoryOptimization(optimization);
    
    this.logger.log(`Optimized inventory for product ${productId}: optimal=${optimalStock}, reorder=${reorderPoint}`);
    return optimization;
  }

  async createReplenishmentOrder(order: Omit<ReplenishmentOrder, 'id' | 'requestedAt'>): Promise<ReplenishmentOrder> {
    const orderId = `replenishment-${Date.now()}`;
    
    const newOrder: ReplenishmentOrder = {
      id: orderId,
      ...order,
      requestedAt: new Date()
    };

    await this.saveReplenishmentOrder(newOrder);
    
    // Auto-order if configured
    if (order.status === 'pending') {
      await this.processReplenishmentOrder(newOrder);
    }
    
    this.logger.log(`Created replenishment order: ${orderId}`);
    return newOrder;
  }

  async getReplenishmentOrders(status?: string, priority?: string): Promise<ReplenishmentOrder[]> {
    let query = 'SELECT * FROM replenishment_orders';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    if (priority) {
      query += status ? ' AND priority = $2' : ' WHERE priority = $1';
      params.push(priority);
    }
    
    query += ' ORDER BY requested_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async updateReplenishmentOrderStatus(orderId: string, status: string): Promise<void> {
    const order = await this.getReplenishmentOrder(orderId);
    
    order.status = status as any;
    
    if (status === 'ordered') {
      order.orderedAt = new Date();
    } else if (status === 'received') {
      order.actualDelivery = new Date();
    }
    
    await this.saveReplenishmentOrder(order);
    
    this.logger.log(`Updated replenishment order status: ${orderId} to ${status}`);
  }

  async getReplenishmentAnalytics(period: string = '30d'): Promise<ReplenishmentAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as completed_orders,
        AVG(EXTRACT(EPOCH FROM (actual_delivery - ordered_at))) as avg_lead_time,
        SUM(total_cost) as total_cost
      FROM replenishment_orders
      WHERE requested_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    
    return {
      totalOrders: parseInt(stats.total_orders) || 0,
      pendingOrders: parseInt(stats.pending_orders) || 0,
      completedOrders: parseInt(stats.completed_orders) || 0,
      averageLeadTime: parseFloat(stats.avg_lead_time) || 0,
      totalCost: parseFloat(stats.total_cost) || 0,
      costSavings: 0, // Mock calculation
      stockoutPrevention: 0, // Mock calculation
      efficiency: 0.85 // Mock efficiency
    };
  }

  private async evaluateReplenishmentRule(rule: ReplenishmentRule): Promise<boolean> {
    switch (rule.trigger.type) {
      case 'stock_level':
        return await this.checkStockLevelTrigger(rule);
      case 'demand_forecast':
        return await this.checkDemandForecastTrigger(rule);
      case 'seasonal':
        return await this.checkSeasonalTrigger(rule);
      case 'manual':
        return false; // Manual triggers are handled separately
      default:
        return false;
    }
  }

  private async checkStockLevelTrigger(rule: ReplenishmentRule): Promise<boolean> {
    const currentStock = await this.getCurrentStock(rule.productId, rule.warehouseId);
    return currentStock <= rule.trigger.threshold;
  }

  private async checkDemandForecastTrigger(rule: ReplenishmentRule): Promise<boolean> {
    const forecast = await this.getLatestDemandForecast(rule.productId, rule.warehouseId);
    const currentStock = await this.getCurrentStock(rule.productId, rule.warehouseId);
    
    return currentStock <= forecast.forecastedDemand * rule.trigger.threshold;
  }

  private async checkSeasonalTrigger(rule: ReplenishmentRule): Promise<boolean> {
    // Mock seasonal check - in real implementation, this would analyze seasonal patterns
    const currentMonth = new Date().getMonth();
    const seasonalMonths = rule.trigger.conditions.seasonalMonths || [];
    
    return seasonalMonths.includes(currentMonth);
  }

  private async executeReplenishment(rule: ReplenishmentRule): Promise<void> {
    switch (rule.action.type) {
      case 'auto_order':
        await this.createAutoOrder(rule);
        break;
      case 'transfer':
        await this.createTransfer(rule);
        break;
      case 'alert':
        await this.createAlert(rule);
        break;
    }
  }

  private async createAutoOrder(rule: ReplenishmentRule): Promise<void> {
    const order: Omit<ReplenishmentOrder, 'id' | 'requestedAt'> = {
      productId: rule.productId,
      warehouseId: rule.warehouseId,
      supplierId: rule.action.supplierId || 'default-supplier',
      quantity: rule.action.quantity,
      unitCost: await this.getProductCost(rule.productId),
      totalCost: 0, // Will be calculated
      status: 'pending',
      priority: rule.action.priority,
      metadata: {
        ruleId: rule.id,
        triggerType: rule.trigger.type
      }
    };
    
    order.totalCost = order.quantity * order.unitCost;
    
    await this.createReplenishmentOrder(order);
  }

  private async createTransfer(rule: ReplenishmentRule): Promise<void> {
    // Mock transfer creation - in real implementation, this would create transfer orders
    this.logger.log(`Creating transfer for product ${rule.productId} from rule ${rule.id}`);
  }

  private async createAlert(rule: ReplenishmentRule): Promise<void> {
    // Mock alert creation - in real implementation, this would send notifications
    this.logger.warn(`Replenishment alert for product ${rule.productId} from rule ${rule.id}`);
  }

  private async getHistoricalDemand(productId: string, warehouseId: string, period: string): Promise<number[]> {
    const result = await this.db.execute(`
      SELECT SUM(quantity) as daily_demand
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
        AND o.warehouse_id = $2
        AND o.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY DATE(o.created_at)
      ORDER BY DATE(o.created_at)
    `, [productId, warehouseId]);
    
    return result.rows.map(row => parseFloat(row.daily_demand) || 0);
  }

  private calculateDemandForecast(historicalData: number[]): number {
    if (historicalData.length === 0) return 0;
    
    // Simple moving average for demonstration
    const sum = historicalData.reduce((acc, val) => acc + val, 0);
    return sum / historicalData.length;
  }

  private calculateOptimalStock(demandForecast: DemandForecast, leadTime: number): number {
    return Math.ceil(demandForecast.forecastedDemand * (leadTime / 30) * 1.2); // 20% buffer
  }

  private calculateReorderPoint(demandForecast: DemandForecast, leadTime: number): number {
    return Math.ceil(demandForecast.forecastedDemand * (leadTime / 30));
  }

  private calculateSafetyStock(demandForecast: DemandForecast, leadTime: number): number {
    return Math.ceil(demandForecast.forecastedDemand * 0.2); // 20% of forecasted demand
  }

  private async getCurrentStock(productId: string, warehouseId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT SUM(quantity) as current_stock
      FROM inventory
      WHERE product_id = $1 AND warehouse_id = $2
    `, [productId, warehouseId]);
    
    return parseFloat(result.rows[0]?.current_stock) || 0;
  }

  private async getLatestDemandForecast(productId: string, warehouseId: string): Promise<DemandForecast> {
    const result = await this.db.execute(`
      SELECT * FROM demand_forecasts
      WHERE product_id = $1 AND warehouse_id = $2
      ORDER BY generated_at DESC
      LIMIT 1
    `, [productId, warehouseId]);
    
    if (result.rows.length === 0) {
      // Return default forecast if none exists
      return {
        id: 'default',
        productId,
        warehouseId,
        period: '30d',
        forecastedDemand: 100, // Default value
        confidence: 0.5,
        method: 'arima',
        generatedAt: new Date(),
        validUntil: new Date()
      };
    }
    
    return result.rows[0];
  }

  private async getAverageLeadTime(productId: string, warehouseId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT AVG(EXTRACT(EPOCH FROM (actual_delivery - ordered_at))) as avg_lead_time
      FROM replenishment_orders
      WHERE product_id = $1 AND warehouse_id = $2
        AND status = 'received'
        AND actual_delivery IS NOT NULL
    `, [productId, warehouseId]);
    
    const leadTimeSeconds = parseFloat(result.rows[0]?.avg_lead_time) || 0;
    return Math.ceil(leadTimeSeconds / (24 * 60 * 60)); // Convert to days
  }

  private async getProductCost(productId: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT cost FROM products WHERE id = $1
    `, [productId]);
    
    return parseFloat(result.rows[0]?.cost) || 0;
  }

  private async getReplenishmentOrder(orderId: string): Promise<ReplenishmentOrder> {
    const result = await this.db.execute(`
      SELECT * FROM replenishment_orders WHERE id = $1
    `, [orderId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Replenishment order not found: ${orderId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private async processReplenishmentOrder(order: ReplenishmentOrder): Promise<void> {
    // Mock order processing - in real implementation, this would integrate with suppliers
    this.logger.log(`Processing replenishment order: ${order.id}`);
    
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    order.status = 'ordered';
    order.orderedAt = new Date();
    order.expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    await this.saveReplenishmentOrder(order);
  }

  private async saveReplenishmentRule(rule: ReplenishmentRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO replenishment_rules (id, product_id, warehouse_id, trigger, action, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      rule.id,
      rule.productId,
      rule.warehouseId,
      JSON.stringify(rule.trigger),
      JSON.stringify(rule.action),
      rule.isActive,
      rule.createdAt,
      rule.updatedAt
    ]);
  }

  private async saveDemandForecast(forecast: DemandForecast): Promise<void> {
    await this.db.execute(`
      INSERT INTO demand_forecasts (id, product_id, warehouse_id, period, forecasted_demand, confidence, method, generated_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      forecast.id,
      forecast.productId,
      forecast.warehouseId,
      forecast.period,
      forecast.forecastedDemand,
      forecast.confidence,
      forecast.method,
      forecast.generatedAt,
      forecast.validUntil
    ]);
  }

  private async saveInventoryOptimization(optimization: InventoryOptimization): Promise<void> {
    await this.db.execute(`
      INSERT INTO inventory_optimizations (id, product_id, warehouse_id, current_stock, optimal_stock, reorder_point, safety_stock, lead_time, demand_variability, service_level, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      optimization.calculatedAt
    ]);
  }

  private async saveReplenishmentOrder(order: ReplenishmentOrder): Promise<void> {
    await this.db.execute(`
      INSERT INTO replenishment_orders (id, product_id, warehouse_id, supplier_id, quantity, unit_cost, total_cost, status, priority, requested_at, ordered_at, expected_delivery, actual_delivery, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        ordered_at = EXCLUDED.ordered_at,
        expected_delivery = EXCLUDED.expected_delivery,
        actual_delivery = EXCLUDED.actual_delivery
    `, [
      order.id,
      order.productId,
      order.warehouseId,
      order.supplierId,
      order.quantity,
      order.unitCost,
      order.totalCost,
      order.status,
      order.priority,
      order.requestedAt,
      order.orderedAt,
      order.expectedDelivery,
      order.actualDelivery,
      JSON.stringify(order.metadata)
    ]);
  }
}
