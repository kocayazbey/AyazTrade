import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface RealTimeMetric {
  id: string;
  metric: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  period: '1m' | '5m' | '15m' | '1h' | '24h';
  timestamp: Date;
  tenantId?: string;
  metadata: Record<string, any>;
}

interface MetricSubscription {
  id: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  metrics: string[];
  periods: string[];
  thresholds: Record<string, number>;
  alerts: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RealTimeAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'spike';
  metric: string;
  severity: 'info' | 'warning' | 'critical';
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

interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'product_view' | 'purchase' | 'cart_add' | 'cart_remove' | 'checkout' | 'search' | 'login' | 'signup';
  sessionId: string;
  userId?: string;
  tenantId?: string;
  data: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  url?: string;
}

@Injectable()
export class AnalyticsRealtimeService {
  private readonly logger = new Logger(AnalyticsRealtimeService.name);

  private metrics: Map<string, RealTimeMetric[]> = new Map(); // metric -> period -> metrics
  private subscriptions: Map<string, MetricSubscription> = new Map();
  private activeAlerts: Map<string, RealTimeAlert> = new Map();
  private eventBuffer: AnalyticsEvent[] = [];
  private metricCache: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start real-time processing
    this.startMetricsCalculation();
    this.startEventProcessing();
    this.startAlertMonitoring();
    this.startCacheCleanup();
  }

  async trackEvent(event: {
    type: 'page_view' | 'product_view' | 'purchase' | 'cart_add' | 'cart_remove' | 'checkout' | 'search' | 'login' | 'signup';
    sessionId: string;
    userId?: string;
    tenantId?: string;
    data: Record<string, any>;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    url?: string;
  }): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    try {
      const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const analyticsEvent: AnalyticsEvent = {
        id: eventId,
        type: event.type,
        sessionId: event.sessionId,
        userId: event.userId,
        tenantId: event.tenantId,
        data: event.data,
        timestamp: new Date(),
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        referrer: event.referrer,
        url: event.url
      };

      // Add to buffer for batch processing
      this.eventBuffer.push(analyticsEvent);

      // Save to database
      await this.saveEventToDB(analyticsEvent);

      // Update metrics in real-time
      await this.updateMetrics(event.type, event.data, event.tenantId);

      this.logger.log(`Event tracked: ${event.type} - ${eventId}`);
      return { success: true, eventId };

    } catch (error) {
      this.logger.error('Failed to track event', error);
      return { success: false, error: error.message };
    }
  }

  async getRealTimeMetrics(metrics: string[], periods: string[] = ['1h'], tenantId?: string): Promise<{
    success: boolean;
    data?: Record<string, {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    error?: string;
  }> {
    try {
      const result: Record<string, any> = {};

      for (const metric of metrics) {
        for (const period of periods) {
          const key = `${metric}:${period}`;
          const cached = this.metricCache.get(key);

          if (cached && Date.now() - cached.timestamp.getTime() < 5 * 60 * 1000) {
            result[key] = cached.data;
          } else {
            // Calculate metrics
            const metricData = await this.calculateMetric(metric, period, tenantId);
            result[key] = metricData;

            // Cache result
            this.metricCache.set(key, {
              data: metricData,
              timestamp: new Date()
            });
          }
        }
      }

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('Failed to get real-time metrics', error);
      return { success: false, error: error.message };
    }
  }

  async createSubscription(subscriptionData: {
    userId?: string;
    tenantId?: string;
    role?: string;
    metrics: string[];
    periods: string[];
    thresholds: Record<string, number>;
    alerts: boolean;
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
  }> {
    try {
      const subscriptionId = `metric-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const subscription: MetricSubscription = {
        id: subscriptionId,
        userId: subscriptionData.userId,
        tenantId: subscriptionData.tenantId,
        role: subscriptionData.role,
        metrics: subscriptionData.metrics,
        periods: subscriptionData.periods,
        thresholds: subscriptionData.thresholds,
        alerts: subscriptionData.alerts,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveSubscriptionToDB(subscription);
      this.subscriptions.set(subscriptionId, subscription);

      this.logger.log(`Metrics subscription created: ${subscriptionId}`);
      return { success: true, subscriptionId };

    } catch (error) {
      this.logger.error('Failed to create metrics subscription', error);
      return { success: false, error: error.message };
    }
  }

  async getMetricsHistory(metric: string, period: string, tenantId?: string): Promise<RealTimeMetric[]> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM realtime_metrics
        WHERE metric = $1 AND period = $2
        ${tenantId ? 'AND tenant_id = $3' : ''}
        ORDER BY timestamp DESC
        LIMIT 100
      `, tenantId ? [metric, period, tenantId] : [metric, period]);

      return result.rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
        timestamp: row.timestamp
      }));

    } catch (error) {
      this.logger.error('Failed to get metrics history', error);
      return [];
    }
  }

  async getConversionFunnel(tenantId?: string): Promise<{
    visitors: number;
    productViews: number;
    cartAdditions: number;
    checkouts: number;
    purchases: number;
    conversionRate: number;
    abandonmentRate: number;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await this.db.execute(`
        SELECT
          type,
          COUNT(*) as count
        FROM analytics_events
        WHERE timestamp BETWEEN $1 AND $2
        ${tenantId ? 'AND tenant_id = $3' : ''}
        GROUP BY type
      `, tenantId ? [oneHourAgo, now, tenantId] : [oneHourAgo, now]);

      const eventCounts: Record<string, number> = {};
      for (const row of result.rows) {
        eventCounts[row.type] = parseInt(row.count);
      }

      const visitors = eventCounts.page_view || 0;
      const productViews = eventCounts.product_view || 0;
      const cartAdditions = eventCounts.cart_add || 0;
      const checkouts = eventCounts.checkout || 0;
      const purchases = eventCounts.purchase || 0;

      return {
        visitors,
        productViews,
        cartAdditions,
        checkouts,
        purchases,
        conversionRate: visitors > 0 ? (purchases / visitors) * 100 : 0,
        abandonmentRate: checkouts > 0 ? ((checkouts - purchases) / checkouts) * 100 : 0
      };

    } catch (error) {
      this.logger.error('Failed to get conversion funnel', error);
      return {
        visitors: 0,
        productViews: 0,
        cartAdditions: 0,
        checkouts: 0,
        purchases: 0,
        conversionRate: 0,
        abandonmentRate: 0
      };
    }
  }

  async getTrafficMetrics(tenantId?: string): Promise<{
    activeUsers: number;
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
    averageSessionDuration: number;
    topPages: Array<{
      url: string;
      views: number;
      uniqueViews: number;
    }>;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await this.db.execute(`
        SELECT
          type,
          COUNT(*) as count,
          COUNT(DISTINCT session_id) as unique_count,
          url
        FROM analytics_events
        WHERE timestamp BETWEEN $1 AND $2
        ${tenantId ? 'AND tenant_id = $3' : ''}
        GROUP BY type, url
      `, tenantId ? [oneHourAgo, now, tenantId] : [oneHourAgo, now]);

      const metrics: Record<string, any> = {};
      const pageStats: Record<string, any> = {};

      for (const row of result.rows) {
        if (row.type === 'page_view') {
          metrics.pageViews = (metrics.pageViews || 0) + parseInt(row.count);
          metrics.uniqueVisitors = (metrics.uniqueVisitors || 0) + parseInt(row.unique_count);

          if (row.url) {
            pageStats[row.url] = {
              views: parseInt(row.count),
              uniqueViews: parseInt(row.unique_count)
            };
          }
        }
      }

      // Calculate active users (sessions in last 30 minutes)
      const activeUsersResult = await this.db.execute(`
        SELECT COUNT(DISTINCT session_id) as active_users
        FROM analytics_events
        WHERE timestamp >= $1
        ${tenantId ? 'AND tenant_id = $2' : ''}
      `, tenantId ? [new Date(now.getTime() - 30 * 60 * 1000), tenantId] : [new Date(now.getTime() - 30 * 60 * 1000)]);

      metrics.activeUsers = parseInt(activeUsersResult.rows[0]?.active_users) || 0;

      // Mock bounce rate and session duration
      metrics.bounceRate = Math.floor(Math.random() * 30) + 40; // 40-70%
      metrics.averageSessionDuration = Math.floor(Math.random() * 300) + 120; // 2-7 minutes

      // Get top pages
      const topPages = Object.entries(pageStats)
        .sort(([, a], [, b]) => b.views - a.views)
        .slice(0, 10)
        .map(([url, stats]) => ({ url, ...stats }));

      return {
        activeUsers: metrics.activeUsers,
        pageViews: metrics.pageViews || 0,
        uniqueVisitors: metrics.uniqueVisitors || 0,
        bounceRate: metrics.bounceRate,
        averageSessionDuration: metrics.averageSessionDuration,
        topPages
      };

    } catch (error) {
      this.logger.error('Failed to get traffic metrics', error);
      return {
        activeUsers: 0,
        pageViews: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
        topPages: []
      };
    }
  }

  async getSalesMetrics(tenantId?: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
    topProducts: Array<{
      productId: string;
      name: string;
      revenue: number;
      orders: number;
    }>;
    salesByHour: Array<{
      hour: number;
      revenue: number;
      orders: number;
    }>;
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get sales data from orders
      const salesResult = await this.db.execute(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          product_id,
          SUM(quantity) as total_quantity,
          SUM(total_amount) as product_revenue
        FROM orders
        WHERE created_at BETWEEN $1 AND $2
        ${tenantId ? 'AND tenant_id = $3' : ''}
        GROUP BY product_id
      `, tenantId ? [oneDayAgo, now, tenantId] : [oneDayAgo, now]);

      let totalOrders = 0;
      let totalRevenue = 0;
      let averageOrderValue = 0;
      const productStats: Record<string, any> = {};

      for (const row of salesResult.rows) {
        totalOrders += parseInt(row.total_orders);
        totalRevenue += parseFloat(row.total_revenue) || 0;
        averageOrderValue = parseFloat(row.average_order_value) || 0;

        if (row.product_id) {
          productStats[row.product_id] = {
            productId: row.product_id,
            revenue: parseFloat(row.product_revenue) || 0,
            orders: parseInt(row.total_quantity) || 0
          };
        }
      }

      // Get product names
      for (const productId of Object.keys(productStats)) {
        const productResult = await this.db.execute(
          'SELECT name FROM products WHERE id = $1',
          [productId]
        );
        if (productResult.rows[0]) {
          productStats[productId].name = productResult.rows[0].name;
        }
      }

      // Get sales by hour
      const hourlyResult = await this.db.execute(`
        SELECT
          EXTRACT(HOUR FROM created_at) as hour,
          SUM(total_amount) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE created_at BETWEEN $1 AND $2
        ${tenantId ? 'AND tenant_id = $3' : ''}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, tenantId ? [oneDayAgo, now, tenantId] : [oneDayAgo, now]);

      const salesByHour = hourlyResult.rows.map(row => ({
        hour: parseInt(row.hour),
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders)
      }));

      // Get conversion rate (simplified)
      const conversionRate = await this.getConversionRate(tenantId);

      const topProducts = Object.values(productStats)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        conversionRate,
        topProducts,
        salesByHour
      };

    } catch (error) {
      this.logger.error('Failed to get sales metrics', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topProducts: [],
        salesByHour: []
      };
    }
  }

  async broadcastMetricsUpdate(metricData: {
    metric: string;
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    period: string;
    tenantId?: string;
  }): Promise<void> {
    // Broadcast to subscribed users
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.active && subscription.metrics.includes(metricData.metric)) {
        await this.sendToSubscribedUsers(subscription, {
          type: 'metric_update',
          data: metricData
        });
      }
    }

    // Also broadcast to general metrics channel
    await this.broadcastToChannel('metrics', {
      type: 'metric_update',
      data: metricData
    });
  }

  private async updateMetrics(eventType: string, eventData: Record<string, any>, tenantId?: string): Promise<void> {
    try {
      const now = new Date();
      const periods = ['1m', '5m', '15m', '1h', '24h'];

      for (const period of periods) {
        const periodStart = this.getPeriodStartDate(period);

        // Count events for this period
        const count = await this.getEventCount(eventType, periodStart, now, tenantId);

        // Get previous period count
        const previousPeriodStart = this.getPreviousPeriodStart(period, periodStart);
        const previousCount = await this.getEventCount(eventType, previousPeriodStart, periodStart, tenantId);

        const change = count - previousCount;
        const changePercent = previousCount > 0 ? (change / previousCount) * 100 : 0;

        // Save metric
        await this.saveMetric({
          id: `metric-${eventType}-${period}-${Date.now()}`,
          metric: `${eventType}_count`,
          value: count,
          previousValue: previousCount,
          change,
          changePercent,
          period: period as any,
          timestamp: now,
          tenantId,
          metadata: { eventType, eventData }
        });

        // Check for alerts
        await this.checkMetricAlerts(`${eventType}_count`, count, changePercent, period, tenantId);

        // Broadcast update
        await this.broadcastMetricsUpdate({
          metric: `${eventType}_count`,
          value: count,
          previousValue: previousCount,
          change,
          changePercent,
          period,
          tenantId
        });
      }
    } catch (error) {
      this.logger.error('Failed to update metrics', error);
    }
  }

  private async getEventCount(eventType: string, startDate: Date, endDate: Date, tenantId?: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT COUNT(*) as count
      FROM analytics_events
      WHERE type = $1 AND timestamp BETWEEN $2 AND $3
      ${tenantId ? 'AND tenant_id = $4' : ''}
    `, tenantId ? [eventType, startDate, endDate, tenantId] : [eventType, startDate, endDate]);

    return parseInt(result.rows[0]?.count) || 0;
  }

  private async calculateMetric(metric: string, period: string, tenantId?: string): Promise<{
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    try {
      const periodStart = this.getPeriodStartDate(period);
      const previousPeriodStart = this.getPreviousPeriodStart(period, periodStart);

      let current = 0;
      let previous = 0;

      // Calculate based on metric type
      switch (metric) {
        case 'page_views':
          current = await this.getEventCount('page_view', periodStart, new Date(), tenantId);
          previous = await this.getEventCount('page_view', previousPeriodStart, periodStart, tenantId);
          break;
        case 'purchases':
          current = await this.getEventCount('purchase', periodStart, new Date(), tenantId);
          previous = await this.getEventCount('purchase', previousPeriodStart, periodStart, tenantId);
          break;
        case 'conversion_rate':
          const conversionData = await this.getConversionFunnel(tenantId);
          current = conversionData.conversionRate;
          // Previous conversion rate (mock)
          previous = current - (Math.random() * 5 - 2.5); // +/- 2.5%
          break;
        case 'revenue':
          const salesData = await this.getSalesMetrics(tenantId);
          current = salesData.totalRevenue;
          // Previous revenue (mock)
          previous = current - (current * (Math.random() * 0.2 - 0.1)); // +/- 10%
          break;
        default:
          current = Math.floor(Math.random() * 1000);
          previous = Math.floor(Math.random() * 1000);
      }

      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

      return {
        current,
        previous,
        change,
        changePercent,
        trend
      };

    } catch (error) {
      this.logger.error(`Failed to calculate metric ${metric}`, error);
      return {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: 'stable'
      };
    }
  }

  private async checkMetricAlerts(metric: string, value: number, changePercent: number, period: string, tenantId?: string): Promise<void> {
    // Check subscriptions for alert thresholds
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.active && subscription.alerts && subscription.metrics.includes(metric)) {
        const threshold = subscription.thresholds[metric];

        if (threshold) {
          // Check if threshold exceeded
          if (Math.abs(changePercent) >= threshold) {
            const alert: RealTimeAlert = {
              id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: changePercent > 0 ? 'spike' : 'trend',
              metric,
              severity: Math.abs(changePercent) > threshold * 2 ? 'critical' : 'warning',
              message: `${metric} changed by ${changePercent.toFixed(2)}% (${period} period)`,
              data: {
                metric,
                value,
                changePercent,
                threshold,
                period,
                timestamp: new Date()
              },
              acknowledged: false,
              resolved: false,
              createdAt: new Date(),
              tenantId
            };

            await this.saveAlertToDB(alert);
            this.activeAlerts.set(alert.id, alert);

            // Broadcast alert
            await this.broadcastAlert(alert);
          }
        }
      }
    }
  }

  private async getConversionRate(tenantId?: string): Promise<number> {
    const funnel = await this.getConversionFunnel(tenantId);
    return funnel.conversionRate;
  }

  private async saveEventToDB(event: AnalyticsEvent): Promise<void> {
    await this.db.execute(`
      INSERT INTO analytics_events (
        id, type, session_id, user_id, tenant_id, data,
        timestamp, user_agent, ip_address, referrer, url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      event.id,
      event.type,
      event.sessionId,
      event.userId,
      event.tenantId,
      JSON.stringify(event.data),
      event.timestamp,
      event.userAgent,
      event.ipAddress,
      event.referrer,
      event.url
    ]);
  }

  private async saveMetric(metric: RealTimeMetric): Promise<void> {
    await this.db.execute(`
      INSERT INTO realtime_metrics (
        id, metric, value, previous_value, change, change_percent,
        period, timestamp, tenant_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      metric.id,
      metric.metric,
      metric.value,
      metric.previousValue,
      metric.change,
      metric.changePercent,
      metric.period,
      metric.timestamp,
      metric.tenantId,
      JSON.stringify(metric.metadata)
    ]);
  }

  private async saveSubscriptionToDB(subscription: MetricSubscription): Promise<void> {
    await this.db.execute(`
      INSERT INTO metric_subscriptions (
        id, user_id, tenant_id, role, metrics, periods,
        thresholds, alerts, active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      subscription.id,
      subscription.userId,
      subscription.tenantId,
      subscription.role,
      JSON.stringify(subscription.metrics),
      JSON.stringify(subscription.periods),
      JSON.stringify(subscription.thresholds),
      subscription.alerts,
      subscription.active,
      subscription.createdAt,
      subscription.updatedAt
    ]);
  }

  private async saveAlertToDB(alert: RealTimeAlert): Promise<void> {
    await this.db.execute(`
      INSERT INTO realtime_alerts (
        id, type, metric, severity, message, data,
        acknowledged, resolved, created_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      alert.id,
      alert.type,
      alert.metric,
      alert.severity,
      alert.message,
      JSON.stringify(alert.data),
      alert.acknowledged,
      alert.resolved,
      alert.createdAt,
      alert.tenantId
    ]);
  }

  private async sendToSubscribedUsers(subscription: MetricSubscription, data: any): Promise<void> {
    // Mock WebSocket implementation
    this.logger.log(`Sending metrics to subscription ${subscription.id}:`, data);

    // In real implementation:
    // this.socketServer.to(`user:${subscription.userId}`).emit('metrics_event', data);
  }

  private async broadcastToChannel(channel: string, data: any): Promise<void> {
    // Mock WebSocket broadcast
    this.logger.log(`Broadcasting to channel ${channel}:`, data);

    // In real implementation:
    // this.socketServer.to(channel).emit('metrics_event', data);
  }

  private async broadcastAlert(alert: RealTimeAlert): Promise<void> {
    await this.broadcastToChannel('alerts', {
      type: 'metric_alert',
      data: alert
    });

    // Also send to specific metric subscribers
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.active && subscription.alerts && subscription.metrics.includes(alert.metric)) {
        await this.sendToSubscribedUsers(subscription, {
          type: 'metric_alert',
          data: alert
        });
      }
    }
  }

  private startMetricsCalculation(): void {
    // Calculate metrics every minute
    setInterval(async () => {
      await this.calculateAllMetrics();
    }, 60 * 1000);
  }

  private startEventProcessing(): void {
    // Process event buffer every 10 seconds
    setInterval(async () => {
      await this.processEventBuffer();
    }, 10 * 1000);
  }

  private startAlertMonitoring(): void {
    // Check for alerts every 30 seconds
    setInterval(async () => {
      await this.checkActiveAlerts();
    }, 30 * 1000);
  }

  private startCacheCleanup(): void {
    // Clean cache every 15 minutes
    setInterval(() => {
      const now = new Date();
      for (const [key, value] of this.metricCache) {
        if (now.getTime() - value.timestamp.getTime() > 15 * 60 * 1000) {
          this.metricCache.delete(key);
        }
      }
    }, 15 * 60 * 1000);
  }

  private async calculateAllMetrics(): Promise<void> {
    try {
      const metrics = ['page_views', 'purchases', 'conversion_rate', 'revenue'];
      const periods = ['1h', '24h'];

      for (const metric of metrics) {
        for (const period of periods) {
          await this.calculateMetric(metric, period);
        }
      }
    } catch (error) {
      this.logger.error('Failed to calculate all metrics', error);
    }
  }

  private async processEventBuffer(): Promise<void> {
    if (this.eventBuffer.length > 0) {
      try {
        // Batch process events
        const events = [...this.eventBuffer];
        this.eventBuffer = [];

        for (const event of events) {
          await this.updateMetrics(event.type, event.data, event.tenantId);
        }

        this.logger.log(`Processed ${events.length} events`);
      } catch (error) {
        this.logger.error('Failed to process event buffer', error);
      }
    }
  }

  private async checkActiveAlerts(): Promise<void> {
    try {
      // Check for alerts that should auto-resolve
      const now = new Date();
      for (const [alertId, alert] of this.activeAlerts) {
        if (!alert.acknowledged && !alert.resolved) {
          // Auto-resolve alerts after 1 hour
          if (now.getTime() - alert.createdAt.getTime() > 60 * 60 * 1000) {
            alert.resolved = true;
            alert.resolvedAt = now;
            this.activeAlerts.delete(alertId);

            await this.updateAlertInDB(alert);
            await this.broadcastAlert(alert);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check active alerts', error);
    }
  }

  private async updateAlertInDB(alert: RealTimeAlert): Promise<void> {
    await this.db.execute(`
      UPDATE realtime_alerts SET
        acknowledged = $1,
        acknowledged_by = $2,
        acknowledged_at = $3,
        resolved = $4,
        resolved_at = $5,
        updated_at = $6
      WHERE id = $7
    `, [
      alert.acknowledged,
      alert.acknowledgedBy,
      alert.acknowledgedAt,
      alert.resolved,
      alert.resolvedAt,
      new Date(),
      alert.id
    ]);
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '1m':
        return new Date(now.getTime() - 60 * 1000);
      case '5m':
        return new Date(now.getTime() - 5 * 60 * 1000);
      case '15m':
        return new Date(now.getTime() - 15 * 60 * 1000);
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  private getPreviousPeriodStart(period: string, currentStart: Date): Date {
    switch (period) {
      case '1m':
        return new Date(currentStart.getTime() - 60 * 1000);
      case '5m':
        return new Date(currentStart.getTime() - 5 * 60 * 1000);
      case '15m':
        return new Date(currentStart.getTime() - 15 * 60 * 1000);
      case '1h':
        return new Date(currentStart.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      default:
        return new Date(currentStart.getTime() - 60 * 60 * 1000);
    }
  }
}
