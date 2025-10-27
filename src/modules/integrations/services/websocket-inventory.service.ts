import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface InventoryUpdate {
  id: string;
  productId: string;
  sku: string;
  warehouseId?: string;
  location?: string;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'damaged' | 'returned';
  previousStock: number;
  newStock: number;
  changeAmount: number;
  reason?: string;
  referenceId?: string; // order_id, transfer_id, etc.
  userId?: string;
  userName?: string;
  automatic: boolean;
  metadata: Record<string, any>;
  timestamp: Date;
  tenantId?: string;
}

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_soon' | 'damaged_goods';
  severity: 'info' | 'warning' | 'critical';
  productId: string;
  sku: string;
  warehouseId?: string;
  message: string;
  data: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  tenantId?: string;
}

interface InventorySubscription {
  id: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  productIds?: string[];
  categories?: string[];
  warehouses?: string[];
  alertTypes: string[];
  stockLevels: {
    lowStockThreshold?: number;
    criticalStockThreshold?: number;
    overstockThreshold?: number;
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  movementType: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'damaged' | 'returned';
  referenceType: 'order' | 'purchase' | 'transfer' | 'adjustment' | 'return' | 'damage';
  referenceId: string;
  notes?: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  tenantId?: string;
}

@Injectable()
export class WebSocketInventoryService {
  private readonly logger = new Logger(WebSocketInventoryService.name);

  private subscriptions: Map<string, InventorySubscription> = new Map();
  private activeAlerts: Map<string, InventoryAlert> = new Map();
  private stockCache: Map<string, { stock: number; lastUpdated: Date }> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start inventory monitoring
    this.startInventoryMonitoring();

    // Start alert processing
    this.startAlertProcessing();

    // Start cache cleanup
    this.startCacheCleanup();
  }

