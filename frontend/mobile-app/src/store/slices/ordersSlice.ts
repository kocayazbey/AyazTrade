import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  timestamp: string;
  location?: string;
  description: string;
  estimatedTime?: string;
}

export interface TrackingEvent {
  id: string;
  type: 'status_change' | 'location_update' | 'delivery_attempt' | 'delay_notice';
  timestamp: string;
  message: string;
  data?: any;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus['status'];
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  carrier?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  deliveryAddress: {
    name: string;
    address: string;
    city: string;
    phone: string;
  };
  items: OrderItem[];
  statusHistory: OrderStatus[];
  trackingEvents: TrackingEvent[];
  isRealTimeTracking: boolean;
  lastUpdated: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  variant?: string;
  sku: string;
}

export interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string;
    dateRange: string;
  };
  realTimeEnabled: boolean;
  lastSync: string;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  filters: {
    status: '',
    dateRange: '',
  },
  realTimeEnabled: false,
  lastSync: new Date().toISOString(),
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
      state.lastSync = new Date().toISOString();
    },

    updateOrder: (state, action: PayloadAction<Order>) => {
      const index = state.orders.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
      if (state.currentOrder?.id === action.payload.id) {
        state.currentOrder = action.payload;
      }
      state.lastSync = new Date().toISOString();
    },

    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },

    updateOrderStatus: (state, action: PayloadAction<{ orderId: string; status: OrderStatus }>) => {
      const order = state.orders.find(o => o.id === action.payload.orderId);
      if (order) {
        order.status = action.payload.status.status;
        order.statusHistory.unshift(action.payload.status);
        state.lastSync = new Date().toISOString();
      }
    },

    addTrackingEvent: (state, action: PayloadAction<{ orderId: string; event: TrackingEvent }>) => {
      const order = state.orders.find(o => o.id === action.payload.orderId);
      if (order) {
        order.trackingEvents.unshift(action.payload.event);
        state.lastSync = new Date().toISOString();
      }
    },

    updateLocation: (state, action: PayloadAction<{ orderId: string; location: Order['currentLocation'] }>) => {
      const order = state.orders.find(o => o.id === action.payload.orderId);
      if (order) {
        order.currentLocation = action.payload.location;
        state.lastSync = new Date().toISOString();
      }
    },

    setFilters: (state, action: PayloadAction<Partial<OrdersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    setRealTimeEnabled: (state, action: PayloadAction<boolean>) => {
      state.realTimeEnabled = action.payload;
    },

    reorderItems: (state, action: PayloadAction<{ orderId: string; items: OrderItem[] }>) => {
      // This would typically trigger a reorder API call
      state.lastSync = new Date().toISOString();
    },

    cancelOrder: (state, action: PayloadAction<string>) => {
      const order = state.orders.find(o => o.id === action.payload);
      if (order) {
        order.status = 'cancelled';
        state.lastSync = new Date().toISOString();
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setOrders,
  updateOrder,
  setCurrentOrder,
  updateOrderStatus,
  addTrackingEvent,
  updateLocation,
  setFilters,
  setRealTimeEnabled,
  reorderItems,
  cancelOrder,
  setCurrentOrder: setCurrentOrderAction,
} = ordersSlice.actions;

export default ordersSlice.reducer;
