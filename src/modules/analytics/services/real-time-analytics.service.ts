import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
}

interface RealTimeDashboard {
  id: string;
  name: string;
  widgets: Array<{
    id: string;
    type: 'kpi' | 'chart' | 'table' | 'gauge';
    title: string;
    data: any;
    position: { x: number; y: number; width: number; height: number };
  }>;
  filters: Record<string, any>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PerformanceIndicator {
  id: string;
  name: string;
  category: 'sales' | 'marketing' | 'operations' | 'financial' | 'customer';
  value: number;
  unit: string;
  target: number;
  actual: number;
  variance: number;
  status: 'on_track' | 'behind' | 'ahead';
  period: string;
  calculatedAt: Date;
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  currentValue: number;
  status: 'active' | 'triggered' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
  triggeredAt?: Date;
  resolvedAt?: Date;
}

@Injectable()
export class RealTimeAnalyticsService {
  private readonly logger = new Logger(RealTimeAnalyticsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async getKPIMetrics(category?: string): Promise<KPIMetric[]> {
    this.logger.log(`Fetching KPI metrics for category: ${category || 'all'}`);
    
    const metrics = await this.calculateKPIMetrics(category);
    
    this.logger.log(`Retrieved ${metrics.length} KPI metrics`);
    return metrics;
  }

  async createRealTimeDashboard(dashboard: Omit<RealTimeDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<RealTimeDashboard> {
    const dashboardId = `dashboard-${Date.now()}`;
    
    const newDashboard: RealTimeDashboard = {
      id: dashboardId,
      ...dashboard,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveRealTimeDashboard(newDashboard);
    
    this.logger.log(`Created real-time dashboard: ${dashboardId}`);
    return newDashboard;
  }

  async getRealTimeDashboards(): Promise<RealTimeDashboard[]> {
    const result = await this.db.execute(`
      SELECT * FROM real_time_dashboards
      ORDER BY updated_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      widgets: JSON.parse(row.widgets || '[]'),
      filters: JSON.parse(row.filters || '{}')
    }));
  }

  async updateRealTimeDashboard(dashboardId: string, updates: Partial<RealTimeDashboard>): Promise<RealTimeDashboard> {
    const existing = await this.getRealTimeDashboard(dashboardId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveRealTimeDashboard(updated);
    
    this.logger.log(`Updated real-time dashboard: ${dashboardId}`);
    return updated;
  }

  async getPerformanceIndicators(period: string = '30d'): Promise<PerformanceIndicator[]> {
    this.logger.log(`Fetching performance indicators for period: ${period}`);
    
    const indicators = await this.calculatePerformanceIndicators(period);
    
    this.logger.log(`Retrieved ${indicators.length} performance indicators`);
    return indicators;
  }

  async createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
    const alertId = `alert-${Date.now()}`;
    
    const newAlert: Alert = {
      id: alertId,
      ...alert,
      createdAt: new Date()
    };

    await this.saveAlert(newAlert);
    
    this.logger.log(`Created alert: ${alertId}`);
    return newAlert;
  }

  async getAlerts(status?: string): Promise<Alert[]> {
    let query = 'SELECT * FROM alerts';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async checkAlerts(): Promise<Alert[]> {
    this.logger.log('Checking alerts');
    
    const alerts = await this.getAlerts('active');
    const triggeredAlerts = [];
    
    for (const alert of alerts) {
      const currentValue = await this.evaluateAlertCondition(alert.condition);
      
      if (this.shouldTriggerAlert(currentValue, alert.threshold, alert.condition)) {
        await this.triggerAlert(alert.id, currentValue);
        triggeredAlerts.push(alert);
      }
    }
    
    this.logger.log(`Checked ${alerts.length} alerts, ${triggeredAlerts.length} triggered`);
    return triggeredAlerts;
  }

  async getRealTimeAnalytics(period: string = '1h'): Promise<{
    kpis: KPIMetric[];
    performanceIndicators: PerformanceIndicator[];
    alerts: Alert[];
    trends: Array<{
      metric: string;
      data: Array<{ timestamp: Date; value: number }>;
    }>;
    summary: {
      totalRevenue: number;
      totalOrders: number;
      activeUsers: number;
      conversionRate: number;
    };
  }> {
    this.logger.log(`Generating real-time analytics for period: ${period}`);
    
    const [kpis, performanceIndicators, alerts, trends, summary] = await Promise.all([
      this.getKPIMetrics(),
      this.getPerformanceIndicators(period),
      this.getAlerts(),
      this.getTrends(period),
      this.getAnalyticsSummary(period)
    ]);
    
    return {
      kpis,
      performanceIndicators,
      alerts,
      trends,
      summary
    };
  }

  async getAnalyticsSummary(period: string = '1h'): Promise<{
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    conversionRate: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        SUM(o.total_amount) as total_revenue,
        COUNT(o.id) as total_orders,
        COUNT(DISTINCT o.customer_id) as active_users
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    const totalRevenue = parseFloat(stats.total_revenue) || 0;
    const totalOrders = parseInt(stats.total_orders) || 0;
    const activeUsers = parseInt(stats.active_users) || 0;
    
    // Mock conversion rate calculation
    const conversionRate = totalOrders > 0 ? (totalOrders / (activeUsers * 10)) * 100 : 0;
    
    return {
      totalRevenue,
      totalOrders,
      activeUsers,
      conversionRate: Math.min(conversionRate, 100)
    };
  }

  async getTrends(period: string = '1h'): Promise<Array<{
    metric: string;
    data: Array<{ timestamp: Date; value: number }>;
  }>> {
    const metrics = ['revenue', 'orders', 'users', 'conversion'];
    const trends = [];
    
    for (const metric of metrics) {
      const data = await this.getMetricTrend(metric, period);
      trends.push({
        metric,
        data
      });
    }
    
    return trends;
  }

  private async calculateKPIMetrics(category?: string): Promise<KPIMetric[]> {
    const metrics = [];
    
    // Revenue KPI
    const revenueResult = await this.db.execute(`
      SELECT 
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const revenue = parseFloat(revenueResult.rows[0]?.total_revenue) || 0;
    const avgOrderValue = parseFloat(revenueResult.rows[0]?.avg_order_value) || 0;
    
    metrics.push({
      id: 'revenue',
      name: 'Total Revenue',
      value: revenue,
      unit: 'USD',
      trend: 'up',
      changePercent: 12.5,
      target: 10000,
      status: revenue > 8000 ? 'good' : revenue > 5000 ? 'warning' : 'critical',
      lastUpdated: new Date()
    });
    
    // Orders KPI
    const ordersResult = await this.db.execute(`
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const totalOrders = parseInt(ordersResult.rows[0]?.total_orders) || 0;
    
    metrics.push({
      id: 'orders',
      name: 'Total Orders',
      value: totalOrders,
      unit: 'count',
      trend: 'up',
      changePercent: 8.3,
      target: 100,
      status: totalOrders > 80 ? 'good' : totalOrders > 50 ? 'warning' : 'critical',
      lastUpdated: new Date()
    });
    
    // Users KPI
    const usersResult = await this.db.execute(`
      SELECT COUNT(DISTINCT customer_id) as active_users
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const activeUsers = parseInt(usersResult.rows[0]?.active_users) || 0;
    
    metrics.push({
      id: 'users',
      name: 'Active Users',
      value: activeUsers,
      unit: 'count',
      trend: 'stable',
      changePercent: 2.1,
      target: 50,
      status: activeUsers > 40 ? 'good' : activeUsers > 25 ? 'warning' : 'critical',
      lastUpdated: new Date()
    });
    
    // Conversion Rate KPI
    const conversionRate = totalOrders > 0 ? (totalOrders / (activeUsers * 10)) * 100 : 0;
    
    metrics.push({
      id: 'conversion',
      name: 'Conversion Rate',
      value: conversionRate,
      unit: '%',
      trend: 'up',
      changePercent: 5.2,
      target: 3.0,
      status: conversionRate > 2.5 ? 'good' : conversionRate > 1.5 ? 'warning' : 'critical',
      lastUpdated: new Date()
    });
    
    return metrics;
  }

  private async calculatePerformanceIndicators(period: string): Promise<PerformanceIndicator[]> {
    const indicators = [];
    
    // Sales Performance
    const salesResult = await this.db.execute(`
      SELECT 
        SUM(total_amount) as total_sales,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const totalSales = parseFloat(salesResult.rows[0]?.total_sales) || 0;
    const orderCount = parseInt(salesResult.rows[0]?.order_count) || 0;
    
    indicators.push({
      id: 'sales-revenue',
      name: 'Sales Revenue',
      category: 'sales',
      value: totalSales,
      unit: 'USD',
      target: 50000,
      actual: totalSales,
      variance: totalSales - 50000,
      status: totalSales >= 50000 ? 'on_track' : totalSales >= 40000 ? 'behind' : 'behind',
      period,
      calculatedAt: new Date()
    });
    
    // Marketing Performance
    const marketingResult = await this.db.execute(`
      SELECT COUNT(*) as lead_count
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const leadCount = parseInt(marketingResult.rows[0]?.lead_count) || 0;
    
    indicators.push({
      id: 'marketing-leads',
      name: 'Marketing Leads',
      category: 'marketing',
      value: leadCount,
      unit: 'count',
      target: 100,
      actual: leadCount,
      variance: leadCount - 100,
      status: leadCount >= 100 ? 'on_track' : leadCount >= 80 ? 'behind' : 'behind',
      period,
      calculatedAt: new Date()
    });
    
    // Operations Performance
    const operationsResult = await this.db.execute(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (shipped_at - created_at))) as avg_fulfillment_time
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${period}'
        AND shipped_at IS NOT NULL
    `);
    
    const avgFulfillmentTime = parseFloat(operationsResult.rows[0]?.avg_fulfillment_time) || 0;
    const avgFulfillmentHours = avgFulfillmentTime / 3600; // Convert to hours
    
    indicators.push({
      id: 'operations-fulfillment',
      name: 'Avg Fulfillment Time',
      category: 'operations',
      value: avgFulfillmentHours,
      unit: 'hours',
      target: 24,
      actual: avgFulfillmentHours,
      variance: avgFulfillmentHours - 24,
      status: avgFulfillmentHours <= 24 ? 'on_track' : avgFulfillmentHours <= 48 ? 'behind' : 'behind',
      period,
      calculatedAt: new Date()
    });
    
    return indicators;
  }

  private async getMetricTrend(metric: string, period: string): Promise<Array<{ timestamp: Date; value: number }>> {
    const data = [];
    const now = new Date();
    const interval = this.getIntervalMinutes(period);
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * interval * 60 * 1000);
      const value = await this.getMetricValue(metric, timestamp, interval);
      
      data.push({
        timestamp,
        value
      });
    }
    
    return data;
  }

  private getIntervalMinutes(period: string): number {
    const intervals = {
      '1h': 5,    // 5-minute intervals
      '24h': 60,  // 1-hour intervals
      '7d': 360,  // 6-hour intervals
      '30d': 1440 // 1-day intervals
    };
    
    return intervals[period] || 60;
  }

  private async getMetricValue(metric: string, timestamp: Date, interval: number): Promise<number> {
    const startTime = new Date(timestamp.getTime() - interval * 60 * 1000);
    const endTime = timestamp;
    
    switch (metric) {
      case 'revenue':
        const revenueResult = await this.db.execute(`
          SELECT SUM(total_amount) as revenue
          FROM orders
          WHERE created_at BETWEEN $1 AND $2
        `, [startTime, endTime]);
        return parseFloat(revenueResult.rows[0]?.revenue) || 0;
        
      case 'orders':
        const ordersResult = await this.db.execute(`
          SELECT COUNT(*) as order_count
          FROM orders
          WHERE created_at BETWEEN $1 AND $2
        `, [startTime, endTime]);
        return parseInt(ordersResult.rows[0]?.order_count) || 0;
        
      case 'users':
        const usersResult = await this.db.execute(`
          SELECT COUNT(DISTINCT customer_id) as user_count
          FROM orders
          WHERE created_at BETWEEN $1 AND $2
        `, [startTime, endTime]);
        return parseInt(usersResult.rows[0]?.user_count) || 0;
        
      case 'conversion':
        const conversionResult = await this.db.execute(`
          SELECT 
            COUNT(*) as orders,
            COUNT(DISTINCT customer_id) as users
          FROM orders
          WHERE created_at BETWEEN $1 AND $2
        `, [startTime, endTime]);
        
        const orders = parseInt(conversionResult.rows[0]?.orders) || 0;
        const users = parseInt(conversionResult.rows[0]?.users) || 0;
        
        return users > 0 ? (orders / users) * 100 : 0;
        
      default:
        return 0;
    }
  }

  private async evaluateAlertCondition(condition: string): Promise<number> {
    // Mock condition evaluation
    const conditions = {
      'revenue < 1000': 500,
      'orders < 10': 5,
      'users < 5': 3,
      'conversion < 2': 1.5
    };
    
    return conditions[condition] || 0;
  }

  private shouldTriggerAlert(currentValue: number, threshold: number, condition: string): boolean {
    if (condition.includes('<')) {
      return currentValue < threshold;
    } else if (condition.includes('>')) {
      return currentValue > threshold;
    } else if (condition.includes('=')) {
      return currentValue === threshold;
    }
    
    return false;
  }

  private async triggerAlert(alertId: string, currentValue: number): Promise<void> {
    await this.db.execute(`
      UPDATE alerts SET 
        status = 'triggered',
        current_value = $2,
        triggered_at = NOW()
      WHERE id = $1
    `, [alertId, currentValue]);
  }

  private async getRealTimeDashboard(dashboardId: string): Promise<RealTimeDashboard> {
    const result = await this.db.execute(`
      SELECT * FROM real_time_dashboards WHERE id = $1
    `, [dashboardId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      widgets: JSON.parse(row.widgets || '[]'),
      filters: JSON.parse(row.filters || '{}')
    };
  }

  private async saveRealTimeDashboard(dashboard: RealTimeDashboard): Promise<void> {
    await this.db.execute(`
      INSERT INTO real_time_dashboards (id, name, widgets, filters, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        widgets = EXCLUDED.widgets,
        filters = EXCLUDED.filters,
        is_public = EXCLUDED.is_public,
        updated_at = EXCLUDED.updated_at
    `, [
      dashboard.id,
      dashboard.name,
      JSON.stringify(dashboard.widgets),
      JSON.stringify(dashboard.filters),
      dashboard.isPublic,
      dashboard.createdAt,
      dashboard.updatedAt
    ]);
  }

  private async saveAlert(alert: Alert): Promise<void> {
    await this.db.execute(`
      INSERT INTO alerts (id, name, condition, threshold, current_value, status, severity, message, created_at, triggered_at, resolved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      alert.id,
      alert.name,
      alert.condition,
      alert.threshold,
      alert.currentValue,
      alert.status,
      alert.severity,
      alert.message,
      alert.createdAt,
      alert.triggeredAt,
      alert.resolvedAt
    ]);
  }
}