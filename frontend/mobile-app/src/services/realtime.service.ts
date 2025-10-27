import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateOrder, updateOrderStatus, addTrackingEvent, updateLocation } from '../store/slices/ordersSlice';
import { AppDispatch } from '../store';

class RealtimeService {
  private socket: Socket | null = null;
  private dispatch: AppDispatch | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
  }

  async initialize(dispatch: AppDispatch) {
    this.dispatch = dispatch;
    await this.connect();
  }

  async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token available');
    }

    this.socket = io(this.baseURL, {
      transports: ['websocket'],
      auth: { token },
      timeout: 20000,
      forceNew: true,
    });

    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        console.log('Connected to real-time service');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.setupEventListeners();
        resolve(this.socket!);
      });

      this.socket!.on('connect_error', (error) => {
        console.error('Real-time connection error:', error);
        this.isConnected = false;
        this.handleReconnection();
        reject(error);
      });

      this.socket!.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnected = false;
        if (reason === 'io server disconnect') {
          this.handleReconnection();
        }
      });
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Order tracking events
    this.socket.on('order:status:updated', (data) => {
      console.log('Order status updated:', data);
      if (this.dispatch) {
        this.dispatch(updateOrderStatus({
          orderId: data.orderId,
          status: data.status
        }));
      }
    });

    this.socket.on('order:location:updated', (data) => {
      console.log('Order location updated:', data);
      if (this.dispatch) {
        this.dispatch(updateLocation({
          orderId: data.orderId,
          location: data.location
        }));
      }
    });

    this.socket.on('order:tracking:event', (data) => {
      console.log('Order tracking event:', data);
      if (this.dispatch) {
        this.dispatch(addTrackingEvent({
          orderId: data.orderId,
          event: data.event
        }));
      }
    });

    this.socket.on('order:updated', (data) => {
      console.log('Order updated:', data);
      if (this.dispatch) {
        this.dispatch(updateOrder(data.order));
      }
    });

    // Push notification events
    this.socket.on('notification:received', (notification) => {
      console.log('Push notification received:', notification);
      this.showNotification(notification);
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);

      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private async showNotification(notification: any) {
    // This would integrate with push notification system
    console.log('Notification to show:', notification);
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Order tracking methods
  async subscribeToOrder(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:subscribe', { orderId });
      console.log(`Subscribed to order ${orderId}`);
    }
  }

  async unsubscribeFromOrder(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:unsubscribe', { orderId });
      console.log(`Unsubscribed from order ${orderId}`);
    }
  }

  async enableRealTimeTracking(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:tracking:enable', { orderId });
      return true;
    }
    return false;
  }

  async disableRealTimeTracking(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:tracking:disable', { orderId });
      return true;
    }
    return false;
  }

  // Legacy methods (keeping for backward compatibility)
  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listeners
  onOrderUpdate(callback: (data: any) => void) {
    this.socket?.on('order_updated', callback);
  }

  onNotification(callback: (data: any) => void) {
    this.socket?.on('notification', callback);
  }

  onInventoryAlert(callback: (data: any) => void) {
    this.socket?.on('inventory_alert', callback);
  }

  // Remove listeners
  offOrderUpdate(callback?: (data: any) => void) {
    this.socket?.off('order_updated', callback);
  }

  offNotification(callback?: (data: any) => void) {
    this.socket?.off('notification', callback);
  }

  offInventoryAlert(callback?: (data: any) => void) {
    this.socket?.off('inventory_alert', callback);
  }

  // Emit events
  joinRoom(room: string) {
    this.socket?.emit('join_room', { room });
  }

  leaveRoom(room: string) {
    this.socket?.emit('leave_room', { room });
  }

  sendMessage(room: string, message: string, type?: string) {
    this.socket?.emit('send_message', { room, message, type });
  }

  // Manual reconnection
  async reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}

export default new RealtimeService();

