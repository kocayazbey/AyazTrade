import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface CustomReport {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'chart' | 'table' | 'kpi' | 'funnel';
  dataSource: 'orders' | 'products' | 'customers' | 'analytics' | 'inventory' | 'payments';
  configuration: {
    dimensions: string[];
    metrics: string[];
    filters: Record<string, any>;
    dateRange: {
      start: Date;
      end: Date;
      period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    };
    groupBy?: string[];
    orderBy?: {
      field: string;
      direction: 'asc' | 'desc';
    };
    limit?: number;
    visualization: {
      chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'table';
      colors?: string[];
      showLegend?: boolean;
      showGrid?: boolean;
      stacked?: boolean;
    };
  };
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    recipients?: string[];
  };
  permissions: {
    view: string[]; // user IDs or roles
    edit: string[];
    delete: string[];
  };
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

interface ReportExecution {
  id: string;
  reportId: string;
  executedAt: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  data?: any;
  error?: string;
  executionTime: number; // milliseconds
  resultCount?: number;
  triggeredBy?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  category: 'sales' | 'marketing' | 'inventory' | 'customer' | 'financial' | 'custom';
  description: string;
  configuration: Partial<CustomReport['configuration']>;
  thumbnail?: string;
  tags: string[];
  public: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface ReportDashboard {
  id: string;
  name: string;
  description: string;
  layout: {
    widgets: Array<{
      id: string;
      reportId: string;
      position: { x: number; y: number; w: number; h: number };
      title: string;
      type: 'chart' | 'kpi' | 'table' | 'text';
    }>;
  };
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
  refreshInterval: number; // seconds
  permissions: {
    view: string[];
    edit: string[];
    delete: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

@Injectable()
export class AnalyticsCustomReportsService {
  private readonly logger = new Logger(AnalyticsCustomReportsService.name);

  private activeExecutions: Map<string, ReportExecution> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start scheduled report execution
    this.startScheduledReportExecution();

    // Start dashboard refresh
    this.startDashboardRefresh();
  }

  async createReport(reportData: {
    name: string;
    description: string;
    type: 'dashboard' | 'chart' | 'table' | 'kpi' | 'funnel';
    dataSource: 'orders' | 'products' | 'customers' | 'analytics' | 'inventory' | 'payments';
    configuration: CustomReport['configuration'];
    schedule?: {
      frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
      time?: string;
      recipients?: string[];
    };
    permissions: {
      view: string[];
      edit: string[];
      delete: string[];
    };
    createdBy: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    reportId?: string;
    error?: string;
  }> {
    try {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const report: CustomReport = {
        id: reportId,
        name: reportData.name,
        description: reportData.description,
        type: reportData.type,
        dataSource: reportData.dataSource,
        configuration: reportData.configuration,
        schedule: reportData.schedule,
        permissions: reportData.permissions,
        status: 'active',
        createdBy: reportData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: reportData.tenantId
      };

      await this.saveReportToDB(report);

      // Schedule report if needed
      if (reportData.schedule) {
        await this.scheduleReport(reportId, reportData.schedule);
      }

      this.logger.log(`Custom report created: ${reportId} - ${reportData.name}`);
      return { success: true, reportId };

    } catch (error) {
      this.logger.error('Failed to create custom report', error);
      return { success: false, error: error.message };
    }
  }

  async executeReport(reportId: string, triggeredBy?: string): Promise<{
    success: boolean;
    executionId?: string;
    data?: any;
    error?: string;
  }> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      // Create execution record
      const execution: ReportExecution = {
        id: executionId,
        reportId,
        executedAt: new Date(),
        status: 'running',
        triggeredBy,
        executionTime: 0
      };

      this.activeExecutions.set(executionId, execution);
      await this.saveExecutionToDB(execution);

      try {
        // Generate report data
        const data = await this.generateReportData(report);

        // Update execution
        execution.status = 'completed';
        execution.data = data;
        execution.resultCount = Array.isArray(data) ? data.length : 1;
        execution.executionTime = Date.now() - startTime;

        await this.updateExecutionInDB(execution);

        this.logger.log(`Report executed: ${reportId} - ${executionId}`);
        return { success: true, executionId, data };

      } catch (error) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.executionTime = Date.now() - startTime;

        await this.updateExecutionInDB(execution);
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to execute report', error);
      return { success: false, error: error.message };
    }
  }

  async getReport(reportId: string): Promise<CustomReport | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM custom_reports WHERE id = $1',
        [reportId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        configuration: JSON.parse(row.configuration || '{}'),
        schedule: JSON.parse(row.schedule || '{}'),
        permissions: JSON.parse(row.permissions || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      this.logger.error('Failed to get report', error);
      return null;
    }
  }

  async updateReport(reportId: string, updates: Partial<CustomReport>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const updatedReport = { ...report, ...updates, updatedAt: new Date() };

      await this.db.execute(`
        UPDATE custom_reports SET
          name = $1, description = $2, type = $3, data_source = $4,
          configuration = $5, schedule = $6, permissions = $7,
          status = $8, updated_at = $9
        WHERE id = $10
      `, [
        updatedReport.name,
        updatedReport.description,
        updatedReport.type,
        updatedReport.dataSource,
        JSON.stringify(updatedReport.configuration),
        JSON.stringify(updatedReport.schedule || {}),
        JSON.stringify(updatedReport.permissions),
        updatedReport.status,
        updatedReport.updatedAt,
        reportId
      ]);

      this.logger.log(`Report updated: ${reportId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to update report', error);
      return { success: false, error: error.message };
    }
  }

  async deleteReport(reportId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute('DELETE FROM custom_reports WHERE id = $1', [reportId]);
      this.logger.log(`Report deleted: ${reportId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to delete report', error);
      return { success: false, error: error.message };
    }
  }

  async getReports(filters?: {
    type?: string;
    dataSource?: string;
    status?: string;
    createdBy?: string;
    tenantId?: string;
  }): Promise<CustomReport[]> {
    try {
      let query = 'SELECT * FROM custom_reports WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters?.dataSource) {
        query += ` AND data_source = $${paramIndex}`;
        params.push(filters.dataSource);
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
        configuration: JSON.parse(row.configuration || '{}'),
        schedule: JSON.parse(row.schedule || '{}'),
        permissions: JSON.parse(row.permissions || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get reports', error);
      return [];
    }
  }

  async createTemplate(templateData: {
    name: string;
    category: 'sales' | 'marketing' | 'inventory' | 'customer' | 'financial' | 'custom';
    description: string;
    configuration: Partial<CustomReport['configuration']>;
    thumbnail?: string;
    tags: string[];
    public: boolean;
    createdBy: string;
  }): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const template: ReportTemplate = {
        id: templateId,
        name: templateData.name,
        category: templateData.category,
        description: templateData.description,
        configuration: templateData.configuration,
        thumbnail: templateData.thumbnail,
        tags: templateData.tags,
        public: templateData.public,
        createdBy: templateData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };

      await this.saveTemplateToDB(template);

      this.logger.log(`Report template created: ${templateId}`);
      return { success: true, templateId };

    } catch (error) {
      this.logger.error('Failed to create template', error);
      return { success: false, error: error.message };
    }
  }

  async getTemplates(category?: string): Promise<ReportTemplate[]> {
    try {
      let query = 'SELECT * FROM report_templates WHERE 1=1';
      const params = [];

      if (category) {
        query += ' AND category = $1';
        params.push(category);
      }

      query += ' ORDER BY usage_count DESC, created_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        configuration: JSON.parse(row.configuration || '{}'),
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get templates', error);
      return [];
    }
  }

  async createDashboard(dashboardData: {
    name: string;
    description: string;
    layout: {
      widgets: Array<{
        id: string;
        reportId: string;
        position: { x: number; y: number; w: number; h: number };
        title: string;
        type: 'chart' | 'kpi' | 'table' | 'text';
      }>;
    };
    theme: {
      primaryColor: string;
      backgroundColor: string;
      fontFamily: string;
    };
    refreshInterval: number;
    permissions: {
      view: string[];
      edit: string[];
      delete: string[];
    };
    createdBy: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    dashboardId?: string;
    error?: string;
  }> {
    try {
      const dashboardId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const dashboard: ReportDashboard = {
        id: dashboardId,
        name: dashboardData.name,
        description: dashboardData.description,
        layout: dashboardData.layout,
        theme: dashboardData.theme,
        refreshInterval: dashboardData.refreshInterval,
        permissions: dashboardData.permissions,
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

  async getDashboard(dashboardId: string): Promise<ReportDashboard | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM report_dashboards WHERE id = $1',
        [dashboardId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        layout: JSON.parse(row.layout || '{}'),
        theme: JSON.parse(row.theme || '{}'),
        permissions: JSON.parse(row.permissions || '{}'),
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
    dashboard?: ReportDashboard;
    widgets?: Array<{
      id: string;
      title: string;
      type: string;
      data: any;
      error?: string;
    }>;
    error?: string;
  }> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const widgets = [];

      for (const widget of dashboard.layout.widgets) {
        try {
          const report = await this.getReport(widget.reportId);
          if (report) {
            const execution = await this.executeReport(widget.reportId);
            widgets.push({
              id: widget.id,
              title: widget.title,
              type: widget.type,
              data: execution.data
            });
          }
        } catch (error) {
          widgets.push({
            id: widget.id,
            title: widget.title,
            type: widget.type,
            error: error.message
          });
        }
      }

      return { success: true, dashboard, widgets };

    } catch (error) {
      this.logger.error('Failed to get dashboard data', error);
      return { success: false, error: error.message };
    }
  }

  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv' | 'json'): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const data = await this.generateReportData(report);

      switch (format) {
        case 'pdf':
          return await this.exportToPDF(data, report);
        case 'excel':
          return await this.exportToExcel(data, report);
        case 'csv':
          return await this.exportToCSV(data, report);
        case 'json':
          return await this.exportToJSON(data, report);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      this.logger.error('Failed to export report', error);
      return { success: false, error: error.message };
    }
  }

  private async generateReportData(report: CustomReport): Promise<any> {
    const { dataSource, configuration } = report;

    try {
      switch (dataSource) {
        case 'orders':
          return await this.generateOrdersReport(configuration);
        case 'products':
          return await this.generateProductsReport(configuration);
        case 'customers':
          return await this.generateCustomersReport(configuration);
        case 'analytics':
          return await this.generateAnalyticsReport(configuration);
        case 'inventory':
          return await this.generateInventoryReport(configuration);
        case 'payments':
          return await this.generatePaymentsReport(configuration);
        default:
          throw new Error(`Unsupported data source: ${dataSource}`);
      }
    } catch (error) {
      this.logger.error('Failed to generate report data', error);
      throw error;
    }
  }

  private async generateOrdersReport(config: any): Promise<any> {
    const { dateRange, dimensions, metrics, filters } = config;

    let query = `
      SELECT ${[...dimensions, ...metrics].join(', ')}
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `;
    const params = [dateRange.start, dateRange.end];
    let paramIndex = 3;

    // Add filters
    for (const [key, value] of Object.entries(filters || {})) {
      query += ` AND ${key} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    // Add grouping
    if (config.groupBy?.length) {
      query += ` GROUP BY ${config.groupBy.join(', ')}`;
    }

    // Add ordering
    if (config.orderBy) {
      query += ` ORDER BY ${config.orderBy.field} ${config.orderBy.direction}`;
    }

    // Add limit
    if (config.limit) {
      query += ` LIMIT ${config.limit}`;
    }

    const result = await this.db.execute(query, params);

    // Transform data for visualization
    return this.transformDataForVisualization(result.rows, config);
  }

  private async generateProductsReport(config: any): Promise<any> {
    // Similar implementation for products
    return this.generateOrdersReport(config); // Simplified
  }

  private async generateCustomersReport(config: any): Promise<any> {
    // Similar implementation for customers
    return this.generateOrdersReport(config); // Simplified
  }

  private async generateAnalyticsReport(config: any): Promise<any> {
    // Similar implementation for analytics
    return this.generateOrdersReport(config); // Simplified
  }

  private async generateInventoryReport(config: any): Promise<any> {
    // Similar implementation for inventory
    return this.generateOrdersReport(config); // Simplified
  }

  private async generatePaymentsReport(config: any): Promise<any> {
    // Similar implementation for payments
    return this.generateOrdersReport(config); // Simplified
  }

  private transformDataForVisualization(data: any[], config: any): any {
    const { visualization } = config;

    switch (visualization.chartType) {
      case 'table':
        return {
          type: 'table',
          headers: Object.keys(data[0] || {}),
          rows: data
        };

      case 'line':
      case 'bar':
      case 'area':
        return {
          type: visualization.chartType,
          labels: data.map(item => item[config.dimensions[0]]),
          datasets: config.metrics.map((metric: string) => ({
            label: metric,
            data: data.map(item => item[metric])
          })),
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true }
            }
          }
        };

      case 'pie':
      case 'doughnut':
        return {
          type: visualization.chartType,
          labels: data.map(item => item[config.dimensions[0]]),
          datasets: [{
            data: data.map(item => item[config.metrics[0]]),
            backgroundColor: visualization.colors || this.getDefaultColors(data.length)
          }]
        };

      default:
        return data;
    }
  }

  private async exportToPDF(data: any, report: CustomReport): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    // PDF export implementation
    const downloadUrl = `/api/reports/${report.id}/export/pdf`;
    return { success: true, downloadUrl };
  }

  private async exportToExcel(data: any, report: CustomReport): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    // Excel export implementation
    const downloadUrl = `/api/reports/${report.id}/export/excel`;
    return { success: true, downloadUrl };
  }

  private async exportToCSV(data: any, report: CustomReport): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    // CSV export implementation
    const downloadUrl = `/api/reports/${report.id}/export/csv`;
    return { success: true, downloadUrl };
  }

  private async exportToJSON(data: any, report: CustomReport): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    // JSON export implementation
    const downloadUrl = `/api/reports/${report.id}/export/json`;
    return { success: true, downloadUrl };
  }

  private getDefaultColors(count: number): string[] {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];
    return colors.slice(0, count);
  }

  private async saveReportToDB(report: CustomReport): Promise<void> {
    await this.db.execute(`
      INSERT INTO custom_reports (
        id, name, description, type, data_source, configuration,
        schedule, permissions, status, created_by, created_at, updated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      report.id,
      report.name,
      report.description,
      report.type,
      report.dataSource,
      JSON.stringify(report.configuration),
      JSON.stringify(report.schedule || {}),
      JSON.stringify(report.permissions),
      report.status,
      report.createdBy,
      report.createdAt,
      report.updatedAt,
      report.tenantId
    ]);
  }

  private async saveExecutionToDB(execution: ReportExecution): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_executions (
        id, report_id, executed_at, status, data, error,
        execution_time, result_count, triggered_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      execution.id,
      execution.reportId,
      execution.executedAt,
      execution.status,
      JSON.stringify(execution.data || {}),
      execution.error,
      execution.executionTime,
      execution.resultCount,
      execution.triggeredBy
    ]);
  }

