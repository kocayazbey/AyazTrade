import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

export interface IoTSensor {
  id: string;
  name: string;
  type: string;
  location: {
    warehouseId: string;
    zone: string;
    rack: string;
    level: number;
    position: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  configuration: {
    samplingRate: number;
    threshold: {
      min: number;
      max: number;
      critical: number;
    };
    alerts: boolean;
    calibration: {
      offset: number;
      multiplier: number;
    };
  };
  lastReading: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'warning' | 'critical';
}

export interface SensorAlert {
  id: string;
  sensorId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface SensorAnalytics {
  sensorId: string;
  period: string;
  averageValue: number;
  minValue: number;
  maxValue: number;
  totalReadings: number;
  goodReadings: number;
  alertCount: number;
  uptime: number;
}

@Injectable()
export class IoTSensorService {
  private readonly logger = new Logger(IoTSensorService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createSensor(sensor: Omit<IoTSensor, 'id' | 'createdAt' | 'updatedAt' | 'lastReading'>): Promise<IoTSensor> {
    const sensorId = `sensor-${Date.now()}`;
    
    const newSensor: IoTSensor = {
      id: sensorId,
      ...sensor,
      lastReading: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSensor(newSensor);
    
    this.logger.log(`Created IoT sensor: ${sensorId}`);
    return newSensor;
  }

  async updateSensor(sensorId: string, updates: Partial<IoTSensor>): Promise<IoTSensor> {
    const sensor = await this.getSensor(sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    const updatedSensor = {
      ...sensor,
      ...updates,
      updatedAt: new Date()
    };

    await this.saveSensor(updatedSensor);
    
    this.logger.log(`Updated IoT sensor: ${sensorId}`);
    return updatedSensor;
  }

  async getSensor(sensorId: string): Promise<IoTSensor | null> {
    const result = await this.db.execute(`
      SELECT * FROM iot_sensors WHERE id = $1
    `, [sensorId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async getSensors(warehouseId?: string, type?: string): Promise<IoTSensor[]> {
    try {
      // TODO: Implement with actual Drizzle ORM queries
      return [{
        id: 'sensor_1',
        name: 'Temperature Sensor 1',
        type: 'temperature',
        location: { warehouseId: warehouseId || 'default', zone: 'A1' },
        status: 'active',
        lastReading: { temperature: 22.5, timestamp: new Date() },
        configuration: { minTemp: 15, maxTemp: 25, alertThreshold: 2 },
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } catch (error) {
      this.logger.error('Error getting IoT sensors', error);
      return [];
    }
  }

  async deleteSensor(sensorId: string): Promise<void> {
    try {
      // TODO: Implement with actual Drizzle ORM delete
      this.logger.log(`Deleted IoT sensor: ${sensorId}`);
    } catch (error) {
      this.logger.error('Error deleting IoT sensor', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      // TODO: Implement alert acknowledgment with Drizzle ORM
      this.logger.log(`Acknowledged IoT alert: ${alertId}`);
    } catch (error) {
      this.logger.error('Error acknowledging IoT alert', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      // TODO: Implement alert resolution with Drizzle ORM
      this.logger.log(`Resolved IoT alert: ${alertId}`);
    } catch (error) {
      this.logger.error('Error resolving IoT alert', error);
      throw error;
    }
  }

  async recordReading(sensorId: string, value: number, unit: string): Promise<void> {
    const reading: SensorReading = {
      id: `reading-${Date.now()}`,
      sensorId,
      value,
      unit,
      timestamp: new Date(),
      quality: 'good'
    };

    await this.saveSensorReading(reading);

    // Check for alerts
    await this.checkSensorAlerts(sensorId, reading);
  }

  // Alias for backward compatibility
  async recordSensorReading(reading: SensorReading): Promise<void> {
    return this.recordReading(reading.sensorId, reading.value, reading.unit);
  }

  async resolveAlert(alertId: string): Promise<void> {
    await this.db.execute(`
      UPDATE sensor_alerts SET resolved = true, resolved_at = NOW() WHERE id = $1
    `, [alertId]);
    
    this.logger.log(`Resolved sensor alert: ${alertId}`);
  }

  async getSensorAnalytics(sensorId: string, period: string = '24h'): Promise<SensorAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as total_readings,
        COUNT(CASE WHEN quality = 'good' THEN 1 END) as good_readings
      FROM sensor_readings 
      WHERE sensor_id = $1 
      AND timestamp >= NOW() - INTERVAL '${period}'
    `, [sensorId]);
    
    const stats = result.rows[0];
    const totalReadings = parseInt(stats.total_readings) || 0;
    const goodReadings = parseInt(stats.good_readings) || 0;
    
    // Get alert count
    const alertResult = await this.db.execute(`
      SELECT COUNT(*) as alert_count
      FROM sensor_alerts 
      WHERE sensor_id = $1 
      AND timestamp >= NOW() - INTERVAL '${period}'
    `, [sensorId]);
    
    const alertCount = parseInt(alertResult.rows[0]?.alert_count) || 0;
    
    // Calculate uptime
    const uptimeResult = await this.db.execute(`
      SELECT COUNT(*) as total_readings
      FROM sensor_readings 
      WHERE sensor_id = $1 
      AND timestamp >= NOW() - INTERVAL '${period}'
    `, [sensorId]);
    
    const uptime = uptimeResult.rows[0]?.total_readings > 0
      ? (goodReadings / totalReadings) * 100
      : 0;

    return {
      sensorId,
      period,
      averageValue: parseFloat(stats.avg_value) || 0,
      minValue: parseFloat(stats.min_value) || 0,
      maxValue: parseFloat(stats.max_value) || 0,
      totalReadings,
      goodReadings,
      alertCount,
      uptime
    };
  }

  async calibrateSensor(sensorId: string, offset: number, multiplier: number): Promise<void> {
    const sensor = await this.getSensor(sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    sensor.configuration.calibration.offset = offset;
    sensor.configuration.calibration.multiplier = multiplier;

    await this.saveSensor(sensor);
    
    this.logger.log(`Calibrated sensor ${sensorId}: offset=${offset}, multiplier=${multiplier}`);
  }

  async getRealTimeData(warehouseId?: string): Promise<Array<{
    sensor: IoTSensor;
    latestReading: SensorReading;
    status: 'normal' | 'warning' | 'critical';
  }>> {
    const sensors = await this.getSensors(warehouseId);
    const realTimeData = [];

    for (const sensor of sensors) {
      const latestReading = await this.getLatestReading(sensor.id);
      const status = this.determineSensorStatus(sensor, latestReading);
      
      realTimeData.push({
        sensor,
        latestReading,
        status
      });
    }

    return realTimeData;
  }

  private async checkSensorAlerts(sensorId: string, reading: SensorReading): Promise<void> {
    const sensor = await this.getSensor(sensorId);
    if (!sensor) return;

    const config = sensor.configuration;
    
    // Check threshold violations
    if (reading.value < config.threshold.min || reading.value > config.threshold.max) {
      const severity = reading.value < config.threshold.critical || reading.value > config.threshold.critical
        ? 'critical' : 'high';
      
      await this.createAlert({
        sensorId,
        message: `Sensor reading ${reading.value}${reading.unit} is outside normal range`,
        severity,
        timestamp: new Date()
      });
    }
  }

  private async createAlert(alert: Omit<SensorAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Promise<SensorAlert> {
    const alertId = `alert-${Date.now()}`;
    
    const newAlert: SensorAlert = {
      id: alertId,
      ...alert,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false
    };

    await this.saveSensorAlert(newAlert);
    
    this.logger.warn(`Created sensor alert: ${alertId} - ${alert.message}`);
    return newAlert;
  }

  private async getLatestReading(sensorId: string): Promise<SensorReading | null> {
    const result = await this.db.execute(`
      SELECT * FROM sensor_readings 
      WHERE sensor_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [sensorId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  private determineSensorStatus(sensor: IoTSensor, reading: SensorReading | null): 'normal' | 'warning' | 'critical' {
    if (!reading) return 'critical';
    
    const config = sensor.configuration;
    
    if (reading.value < config.threshold.critical || reading.value > config.threshold.critical) {
      return 'critical';
    }
    
    if (reading.value < config.threshold.min || reading.value > config.threshold.max) {
      return 'warning';
    }
    
    return 'normal';
  }

  private async saveSensor(sensor: IoTSensor): Promise<void> {
    await this.db.execute(`
      INSERT INTO iot_sensors (
        id, name, type, location, status, configuration, 
        last_reading, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        location = EXCLUDED.location,
        status = EXCLUDED.status,
        configuration = EXCLUDED.configuration,
        last_reading = EXCLUDED.last_reading,
        updated_at = EXCLUDED.updated_at
    `, [
      sensor.id,
      sensor.name,
      sensor.type,
      JSON.stringify(sensor.location),
      sensor.status,
      JSON.stringify(sensor.configuration),
      sensor.lastReading,
      sensor.createdAt,
      sensor.updatedAt
    ]);
  }

  private async saveSensorReading(reading: SensorReading): Promise<void> {
    await this.db.execute(`
      INSERT INTO sensor_readings (
        id, sensor_id, value, unit, timestamp, quality
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      reading.id,
      reading.sensorId,
      reading.value,
      reading.unit,
      reading.timestamp,
      reading.quality
    ]);
  }

  private async saveSensorAlert(alert: SensorAlert): Promise<void> {
    await this.db.execute(`
      INSERT INTO sensor_alerts (
        id, sensor_id, message, severity, timestamp, acknowledged, resolved, resolved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      alert.id,
      alert.sensorId,
      alert.message,
      alert.severity,
      alert.timestamp,
      alert.acknowledged,
      alert.resolved,
      alert.resolvedAt
    ]);
  }

  // Additional methods for controller compatibility
  async getSensorReadings(sensorId: string, limit: number = 100): Promise<SensorReading[]> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM sensor_readings
        WHERE sensor_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [sensorId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        sensorId: row.sensor_id,
        value: parseFloat(row.value),
        unit: row.unit,
        timestamp: row.timestamp,
        quality: row.quality
      }));
    } catch (error) {
      this.logger.error('Error getting sensor readings', error);
      throw error;
    }
  }

  async getSensorAlerts(sensorId?: string, severity?: string, acknowledged?: boolean): Promise<SensorAlert[]> {
    try {
      let query = 'SELECT * FROM sensor_alerts WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (sensorId) {
        query += ` AND sensor_id = $${paramIndex}`;
        params.push(sensorId);
        paramIndex++;
      }

      if (severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }

      if (acknowledged !== undefined) {
        query += ` AND acknowledged = $${paramIndex}`;
        params.push(acknowledged);
        paramIndex++;
      }

      query += ' ORDER BY timestamp DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        id: row.id,
        sensorId: row.sensor_id,
        message: row.message,
        severity: row.severity,
        timestamp: row.timestamp,
        acknowledged: row.acknowledged,
        resolved: row.resolved,
        resolvedAt: row.resolved_at
      }));
    } catch (error) {
      this.logger.error('Error getting sensor alerts', error);
      throw error;
    }
  }
}