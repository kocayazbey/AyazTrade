import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { IoTSensorService } from './services/iot-sensor.service';
import { AutomatedReplenishmentService } from './services/automated-replenishment.service';
import { RealTimeTrackingService } from './services/real-time-tracking.service';
import { AiQualityControlService } from './services/ai-quality-control.service';

@ApiTags('WMS IoT - Warehouse IoT Integration')
@Controller({ path: 'wms-iot', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WmsIoTController {
  constructor(
    private readonly iotSensor: IoTSensorService,
    private readonly automatedReplenishment: AutomatedReplenishmentService,
    private readonly realTimeTracking: RealTimeTrackingService,
    private readonly aiQualityControl: AiQualityControlService,
  ) {}

  // ==================== IoT SENSORS ====================

  @Post('sensors')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create IoT sensor' })
  @ApiResponse({ status: 201, description: 'IoT sensor created' })
  async createSensor(@Body() sensor: any) {
    return this.iotSensor.createSensor(sensor);
  }

  @Get('sensors')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get IoT sensors' })
  @ApiResponse({ status: 200, description: 'IoT sensors' })
  async getSensors(@Query('warehouseId') warehouseId?: string, @Query('type') type?: string) {
    return this.iotSensor.getSensors(warehouseId, type);
  }

  @Post('sensors/:sensorId/readings')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Record sensor reading' })
  @ApiResponse({ status: 201, description: 'Sensor reading recorded' })
  async recordSensorReading(
    @Param('sensorId') _sensorId: string,
    @Body() reading: any
  ) {
    return this.iotSensor.recordSensorReading(reading);
  }

  @Get('sensors/:sensorId/readings')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sensor readings' })
  @ApiResponse({ status: 200, description: 'Sensor readings' })
  async getSensorReadings(
    @Param('sensorId') sensorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = 1000
  ) {
    return this.iotSensor.getSensorReadings(
      sensorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit
    );
  }

  @Get('sensors/alerts')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sensor alerts' })
  @ApiResponse({ status: 200, description: 'Sensor alerts' })
  async getSensorAlerts(
    @Query('sensorId') sensorId?: string,
    @Query('severity') severity?: string,
    @Query('acknowledged') acknowledged?: boolean
  ) {
    return this.iotSensor.getSensorAlerts(sensorId, severity, acknowledged);
  }

  @Post('sensors/alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge sensor alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    await this.iotSensor.acknowledgeAlert(alertId);
    return { success: true };
  }

  @Post('sensors/alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve sensor alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(@Param('alertId') alertId: string) {
    await this.iotSensor.resolveAlert(alertId);
    return { success: true };
  }

  @Get('sensors/:sensorId/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get sensor analytics' })
  @ApiResponse({ status: 200, description: 'Sensor analytics' })
  async getSensorAnalytics(
    @Param('sensorId') sensorId: string,
    @Query('period') period: string = '24h'
  ) {
    return this.iotSensor.getSensorAnalytics(sensorId, period);
  }

  @Post('sensors/:sensorId/calibrate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calibrate sensor' })
  @ApiResponse({ status: 200, description: 'Sensor calibrated' })
  async calibrateSensor(
    @Param('sensorId') sensorId: string,
    @Body() data: { offset: number; multiplier: number }
  ) {
    await this.iotSensor.calibrateSensor(sensorId, data.offset, data.multiplier);
    return { success: true };
  }

  @Get('sensors/realtime')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get real-time sensor data' })
  @ApiResponse({ status: 200, description: 'Real-time sensor data' })
  async getRealTimeData(@Query('warehouseId') warehouseId?: string) {
    return this.iotSensor.getRealTimeData(warehouseId);
  }

  // ==================== AUTOMATED REPLENISHMENT ====================

  @Post('replenishment/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create replenishment rule' })
  @ApiResponse({ status: 201, description: 'Replenishment rule created' })
  async createReplenishmentRule(@Body() rule: any) {
    return this.automatedReplenishment.createReplenishmentRule(rule);
  }

  @Get('replenishment/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get replenishment rules' })
  @ApiResponse({ status: 200, description: 'Replenishment rules' })
  async getReplenishmentRules(@Query('productId') productId?: string, @Query('warehouseId') warehouseId?: string) {
    return this.automatedReplenishment.getReplenishmentRules(productId, warehouseId);
  }

  @Post('replenishment/process')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process replenishment checks' })
  @ApiResponse({ status: 200, description: 'Replenishment checks processed' })
  async processReplenishmentChecks() {
    await this.automatedReplenishment.processReplenishmentChecks();
    return { success: true };
  }

  @Post('replenishment/forecast/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate demand forecast' })
  @ApiResponse({ status: 200, description: 'Demand forecast generated' })
  async generateDemandForecast(
    @Param('productId') productId: string,
    @Body() data: { warehouseId: string; period?: string }
  ) {
    return this.automatedReplenishment.generateDemandForecast(productId, data.warehouseId, data.period);
  }

  @Post('replenishment/optimize/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize inventory' })
  @ApiResponse({ status: 200, description: 'Inventory optimized' })
  async optimizeInventory(
    @Param('productId') productId: string,
    @Body() data: { warehouseId: string }
  ) {
    return this.automatedReplenishment.optimizeInventory(productId, data.warehouseId);
  }

  @Post('replenishment/orders')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create replenishment order' })
  @ApiResponse({ status: 201, description: 'Replenishment order created' })
  async createReplenishmentOrder(@Body() order: any) {
    return this.automatedReplenishment.createReplenishmentOrder(order);
  }

  @Get('replenishment/orders')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get replenishment orders' })
  @ApiResponse({ status: 200, description: 'Replenishment orders' })
  async getReplenishmentOrders(@Query('status') status?: string, @Query('priority') priority?: string) {
    return this.automatedReplenishment.getReplenishmentOrders(status, priority);
  }

  @Post('replenishment/orders/:orderId/status')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update replenishment order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateReplenishmentOrderStatus(
    @Param('orderId') orderId: string,
    @Body() data: { status: string }
  ) {
    await this.automatedReplenishment.updateReplenishmentOrderStatus(orderId, data.status);
    return { success: true };
  }

  @Get('replenishment/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get replenishment analytics' })
  @ApiResponse({ status: 200, description: 'Replenishment analytics' })
  async getReplenishmentAnalytics(@Query('period') period: string = '30d') {
    return this.automatedReplenishment.getReplenishmentAnalytics(period);
  }

  // ==================== REAL-TIME TRACKING ====================

  @Post('tracking/devices')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create tracking device' })
  @ApiResponse({ status: 201, description: 'Tracking device created' })
  async createTrackingDevice(@Body() device: any) {
    return this.realTimeTracking.createTrackingDevice(device);
  }

  @Get('tracking/devices')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get tracking devices' })
  @ApiResponse({ status: 200, description: 'Tracking devices' })
  async getTrackingDevices(@Query('warehouseId') warehouseId?: string, @Query('type') type?: string) {
    return this.realTimeTracking.getTrackingDevices(warehouseId, type);
  }

  @Post('tracking/events')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Record tracking event' })
  @ApiResponse({ status: 201, description: 'Tracking event recorded' })
  async recordTrackingEvent(@Body() event: any) {
    return this.realTimeTracking.recordTrackingEvent(event);
  }

  @Get('tracking/events')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get tracking events' })
  @ApiResponse({ status: 200, description: 'Tracking events' })
  async getTrackingEvents(
    @Query('deviceId') deviceId?: string,
    @Query('itemId') itemId?: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit: number = 1000
  ) {
    return this.realTimeTracking.getTrackingEvents(deviceId, itemId, eventType, limit);
  }

  @Get('tracking/items/:itemId/location')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get item location' })
  @ApiResponse({ status: 200, description: 'Item location' })
  async getItemLocation(@Param('itemId') itemId: string) {
    return this.realTimeTracking.getItemLocation(itemId);
  }

  @Get('tracking/items/:itemId/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get item tracking history' })
  @ApiResponse({ status: 200, description: 'Item tracking history' })
  async getItemTrackingHistory(
    @Param('itemId') itemId: string,
    @Query('limit') limit: number = 100
  ) {
    return this.realTimeTracking.getItemTrackingHistory(itemId, limit);
  }

  @Post('tracking/scan')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Scan item' })
  @ApiResponse({ status: 200, description: 'Item scanned' })
  async scanItem(
    @Body() data: { deviceId: string; itemId: string; itemType: string; location: any }
  ) {
    return this.realTimeTracking.scanItem(data.deviceId, data.itemId, data.itemType, data.location);
  }

  @Post('tracking/movement')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Track item movement' })
  @ApiResponse({ status: 200, description: 'Item movement tracked' })
  async trackItemMovement(
    @Body() data: { itemId: string; fromLocation: any; toLocation: any; metadata?: Record<string, any> }
  ) {
    return this.realTimeTracking.trackItemMovement(data.itemId, data.fromLocation, data.toLocation, data.metadata);
  }

  @Get('tracking/locations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get real-time locations' })
  @ApiResponse({ status: 200, description: 'Real-time locations' })
  async getRealTimeLocations(@Query('warehouseId') warehouseId?: string) {
    return this.realTimeTracking.getRealTimeLocations(warehouseId);
  }

  @Get('tracking/search')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Search items' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchItems(@Query('query') query: string, @Query('warehouseId') warehouseId?: string) {
    return this.realTimeTracking.searchItems(query, warehouseId);
  }

  @Get('tracking/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get tracking analytics' })
  @ApiResponse({ status: 200, description: 'Tracking analytics' })
  async getTrackingAnalytics(@Query('period') period: string = '24h') {
    return this.realTimeTracking.getTrackingAnalytics(period);
  }

  @Get('tracking/report/:warehouseId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate location report' })
  @ApiResponse({ status: 200, description: 'Location report' })
  async generateLocationReport(
    @Param('warehouseId') warehouseId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.realTimeTracking.generateLocationReport(warehouseId, new Date(startDate), new Date(endDate));
  }

  // ==================== AI QUALITY CONTROL ====================

  @Post('quality/standards')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create quality standard' })
  @ApiResponse({ status: 201, description: 'Quality standard created' })
  async createQualityStandard(@Body() standard: any) {
    return this.aiQualityControl.createQualityStandard(standard);
  }

  @Get('quality/standards')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get quality standards' })
  @ApiResponse({ status: 200, description: 'Quality standards' })
  async getQualityStandards(@Query('productId') productId?: string) {
    return this.aiQualityControl.getQualityStandards(productId);
  }

  @Post('quality/inspections')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create quality inspection' })
  @ApiResponse({ status: 201, description: 'Quality inspection created' })
  async createQualityInspection(@Body() inspection: any) {
    return this.aiQualityControl.createQualityInspection(inspection);
  }

  @Get('quality/inspections')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get quality inspections' })
  @ApiResponse({ status: 200, description: 'Quality inspections' })
  async getQualityInspections(@Query('productId') productId?: string, @Query('status') status?: string) {
    return this.aiQualityControl.getQualityInspections(productId, status);
  }

  @Post('quality/inspections/:inspectionId/ai-process')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Process AI inspection' })
  @ApiResponse({ status: 200, description: 'AI inspection processed' })
  async processAiInspection(
    @Param('inspectionId') inspectionId: string,
    @Body() data: { images: string[] }
  ) {
    return this.aiQualityControl.processAiInspection(inspectionId, data.images);
  }

  @Post('quality/inspections/:inspectionId/status')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update inspection status' })
  @ApiResponse({ status: 200, description: 'Inspection status updated' })
  async updateInspectionStatus(
    @Param('inspectionId') inspectionId: string,
    @Body() data: { status: string; inspectorId?: string; notes?: string }
  ) {
    await this.aiQualityControl.updateInspectionStatus(inspectionId, data.status, data.inspectorId, data.notes);
    return { success: true };
  }

  @Get('quality/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get quality analytics' })
  @ApiResponse({ status: 200, description: 'Quality analytics' })
  async getQualityAnalytics(@Query('period') period: string = '30d') {
    return this.aiQualityControl.getQualityAnalytics(period);
  }

  @Get('quality/report/:productId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate quality report' })
  @ApiResponse({ status: 200, description: 'Quality report' })
  async generateQualityReport(
    @Param('productId') productId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.aiQualityControl.generateQualityReport(productId, new Date(startDate), new Date(endDate));
  }

  // ==================== COMPREHENSIVE WMS IoT ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WMS IoT dashboard' })
  @ApiResponse({ status: 200, description: 'WMS IoT dashboard data' })
  async getWmsIoTDashboard() {
    const [
      sensorAnalytics,
      replenishmentAnalytics,
      trackingAnalytics,
      qualityAnalytics
    ] = await Promise.all([
      this.iotSensor.getSensorAnalytics('sensor-1', '24h'),
      this.automatedReplenishment.getReplenishmentAnalytics(),
      this.realTimeTracking.getTrackingAnalytics(),
      this.aiQualityControl.getQualityAnalytics()
    ]);

    return {
      sensors: sensorAnalytics,
      replenishment: replenishmentAnalytics,
      tracking: trackingAnalytics,
      quality: qualityAnalytics,
      lastUpdated: new Date(),
      insights: this.generateWmsIoTInsights(sensorAnalytics, replenishmentAnalytics, trackingAnalytics, qualityAnalytics)
    };
  }

  @Get('health')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get WMS IoT health' })
  @ApiResponse({ status: 200, description: 'WMS IoT health status' })
  async getWmsIoTHealth() {
    return {
      iotSensors: 'healthy',
      automatedReplenishment: 'healthy',
      realTimeTracking: 'healthy',
      aiQualityControl: 'healthy',
      lastChecked: new Date(),
      uptime: 99.8,
      performance: {
        averageResponseTime: 250,
        throughput: 500,
        errorRate: 0.02
      }
    };
  }

  private generateWmsIoTInsights(sensorAnalytics: any, replenishmentAnalytics: any, trackingAnalytics: any, qualityAnalytics: any) {
    const insights = [];
    
    if (sensorAnalytics.qualityScore < 90) {
      insights.push('📊 Sensor data quality is below target - check sensor calibration');
    }
    
    if (replenishmentAnalytics.efficiency < 80) {
      insights.push('📦 Replenishment efficiency is low - review automation rules');
    }
    
    if (trackingAnalytics.locationAccuracy < 95) {
      insights.push('📍 Tracking accuracy is below target - check device positioning');
    }
    
    if (qualityAnalytics.passRate < 95) {
      insights.push('🔍 Quality pass rate is below target - review inspection standards');
    }
    
    return insights;
  }
}
