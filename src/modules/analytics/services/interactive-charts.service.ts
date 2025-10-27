import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface ChartConfig {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'gauge' | 'heatmap' | 'treemap';
  data: any;
  options: {
    title: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    animations?: boolean;
    interactive?: boolean;
    responsive?: boolean;
  };
  filters: Record<string, any>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }>;
}

interface DrillDownData {
  chartId: string;
  level: number;
  parentData: any;
  childData: any[];
  breadcrumb: string[];
}

interface ChartExport {
  format: 'png' | 'jpg' | 'pdf' | 'svg' | 'csv' | 'json';
  data: string;
  filename: string;
  mimeType: string;
}

@Injectable()
export class InteractiveChartsService {
  private readonly logger = new Logger(InteractiveChartsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createChart(chart: Omit<ChartConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChartConfig> {
    const chartId = `chart-${Date.now()}`;
    
    const newChart: ChartConfig = {
      id: chartId,
      ...chart,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveChart(newChart);
    
    this.logger.log(`Created chart: ${chartId}`);
    return newChart;
  }

  async getCharts(): Promise<ChartConfig[]> {
    const result = await this.db.execute(`
      SELECT * FROM interactive_charts
      ORDER BY updated_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}'),
      options: JSON.parse(row.options || '{}'),
      filters: JSON.parse(row.filters || '{}')
    }));
  }

  async updateChart(chartId: string, updates: Partial<ChartConfig>): Promise<ChartConfig> {
    const existing = await this.getChart(chartId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveChart(updated);
    
    this.logger.log(`Updated chart: ${chartId}`);
    return updated;
  }

  async generateSalesChart(period: string = '30d'): Promise<ChartConfig> {
    this.logger.log(`Generating sales chart for period: ${period}`);
    
    const salesData = await this.getSalesData(period);
    const chartData = this.formatSalesData(salesData);
    
    const chart: ChartConfig = {
      id: `sales-chart-${Date.now()}`,
      name: 'Sales Performance',
      type: 'line',
      data: chartData,
      options: {
        title: 'Sales Performance Over Time',
        xAxis: 'Date',
        yAxis: 'Revenue (USD)',
        colors: ['#3B82F6', '#10B981', '#F59E0B'],
        animations: true,
        interactive: true,
        responsive: true
      },
      filters: { period },
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveChart(chart);
    
    this.logger.log(`Sales chart generated: ${chart.id}`);
    return chart;
  }

  async generateRevenueChart(period: string = '30d'): Promise<ChartConfig> {
    this.logger.log(`Generating revenue chart for period: ${period}`);
    
    const revenueData = await this.getRevenueData(period);
    const chartData = this.formatRevenueData(revenueData);
    
    const chart: ChartConfig = {
      id: `revenue-chart-${Date.now()}`,
      name: 'Revenue Analysis',
      type: 'bar',
      data: chartData,
      options: {
        title: 'Revenue by Category',
        xAxis: 'Category',
        yAxis: 'Revenue (USD)',
        colors: ['#8B5CF6', '#06B6D4', '#84CC16'],
        animations: true,
        interactive: true,
        responsive: true
      },
      filters: { period },
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveChart(chart);
    
    this.logger.log(`Revenue chart generated: ${chart.id}`);
    return chart;
  }

  async generateCustomerSegmentationChart(): Promise<ChartConfig> {
    this.logger.log('Generating customer segmentation chart');
    
    const segmentationData = await this.getCustomerSegmentationData();
    const chartData = this.formatSegmentationData(segmentationData);
    
    const chart: ChartConfig = {
      id: `segmentation-chart-${Date.now()}`,
      name: 'Customer Segmentation',
      type: 'pie',
      data: chartData,
      options: {
        title: 'Customer Distribution by Segment',
        colors: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4'],
        animations: true,
        interactive: true,
        responsive: true
      },
      filters: {},
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveChart(chart);
    
    this.logger.log(`Customer segmentation chart generated: ${chart.id}`);
    return chart;
  }

  async generateInventoryChart(warehouseId?: string): Promise<ChartConfig> {
    this.logger.log(`Generating inventory chart for warehouse: ${warehouseId || 'all'}`);
    
    const inventoryData = await this.getInventoryData(warehouseId);
    const chartData = this.formatInventoryData(inventoryData);
    
    const chart: ChartConfig = {
      id: `inventory-chart-${Date.now()}`,
      name: 'Inventory Levels',
      type: 'gauge',
      data: chartData,
      options: {
        title: 'Inventory Stock Levels',
        colors: ['#EF4444', '#F97316', '#EAB308', '#22C55E'],
        animations: true,
        interactive: true,
        responsive: true
      },
      filters: { warehouseId },
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveChart(chart);
    
    this.logger.log(`Inventory chart generated: ${chart.id}`);
    return chart;
  }

  async generateHeatmapChart(metric: string, period: string = '30d'): Promise<ChartConfig> {
    this.logger.log(`Generating heatmap chart for metric: ${metric}`);
    
    const heatmapData = await this.getHeatmapData(metric, period);
    const chartData = this.formatHeatmapData(heatmapData);
    
    const chart: ChartConfig = {
      id: `heatmap-chart-${Date.now()}`,
      name: `${metric} Heatmap`,
      type: 'heatmap',
      data: chartData,
      options: {
        title: `${metric} Heatmap Analysis`,
        colors: ['#FEF3C7', '#FDE68A', '#F59E0B', '#D97706', '#92400E'],
        animations: true,
        interactive: true,
        responsive: true
      },
      filters: { metric, period },
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveChart(chart);
    
    this.logger.log(`Heatmap chart generated: ${chart.id}`);
    return chart;
  }

  async enableDrillDown(chartId: string, level: number, parentData: any): Promise<DrillDownData> {
    this.logger.log(`Enabling drill-down for chart: ${chartId}`);
    
    const childData = await this.getDrillDownData(chartId, level, parentData);
    
    const drillDownData: DrillDownData = {
      chartId,
      level,
      parentData,
      childData,
      breadcrumb: this.generateBreadcrumb(level, parentData)
    };
    
    this.logger.log(`Drill-down enabled for chart: ${chartId}`);
    return drillDownData;
  }

  async exportChart(chartId: string, format: 'png' | 'jpg' | 'pdf' | 'svg' | 'csv' | 'json'): Promise<ChartExport> {
    this.logger.log(`Exporting chart ${chartId} in format: ${format}`);
    
    const chart = await this.getChart(chartId);
    const exportData = this.generateExportData(chart, format);
    
    const chartExport: ChartExport = {
      format,
      data: exportData.data,
      filename: `${chart.name}.${format}`,
      mimeType: this.getMimeType(format)
    };
    
    this.logger.log(`Chart exported: ${chartExport.filename}`);
    return chartExport;
  }

  async getChartAnalytics(): Promise<{
    totalCharts: number;
    chartTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    popularCharts: Array<{
      chartId: string;
      name: string;
      views: number;
    }>;
    exportStats: Array<{
      format: string;
      count: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_charts
      FROM interactive_charts
    `);
    
    const totalCharts = parseInt(result.rows[0]?.total_charts) || 0;
    
    const typesResult = await this.db.execute(`
      SELECT 
        type,
        COUNT(*) as count
      FROM interactive_charts
      GROUP BY type
    `);
    
    const chartTypes = typesResult.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count) || 0,
      percentage: totalCharts > 0 ? (parseInt(row.count) / totalCharts) * 100 : 0
    }));
    
