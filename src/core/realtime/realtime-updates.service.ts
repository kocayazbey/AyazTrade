import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';
import { CacheService } from '../cache/cache.service';

interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  room?: string;
}

interface RealtimeConfig {
  maxConnections: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

@Injectable()
export class RealtimeUpdatesService {
  private readonly logger = new Logger(RealtimeUpdatesService.name);
  private readonly config: RealtimeConfig = {
    maxConnections: 1000,
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 60000, // 1 minute
  };

  private connections = new Map<string, any>();
  private rooms = new Map<string, Set<string>>();

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly cacheService: CacheService
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for system events and broadcast to relevant users
    this.eventBusService.on('order.created', (data) => {
      this.broadcastToAdmins('order.created', data);
    });

    this.eventBusService.on('order.updated', (data) => {
      this.broadcastToAdmins('order.updated', data);
    });

    this.eventBusService.on('inventory.updated', (data) => {
      this.broadcastToAdmins('inventory.updated', data);
    });

    this.eventBusService.on('user.registered', (data) => {
      this.broadcastToAdmins('user.registered', data);
    });

    this.eventBusService.on('payment.processed', (data) => {
      this.broadcastToAdmins('payment.processed', data);
    });
  }

  async addConnection(connectionId: string, userId: string, userRole: string): Promise<void> {
    this.connections.set(connectionId, {
      userId,
      userRole,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    // Add to appropriate rooms based on role
    if (userRole === 'admin') {
      this.addToRoom('admins', connectionId);
    }
    if (userRole === 'manager') {
      this.addToRoom('managers', connectionId);
    }

    this.logger.log(`Connection added: ${connectionId} for user ${userId}`);
  }

  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove from all rooms
      for (const [roomName, roomConnections] of this.rooms.entries()) {
        roomConnections.delete(connectionId);
      }

      this.connections.delete(connectionId);
      this.logger.log(`Connection removed: ${connectionId}`);
    }
  }

  async broadcastToUser(userId: string, event: RealtimeEvent): Promise<void> {
    const userConnections = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.userId === userId);

    for (const [connectionId, _] of userConnections) {
      await this.sendToConnection(connectionId, event);
    }
  }

  async broadcastToAdmins(eventType: string, data: any): Promise<void> {
    const event: RealtimeEvent = {
      id: this.generateEventId(),
      type: eventType,
      data,
      timestamp: new Date(),
    };

    const adminConnections = this.rooms.get('admins') || new Set();
    for (const connectionId of adminConnections) {
      await this.sendToConnection(connectionId, event);
    }
  }

  async broadcastToRoom(roomName: string, event: RealtimeEvent): Promise<void> {
    const roomConnections = this.rooms.get(roomName) || new Set();
    for (const connectionId of roomConnections) {
      await this.sendToConnection(connectionId, event);
    }
  }

  async broadcastToAll(event: RealtimeEvent): Promise<void> {
    for (const connectionId of this.connections.keys()) {
      await this.sendToConnection(connectionId, event);
    }
  }

  async addToRoom(roomName: string, connectionId: string): Promise<void> {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName)!.add(connectionId);
  }

  async removeFromRoom(roomName: string, connectionId: string): Promise<void> {
    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(connectionId);
    }
  }

  async sendToConnection(connectionId: string, event: RealtimeEvent): Promise<void> {
    try {
      // In a real implementation, this would send via WebSocket
      this.logger.debug(`Sending event ${event.type} to connection ${connectionId}`);
      
      // Store event for debugging
      await this.cacheService.set(
        `realtime_event:${event.id}`,
        JSON.stringify(event),
        300 // 5 minutes
      );
    } catch (error) {
      this.logger.error(`Error sending to connection ${connectionId}:`, error);
    }
  }

  async getConnectionStats(): Promise<any> {
    const stats = {
      totalConnections: this.connections.size,
      connectionsByRole: {} as any,
      rooms: {} as any,
    };

    // Count connections by role
    for (const connection of this.connections.values()) {
      const role = connection.userRole;
      stats.connectionsByRole[role] = (stats.connectionsByRole[role] || 0) + 1;
    }

    // Count connections by room
    for (const [roomName, connections] of this.rooms.entries()) {
      stats.rooms[roomName] = connections.size;
    }

    return stats;
  }

  async getActiveConnections(): Promise<any[]> {
    const activeConnections = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      activeConnections.push({
        connectionId,
        userId: connection.userId,
        userRole: connection.userRole,
        connectedAt: connection.connectedAt,
        lastActivity: connection.lastActivity,
      });
    }

    return activeConnections;
  }

  async cleanupInactiveConnections(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceActivity > this.config.connectionTimeout) {
        await this.removeConnection(connectionId);
        cleanedCount++;
      }
    }

    this.logger.log(`Cleaned up ${cleanedCount} inactive connections`);
    return cleanedCount;
  }

  async sendHeartbeat(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  async getRoomMembers(roomName: string): Promise<string[]> {
    const room = this.rooms.get(roomName);
    return room ? Array.from(room) : [];
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
