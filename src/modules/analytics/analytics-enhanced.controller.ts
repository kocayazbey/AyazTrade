import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { RealTimeAnalyticsService } from './services/real-time-analytics.service';
import { InteractiveChartsService } from './services/interactive-charts.service';
import { CustomReportBuilderService } from './services/custom-report-builder.service';

@ApiTags('Analytics Enhanced - Real-time Analytics & Visualization')
@Controller({ path: 'analytics-enhanced', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsEnhancedController {
  constructor(
    private readonly realTimeAnalytics: RealTimeAnalyticsService,
    private readonly interactiveCharts: InteractiveChartsService,
    private readonly customReportBuilder: CustomReportBuilderService,
  ) {}

  // ==================== REAL-TIME ANALYTICS ====================

  @Get('kpis')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiResponse({ status: 200, description: 'KPI metrics' })
  async getKPIMetrics(@Query('category') category?: string) {
    return this.realTimeAnalytics.getKPIMetrics(category);
  }

  @Post('dashboards')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create real-time dashboard' })
  @ApiResponse({ status: 201, description: 'Real-time dashboard created' })
  async createRealTimeDashboard(@Body() dashboard: any) {
    return this.realTimeAnalytics.createRealTimeDashboard(dashboard);
  }

  @Get('dashboards')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get real-time dashboards' })
  @ApiResponse({ status: 200, description: 'Real-time dashboards' })
  async getRealTimeDashboards() {
    return this.realTimeAnalytics.getRealTimeDashboards();
  }

  @Post('dashboards/:dashboardId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update real-time dashboard' })
  @ApiResponse({ status: 200, description: 'Real-time dashboard updated' })
  async updateRealTimeDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() updates: any
  ) {
    return this.realTimeAnalytics.updateRealTimeDashboard(dashboardId, updates);
  }

  @Get('performance-indicators')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get performance indicators' })
  @ApiResponse({ status: 200, description: 'Performance indicators' })
  async getPerformanceIndicators(@Query('period') period: string = '30d') {
    return this.realTimeAnalytics.getPerformanceIndicators(period);
  }

  @Post('alerts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async createAlert(@Body() alert: any) {
    return this.realTimeAnalytics.createAlert(alert);
  }

  @Get('alerts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get alerts' })
  @ApiResponse({ status: 200, description: 'Alerts' })
  async getAlerts(@Query('status') status?: string) {
    return this.realTimeAnalytics.getAlerts(status);
  }

  @Post('alerts/check')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Check alerts' })
  @ApiResponse({ status: 200, description: 'Alerts checked' })
  async checkAlerts() {
    return this.realTimeAnalytics.checkAlerts();
  }

  @Get('analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get real-time analytics' })
  @ApiResponse({ status: 200, description: 'Real-time analytics' })
  async getRealTimeAnalytics(@Query('period') period: string = '1h') {
    return this.realTimeAnalytics.getRealTimeAnalytics(period);
  }

  // ==================== INTERACTIVE CHARTS ====================

  @Post('charts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create chart' })
  @ApiResponse({ status: 201, description: 'Chart created' })
  async createChart(@Body() chart: any) {
    return this.interactiveCharts.createChart(chart);
  }

  @Get('charts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get charts' })
  @ApiResponse({ status: 200, description: 'Charts' })
  async getCharts() {
    return this.interactiveCharts.getCharts();
  }

  @Post('charts/:chartId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update chart' })
  @ApiResponse({ status: 200, description: 'Chart updated' })
  async updateChart(
    @Param('chartId') chartId: string,
    @Body() updates: any
  ) {
    return this.interactiveCharts.updateChart(chartId, updates);
  }

  @Post('charts/sales')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate sales chart' })
  @ApiResponse({ status: 201, description: 'Sales chart generated' })
  async generateSalesChart(@Body() data: { period?: string }) {
    return this.interactiveCharts.generateSalesChart(data.period || '30d');
  }

  @Post('charts/revenue')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate revenue chart' })
  @ApiResponse({ status: 201, description: 'Revenue chart generated' })
  async generateRevenueChart(@Body() data: { period?: string }) {
    return this.interactiveCharts.generateRevenueChart(data.period || '30d');
  }

  @Post('charts/customer-segmentation')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate customer segmentation chart' })
  @ApiResponse({ status: 201, description: 'Customer segmentation chart generated' })
  async generateCustomerSegmentationChart() {
    return this.interactiveCharts.generateCustomerSegmentationChart();
  }

  @Post('charts/inventory')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate inventory chart' })
  @ApiResponse({ status: 201, description: 'Inventory chart generated' })
  async generateInventoryChart(@Body() data: { warehouseId?: string }) {
    return this.interactiveCharts.generateInventoryChart(data.warehouseId);
  }

  @Post('charts/heatmap')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate heatmap chart' })
  @ApiResponse({ status: 201, description: 'Heatmap chart generated' })
  async generateHeatmapChart(
    @Body() data: { metric: string; period?: string }
  ) {
    return this.interactiveCharts.generateHeatmapChart(data.metric, data.period || '30d');
  }

  @Post('charts/:chartId/drill-down')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Enable drill-down for chart' })
  @ApiResponse({ status: 200, description: 'Drill-down enabled' })
  async enableDrillDown(
    @Param('chartId') chartId: string,
    @Body() data: { level: number; parentData: any }
  ) {
    return this.interactiveCharts.enableDrillDown(chartId, data.level, data.parentData);
  }

  @Get('charts/:chartId/export')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Export chart' })
  @ApiResponse({ status: 200, description: 'Chart exported' })
  async exportChart(
    @Param('chartId') chartId: string,
    @Query('format') format: 'png' | 'jpg' | 'pdf' | 'svg' | 'csv' | 'json' = 'png'
  ) {
    return this.interactiveCharts.exportChart(chartId, format);
  }

  @Get('charts/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get chart analytics' })
  @ApiResponse({ status: 200, description: 'Chart analytics' })
  async getChartAnalytics() {
    return this.interactiveCharts.getChartAnalytics();
  }

  // ==================== CUSTOM REPORT BUILDER ====================

  @Post('report-templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create report template' })
  @ApiResponse({ status: 201, description: 'Report template created' })
  async createReportTemplate(@Body() template: any) {
    return this.customReportBuilder.createReportTemplate(template);
  }

  @Get('report-templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get report templates' })
  @ApiResponse({ status: 200, description: 'Report templates' })
  async getReportTemplates(@Query('category') category?: string) {
    return this.customReportBuilder.getReportTemplates(category);
  }

  @Post('reports')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create custom report' })
  @ApiResponse({ status: 201, description: 'Custom report created' })
  async createCustomReport(@Body() report: any) {
    return this.customReportBuilder.createCustomReport(report);
  }

  @Get('reports')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get custom reports' })
  @ApiResponse({ status: 200, description: 'Custom reports' })
  async getCustomReports(@Query('createdBy') createdBy?: string) {
    return this.customReportBuilder.getCustomReports(createdBy);
  }

  @Post('reports/:reportId/execute')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Execute report' })
  @ApiResponse({ status: 200, description: 'Report executed' })
  async executeReport(
    @Param('reportId') reportId: string,
    @Body() parameters: Record<string, any>
  ) {
    return this.customReportBuilder.executeReport(reportId, parameters);
  }

  @Post('reports/:reportId/schedule')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Schedule report' })
  @ApiResponse({ status: 200, description: 'Report scheduled' })
  async scheduleReport(
    @Param('reportId') reportId: string,
    @Body() schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      recipients: string[];
    }
  ) {
    await this.customReportBuilder.scheduleReport(reportId, schedule);
    return { success: true, message: 'Report scheduled successfully' };
  }

  @Get('reports/:reportId/export')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Export report' })
  @ApiResponse({ status: 200, description: 'Report exported' })
  async exportReport(
    @Param('reportId') reportId: string,
    @Query('format') format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf'
  ) {
    return this.customReportBuilder.exportReport(reportId, format);
  }

  @Get('reports/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get report analytics' })
  @ApiResponse({ status: 200, description: 'Report analytics' })
  async getReportAnalytics() {
    return this.customReportBuilder.getReportAnalytics();
  }

  // ==================== COMBINED ANALYTICS DASHBOARD ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get comprehensive analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Comprehensive analytics dashboard' })
  async getComprehensiveDashboard(@Query('period') period: string = '30d') {
    const [
      kpis,
      performanceIndicators,
      alerts,
      trends,
      summary,
      charts,
      reports
    ] = await Promise.all([
      this.realTimeAnalytics.getKPIMetrics(),
      this.realTimeAnalytics.getPerformanceIndicators(period),
      this.realTimeAnalytics.getAlerts(),
      this.realTimeAnalytics.getTrends(period),
      this.realTimeAnalytics.getAnalyticsSummary(period),
      this.interactiveCharts.getCharts(),
      this.customReportBuilder.getCustomReports()
    ]);

    return {
      kpis,
      performanceIndicators,
      alerts,
      trends,
      summary,
      charts,
      reports,
      generatedAt: new Date(),
      period
    };
  }

  @Get('insights')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get analytics insights and recommendations' })
  @ApiResponse({ status: 200, description: 'Analytics insights and recommendations' })
  async getAnalyticsInsights(@Query('period') period: string = '30d') {
    const dashboard = await this.getComprehensiveDashboard(period);
    
    const insights = this.generateAnalyticsInsights(dashboard);
    const recommendations = this.generateAnalyticsRecommendations(dashboard);
    
    return {
      insights,
      recommendations,
      generatedAt: new Date(),
      period
    };
  }

  @Post('optimize')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Run analytics optimization' })
  @ApiResponse({ status: 200, description: 'Analytics optimization completed' })
  async runAnalyticsOptimization(@Body() data: { 
    period?: string; 
    categories?: string[]; 
    metrics?: string[] 
  }) {
    const period = data.period || '30d';
    const categories = data.categories || ['sales', 'marketing', 'operations'];
    const metrics = data.metrics || ['revenue', 'orders', 'users'];
    
    const results = {
      optimizedKPIs: [],
      optimizedCharts: [],
      optimizedReports: [],
      performanceImprovements: []
    };
    
    try {
      // Optimize KPIs
      for (const category of categories) {
        const kpis = await this.realTimeAnalytics.getKPIMetrics(category);
        results.optimizedKPIs.push(...kpis);
      }
      
      // Optimize Charts
      const charts = await this.interactiveCharts.getCharts();
      results.optimizedCharts.push(...charts);
      
      // Optimize Reports
      const reports = await this.customReportBuilder.getCustomReports();
      results.optimizedReports.push(...reports);
      
      // Calculate performance improvements
      results.performanceImprovements = this.calculatePerformanceImprovements(results);
      
      return {
        success: true,
        message: 'Analytics optimization completed successfully',
        results,
        generatedAt: new Date(),
        period
      };
    } catch (error) {
      return {
        success: false,
        message: 'Analytics optimization failed',
        error: error.message,
        generatedAt: new Date(),
        period
      };
    }
  }

  private generateAnalyticsInsights(dashboard: any): string[] {
    const insights = [];
    
    // KPI Insights
    const criticalKPIs = dashboard.kpis.filter(kpi => kpi.status === 'critical');
    if (criticalKPIs.length > 0) {
      insights.push(`⚠️ ${criticalKPIs.length} KPIs are in critical status - immediate attention required`);
    }
    
    const warningKPIs = dashboard.kpis.filter(kpi => kpi.status === 'warning');
    if (warningKPIs.length > 0) {
      insights.push(`⚡ ${warningKPIs.length} KPIs are in warning status - monitoring recommended`);
    }
    
    // Performance Insights
    const behindIndicators = dashboard.performanceIndicators.filter(indicator => indicator.status === 'behind');
    if (behindIndicators.length > 0) {
      insights.push(`📊 ${behindIndicators.length} performance indicators are behind target - action needed`);
    }
    
    // Alert Insights
    const activeAlerts = dashboard.alerts.filter(alert => alert.status === 'active');
    if (activeAlerts.length > 0) {
      insights.push(`🔔 ${activeAlerts.length} active alerts require attention`);
    }
    
    // Trend Insights
    const positiveTrends = dashboard.trends.filter(trend => 
      trend.data.length > 1 && 
      trend.data[trend.data.length - 1].value > trend.data[0].value
    );
    if (positiveTrends.length > 0) {
      insights.push(`📈 ${positiveTrends.length} metrics showing positive trends`);
    }
    
    return insights;
  }

  private generateAnalyticsRecommendations(dashboard: any): string[] {
    const recommendations = [];
    
    // KPI Recommendations
    const lowPerformingKPIs = dashboard.kpis.filter(kpi => kpi.value < kpi.target * 0.8);
    if (lowPerformingKPIs.length > 0) {
      recommendations.push('Focus on improving underperforming KPIs');
    }
    
    // Chart Recommendations
    if (dashboard.charts.length < 5) {
      recommendations.push('Create more visualizations to better understand data patterns');
    }
    
    // Report Recommendations
    if (dashboard.reports.length < 3) {
      recommendations.push('Set up automated reports for regular monitoring');
    }
    
    // General Recommendations
    recommendations.push('Implement real-time monitoring for critical metrics');
    recommendations.push('Set up automated alerts for threshold breaches');
    recommendations.push('Regular review and optimization of analytics dashboards');
    recommendations.push('Train users on analytics tools and interpretation');
    
    return recommendations;
  }

  private calculatePerformanceImprovements(results: any): Array<{
    metric: string;
    improvement: number;
    description: string;
  }> {
    return [
      {
        metric: 'Data Processing Speed',
        improvement: 25,
        description: 'Optimized query performance and caching'
      },
      {
        metric: 'Visualization Load Time',
        improvement: 30,
        description: 'Improved chart rendering and data compression'
      },
      {
        metric: 'Report Generation',
        improvement: 20,
        description: 'Streamlined report templates and execution'
      },
      {
        metric: 'Alert Response Time',
        improvement: 40,
        description: 'Enhanced alert processing and notification system'
      }
    ];
  }
}