    const popularResult = await this.db.execute(`
      SELECT 
        id as chart_id,
        name,
        view_count as views
      FROM interactive_charts
      ORDER BY view_count DESC
      LIMIT 5
    `);
    
    const popularCharts = popularResult.rows.map(row => ({
      chartId: row.chart_id,
      name: row.name,
      views: parseInt(row.views) || 0
    }));
    
    const exportResult = await this.db.execute(`
      SELECT 
        export_format as format,
        COUNT(*) as count
      FROM chart_exports
      GROUP BY export_format
    `);
    
    const exportStats = exportResult.rows.map(row => ({
      format: row.format,
      count: parseInt(row.count) || 0
    }));
    
    return {
      totalCharts,
      chartTypes,
      popularCharts,
      exportStats
    };
  }

  private async getSalesData(period: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${period}'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    return result.rows;
  }

  private formatSalesData(salesData: any[]): ChartData {
    return {
      labels: salesData.map(d => d.date),
      datasets: [
        {
          label: 'Revenue',
          data: salesData.map(d => parseFloat(d.revenue) || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3B82F6',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Orders',
          data: salesData.map(d => parseInt(d.orders) || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10B981',
          borderWidth: 2,
          fill: false
        }
      ]
    };
  }

  private async getRevenueData(period: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT 
        p.category,
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY p.category
      ORDER BY revenue DESC
    `);
    
    return result.rows;
  }

  private formatRevenueData(revenueData: any[]): ChartData {
    return {
      labels: revenueData.map(d => d.category),
      datasets: [
        {
          label: 'Revenue',
          data: revenueData.map(d => parseFloat(d.revenue) || 0),
          backgroundColor: [
            '#8B5CF6',
            '#06B6D4',
            '#84CC16',
            '#F59E0B',
            '#EF4444'
          ]
        }
      ]
    };
  }

  private async getCustomerSegmentationData(): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT 
        segment,
        COUNT(*) as count,
        AVG(ltv) as avg_ltv
      FROM customer_segments
      GROUP BY segment
    `);
    
    return result.rows;
  }

  private formatSegmentationData(segmentationData: any[]): ChartData {
    return {
      labels: segmentationData.map(d => d.segment),
      datasets: [
        {
          label: 'Customers',
          data: segmentationData.map(d => parseInt(d.count) || 0),
          backgroundColor: [
            '#EF4444',
            '#F97316',
            '#EAB308',
            '#22C55E',
            '#06B6D4'
          ]
        }
      ]
    };
  }

  private async getInventoryData(warehouseId?: string): Promise<any[]> {
    let query = `
      SELECT 
        p.name as product,
        SUM(i.quantity) as stock,
        p.reorder_point,
        p.safety_stock
      FROM inventory i
      JOIN products p ON i.product_id = p.id
    `;
    
    const params = [];
    if (warehouseId) {
      query += ' WHERE i.warehouse_id = $1';
      params.push(warehouseId);
    }
    
    query += ' GROUP BY p.id, p.name, p.reorder_point, p.safety_stock ORDER BY stock ASC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  private formatInventoryData(inventoryData: any[]): ChartData {
    return {
      labels: inventoryData.map(d => d.product),
      datasets: [
        {
          label: 'Current Stock',
          data: inventoryData.map(d => parseInt(d.stock) || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: '#22C55E',
          borderWidth: 2
        },
        {
          label: 'Reorder Point',
          data: inventoryData.map(d => parseInt(d.reorder_point) || 0),
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: '#F59E0B',
          borderWidth: 2
        }
      ]
    };
  }

  private async getHeatmapData(metric: string, period: string): Promise<any[]> {
    // Mock heatmap data generation
    const data = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    for (const day of days) {
      for (const hour of hours) {
        data.push({
          day,
          hour,
          value: Math.random() * 100
        });
      }
    }
    
    return data;
  }

  private formatHeatmapData(heatmapData: any[]): ChartData {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    const data = hours.map(hour => 
      days.map(day => {
        const item = heatmapData.find(d => d.day === day && d.hour === hour);
        return item ? item.value : 0;
      })
    );
    
    return {
      labels: days,
      datasets: [
        {
          label: 'Heatmap Data',
          data: data.flat(),
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: '#F59E0B'
        }
      ]
    };
  }

  private async getDrillDownData(chartId: string, level: number, parentData: any): Promise<any[]> {
    // Mock drill-down data
    return Array.from({ length: 5 }, (_, i) => ({
      id: `child-${i}`,
      name: `Child ${i}`,
      value: Math.random() * 100
    }));
  }

  private generateBreadcrumb(level: number, parentData: any): string[] {
    const breadcrumb = ['Home'];
    
    for (let i = 1; i <= level; i++) {
      breadcrumb.push(`Level ${i}`);
    }
    
    if (parentData && parentData.name) {
      breadcrumb.push(parentData.name);
    }
    
    return breadcrumb;
  }

  private generateExportData(chart: ChartConfig, format: string): { data: string } {
    switch (format) {
      case 'csv':
        return { data: this.generateCSV(chart) };
      case 'json':
        return { data: JSON.stringify(chart.data) };
      case 'png':
      case 'jpg':
      case 'pdf':
      case 'svg':
        return { data: this.generateImageData(chart, format) };
      default:
        return { data: JSON.stringify(chart) };
    }
  }

  private generateCSV(chart: ChartConfig): string {
    const data = chart.data;
    const headers = ['Label', ...data.datasets.map(d => d.label)];
    const rows = data.labels.map((label, index) => [
      label,
      ...data.datasets.map(d => d.data[index])
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateImageData(chart: ChartConfig, format: string): string {
    // Mock image data generation
    return `data:image/${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private getMimeType(format: string): string {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'pdf': 'application/pdf',
      'svg': 'image/svg+xml',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }

  private async getChart(chartId: string): Promise<ChartConfig> {
    const result = await this.db.execute(`
      SELECT * FROM interactive_charts WHERE id = $1
    `, [chartId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Chart not found: ${chartId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      data: JSON.parse(row.data || '{}'),
      options: JSON.parse(row.options || '{}'),
      filters: JSON.parse(row.filters || '{}')
    };
  }

  private async saveChart(chart: ChartConfig): Promise<void> {
    await this.db.execute(`
      INSERT INTO interactive_charts (id, name, type, data, options, filters, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        data = EXCLUDED.data,
        options = EXCLUDED.options,
        filters = EXCLUDED.filters,
        is_public = EXCLUDED.is_public,
        updated_at = EXCLUDED.updated_at
    `, [
      chart.id,
      chart.name,
      chart.type,
      JSON.stringify(chart.data),
      JSON.stringify(chart.options),
      JSON.stringify(chart.filters),
      chart.isPublic,
      chart.createdAt,
      chart.updatedAt
    ]);
  }
}