  private async updateExecutionInDB(execution: ReportExecution): Promise<void> {
    await this.db.execute(`
      UPDATE report_executions SET
        status = $1, data = $2, error = $3, execution_time = $4, result_count = $5
      WHERE id = $6
    `, [
      execution.status,
      JSON.stringify(execution.data || {}),
      execution.error,
      execution.executionTime,
      execution.resultCount,
      execution.id
    ]);
  }

  private async saveTemplateToDB(template: ReportTemplate): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_templates (
        id, name, category, description, configuration,
        thumbnail, tags, public, created_by, created_at, updated_at, usage_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      template.id,
      template.name,
      template.category,
      template.description,
      JSON.stringify(template.configuration),
      template.thumbnail,
      JSON.stringify(template.tags),
      template.public,
      template.createdBy,
      template.createdAt,
      template.updatedAt,
      template.usageCount
    ]);
  }

  private async saveDashboardToDB(dashboard: ReportDashboard): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_dashboards (
        id, name, description, layout, theme, refresh_interval,
        permissions, created_by, created_at, updated_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      dashboard.id,
      dashboard.name,
      dashboard.description,
      JSON.stringify(dashboard.layout),
      JSON.stringify(dashboard.theme),
      dashboard.refreshInterval,
      JSON.stringify(dashboard.permissions),
      dashboard.createdBy,
      dashboard.createdAt,
      dashboard.updatedAt,
      dashboard.tenantId
    ]);
  }

  private async scheduleReport(reportId: string, schedule: any): Promise<void> {
    // Schedule implementation (simplified)
    this.logger.log(`Report scheduled: ${reportId} - ${schedule.frequency}`);
  }

  private startScheduledReportExecution(): void {
    // Execute scheduled reports every hour
    setInterval(async () => {
      await this.executeScheduledReports();
    }, 60 * 60 * 1000);
  }

  private startDashboardRefresh(): void {
    // Refresh dashboards every 30 seconds
    setInterval(async () => {
      await this.refreshDashboards();
    }, 30 * 1000);
  }

  private async executeScheduledReports(): Promise<void> {
    try {
      const result = await this.db.execute(`
        SELECT id FROM custom_reports
        WHERE status = 'active'
        AND schedule IS NOT NULL
        AND schedule->>'frequency' IS NOT NULL
      `);

      for (const row of result.rows) {
        await this.executeReport(row.id, 'scheduler');
      }
    } catch (error) {
      this.logger.error('Failed to execute scheduled reports', error);
    }
  }

  private async refreshDashboards(): Promise<void> {
    try {
      const result = await this.db.execute(`
        SELECT id FROM report_dashboards
        WHERE refresh_interval > 0
      `);

      for (const row of result.rows) {
        // Refresh dashboard widgets
        await this.getDashboardData(row.id);
      }
    } catch (error) {
      this.logger.error('Failed to refresh dashboards', error);
    }
  }
}
