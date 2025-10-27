import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  dataSource: string;
  query: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    required: boolean;
    defaultValue?: any;
    options?: string[];
  }>;
  visualizations: Array<{
    id: string;
    type: 'table' | 'chart' | 'kpi' | 'gauge';
    title: string;
    config: Record<string, any>;
  }>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  templateId: string;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  visualizations: Array<{
    id: string;
    type: string;
    title: string;
    config: Record<string, any>;
    data: any;
  }>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  results: any;
  parameters: Record<string, any>;
}

interface ReportExport {
  id: string;
  reportId: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  data: string;
  filename: string;
  mimeType: string;
  generatedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class CustomReportBuilderService {
  private readonly logger = new Logger(CustomReportBuilderService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createReportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    const templateId = `template-${Date.now()}`;
    
    const newTemplate: ReportTemplate = {
      id: templateId,
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveReportTemplate(newTemplate);
    
    this.logger.log(`Created report template: ${templateId}`);
    return newTemplate;
  }

  async getReportTemplates(category?: string): Promise<ReportTemplate[]> {
    let query = 'SELECT * FROM report_templates';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '[]'),
      visualizations: JSON.parse(row.visualizations || '[]')
    }));
  }

  async createCustomReport(report: Omit<CustomReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomReport> {
    const reportId = `report-${Date.now()}`;
    
    const newReport: CustomReport = {
      id: reportId,
      ...report,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveCustomReport(newReport);
    
    this.logger.log(`Created custom report: ${reportId}`);
    return newReport;
  }

  async getCustomReports(createdBy?: string): Promise<CustomReport[]> {
    let query = 'SELECT * FROM custom_reports';
    const params = [];
    
    if (createdBy) {
      query += ' WHERE created_by = $1';
      params.push(createdBy);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '{}'),
      filters: JSON.parse(row.filters || '{}'),
      visualizations: JSON.parse(row.visualizations || '[]'),
      schedule: row.schedule ? JSON.parse(row.schedule) : undefined
    }));
  }

  async executeReport(reportId: string, parameters: Record<string, any>): Promise<ReportExecution> {
    this.logger.log(`Executing report: ${reportId}`);
    
    const report = await this.getCustomReport(reportId);
    const executionId = `execution-${Date.now()}`;
    
    const execution: ReportExecution = {
      id: executionId,
      reportId,
      status: 'pending',
      startedAt: new Date(),
      parameters,
      results: null
    };
    
    await this.saveReportExecution(execution);
    
    try {
      execution.status = 'running';
      await this.updateReportExecution(execution);
      
      const results = await this.runReportQuery(report, parameters);
      execution.results = results;
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      
      await this.updateReportExecution(execution);
      
      this.logger.log(`Report execution completed: ${executionId}`);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      
      await this.updateReportExecution(execution);
      
      this.logger.error(`Report execution failed: ${executionId} - ${error.message}`);
      throw error;
    }
  }

  async scheduleReport(reportId: string, schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  }): Promise<void> {
    this.logger.log(`Scheduling report: ${reportId}`);
    
    const report = await this.getCustomReport(reportId);
    report.schedule = schedule;
    
    await this.saveCustomReport(report);
    
    this.logger.log(`Report scheduled: ${reportId}`);
  }

  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv' | 'json'): Promise<ReportExport> {
    this.logger.log(`Exporting report ${reportId} in format: ${format}`);
    
    const report = await this.getCustomReport(reportId);
    const execution = await this.executeReport(reportId, report.parameters);
    
    const exportData = this.generateExportData(execution.results, format);
    const exportId = `export-${Date.now()}`;
    
    const reportExport: ReportExport = {
      id: exportId,
      reportId,
      format,
      data: exportData.data,
      filename: `${report.name}.${format}`,
      mimeType: this.getMimeType(format),
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    await this.saveReportExport(reportExport);
    
    this.logger.log(`Report exported: ${reportExport.filename}`);
    return reportExport;
  }

  async getReportAnalytics(): Promise<{
    totalReports: number;
    totalTemplates: number;
    executionStats: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    popularTemplates: Array<{
      templateId: string;
      name: string;
      usage: number;
    }>;
    exportStats: Array<{
      format: string;
      count: number;
    }>;
  }> {
    const reportsResult = await this.db.execute(`
      SELECT COUNT(*) as total_reports FROM custom_reports
    `);
    
    const templatesResult = await this.db.execute(`
      SELECT COUNT(*) as total_templates FROM report_templates
    `);
    
    const executionsResult = await this.db.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM report_executions
      GROUP BY status
    `);
    
    const totalExecutions = executionsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    const executionStats = executionsResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count) || 0,
      percentage: totalExecutions > 0 ? (parseInt(row.count) / totalExecutions) * 100 : 0
    }));
    
    const popularResult = await this.db.execute(`
      SELECT 
        rt.id as template_id,
        rt.name,
        COUNT(cr.id) as usage
      FROM report_templates rt
      LEFT JOIN custom_reports cr ON rt.id = cr.template_id
      GROUP BY rt.id, rt.name
      ORDER BY usage DESC
      LIMIT 5
    `);
    
    const popularTemplates = popularResult.rows.map(row => ({
      templateId: row.template_id,
      name: row.name,
      usage: parseInt(row.usage) || 0
    }));
    
    const exportsResult = await this.db.execute(`
      SELECT 
        format,
        COUNT(*) as count
      FROM report_exports
      GROUP BY format
    `);
    
    const exportStats = exportsResult.rows.map(row => ({
      format: row.format,
      count: parseInt(row.count) || 0
    }));
    
    return {
      totalReports: parseInt(reportsResult.rows[0]?.total_reports) || 0,
      totalTemplates: parseInt(templatesResult.rows[0]?.total_templates) || 0,
      executionStats,
      popularTemplates,
      exportStats
    };
  }

  private async runReportQuery(report: CustomReport, parameters: Record<string, any>): Promise<any> {
    const template = await this.getReportTemplate(report.templateId);
    let query = template.query;
    
    // Replace parameters in query
    for (const [key, value] of Object.entries(parameters)) {
      query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    // Execute query
    const result = await this.db.execute(query);
    
    return {
      columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
      data: result.rows,
      totalRows: result.rows.length
    };
  }

  private generateExportData(results: any, format: string): { data: string } {
    switch (format) {
      case 'csv':
        return { data: this.generateCSV(results) };
      case 'json':
        return { data: JSON.stringify(results) };
      case 'excel':
        return { data: this.generateExcel(results) };
      case 'pdf':
        return { data: this.generatePDF(results) };
      default:
        return { data: JSON.stringify(results) };
    }
  }

  private generateCSV(results: any): string {
    if (!results.data || results.data.length === 0) {
      return '';
    }
    
    const headers = results.columns;
    const rows = results.data.map(row => 
      headers.map(header => row[header] || '')
    );
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateExcel(results: any): string {
    // Mock Excel generation
    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from('mock excel data').toString('base64')}`;
  }

  private generatePDF(results: any): string {
    // Mock PDF generation
    return `data:application/pdf;base64,${Buffer.from('mock pdf data').toString('base64')}`;
  }

  private getMimeType(format: string): string {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }

  private async getCustomReport(reportId: string): Promise<CustomReport> {
    const result = await this.db.execute(`
      SELECT * FROM custom_reports WHERE id = $1
    `, [reportId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      parameters: JSON.parse(row.parameters || '{}'),
      filters: JSON.parse(row.filters || '{}'),
      visualizations: JSON.parse(row.visualizations || '[]'),
      schedule: row.schedule ? JSON.parse(row.schedule) : undefined
    };
  }

  private async getReportTemplate(templateId: string): Promise<ReportTemplate> {
    const result = await this.db.execute(`
      SELECT * FROM report_templates WHERE id = $1
    `, [templateId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      parameters: JSON.parse(row.parameters || '[]'),
      visualizations: JSON.parse(row.visualizations || '[]')
    };
  }

  private async saveReportTemplate(template: ReportTemplate): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_templates (id, name, description, category, data_source, query, parameters, visualizations, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      template.id,
      template.name,
      template.description,
      template.category,
      template.dataSource,
      template.query,
      JSON.stringify(template.parameters),
      JSON.stringify(template.visualizations),
      template.isPublic,
      template.createdAt,
      template.updatedAt
    ]);
  }

  private async saveCustomReport(report: CustomReport): Promise<void> {
    await this.db.execute(`
      INSERT INTO custom_reports (id, name, description, template_id, parameters, filters, visualizations, schedule, is_public, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        template_id = EXCLUDED.template_id,
        parameters = EXCLUDED.parameters,
        filters = EXCLUDED.filters,
        visualizations = EXCLUDED.visualizations,
        schedule = EXCLUDED.schedule,
        is_public = EXCLUDED.is_public,
        updated_at = EXCLUDED.updated_at
    `, [
      report.id,
      report.name,
      report.description,
      report.templateId,
      JSON.stringify(report.parameters),
      JSON.stringify(report.filters),
      JSON.stringify(report.visualizations),
      report.schedule ? JSON.stringify(report.schedule) : null,
      report.isPublic,
      report.createdBy,
      report.createdAt,
      report.updatedAt
    ]);
  }

  private async saveReportExecution(execution: ReportExecution): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_executions (id, report_id, status, started_at, completed_at, duration, error, results, parameters)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      execution.id,
      execution.reportId,
      execution.status,
      execution.startedAt,
      execution.completedAt,
      execution.duration,
      execution.error,
      execution.results ? JSON.stringify(execution.results) : null,
      JSON.stringify(execution.parameters)
    ]);
  }

  private async updateReportExecution(execution: ReportExecution): Promise<void> {
    await this.db.execute(`
      UPDATE report_executions SET
        status = $2,
        completed_at = $3,
        duration = $4,
        error = $5,
        results = $6
      WHERE id = $1
    `, [
      execution.id,
      execution.status,
      execution.completedAt,
      execution.duration,
      execution.error,
      execution.results ? JSON.stringify(execution.results) : null
    ]);
  }

  private async saveReportExport(reportExport: ReportExport): Promise<void> {
    await this.db.execute(`
      INSERT INTO report_exports (id, report_id, format, data, filename, mime_type, generated_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      reportExport.id,
      reportExport.reportId,
      reportExport.format,
      reportExport.data,
      reportExport.filename,
      reportExport.mimeType,
      reportExport.generatedAt,
      reportExport.expiresAt
    ]);
  }
}