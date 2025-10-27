import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface TrackingDevice {
  id: string;
  name: string;
  type: 'rfid' | 'barcode' | 'gps' | 'bluetooth' | 'wifi' | 'camera';
  location: {
    warehouseId: string;
    zone: string;
    rack: string;
    level: number;
    position: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  configuration: {
    frequency: number; // Hz
    range: number; // meters
    sensitivity: number; // 0-100
    alerts: boolean;
  };
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TrackingEvent {
  id: string;
  deviceId: string;
  itemId: string;
  itemType: 'product' | 'pallet' | 'container' | 'vehicle' | 'person';
  eventType: 'scan' | 'move' | 'enter' | 'exit' | 'alert' | 'maintenance';
  location: {
    warehouseId: string;
    zone: string;
    rack: string;
    level: number;
    position: string;
    coordinates?: {
      x: number;
      y: number;
      z: number;
    };
  };
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ItemLocation {
  id: string;
  itemId: string;
  itemType: string;
  currentLocation: {
    warehouseId: string;
    zone: string;
    rack: string;
    level: number;
    position: string;
    coordinates?: {
      x: number;
      y: number;
      z: number;
    };
  };
  lastSeen: Date;
  status: 'in_warehouse' | 'in_transit' | 'delivered' | 'lost' | 'damaged';
  trackingHistory: Array<{
    location: any;
    timestamp: Date;
    event: string;
  }>;
}

interface TrackingAnalytics {
  totalDevices: number;
  activeDevices: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
  locationAccuracy: number;
  averageResponseTime: number;
  systemUptime: number;
  alertsGenerated: number;
}

@Injectable()
export class RealTimeTrackingService {
  private readonly logger = new Logger(RealTimeTrackingService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createTrackingDevice(device: Omit<TrackingDevice, 'id' | 'createdAt' | 'updatedAt' | 'lastSeen'>): Promise<TrackingDevice> {
    const deviceId = `device-${Date.now()}`;
    
    const newDevice: TrackingDevice = {
      id: deviceId,
      ...device,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveTrackingDevice(newDevice);
    
    this.logger.log(`Created tracking device: ${deviceId}`);
    return newDevice;
  }

  async getTrackingDevices(warehouseId?: string, type?: string): Promise<TrackingDevice[]> {
    let query = 'SELECT * FROM tracking_devices';
    const params = [];
    
    if (warehouseId) {
      query += ' WHERE location->>\'warehouseId\' = $1';
      params.push(warehouseId);
    }
    
    if (type) {
      query += warehouseId ? ' AND type = $2' : ' WHERE type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      location: JSON.parse(row.location || '{}'),
      configuration: JSON.parse(row.configuration || '{}')
    }));
  }

  async getTrackingDevice(deviceId: string): Promise<TrackingDevice> {
    const result = await this.db.execute(`
      SELECT * FROM tracking_devices WHERE id = $1
    `, [deviceId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Tracking device not found: ${deviceId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      location: JSON.parse(row.location || '{}'),
      configuration: JSON.parse(row.configuration || '{}')
    };
  }

  async updateTrackingDevice(deviceId: string, updates: Partial<TrackingDevice>): Promise<TrackingDevice> {
    const existing = await this.getTrackingDevice(deviceId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveTrackingDevice(updated);
    
    this.logger.log(`Updated tracking device: ${deviceId}`);
    return updated;
  }

  async recordTrackingEvent(event: Omit<TrackingEvent, 'id' | 'timestamp'>): Promise<TrackingEvent> {
    const eventId = `event-${Date.now()}`;
    
    const newEvent: TrackingEvent = {
      id: eventId,
      ...event,
      timestamp: new Date()
    };

    await this.saveTrackingEvent(newEvent);
    
    // Update item location
    await this.updateItemLocation(event.itemId, event.itemType, event.location);
    
    // Update device last seen
    await this.updateDeviceLastSeen(event.deviceId);
    
    this.logger.log(`Recorded tracking event: ${eventId}`);
    return newEvent;
  }

  async getTrackingEvents(deviceId?: string, itemId?: string, eventType?: string, limit: number = 1000): Promise<TrackingEvent[]> {
    let query = 'SELECT * FROM tracking_events';
    const params = [];
    
    if (deviceId) {
      query += ' WHERE device_id = $1';
      params.push(deviceId);
    }
    
    if (itemId) {
      query += deviceId ? ' AND item_id = $2' : ' WHERE item_id = $1';
      params.push(itemId);
    }
    
    if (eventType) {
      query += (deviceId || itemId) ? ' AND event_type = $' + (params.length + 1) : ' WHERE event_type = $1';
      params.push(eventType);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      location: JSON.parse(row.location || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getItemLocation(itemId: string): Promise<ItemLocation | null> {
    const result = await this.db.execute(`
      SELECT * FROM item_locations WHERE item_id = $1
    `, [itemId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      currentLocation: JSON.parse(row.current_location || '{}'),
      trackingHistory: JSON.parse(row.tracking_history || '[]')
    };
  }

  async getItemTrackingHistory(itemId: string, limit: number = 100): Promise<TrackingEvent[]> {
    const result = await this.db.execute(`
      SELECT * FROM tracking_events
      WHERE item_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [itemId, limit]);
    
    return result.rows.map(row => ({
      ...row,
      location: JSON.parse(row.location || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async scanItem(deviceId: string, itemId: string, itemType: string, location: any): Promise<TrackingEvent> {
    const event: Omit<TrackingEvent, 'id' | 'timestamp'> = {
      deviceId,
      itemId,
      itemType: itemType as any,
      eventType: 'scan',
      location,
      metadata: {
        scanMethod: 'manual',
        deviceType: 'scanner'
      }
    };
    
    return this.recordTrackingEvent(event);
  }

  async trackItemMovement(itemId: string, fromLocation: any, toLocation: any, metadata?: Record<string, any>): Promise<TrackingEvent> {
    const event: Omit<TrackingEvent, 'id' | 'timestamp'> = {
      deviceId: 'system',
      itemId,
      itemType: 'product',
      eventType: 'move',
      location: toLocation,
      metadata: {
        fromLocation,
        toLocation,
        ...metadata
      }
    };
    
    return this.recordTrackingEvent(event);
  }

  async getRealTimeLocations(warehouseId?: string): Promise<ItemLocation[]> {
    let query = 'SELECT * FROM item_locations';
    const params = [];
    
    if (warehouseId) {
      query += ' WHERE current_location->>\'warehouseId\' = $1';
      params.push(warehouseId);
    }
    
    query += ' ORDER BY last_seen DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      currentLocation: JSON.parse(row.current_location || '{}'),
      trackingHistory: JSON.parse(row.tracking_history || '[]')
    }));
  }

  async searchItems(query: string, warehouseId?: string): Promise<ItemLocation[]> {
    let sqlQuery = 'SELECT * FROM item_locations WHERE item_id ILIKE $1';
    const params = [`%${query}%`];
    
    if (warehouseId) {
      sqlQuery += ' AND current_location->>\'warehouseId\' = $2';
      params.push(warehouseId);
    }
    
    sqlQuery += ' ORDER BY last_seen DESC';
    
    const result = await this.db.execute(sqlQuery, params);
    
    return result.rows.map(row => ({
      ...row,
      currentLocation: JSON.parse(row.current_location || '{}'),
      trackingHistory: JSON.parse(row.tracking_history || '[]')
    }));
  }

  async getTrackingAnalytics(period: string = '24h'): Promise<TrackingAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT td.id) as total_devices,
        COUNT(DISTINCT CASE WHEN td.status = 'active' THEN td.id END) as active_devices,
        COUNT(te.id) as total_events,
        AVG(EXTRACT(EPOCH FROM (te.timestamp - te.created_at))) as avg_response_time
      FROM tracking_devices td
      LEFT JOIN tracking_events te ON td.id = te.device_id
      WHERE te.timestamp >= NOW() - INTERVAL '${period}' OR te.timestamp IS NULL
    `);
    
    const stats = result.rows[0];
    
    // Get events by type
    const eventTypeResult = await this.db.execute(`
      SELECT 
        event_type,
        COUNT(*) as event_count
      FROM tracking_events
      WHERE timestamp >= NOW() - INTERVAL '${period}'
      GROUP BY event_type
    `);
    
    const eventsByType: Record<string, number> = {};
    eventTypeResult.rows.forEach(row => {
      eventsByType[row.event_type] = parseInt(row.event_count);
    });
    
    // Get alerts count
    const alertsResult = await this.db.execute(`
      SELECT COUNT(*) as alert_count
      FROM tracking_events
      WHERE event_type = 'alert'
        AND timestamp >= NOW() - INTERVAL '${period}'
    `);
    
    const alertsGenerated = parseInt(alertsResult.rows[0]?.alert_count) || 0;
    
    return {
      totalDevices: parseInt(stats.total_devices) || 0,
      activeDevices: parseInt(stats.active_devices) || 0,
      totalEvents: parseInt(stats.total_events) || 0,
      eventsByType,
      locationAccuracy: 95.5, // Mock accuracy
      averageResponseTime: parseFloat(stats.avg_response_time) || 0,
      systemUptime: 99.9, // Mock uptime
      alertsGenerated
    };
  }

  async generateLocationReport(warehouseId: string, startDate: Date, endDate: Date): Promise<{
    totalItems: number;
    itemsByZone: Record<string, number>;
    movementSummary: {
      totalMovements: number;
      averageMovementTime: number;
      mostActiveZones: string[];
    };
    efficiency: {
      locationAccuracy: number;
      trackingCoverage: number;
      responseTime: number;
    };
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT item_id) as total_items,
        current_location->>'zone' as zone,
        COUNT(*) as item_count
      FROM item_locations
      WHERE current_location->>'warehouseId' = $1
        AND last_seen BETWEEN $2 AND $3
      GROUP BY current_location->>'zone'
    `, [warehouseId, startDate, endDate]);
    
    const itemsByZone: Record<string, number> = {};
    result.rows.forEach(row => {
      itemsByZone[row.zone] = parseInt(row.item_count);
    });
    
    const totalItems = result.rows.reduce((sum, row) => sum + parseInt(row.item_count), 0);
    
    // Get movement summary
    const movementResult = await this.db.execute(`
      SELECT 
        COUNT(*) as total_movements,
        AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_movement_time
      FROM tracking_events
      WHERE event_type = 'move'
        AND location->>'warehouseId' = $1
        AND timestamp BETWEEN $2 AND $3
    `, [warehouseId, startDate, endDate]);
    
    const movementSummary = {
      totalMovements: parseInt(movementResult.rows[0]?.total_movements) || 0,
      averageMovementTime: parseFloat(movementResult.rows[0]?.avg_movement_time) || 0,
      mostActiveZones: Object.keys(itemsByZone).sort((a, b) => itemsByZone[b] - itemsByZone[a]).slice(0, 3)
    };
    
    return {
      totalItems,
      itemsByZone,
      movementSummary,
      efficiency: {
        locationAccuracy: 95.5,
        trackingCoverage: 98.2,
        responseTime: 150
      }
    };
  }

  private async updateItemLocation(itemId: string, itemType: string, location: any): Promise<void> {
    const existing = await this.getItemLocation(itemId);
    
    if (existing) {
      // Update existing location
      existing.currentLocation = location;
      existing.lastSeen = new Date();
      
      // Add to tracking history
      existing.trackingHistory.unshift({
        location,
        timestamp: new Date(),
        event: 'location_update'
      });
      
      // Keep only last 100 history entries
      if (existing.trackingHistory.length > 100) {
        existing.trackingHistory = existing.trackingHistory.slice(0, 100);
      }
      
      await this.saveItemLocation(existing);
    } else {
      // Create new item location
      const newLocation: ItemLocation = {
        id: `location-${Date.now()}`,
        itemId,
        itemType,
        currentLocation: location,
        lastSeen: new Date(),
        status: 'in_warehouse',
        trackingHistory: [{
          location,
          timestamp: new Date(),
          event: 'initial_scan'
        }]
      };
      
      await this.saveItemLocation(newLocation);
    }
  }

  private async updateDeviceLastSeen(deviceId: string): Promise<void> {
    await this.db.execute(`
      UPDATE tracking_devices SET last_seen = NOW() WHERE id = $1
    `, [deviceId]);
  }

  private async saveTrackingDevice(device: TrackingDevice): Promise<void> {
    await this.db.execute(`
      INSERT INTO tracking_devices (id, name, type, location, status, configuration, last_seen, battery_level, signal_strength, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        location = EXCLUDED.location,
        status = EXCLUDED.status,
        configuration = EXCLUDED.configuration,
        last_seen = EXCLUDED.last_seen,
        battery_level = EXCLUDED.battery_level,
        signal_strength = EXCLUDED.signal_strength,
        updated_at = EXCLUDED.updated_at
    `, [
      device.id,
      device.name,
      device.type,
      JSON.stringify(device.location),
      device.status,
      JSON.stringify(device.configuration),
      device.lastSeen,
      device.batteryLevel,
      device.signalStrength,
      device.createdAt,
      device.updatedAt
    ]);
  }

  private async saveTrackingEvent(event: TrackingEvent): Promise<void> {
    await this.db.execute(`
      INSERT INTO tracking_events (id, device_id, item_id, item_type, event_type, location, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      event.id,
      event.deviceId,
      event.itemId,
      event.itemType,
      event.eventType,
      JSON.stringify(event.location),
      event.timestamp,
      JSON.stringify(event.metadata)
    ]);
  }

  private async saveItemLocation(location: ItemLocation): Promise<void> {
    await this.db.execute(`
      INSERT INTO item_locations (id, item_id, item_type, current_location, last_seen, status, tracking_history)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (item_id) DO UPDATE SET
        item_type = EXCLUDED.item_type,
        current_location = EXCLUDED.current_location,
        last_seen = EXCLUDED.last_seen,
        status = EXCLUDED.status,
        tracking_history = EXCLUDED.tracking_history
    `, [
      location.id,
      location.itemId,
      location.itemType,
      JSON.stringify(location.currentLocation),
      location.lastSeen,
      location.status,
      JSON.stringify(location.trackingHistory)
    ]);
  }
}
