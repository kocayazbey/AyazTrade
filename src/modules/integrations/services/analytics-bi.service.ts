import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface KPIMetric {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'customer' | 'marketing' | 'inventory' | 'custom';
  calculation: {
    type: 'sum' | 'average' | 'count' | 'percentage' | 'ratio' | 'formula';
    formula?: string;
    fields: string[];
    filters: Record<string, any>;
    dateRange: {
      field: string;
      period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    };
  };
  target?: number;
  targetDirection: 'higher' | 'lower' | 'exact';
  unit: string;
  visualization: {
    chartType: 'number' | 'gauge' | 'progress' | 'sparkline' | 'trend';
    color?: string;
    showTarget?: boolean;
    showChange?: boolean;
  };
  refreshInterval: number; // seconds
  status: 'active' | 'inactive' | 'maintenance';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

interface KPIValue {
  kpiId: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  target?: number;
  targetAchievement?: number;
  trend: 'up' | 'down' | 'stable' | 'volatile';
  status: 'good' | 'warning' | 'critical' | 'neutral';
  calculatedAt: Date;
  period: string;
  tenantId?: string;
}

interface TrendAnalysis {
  id: string;
  kpiId: string;
  metric: string;
  period: string;
  dataPoints: Array<{
    date: Date;
    value: number;
    prediction?: number;
  }>;
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    strength: 'weak' | 'moderate' | 'strong';
    confidence: number;
    seasonality?: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      strength: number;
    };
    anomalies: Array<{
      date: Date;
      value: number;
      deviation: number;
      type: 'spike' | 'drop' | 'outlier';
    }>;
  };
  forecast?: {
    periods: number;
    predictions: Array<{
      date: Date;
      value: number;
      confidence: number;
    }>;
    accuracy?: number;
  };
  insights: string[];
  generatedAt: Date;
  tenantId?: string;
}

interface BusinessDashboard {
  id: string;
  name: string;
  description: string;
  layout: {
    sections: Array<{
      id: string;
      title: string;
      position: { x: number; y: number; w: number; h: number };
      widgets: Array<{
        id: string;
        type: 'kpi' | 'chart' | 'table' | 'trend' | 'alert';
        kpiId?: string;
        configuration: any;
      }>;
    }>;
  };
  filters: {
    dateRange: {
      start: Date;
      end: Date;
      preset?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year';
    };
    segments: string[];
    customFilters: Record<string, any>;
  };
  permissions: {
    view: string[];
    edit: string[];
    delete: string[];
  };
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  kpiId: string;
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'between' | 'not_between';
    value: number | [number, number];
    duration?: number; // minutes - alert if condition persists
  };
  severity: 'info' | 'warning' | 'critical';
  notificationChannels: string[];
  notificationRecipients: string[];
  cooldown: number; // minutes between alerts
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

interface BusinessInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'achievement';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'positive';
  kpiIds: string[];
  data: Record<string, any>;
  actionable: boolean;
  recommendations: string[];
  expiresAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  generatedAt: Date;
  tenantId?: string;
}

@Injectable()
export class AnalyticsBIService {
  private readonly logger = new Logger(AnalyticsBIService.name);

  private kpiCache: Map<string, KPIValue> = new Map();
  private trendCache: Map<string, TrendAnalysis> = new Map();
  private activeAlerts: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start KPI calculation
    this.startKPICalculation();

    // Start trend analysis
    this.startTrendAnalysis();

    // Start alert monitoring
    this.startAlertMonitoring();

