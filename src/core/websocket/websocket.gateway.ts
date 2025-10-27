import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@WSGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5001',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.connectedUsers.set(client.user.id, client);
      this.logger.log(`User ${client.user.email} connected with socket ${client.id}`);

      // Join user to their personal room
      client.join(`user:${client.user.id}`);
      
      // Join user to role-based rooms
      client.join(`role:${client.user.role}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to WebSocket',
        userId: client.user.id,
      });

      // Notify other users about new connection (for admin dashboard)
      this.server.to('role:admin').emit('user_connected', {
        userId: client.user.id,
        email: client.user.email,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error instanceof Error ? error.message : String(error));
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.id);
      this.logger.log(`User ${client.user.email} disconnected`);

      // Notify other users about disconnection
      this.server.to('role:admin').emit('user_disconnected', {
        userId: client.user.id,
        email: client.user.email,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(data.room);
    this.logger.log(`User ${client.user.email} joined room ${data.room}`);
    client.emit('joined_room', { room: data.room });
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.leave(data.room);
    this.logger.log(`User ${client.user.email} left room ${data.room}`);
    client.emit('left_room', { room: data.room });
  }

  @SubscribeMessage('send_message')
  handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string; message: string; type?: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const messageData = {
      id: Date.now().toString(),
      from: client.user.id,
      fromEmail: client.user.email,
      message: data.message,
      type: data.type || 'message',
      timestamp: new Date().toISOString(),
    };

    // Send to specific room
    this.server.to(data.room).emit('message', messageData);
    
    this.logger.log(`User ${client.user.email} sent message to room ${data.room}`);
  }

  @SubscribeMessage('order_update')
  handleOrderUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: string; status: string; message?: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const updateData = {
      orderId: data.orderId,
      status: data.status,
      message: data.message,
      updatedBy: client.user.id,
      updatedByEmail: client.user.email,
      timestamp: new Date().toISOString(),
    };

    // Send to order-specific room
    this.server.to(`order:${data.orderId}`).emit('order_updated', updateData);
    
    // Send to admin room
    this.server.to('role:admin').emit('order_updated', updateData);
    
    this.logger.log(`Order ${data.orderId} updated by ${client.user.email}`);
  }

  @SubscribeMessage('product_update')
  handleProductUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { productId: string; action: string; data: any },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const updateData = {
      productId: data.productId,
      action: data.action,
      data: data.data,
      updatedBy: client.user.id,
      updatedByEmail: client.user.email,
      timestamp: new Date().toISOString(),
    };

    // Send to product-specific room
    this.server.to(`product:${data.productId}`).emit('product_updated', updateData);
    
    // Send to admin room
    this.server.to('role:admin').emit('product_updated', updateData);
    
    this.logger.log(`Product ${data.productId} updated by ${client.user.email}`);
  }

  @SubscribeMessage('inventory_alert')
  handleInventoryAlert(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { productId: string; currentStock: number; threshold: number },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const alertData = {
      productId: data.productId,
      currentStock: data.currentStock,
      threshold: data.threshold,
      message: `Product stock is below threshold (${data.currentStock}/${data.threshold})`,
      timestamp: new Date().toISOString(),
    };

    // Send to admin and manager rooms
    this.server.to('role:admin').emit('inventory_alert', alertData);
    this.server.to('role:manager').emit('inventory_alert', alertData);

    this.logger.log(`Inventory alert for product ${data.productId}`);
  }

  @SubscribeMessage('subscribe_inventory')
  handleSubscribeInventory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tenantId: string; sku?: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Join tenant-specific inventory room
    client.join(`inventory:${data.tenantId}`);

    // Join SKU-specific room if provided
    if (data.sku) {
      client.join(`inventory:${data.tenantId}:${data.sku}`);
    }

    client.emit('subscribed_inventory', {
      tenantId: data.tenantId,
      sku: data.sku,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${client.user.email} subscribed to inventory changes - Tenant: ${data.tenantId}, SKU: ${data.sku || 'all'}`);
  }

  @SubscribeMessage('unsubscribe_inventory')
  handleUnsubscribeInventory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tenantId: string; sku?: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Leave tenant-specific inventory room
    client.leave(`inventory:${data.tenantId}`);

    // Leave SKU-specific room if provided
    if (data.sku) {
      client.leave(`inventory:${data.tenantId}:${data.sku}`);
    }

    client.emit('unsubscribed_inventory', {
      tenantId: data.tenantId,
      sku: data.sku,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${client.user.email} unsubscribed from inventory changes - Tenant: ${data.tenantId}, SKU: ${data.sku || 'all'}`);
  }

  @SubscribeMessage('notification')
  handleNotification(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string; type: string; title: string; message: string; data?: any },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const notificationData = {
      id: Date.now().toString(),
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Send to specific user
    this.server.to(`user:${data.userId}`).emit('notification', notificationData);
    
    this.logger.log(`Notification sent to user ${data.userId} by ${client.user.email}`);
  }

  // Public methods for sending messages from services
  sendToUser(userId: string, event: string, data: any) {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.emit(event, data);
    }
  }

  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  sendToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Inventory-specific methods
  broadcastInventoryChange(tenantId: string, data: any) {
    this.server.to(`inventory:${tenantId}`).emit('inventory_change', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastInventoryChangeToSku(tenantId: string, sku: string, data: any) {
    this.server.to(`inventory:${tenantId}:${sku}`).emit('inventory_change', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastInventoryAlert(tenantId: string, alertData: any) {
    this.server.to(`inventory:${tenantId}`).emit('inventory_alert', {
      ...alertData,
      timestamp: new Date().toISOString(),
    });

    // Also send to admin and manager roles
    this.sendToRole('admin', 'inventory_alert', alertData);
    this.sendToRole('manager', 'inventory_alert', alertData);
  }

  broadcastLowStockAlert(tenantId: string, alertData: any) {
    this.server.to(`inventory:${tenantId}`).emit('low_stock_alert', {
      ...alertData,
      timestamp: new Date().toISOString(),
    });

    // Also send to admin and manager roles
    this.sendToRole('admin', 'low_stock_alert', alertData);
    this.sendToRole('manager', 'low_stock_alert', alertData);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}