  async updateStock(stockUpdate: {
    productId: string;
    sku: string;
    warehouseId?: string;
    location?: string;
    type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'damaged' | 'returned';
    changeAmount: number;
    reason?: string;
    referenceId?: string;
    userId?: string;
    userName?: string;
    automatic?: boolean;
    metadata?: Record<string, any>;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    updateId?: string;
    newStock?: number;
    alerts?: InventoryAlert[];
    error?: string;
  }> {
    try {
      const updateId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get current stock level
      const currentStock = await this.getCurrentStock(stockUpdate.productId, stockUpdate.sku, stockUpdate.warehouseId);
      const newStock = currentStock + stockUpdate.changeAmount;

      // Save inventory update
      await this.saveInventoryUpdate({
        id: updateId,
        productId: stockUpdate.productId,
        sku: stockUpdate.sku,
        warehouseId: stockUpdate.warehouseId,
        location: stockUpdate.location,
        type: stockUpdate.type,
        previousStock: currentStock,
        newStock,
        changeAmount: stockUpdate.changeAmount,
        reason: stockUpdate.reason,
        referenceId: stockUpdate.referenceId,
        userId: stockUpdate.userId,
        userName: stockUpdate.userName,
        automatic: stockUpdate.automatic || false,
        metadata: stockUpdate.metadata || {},
        timestamp: new Date(),
        tenantId: stockUpdate.tenantId
      });

      // Save stock movement
      await this.saveStockMovement({
        id: `mov-${updateId}`,
        productId: stockUpdate.productId,
        sku: stockUpdate.sku,
        fromWarehouseId: stockUpdate.type === 'transfer' ? stockUpdate.warehouseId : undefined,
        toWarehouseId: stockUpdate.type === 'stock_in' ? stockUpdate.warehouseId : undefined,
        quantity: Math.abs(stockUpdate.changeAmount),
        movementType: stockUpdate.type === 'stock_in' ? 'inbound' : 'outbound',
        referenceType: this.mapMovementType(stockUpdate.type),
        referenceId: stockUpdate.referenceId || updateId,
        notes: stockUpdate.reason,
        userId: stockUpdate.userId,
        userName: stockUpdate.userName,
        timestamp: new Date(),
        tenantId: stockUpdate.tenantId
      });

      // Update stock in database
      await this.updateProductStock(stockUpdate.productId, stockUpdate.sku, newStock, stockUpdate.warehouseId);

      // Update cache
      const cacheKey = this.getCacheKey(stockUpdate.productId, stockUpdate.sku, stockUpdate.warehouseId);
      this.stockCache.set(cacheKey, { stock: newStock, lastUpdated: new Date() });

      // Check for alerts
      const alerts = await this.checkInventoryAlerts(stockUpdate.productId, stockUpdate.sku, newStock, stockUpdate.warehouseId);

      // Broadcast update
      await this.broadcastInventoryUpdate({
        productId: stockUpdate.productId,
        sku: stockUpdate.sku,
        warehouseId: stockUpdate.warehouseId,
        previousStock: currentStock,
        newStock,
        changeAmount: stockUpdate.changeAmount,
        type: stockUpdate.type,
        reason: stockUpdate.reason,
        updateId,
        timestamp: new Date()
      });

      // Send alerts if any
      if (alerts.length > 0) {
        await this.broadcastAlerts(alerts);
      }

      this.logger.log(`Stock updated: ${stockUpdate.productId} - ${currentStock} → ${newStock}`);
      return {
        success: true,
        updateId,
        newStock,
        alerts
      };

    } catch (error) {
      this.logger.error('Failed to update stock', error);
      return { success: false, error: error.message };
    }
  }

  async createSubscription(subscriptionData: {
    userId?: string;
    tenantId?: string;
    role?: string;
    productIds?: string[];
    categories?: string[];
    warehouses?: string[];
    alertTypes: string[];
    stockLevels: {
      lowStockThreshold?: number;
      criticalStockThreshold?: number;
      overstockThreshold?: number;
    };
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
  }> {
    try {
      const subscriptionId = `invsub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const subscription: InventorySubscription = {
        id: subscriptionId,
        userId: subscriptionData.userId,
        tenantId: subscriptionData.tenantId,
        role: subscriptionData.role,
        productIds: subscriptionData.productIds,
        categories: subscriptionData.categories,
        warehouses: subscriptionData.warehouses,
        alertTypes: subscriptionData.alertTypes,
        stockLevels: subscriptionData.stockLevels,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveSubscriptionToDB(subscription);
      this.subscriptions.set(subscriptionId, subscription);

      this.logger.log(`Inventory subscription created: ${subscriptionId}`);
      return { success: true, subscriptionId };

    } catch (error) {
      this.logger.error('Failed to create inventory subscription', error);
      return { success: false, error: error.message };
    }
  }

  async getInventoryUpdates(filters?: {
    productId?: string;
    sku?: string;
    warehouseId?: string;
    type?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tenantId?: string;
  }): Promise<InventoryUpdate[]> {
    try {
      let query = 'SELECT * FROM inventory_updates WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.productId) {
        query += ` AND product_id = $${paramIndex}`;
        params.push(filters.productId);
        paramIndex++;
      }

      if (filters?.sku) {
        query += ` AND sku = $${paramIndex}`;
        params.push(filters.sku);
        paramIndex++;
      }

      if (filters?.warehouseId) {
        query += ` AND warehouse_id = $${paramIndex}`;
        params.push(filters.warehouseId);
        paramIndex++;
      }

      if (filters?.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters?.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      if (filters?.tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(filters.tenantId);
        paramIndex++;
      }

      query += ' ORDER BY timestamp DESC LIMIT 100';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
        timestamp: row.timestamp
      }));

    } catch (error) {
      this.logger.error('Failed to get inventory updates', error);
      return [];
    }
  }

  async getStockMovements(filters?: {
    productId?: string;
    sku?: string;
    warehouseId?: string;
    movementType?: string;
    referenceType?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tenantId?: string;
  }): Promise<StockMovement[]> {
    try {
      let query = 'SELECT * FROM stock_movements WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.productId) {
        query += ` AND product_id = $${paramIndex}`;
        params.push(filters.productId);
        paramIndex++;
      }

      if (filters?.sku) {
        query += ` AND sku = $${paramIndex}`;
        params.push(filters.sku);
        paramIndex++;
      }

      if (filters?.warehouseId) {
        query += ` AND (from_warehouse_id = $${paramIndex} OR to_warehouse_id = $${paramIndex})`;
        params.push(filters.warehouseId, filters.warehouseId);
        paramIndex++;
      }

      if (filters?.movementType) {
        query += ` AND movement_type = $${paramIndex}`;
        params.push(filters.movementType);
        paramIndex++;
      }

      if (filters?.referenceType) {
        query += ` AND reference_type = $${paramIndex}`;
        params.push(filters.referenceType);
        paramIndex++;
      }

      if (filters?.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      if (filters?.tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(filters.tenantId);
        paramIndex++;
      }

      query += ' ORDER BY timestamp DESC LIMIT 100';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        fromWarehouseId: row.from_warehouse_id,
        toWarehouseId: row.to_warehouse_id,
        referenceId: row.reference_id,
        userId: row.user_id,
        userName: row.user_name,
        timestamp: row.timestamp,
        tenantId: row.tenant_id
      }));

    } catch (error) {
      this.logger.error('Failed to get stock movements', error);
      return [];
    }
  }

  async getInventoryAlerts(filters?: {
    type?: string;
    severity?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    productId?: string;
    warehouseId?: string;
    tenantId?: string;
  }): Promise<InventoryAlert[]> {
    try {
      let query = 'SELECT * FROM inventory_alerts WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters?.severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters?.acknowledged !== undefined) {
        query += ` AND acknowledged = $${paramIndex}`;
        params.push(filters.acknowledged);
        paramIndex++;
      }

      if (filters?.resolved !== undefined) {
        query += ` AND resolved = $${paramIndex}`;
        params.push(filters.resolved);
        paramIndex++;
      }

      if (filters?.productId) {
        query += ` AND product_id = $${paramIndex}`;
        params.push(filters.productId);
        paramIndex++;
      }

      if (filters?.warehouseId) {
        query += ` AND warehouse_id = $${paramIndex}`;
        params.push(filters.warehouseId);
        paramIndex++;
      }

      if (filters?.tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(filters.tenantId);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        data: JSON.parse(row.data || '{}'),
        acknowledgedAt: row.acknowledged_at,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get inventory alerts', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE inventory_alerts SET
          acknowledged = true,
          acknowledged_by = $1,
          acknowledged_at = $2,
          updated_at = $3
        WHERE id = $4
      `, [userId, new Date(), new Date(), alertId]);

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      // Broadcast alert update
      await this.broadcastAlertUpdate(alertId, 'acknowledged', userId);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to acknowledge alert', error);
      return { success: false, error: error.message };
    }
  }

  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE inventory_alerts SET
          resolved = true,
          resolved_at = $1,
          updated_at = $2
        WHERE id = $3
      `, [new Date(), new Date(), alertId]);

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      // Broadcast alert update
      await this.broadcastAlertUpdate(alertId, 'resolved', userId, resolution);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to resolve alert', error);
      return { success: false, error: error.message };
    }
  }

  async getInventoryAnalytics(filters?: {
    productId?: string;
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tenantId?: string;
  }): Promise<{
    totalUpdates: number;
    stockIn: number;
    stockOut: number;
    adjustments: number;
    transfers: number;
    damaged: number;
    returned: number;
    topMovingProducts: Array<{
      productId: string;
      sku: string;
      totalMovement: number;
      averageStock: number;
    }>;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    averageStockLevel: number;
    turnoverRate: number;
  }> {
    try {
      const dateFrom = filters?.dateFrom || this.getPeriodStartDate('month');
      const dateTo = filters?.dateTo || new Date();

      // Get basic statistics
      const statsResult = await this.db.execute(`
        SELECT
          COUNT(*) as total_updates,
          SUM(CASE WHEN type = 'stock_in' THEN change_amount ELSE 0 END) as stock_in,
          SUM(CASE WHEN type = 'stock_out' THEN ABS(change_amount) ELSE 0 END) as stock_out,
          SUM(CASE WHEN type = 'adjustment' THEN ABS(change_amount) ELSE 0 END) as adjustments,
          SUM(CASE WHEN type = 'transfer' THEN ABS(change_amount) ELSE 0 END) as transfers,
          SUM(CASE WHEN type = 'damaged' THEN ABS(change_amount) ELSE 0 END) as damaged,
          SUM(CASE WHEN type = 'returned' THEN ABS(change_amount) ELSE 0 END) as returned,
          product_id,
          sku,
          SUM(ABS(change_amount)) as total_movement,
          AVG((previous_stock + new_stock) / 2) as average_stock
        FROM inventory_updates
        WHERE timestamp BETWEEN $1 AND $2
        ${filters?.productId ? 'AND product_id = $3' : ''}
        ${filters?.warehouseId ? 'AND warehouse_id = $4' : ''}
        ${filters?.tenantId ? 'AND tenant_id = $5' : ''}
        GROUP BY product_id, sku
        ORDER BY total_movement DESC
        LIMIT 10
      `, filters?.productId && filters?.warehouseId && filters?.tenantId
        ? [dateFrom, dateTo, filters.productId, filters.warehouseId, filters.tenantId]
        : filters?.productId && filters?.warehouseId
        ? [dateFrom, dateTo, filters.productId, filters.warehouseId]
        : filters?.productId
        ? [dateFrom, dateTo, filters.productId]
        : [dateFrom, dateTo]);

      // Get alert statistics
      const alertsResult = await this.db.execute(`
        SELECT
          type,
          severity,
          COUNT(*) as count
        FROM inventory_alerts
        WHERE created_at BETWEEN $1 AND $2
        ${filters?.productId ? 'AND product_id = $3' : ''}
        ${filters?.warehouseId ? 'AND warehouse_id = $4' : ''}
        ${filters?.tenantId ? 'AND tenant_id = $5' : ''}
        GROUP BY type, severity
      `, filters?.productId && filters?.warehouseId && filters?.tenantId
        ? [dateFrom, dateTo, filters.productId, filters.warehouseId, filters.tenantId]
        : filters?.productId && filters?.warehouseId
        ? [dateFrom, dateTo, filters.productId, filters.warehouseId]
        : filters?.productId
        ? [dateFrom, dateTo, filters.productId]
        : [dateFrom, dateTo]);

      // Calculate analytics
      const stats = {
        totalUpdates: 0,
        stockIn: 0,
        stockOut: 0,
        adjustments: 0,
        transfers: 0,
        damaged: 0,
        returned: 0,
        topMovingProducts: [] as Array<{
          productId: string;
          sku: string;
          totalMovement: number;
          averageStock: number;
        }>,
        alertsByType: {} as Record<string, number>,
        alertsBySeverity: {} as Record<string, number>,
        averageStockLevel: 0,
        turnoverRate: 0
      };

      for (const row of statsResult.rows) {
        stats.totalUpdates += parseInt(row.total_updates);
        stats.stockIn += parseFloat(row.stock_in) || 0;
        stats.stockOut += parseFloat(row.stock_out) || 0;
        stats.adjustments += parseFloat(row.adjustments) || 0;
        stats.transfers += parseFloat(row.transfers) || 0;
        stats.damaged += parseFloat(row.damaged) || 0;
        stats.returned += parseFloat(row.returned) || 0;

        if (row.product_id) {
          stats.topMovingProducts.push({
            productId: row.product_id,
            sku: row.sku,
            totalMovement: parseFloat(row.total_movement) || 0,
            averageStock: parseFloat(row.average_stock) || 0
          });
        }
      }

      for (const row of alertsResult.rows) {
        if (row.type) {
          stats.alertsByType[row.type] = (stats.alertsByType[row.type] || 0) + parseInt(row.count);
        }
        if (row.severity) {
          stats.alertsBySeverity[row.severity] = (stats.alertsBySeverity[row.severity] || 0) + parseInt(row.count);
        }
      }

      // Calculate turnover rate (simplified)
      stats.turnoverRate = stats.stockIn > 0 ? (stats.stockOut / stats.stockIn) * 100 : 0;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get inventory analytics', error);
      return {
        totalUpdates: 0,
        stockIn: 0,
        stockOut: 0,
        adjustments: 0,
        transfers: 0,
        damaged: 0,
        returned: 0,
        topMovingProducts: [],
        alertsByType: {},
        alertsBySeverity: {},
        averageStockLevel: 0,
        turnoverRate: 0
      };
    }
  }

  async getCurrentStock(productId: string, sku: string, warehouseId?: string): Promise<number> {
    const cacheKey = this.getCacheKey(productId, sku, warehouseId);

    // Check cache first
    const cached = this.stockCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) { // 5 minutes cache
      return cached.stock;
    }

    // Get from database
    let query = 'SELECT COALESCE(stock, 0) as stock FROM products WHERE sku = $1';
    const params = [sku];

    if (warehouseId) {
      query = 'SELECT COALESCE(stock, 0) as stock FROM warehouse_inventory WHERE product_id = $1 AND warehouse_id = $2';
      params.push(warehouseId);
    }

    const result = await this.db.execute(query, params);
    const stock = parseInt(result.rows[0]?.stock) || 0;

    // Update cache
    this.stockCache.set(cacheKey, { stock, lastUpdated: new Date() });

    return stock;
  }

  async broadcastInventoryUpdate(update: {
    productId: string;
    sku: string;
    warehouseId?: string;
    previousStock: number;
    newStock: number;
    changeAmount: number;
    type: string;
    reason?: string;
    updateId: string;
    timestamp: Date;
  }): Promise<void> {
    // Broadcast to subscribed users
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.active && this.shouldReceiveUpdate(subscription, update)) {
        // Send WebSocket message
        await this.sendToSubscribedUsers(subscription, {
          type: 'inventory_update',
          data: update
        });
      }
    }

    // Also broadcast to general inventory channel
    await this.broadcastToChannel('inventory_updates', {
      type: 'inventory_update',
      data: update
    });
  }

  async broadcastAlerts(alerts: InventoryAlert[]): Promise<void> {
    for (const alert of alerts) {
      // Add to active alerts
      this.activeAlerts.set(alert.id, alert);

      // Broadcast to subscribed users
      for (const [subscriptionId, subscription] of this.subscriptions) {
        if (subscription.active && subscription.alertTypes.includes(alert.type)) {
          await this.sendToSubscribedUsers(subscription, {
            type: 'inventory_alert',
            data: alert
          });
        }
      }

      // Also broadcast to alerts channel
      await this.broadcastToChannel('inventory_alerts', {
        type: 'inventory_alert',
        data: alert
      });
    }
  }

  private async checkInventoryAlerts(productId: string, sku: string, currentStock: number, warehouseId?: string): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];

    // Get product info
    const productResult = await this.db.execute(
      'SELECT * FROM products WHERE id = $1 OR sku = $2',
      [productId, sku]
    );

    if (productResult.rows.length === 0) return alerts;

    const product = productResult.rows[0];
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check low stock alert
    if (product.min_stock && currentStock <= product.min_stock) {
      alerts.push({
        id: `${alertId}-low`,
        type: 'low_stock',
        severity: currentStock <= product.critical_stock ? 'critical' : 'warning',
        productId,
        sku,
        warehouseId,
        message: `Düşük stok seviyesi: ${currentStock} (Min: ${product.min_stock})`,
        data: {
          currentStock,
          minStock: product.min_stock,
          criticalStock: product.critical_stock
        },
        acknowledged: false,
        resolved: false,
        createdAt: new Date()
      });
    }

    // Check out of stock alert
    if (currentStock <= 0) {
      alerts.push({
        id: `${alertId}-out`,
        type: 'out_of_stock',
        severity: 'critical',
        productId,
        sku,
        warehouseId,
        message: `Stok tükenmiş: ${currentStock}`,
        data: { currentStock },
        acknowledged: false,
        resolved: false,
        createdAt: new Date()
      });
    }

    // Check overstock alert
    if (product.max_stock && currentStock >= product.max_stock) {
      alerts.push({
        id: `${alertId}-over`,
        type: 'overstock',
        severity: 'warning',
        productId,
        sku,
        warehouseId,
        message: `Fazla stok: ${currentStock} (Max: ${product.max_stock})`,
        data: {
          currentStock,
          maxStock: product.max_stock
        },
        acknowledged: false,
        resolved: false,
        createdAt: new Date()
      });
    }

    // Save alerts to database
    for (const alert of alerts) {
      await this.saveAlertToDB(alert);
    }

    return alerts;
  }

  private shouldReceiveUpdate(subscription: InventorySubscription, update: any): boolean {
    // Check if subscription matches the update criteria
    if (subscription.productIds?.length && !subscription.productIds.includes(update.productId)) {
      return false;
    }

    if (subscription.warehouses?.length && update.warehouseId && !subscription.warehouses.includes(update.warehouseId)) {
      return false;
    }

    return true;
  }

  private async sendToSubscribedUsers(subscription: InventorySubscription, data: any): Promise<void> {
    // Mock WebSocket implementation
    this.logger.log(`Sending to subscription ${subscription.id}:`, data);

    // In real implementation:
    // this.socketServer.to(`user:${subscription.userId}`).emit('inventory_event', data);
    // or this.socketServer.to(`tenant:${subscription.tenantId}`).emit('inventory_event', data);
  }

  private async broadcastToChannel(channel: string, data: any): Promise<void> {
    // Mock WebSocket broadcast to channel
    this.logger.log(`Broadcasting to channel ${channel}:`, data);

    // In real implementation:
    // this.socketServer.to(channel).emit('inventory_event', data);
  }

  private async broadcastAlertUpdate(alertId: string, action: string, userId: string, resolution?: string): Promise<void> {
    await this.broadcastToChannel('inventory_alerts', {
      type: 'alert_update',
      data: {
        alertId,
        action,
        userId,
        resolution,
        timestamp: new Date()
      }
    });
  }

  private async saveInventoryUpdate(update: InventoryUpdate): Promise<void> {
    await this.db.execute(`
      INSERT INTO inventory_updates (
        id, product_id, sku, warehouse_id, location, type,
        previous_stock, new_stock, change_amount, reason,
        reference_id, user_id, user_name, automatic, metadata, timestamp, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      update.id,
      update.productId,
      update.sku,
      update.warehouseId,
      update.location,
      update.type,
      update.previousStock,
      update.newStock,
      update.changeAmount,
      update.reason,
      update.referenceId,
      update.userId,
      update.userName,
      update.automatic,
      JSON.stringify(update.metadata),
      update.timestamp,
      update.tenantId
    ]);
  }

  private async saveStockMovement(movement: StockMovement): Promise<void> {
    await this.db.execute(`
      INSERT INTO stock_movements (
        id, product_id, sku, from_warehouse_id, to_warehouse_id,
        quantity, unit_cost, total_cost, movement_type, reference_type,
        reference_id, notes, user_id, user_name, timestamp, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      movement.id,
      movement.productId,
      movement.sku,
      movement.fromWarehouseId,
      movement.toWarehouseId,
      movement.quantity,
      movement.unitCost,
      movement.totalCost,
      movement.movementType,
      movement.referenceType,
      movement.referenceId,
      movement.notes,
      movement.userId,
      movement.userName,
      movement.timestamp,
      movement.tenantId
    ]);
  }

  private async updateProductStock(productId: string, sku: string, stock: number, warehouseId?: string): Promise<void> {
    if (warehouseId) {
      await this.db.execute(`
        INSERT INTO warehouse_inventory (product_id, warehouse_id, sku, stock, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
          stock = $4, updated_at = $5
      `, [productId, warehouseId, sku, stock, new Date()]);
    } else {
      await this.db.execute(`
        UPDATE products SET stock = $1, updated_at = $2 WHERE sku = $3
      `, [stock, new Date(), sku]);
    }
  }

  private async saveSubscriptionToDB(subscription: InventorySubscription): Promise<void> {
    await this.db.execute(`
      INSERT INTO inventory_subscriptions (
        id, user_id, tenant_id, role, product_ids, categories, warehouses,
        alert_types, stock_levels, active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      subscription.id,
      subscription.userId,
      subscription.tenantId,
      subscription.role,
      JSON.stringify(subscription.productIds || []),
      JSON.stringify(subscription.categories || []),
      JSON.stringify(subscription.warehouses || []),
      JSON.stringify(subscription.alertTypes),
      JSON.stringify(subscription.stockLevels),
      subscription.active,
      subscription.createdAt,
      subscription.updatedAt
    ]);
  }

  private async saveAlertToDB(alert: InventoryAlert): Promise<void> {
    await this.db.execute(`
      INSERT INTO inventory_alerts (
        id, type, severity, product_id, sku, warehouse_id,
        message, data, acknowledged, resolved, created_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      alert.id,
      alert.type,
      alert.severity,
      alert.productId,
      alert.sku,
      alert.warehouseId,
      alert.message,
      JSON.stringify(alert.data),
      alert.acknowledged,
      alert.resolved,
      alert.createdAt,
      alert.tenantId
    ]);
  }

  private mapMovementType(type: string): 'order' | 'adjustment' | 'transfer' | 'purchase' | 'return' | 'damage' {
    switch (type) {
      case 'stock_in': return 'purchase';
      case 'stock_out': return 'order';
      case 'transfer': return 'transfer';
      case 'adjustment': return 'adjustment';
      case 'damaged': return 'damage';
      case 'returned': return 'return';
      default: return 'adjustment';
    }
  }

  private getCacheKey(productId: string, sku: string, warehouseId?: string): string {
    return warehouseId ? `${sku}:${warehouseId}` : sku;
  }

  private startInventoryMonitoring(): void {
    // Monitor inventory levels every 30 seconds
    setInterval(async () => {
      await this.checkInventoryLevels();
    }, 30 * 1000);
  }

  private startAlertProcessing(): void {
    // Process pending alerts every 10 seconds
    setInterval(async () => {
      await this.processPendingAlerts();
    }, 10 * 1000);
  }

  private startCacheCleanup(): void {
    // Clean cache every 10 minutes
    setInterval(() => {
      const now = new Date();
      for (const [key, value] of this.stockCache) {
        if (now.getTime() - value.lastUpdated.getTime() > 10 * 60 * 1000) { // 10 minutes
          this.stockCache.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }

  private async checkInventoryLevels(): Promise<void> {
    try {
      // Get products with low stock levels
      const result = await this.db.execute(`
        SELECT p.*, wi.warehouse_id, wi.stock
        FROM products p
        LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
        WHERE (p.min_stock IS NOT NULL AND p.stock <= p.min_stock)
        OR (wi.stock IS NOT NULL AND p.min_stock IS NOT NULL AND wi.stock <= p.min_stock)
      `);

      for (const row of result.rows) {
        const currentStock = parseInt(row.stock) || 0;
        const minStock = parseInt(row.min_stock) || 0;

        if (currentStock <= minStock) {
          // Trigger low stock update
          await this.updateStock({
            productId: row.id,
            sku: row.sku,
            warehouseId: row.warehouse_id,
            type: 'adjustment',
            changeAmount: 0, // Just trigger alert check
            automatic: true,
            metadata: { triggeredBy: 'monitoring', currentStock, minStock }
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to check inventory levels', error);
    }
  }

  private async processPendingAlerts(): Promise<void> {
    try {
      // Get unacknowledged alerts older than 1 hour
      const result = await this.db.execute(`
        SELECT * FROM inventory_alerts
        WHERE acknowledged = false
        AND created_at < $1
      `, [new Date(Date.now() - 60 * 60 * 1000)]); // 1 hour

      for (const row of result.rows) {
        // Re-broadcast old alerts
        const alert: InventoryAlert = {
          ...row,
          data: JSON.parse(row.data || '{}'),
          acknowledgedAt: row.acknowledged_at,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at
        };

        await this.broadcastAlerts([alert]);
      }
    } catch (error) {
      this.logger.error('Failed to process pending alerts', error);
    }
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        now.setDate(now.getDate() - dayOfWeek);
        now.setHours(0, 0, 0, 0);
        break;
      case 'month':
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        break;
    }
    return now;
  }
}