    // Start insight generation
    this.startInsightGeneration();
  }

  async createKPI(kpiData: {
    name: string;
    description: string;
    category: 'financial' | 'operational' | 'customer' | 'marketing' | 'inventory' | 'custom';
    calculation: KPIMetric['calculation'];
    target?: number;
    targetDirection: 'higher' | 'lower' | 'exact';
    unit: string;
    visualization: KPIMetric['visualization'];
    refreshInterval?: number;
    createdBy: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    kpiId?: string;
    error?: string;
  }> {
    try {
      const kpiId = `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const kpi: KPIMetric = {
        id: kpiId,
        name: kpiData.name,
        description: kpiData.description,
        category: kpiData.category,
        calculation: kpiData.calculation,
        target: kpiData.target,
        targetDirection: kpiData.targetDirection,
        unit: kpiData.unit,
        visualization: kpiData.visualization,
        refreshInterval: kpiData.refreshInterval || 300, // 5 minutes default
        status: 'active',
        createdBy: kpiData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: kpiData.tenantId
      };

      await this.saveKPIToDB(kpi);

      // Calculate initial value
      await this.calculateKPIValue(kpiId);

      this.logger.log(`KPI created: ${kpiId} - ${kpiData.name}`);
      return { success: true, kpiId };

    } catch (error) {
      this.logger.error('Failed to create KPI', error);
      return { success: false, error: error.message };
    }
  }

  async calculateKPIValue(kpiId: string): Promise<{
    success: boolean;
    value?: KPIValue;
    error?: string;
  }> {
    try {
      const kpi = await this.getKPI(kpiId);
      if (!kpi) {
        throw new Error('KPI not found');
      }

      const value = await this.calculateKPIMetric(kpi);

      // Get previous value
      const previousValue = await this.getPreviousKPIValue(kpiId, kpi.calculation.dateRange.period);

      const change = previousValue ? value.value - previousValue.value : 0;
      const changePercent = previousValue && previousValue.value !== 0
        ? (change / previousValue.value) * 100
        : 0;

      // Determine trend
      const trend = this.determineTrend(change);

      // Determine status based on target
      const status = this.determineKPIStatus(value.value, kpi.target, kpi.targetDirection);

      const kpiValue: KPIValue = {
        kpiId,
        value: value.value,
        previousValue: previousValue?.value,
        change,
        changePercent,
        target: kpi.target,
        targetAchievement: kpi.target ? (value.value / kpi.target) * 100 : undefined,
        trend,
        status,
        calculatedAt: new Date(),
        period: kpi.calculation.dateRange.period,
        tenantId: kpi.tenantId
      };

      // Save to database
      await this.saveKPIValueToDB(kpiValue);

      // Update cache
      this.kpiCache.set(kpiId, kpiValue);

      // Check for alerts
      await this.checkKPIAlerts(kpi, kpiValue);

      this.logger.log(`KPI calculated: ${kpiId} - ${value.value} ${kpi.unit}`);
      return { success: true, value: kpiValue };

    } catch (error) {
      this.logger.error('Failed to calculate KPI value', error);
      return { success: false, error: error.message };
    }
  }

  async getKPI(kpiId: string): Promise<KPIMetric | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM kpi_metrics WHERE id = $1',
        [kpiId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        calculation: JSON.parse(row.calculation || '{}'),
        visualization: JSON.parse(row.visualization || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      this.logger.error('Failed to get KPI', error);
      return null;
    }
  }

  async getKPIs(filters?: {
    category?: string;
    status?: string;
    createdBy?: string;
    tenantId?: string;
  }): Promise<KPIMetric[]> {
    try {
      let query = 'SELECT * FROM kpi_metrics WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.category) {
        query += ` AND category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.createdBy) {
        query += ` AND created_by = $${paramIndex}`;
        params.push(filters.createdBy);
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
        calculation: JSON.parse(row.calculation || '{}'),
        visualization: JSON.parse(row.visualization || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get KPIs', error);
      return [];
    }
  }

  async getKPIValue(kpiId: string, period?: string): Promise<KPIValue | null> {
    try {
      const cacheKey = period ? `${kpiId}:${period}` : kpiId;
      const cached = this.kpiCache.get(cacheKey);

      if (cached && Date.now() - cached.calculatedAt.getTime() < 5 * 60 * 1000) {
        return cached;
      }

      const result = await this.db.execute(`
        SELECT * FROM kpi_values
        WHERE kpi_id = $1 ${period ? 'AND period = $2' : ''}
        ORDER BY calculated_at DESC
        LIMIT 1
      `, period ? [kpiId, period] : [kpiId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        calculatedAt: row.calculated_at
      };

    } catch (error) {
      this.logger.error('Failed to get KPI value', error);
      return null;
    }
  }

  async generateTrendAnalysis(kpiId: string, period: string = '30d'): Promise<{
    success: boolean;
    analysis?: TrendAnalysis;
    error?: string;
  }> {
    try {
      const kpi = await this.getKPI(kpiId);
      if (!kpi) {
        throw new Error('KPI not found');
      }

      // Get historical data
      const dataPoints = await this.getKPIMetricHistory(kpiId, period);

      // Perform trend analysis
      const analysis = await this.analyzeTrend(kpi, dataPoints);

      // Save analysis
      await this.saveTrendAnalysisToDB(analysis);

      // Update cache
      this.trendCache.set(`${kpiId}:${period}`, analysis);

      this.logger.log(`Trend analysis generated: ${kpiId} - ${period}`);
      return { success: true, analysis };

    } catch (error) {
      this.logger.error('Failed to generate trend analysis', error);
      return { success: false, error: error.message };
    }
  }

  async createDashboard(dashboardData: {
    name: string;
    description: string;
    layout: BusinessDashboard['layout'];
    filters: BusinessDashboard['filters'];
    permissions: BusinessDashboard['permissions'];
    autoRefresh?: boolean;
    refreshInterval?: number;
    theme: BusinessDashboard['theme'];
    createdBy: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    dashboardId?: string;
    error?: string;
  }> {
    try {
      const dashboardId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const dashboard: BusinessDashboard = {
        id: dashboardId,
        name: dashboardData.name,
        description: dashboardData.description,
        layout: dashboardData.layout,
        filters: dashboardData.filters,
        permissions: dashboardData.permissions,
        autoRefresh: dashboardData.autoRefresh || true,
        refreshInterval: dashboardData.refreshInterval || 300, // 5 minutes
        theme: dashboardData.theme,
        createdBy: dashboardData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: dashboardData.tenantId
      };

      await this.saveDashboardToDB(dashboard);

      this.logger.log(`Dashboard created: ${dashboardId}`);
      return { success: true, dashboardId };

    } catch (error) {
      this.logger.error('Failed to create dashboard', error);
      return { success: false, error: error.message };
    }
  }

  async getDashboard(dashboardId: string): Promise<BusinessDashboard | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM business_dashboards WHERE id = $1',
        [dashboardId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        layout: JSON.parse(row.layout || '{}'),
        filters: JSON.parse(row.filters || '{}'),
        permissions: JSON.parse(row.permissions || '{}'),
        theme: JSON.parse(row.theme || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      this.logger.error('Failed to get dashboard', error);
      return null;
    }
  }

  async getDashboardData(dashboardId: string): Promise<{
    success: boolean;
    dashboard?: BusinessDashboard;
    sections?: Array<{
      id: string;
      title: string;
      widgets: Array<{
        id: string;
        type: string;
        kpiValue?: KPIValue;
        data?: any;
        error?: string;
      }>;
    }>;
    error?: string;
  }> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const sections = [];

      for (const section of dashboard.layout.sections) {
        const widgets = [];

        for (const widget of section.widgets) {
          try {
            if (widget.type === 'kpi' && widget.kpiId) {
              const kpiValue = await this.getKPIValue(widget.kpiId);
              widgets.push({
                id: widget.id,
                type: widget.type,
                kpiValue
              });
            } else {
              widgets.push({
                id: widget.id,
                type: widget.type,
                data: widget.configuration
              });
            }
          } catch (error) {
            widgets.push({
              id: widget.id,
              type: widget.type,
              error: error.message
            });
          }
        }

        sections.push({
          id: section.id,
          title: section.title,
          widgets
        });
      }

      return { success: true, dashboard, sections };

    } catch (error) {
      this.logger.error('Failed to get dashboard data', error);
      return { success: false, error: error.message };
    }
  }

  async createAlertRule(ruleData: {
    name: string;
    description: string;
    kpiId: string;
    condition: AlertRule['condition'];
    severity: AlertRule['severity'];
    notificationChannels: string[];
    notificationRecipients: string[];
    cooldown: number;
    createdBy: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    ruleId?: string;
    error?: string;
  }> {
    try {
      const ruleId = `alert-rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const rule: AlertRule = {
        id: ruleId,
        name: ruleData.name,
        description: ruleData.description,
        kpiId: ruleData.kpiId,
        condition: ruleData.condition,
        severity: ruleData.severity,
        notificationChannels: ruleData.notificationChannels,
        notificationRecipients: ruleData.notificationRecipients,
        cooldown: ruleData.cooldown,
        active: true,
        createdBy: ruleData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: ruleData.tenantId
      };

      await this.saveAlertRuleToDB(rule);

      this.logger.log(`Alert rule created: ${ruleId}`);
      return { success: true, ruleId };

    } catch (error) {
      this.logger.error('Failed to create alert rule', error);
      return { success: false, error: error.message };
    }
  }

  async generateBusinessInsights(kpiIds: string[], period: string = '7d'): Promise<{
    success: boolean;
    insights?: BusinessInsight[];
    error?: string;
  }> {
    try {
      const insights: BusinessInsight[] = [];

      for (const kpiId of kpiIds) {
        const kpi = await this.getKPI(kpiId);
        if (!kpi) continue;

        // Get recent KPI values
        const recentValues = await this.getKPIMetricHistory(kpiId, period);

        // Generate insights based on trends and patterns
        const kpiInsights = await this.generateInsightsForKPI(kpi, recentValues);
        insights.push(...kpiInsights);
      }

      // Save insights
      for (const insight of insights) {
        await this.saveInsightToDB(insight);
      }

      this.logger.log(`Generated ${insights.length} business insights`);
      return { success: true, insights };

    } catch (error) {
      this.logger.error('Failed to generate business insights', error);
      return { success: false, error: error.message };
    }
  }

  async getBusinessInsights(filters?: {
    type?: string;
    severity?: string;
    acknowledged?: boolean;
    tenantId?: string;
  }): Promise<BusinessInsight[]> {
    try {
      let query = 'SELECT * FROM business_insights WHERE 1=1';
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

      if (filters?.tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(filters.tenantId);
        paramIndex++;
      }

      query += ' ORDER BY generated_at DESC LIMIT 50';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        data: JSON.parse(row.data || '{}'),
        recommendations: JSON.parse(row.recommendations || '[]'),
        expiresAt: row.expires_at,
        acknowledgedAt: row.acknowledged_at,
        generatedAt: row.generated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get business insights', error);
      return [];
    }
  }

  async acknowledgeInsight(insightId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE business_insights SET
          acknowledged = true,
          acknowledged_by = $1,
          acknowledged_at = $2
        WHERE id = $3
      `, [userId, new Date(), insightId]);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to acknowledge insight', error);
      return { success: false, error: error.message };
    }
  }

  private async calculateKPIMetric(kpi: KPIMetric): Promise<{ value: number }> {
    const { calculation } = kpi;

    try {
      switch (calculation.type) {
        case 'sum':
          return await this.calculateSum(calculation);
        case 'average':
          return await this.calculateAverage(calculation);
        case 'count':
          return await this.calculateCount(calculation);
        case 'percentage':
          return await this.calculatePercentage(calculation);
        case 'ratio':
          return await this.calculateRatio(calculation);
        case 'formula':
          return await this.calculateFormula(calculation);
        default:
          throw new Error(`Unsupported calculation type: ${calculation.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to calculate KPI metric', error);
      throw error;
    }
  }

  private async calculateSum(calculation: any): Promise<{ value: number }> {
    let query = `SELECT SUM(${calculation.fields[0]}) as value FROM ${this.getTableForDataSource(calculation.dataSource || 'orders')} WHERE 1=1`;

    // Add date range filter
    if (calculation.dateRange) {
      const dateField = calculation.dateRange.field || 'created_at';
      const period = this.getDateRangeForPeriod(calculation.dateRange.period);
      query += ` AND ${dateField} >= '${period.start}' AND ${dateField} <= '${period.end}'`;
    }

    // Add custom filters
    for (const [key, value] of Object.entries(calculation.filters || {})) {
      query += ` AND ${key} = '${value}'`;
    }

    const result = await this.db.execute(query);
    return { value: parseFloat(result.rows[0]?.value) || 0 };
  }

  private async calculateAverage(calculation: any): Promise<{ value: number }> {
    let query = `SELECT AVG(${calculation.fields[0]}) as value FROM ${this.getTableForDataSource(calculation.dataSource || 'orders')} WHERE 1=1`;

    // Add date range filter
    if (calculation.dateRange) {
      const dateField = calculation.dateRange.field || 'created_at';
      const period = this.getDateRangeForPeriod(calculation.dateRange.period);
      query += ` AND ${dateField} >= '${period.start}' AND ${dateField} <= '${period.end}'`;
    }

    // Add custom filters
    for (const [key, value] of Object.entries(calculation.filters || {})) {
      query += ` AND ${key} = '${value}'`;
    }

    const result = await this.db.execute(query);
    return { value: parseFloat(result.rows[0]?.value) || 0 };
  }

  private async calculateCount(calculation: any): Promise<{ value: number }> {
    let query = `SELECT COUNT(*) as value FROM ${this.getTableForDataSource(calculation.dataSource || 'orders')} WHERE 1=1`;

    // Add date range filter
    if (calculation.dateRange) {
      const dateField = calculation.dateRange.field || 'created_at';
      const period = this.getDateRangeForPeriod(calculation.dateRange.period);
      query += ` AND ${dateField} >= '${period.start}' AND ${dateField} <= '${period.end}'`;
    }

    // Add custom filters
    for (const [key, value] of Object.entries(calculation.filters || {})) {
      query += ` AND ${key} = '${value}'`;
    }

    const result = await this.db.execute(query);
    return { value: parseInt(result.rows[0]?.value) || 0 };
  }

  private async calculatePercentage(calculation: any): Promise<{ value: number }> {
    // Calculate percentage based on numerator/denominator
    const numerator = await this.calculateSum({ ...calculation, fields: [calculation.fields[0]] });
    const denominator = await this.calculateSum({ ...calculation, fields: [calculation.fields[1]] });

    const value = denominator.value > 0 ? (numerator.value / denominator.value) * 100 : 0;
    return { value };
  }

  private async calculateRatio(calculation: any): Promise<{ value: number }> {
    // Calculate ratio based on two metrics
    const metric1 = await this.calculateSum({ ...calculation, fields: [calculation.fields[0]] });
    const metric2 = await this.calculateSum({ ...calculation, fields: [calculation.fields[1]] });

    const value = metric2.value > 0 ? metric1.value / metric2.value : 0;
    return { value };
  }

  private async calculateFormula(calculation: any): Promise<{ value: number }> {
    // Parse and evaluate formula (simplified implementation)
    const formula = calculation.formula;
    // This would require a proper formula parser in production
    // For now, return a mock value
    return { value: Math.floor(Math.random() * 1000) };
  }

  private async getKPIMetricHistory(kpiId: string, period: string): Promise<Array<{ date: Date; value: number }>> {
    const periodStart = this.getPeriodStartDate(period);
    const result = await this.db.execute(`
      SELECT value, calculated_at FROM kpi_values
      WHERE kpi_id = $1 AND calculated_at >= $2
      ORDER BY calculated_at ASC
    `, [kpiId, periodStart]);

    return result.rows.map(row => ({
      date: row.calculated_at,
      value: parseFloat(row.value)
    }));
  }

  private async analyzeTrend(kpi: KPIMetric, dataPoints: Array<{ date: Date; value: number }>): Promise<TrendAnalysis> {
    const analysisId = `trend-${kpi.id}-${Date.now()}`;

    // Simple trend analysis (in production, use more sophisticated algorithms)
    const values = dataPoints.map(dp => dp.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

    // Determine trend direction
    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile' = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate trend strength
    const strength = Math.abs(changePercent) > 20 ? 'strong' : Math.abs(changePercent) > 10 ? 'moderate' : 'weak';

    // Simple volatility check
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    if (volatility / mean > 0.3) {
      direction = 'volatile';
    }

    const insights = this.generateTrendInsights(kpi, changePercent, direction);

    return {
      id: analysisId,
      kpiId: kpi.id,
      metric: kpi.name,
      period: '30d',
      dataPoints,
      trend: {
        direction,
        strength,
        confidence: 0.85, // Mock confidence
        seasonality: {
          pattern: 'monthly',
          strength: 0.6
        },
        anomalies: []
      },
      insights,
      generatedAt: new Date(),
      tenantId: kpi.tenantId
    };
  }

  private generateTrendInsights(kpi: KPIMetric, changePercent: number, direction: string): string[] {
    const insights: string[] = [];

    if (Math.abs(changePercent) > 20) {
      if (changePercent > 0) {
        insights.push(`${kpi.name} %${changePercent.toFixed(1)} oranında arttı - güçlü büyüme trendi`);
      } else {
        insights.push(`${kpi.name} %${Math.abs(changePercent).toFixed(1)} oranında düştü - dikkat edilmesi gereken durum`);
      }
    } else if (Math.abs(changePercent) > 5) {
      if (changePercent > 0) {
        insights.push(`${kpi.name} hafif artış gösterdi - olumlu eğilim`);
      } else {
        insights.push(`${kpi.name} hafif düşüş yaşadı - takip edilmeli`);
      }
    } else {
      insights.push(`${kpi.name} stabil seyrediyor - normal durum`);
    }

    return insights;
  }

  private async generateInsightsForKPI(kpi: KPIMetric, recentValues: Array<{ date: Date; value: number }>): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];

    if (recentValues.length < 2) return insights;

    const latest = recentValues[recentValues.length - 1];
    const previous = recentValues[recentValues.length - 2];
    const change = latest.value - previous.value;
    const changePercent = previous.value > 0 ? (change / previous.value) * 100 : 0;

    // Generate opportunity insight
    if (changePercent > 15 && kpi.targetDirection === 'higher') {
      insights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'opportunity',
        title: 'Büyüme Fırsatı',
        description: `${kpi.name} metrikinde önemli büyüme tespit edildi`,
        severity: 'positive',
        kpiIds: [kpi.id],
        data: { changePercent, currentValue: latest.value, previousValue: previous.value },
        actionable: true,
        recommendations: [
          'Bu büyümeyi sürdürmek için pazarlama yatırımlarını artırın',
          'Müşteri memnuniyeti anketi yapın',
          'Benzer stratejileri diğer alanlara uygulayın'
        ],
        acknowledged: false,
        generatedAt: new Date(),
        tenantId: kpi.tenantId
      });
    }

    // Generate risk insight
    if (changePercent < -15 && kpi.targetDirection === 'higher') {
      insights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'risk',
        title: 'Düşüş Riski',
        description: `${kpi.name} metrikinde önemli düşüş tespit edildi`,
        severity: 'critical',
        kpiIds: [kpi.id],
        data: { changePercent, currentValue: latest.value, previousValue: previous.value },
        actionable: true,
        acknowledged: false,
        recommendations: [
          'Acil durum analizi yapın',
          'Müşteri geri bildirimlerini toplayın',
          'Pazarlama stratejilerini gözden geçirin'
        ],
        generatedAt: new Date(),
        tenantId: kpi.tenantId
      });
    }

    return insights;
  }

  private async checkKPIAlerts(kpi: KPIMetric, value: KPIValue): Promise<void> {
    // Check alert rules for this KPI
    const result = await this.db.execute(
      'SELECT * FROM alert_rules WHERE kpi_id = $1 AND active = true',
      [kpi.id]
    );

    for (const row of result.rows) {
      const rule: AlertRule = {
        ...row,
        condition: JSON.parse(row.condition || '{}'),
        notificationChannels: JSON.parse(row.notification_channels || '[]'),
        notificationRecipients: JSON.parse(row.notification_recipients || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      const shouldAlert = this.evaluateAlertCondition(rule.condition, value.value);

      if (shouldAlert) {
        await this.triggerAlert(rule, kpi, value);
      }
    }
  }

  private evaluateAlertCondition(condition: any, value: number): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.value;
      case '<':
        return value < condition.value;
      case '>=':
        return value >= condition.value;
      case '<=':
        return value <= condition.value;
      case '=':
        return value === condition.value;
      case '!=':
        return value !== condition.value;
      case 'between':
        return value >= condition.value[0] && value <= condition.value[1];
      case 'not_between':
        return value < condition.value[0] || value > condition.value[1];
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, kpi: KPIMetric, value: KPIValue): Promise<void> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check cooldown
    const lastAlert = this.activeAlerts.get(`${rule.id}:${kpi.id}`);
    if (lastAlert && Date.now() - lastAlert.timestamp.getTime() < rule.cooldown * 60 * 1000) {
      return; // Still in cooldown
    }

    // Create alert
    const alert = {
      id: alertId,
      type: 'kpi_threshold',
      kpiId: kpi.id,
      metric: kpi.name,
      severity: rule.severity,
      message: `${kpi.name} hedef değeri aşıldı: ${value.value} ${kpi.unit}`,
      data: { kpi, value, rule },
      acknowledged: false,
      createdAt: new Date(),
      tenantId: kpi.tenantId
    };

    // Save alert
    await this.saveAlertToDB(alert);

    // Track active alert
    this.activeAlerts.set(`${rule.id}:${kpi.id}`, {
      ...alert,
      timestamp: new Date()
    });

    // Send notifications
    await this.sendAlertNotifications(rule, alert);

    this.logger.log(`KPI alert triggered: ${alertId} for ${kpi.name}`);
  }

  private async sendAlertNotifications(rule: AlertRule, alert: any): Promise<void> {
    // Send via configured channels
    for (const channel of rule.notificationChannels) {
      switch (channel) {
        case 'email':
          // Send email notification
          break;
        case 'sms':
          // Send SMS notification
          break;
        case 'webhook':
          // Send webhook notification
          break;
        case 'websocket':
          // Send WebSocket notification
          break;
      }
    }
  }

  private determineTrend(change: number): 'up' | 'down' | 'stable' | 'volatile' {
    const absChange = Math.abs(change);
    if (absChange > 50) return 'volatile';
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }

  private determineKPIStatus(value: number, target?: number, direction?: string): 'good' | 'warning' | 'critical' | 'neutral' {
    if (!target) return 'neutral';

    const achievement = (value / target) * 100;

    if (direction === 'higher') {
      if (achievement >= 90) return 'good';
      if (achievement >= 70) return 'warning';
      return 'critical';
    } else if (direction === 'lower') {
      if (achievement <= 110) return 'good';
      if (achievement <= 130) return 'warning';
      return 'critical';
    } else {
      if (Math.abs(achievement - 100) <= 10) return 'good';
      if (Math.abs(achievement - 100) <= 20) return 'warning';
      return 'critical';
    }
  }

  private getTableForDataSource(dataSource: string): string {
    switch (dataSource) {
      case 'orders': return 'orders';
      case 'products': return 'products';
      case 'customers': return 'customers';
      case 'analytics': return 'analytics_events';
      case 'inventory': return 'inventory_updates';
      case 'payments': return 'payments';
      default: return 'orders';
    }
  }

  private getDateRangeForPeriod(period: string): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date();

    switch (period) {
      case 'day':
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end };
      case 'week':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end };
      case 'month':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end };
      case 'quarter':
        return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end };
      case 'year':
        return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end };
      default:
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end };
    }
  }

  private async getPreviousKPIValue(kpiId: string, period: string): Promise<KPIValue | null> {
    const periodStart = this.getPeriodStartDate(period);
    const result = await this.db.execute(`
      SELECT * FROM kpi_values
      WHERE kpi_id = $1 AND calculated_at < $2
      ORDER BY calculated_at DESC
      LIMIT 1
    `, [kpiId, periodStart]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      calculatedAt: row.calculated_at
    };
  }

  private async saveKPIToDB(kpi: KPIMetric): Promise<void> {
    await this.db.execute(`
      INSERT INTO kpi_metrics (
        id, name, description, category, calculation, target, target_direction,
        unit, visualization, refresh_interval, status, created_by, created_at, updated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      kpi.id,
      kpi.name,
      kpi.description,
      kpi.category,
      JSON.stringify(kpi.calculation),
      kpi.target,
      kpi.targetDirection,
      kpi.unit,
      JSON.stringify(kpi.visualization),
      kpi.refreshInterval,
      kpi.status,
      kpi.createdBy,
      kpi.createdAt,
      kpi.updatedAt,
      kpi.tenantId
    ]);
  }

  private async saveKPIValueToDB(value: KPIValue): Promise<void> {
    await this.db.execute(`
      INSERT INTO kpi_values (
        kpi_id, value, previous_value, change, change_percent, target,
        target_achievement, trend, status, calculated_at, period, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      value.kpiId,
      value.value,
      value.previousValue,
      value.change,
      value.changePercent,
      value.target,
      value.targetAchievement,
      value.trend,
      value.status,
      value.calculatedAt,
      value.period,
      value.tenantId
    ]);
  }

  private async saveTrendAnalysisToDB(analysis: TrendAnalysis): Promise<void> {
    await this.db.execute(`
      INSERT INTO trend_analysis (
        id, kpi_id, metric, period, data_points, trend, insights, generated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      analysis.id,
      analysis.kpiId,
      analysis.metric,
      analysis.period,
      JSON.stringify(analysis.dataPoints),
      JSON.stringify(analysis.trend),
      JSON.stringify(analysis.insights),
      analysis.generatedAt,
      analysis.tenantId
    ]);
  }

  private async saveDashboardToDB(dashboard: BusinessDashboard): Promise<void> {
    await this.db.execute(`
      INSERT INTO business_dashboards (
        id, name, description, layout, filters, permissions, auto_refresh,
        refresh_interval, theme, created_by, created_at, updated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      dashboard.id,
      dashboard.name,
      dashboard.description,
      JSON.stringify(dashboard.layout),
      JSON.stringify(dashboard.filters),
      JSON.stringify(dashboard.permissions),
      dashboard.autoRefresh,
      dashboard.refreshInterval,
      JSON.stringify(dashboard.theme),
      dashboard.createdBy,
      dashboard.createdAt,
      dashboard.updatedAt,
      dashboard.tenantId
    ]);
  }

  private async saveAlertRuleToDB(rule: AlertRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO alert_rules (
        id, name, description, kpi_id, condition, severity,
        notification_channels, notification_recipients, cooldown, active,
        created_by, created_at, updated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      rule.id,
      rule.name,
      rule.description,
      rule.kpiId,
      JSON.stringify(rule.condition),
      rule.severity,
      JSON.stringify(rule.notificationChannels),
      JSON.stringify(rule.notificationRecipients),
      rule.cooldown,
      rule.active,
      rule.createdBy,
      rule.createdAt,
      rule.updatedAt,
      rule.tenantId
    ]);
  }

  private async saveAlertToDB(alert: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO kpi_alerts (
        id, type, kpi_id, metric, severity, message, data,
        acknowledged, created_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      alert.id,
      alert.type,
      alert.kpiId,
      alert.metric,
      alert.severity,
      alert.message,
      JSON.stringify(alert.data),
      alert.acknowledged,
      alert.createdAt,
      alert.tenantId
    ]);
  }

  private async saveInsightToDB(insight: BusinessInsight): Promise<void> {
    await this.db.execute(`
      INSERT INTO business_insights (
        id, type, title, description, severity, kpi_ids, data,
        actionable, recommendations, expires_at, acknowledged,
        generated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      insight.id,
      insight.type,
      insight.title,
      insight.description,
      insight.severity,
      JSON.stringify(insight.kpiIds),
      JSON.stringify(insight.data),
      insight.actionable,
      JSON.stringify(insight.recommendations),
      insight.expiresAt,
      insight.acknowledged,
      insight.generatedAt,
      insight.tenantId
    ]);
  }

  private startKPICalculation(): void {
    // Calculate KPIs every 5 minutes
    setInterval(async () => {
      await this.calculateAllKPIs();
    }, 5 * 60 * 1000);
  }

  private startTrendAnalysis(): void {
    // Generate trend analysis every hour
    setInterval(async () => {
      await this.generateAllTrendAnalysis();
    }, 60 * 60 * 1000);
  }

  private startAlertMonitoring(): void {
    // Check for alerts every minute
    setInterval(async () => {
      await this.checkAllAlerts();
    }, 60 * 1000);
  }

  private startInsightGeneration(): void {
    // Generate insights every 2 hours
    setInterval(async () => {
      await this.generateAllInsights();
    }, 2 * 60 * 60 * 1000);
  }

  private async calculateAllKPIs(): Promise<void> {
    try {
      const result = await this.db.execute('SELECT id FROM kpi_metrics WHERE status = $1', ['active']);

      for (const row of result.rows) {
        await this.calculateKPIValue(row.id);
      }
    } catch (error) {
      this.logger.error('Failed to calculate all KPIs', error);
    }
  }

  private async generateAllTrendAnalysis(): Promise<void> {
    try {
      const result = await this.db.execute('SELECT id FROM kpi_metrics WHERE status = $1', ['active']);

      for (const row of result.rows) {
        await this.generateTrendAnalysis(row.id);
      }
    } catch (error) {
      this.logger.error('Failed to generate all trend analysis', error);
    }
  }

  private async checkAllAlerts(): Promise<void> {
    try {
      // Check for KPI threshold alerts
      const result = await this.db.execute('SELECT * FROM kpi_metrics WHERE status = $1', ['active']);

      for (const row of result.rows) {
        const kpi: KPIMetric = {
          ...row,
          calculation: JSON.parse(row.calculation || '{}'),
          visualization: JSON.parse(row.visualization || '{}'),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        const value = await this.getKPIValue(kpi.id);
        if (value) {
          await this.checkKPIAlerts(kpi, value);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check all alerts', error);
    }
  }

  private async generateAllInsights(): Promise<void> {
    try {
      const result = await this.db.execute('SELECT id FROM kpi_metrics WHERE status = $1', ['active']);

      const kpiIds = result.rows.map(row => row.id);
      await this.generateBusinessInsights(kpiIds);
    } catch (error) {
      this.logger.error('Failed to generate all insights', error);
    }
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
