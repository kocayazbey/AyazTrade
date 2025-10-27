import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
  variant?: {
    name: string;
    value: string;
  };
  isInStock: boolean;
  maxQuantity?: number;
  discount?: number;
  originalPrice?: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  couponCode?: string;
  discount: number;
  isGuestCheckout: boolean;
  shareToken?: string;
  lastUpdated: string;
  isLoading: boolean;
  error?: string;
  appliedPromotions: Promotion[];
  savedForLater: CartItem[];
}

interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  discount: 0,
  isGuestCheckout: false,
  shareToken: undefined,
  lastUpdated: new Date().toISOString(),
  isLoading: false,
  error: undefined,
  appliedPromotions: [],
  savedForLater: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Enhanced cart management
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(item =>
        item.productId === action.payload.productId &&
        JSON.stringify(item.variant) === JSON.stringify(action.payload.variant)
      );
      if (existing) {
        const newQuantity = existing.quantity + action.payload.quantity;
        if (existing.maxQuantity && newQuantity > existing.maxQuantity) {
          state.error = `Maximum quantity for this item is ${existing.maxQuantity}`;
          return;
        }
        existing.quantity = newQuantity;
      } else {
        state.items.push(action.payload);
      }
      state.lastUpdated = new Date().toISOString();
      recalculateTotals(state);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.productId !== action.payload);
      state.lastUpdated = new Date().toISOString();
      recalculateTotals(state);
    },

    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (item) {
        if (action.payload.quantity < 1) {
          state.items = state.items.filter(i => i.productId !== action.payload.productId);
        } else {
          if (item.maxQuantity && action.payload.quantity > item.maxQuantity) {
            state.error = `Maximum quantity for this item is ${item.maxQuantity}`;
            return;
          }
          item.quantity = action.payload.quantity;
        }
        state.lastUpdated = new Date().toISOString();
        recalculateTotals(state);
      }
    },

    // Guest checkout support
    setGuestCheckout: (state, action: PayloadAction<boolean>) => {
      state.isGuestCheckout = action.payload;
    },

    // Cart sharing
    setShareToken: (state, action: PayloadAction<string>) => {
      state.shareToken = action.payload;
    },

    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },

    // Enhanced promotion system
    applyPromotion: (state, action: PayloadAction<Promotion>) => {
      const existing = state.appliedPromotions.find(p => p.id === action.payload.id);
      if (!existing) {
        state.appliedPromotions.push(action.payload);
        recalculateTotals(state);
      }
    },

    removePromotion: (state, action: PayloadAction<string>) => {
      state.appliedPromotions = state.appliedPromotions.filter(p => p.id !== action.payload);
      recalculateTotals(state);
    },

    // Save for later functionality
    saveForLater: (state, action: PayloadAction<string>) => {
      const item = state.items.find(i => i.productId === action.payload);
      if (item) {
        state.savedForLater.push(item);
        state.items = state.items.filter(i => i.productId !== action.payload);
        recalculateTotals(state);
      }
    },

    moveToCart: (state, action: PayloadAction<string>) => {
      const item = state.savedForLater.find(i => i.productId === action.payload);
      if (item) {
        state.items.push(item);
        state.savedForLater = state.savedForLater.filter(i => i.productId !== action.payload);
        recalculateTotals(state);
      }
    },

    removeFromSaved: (state, action: PayloadAction<string>) => {
      state.savedForLater = state.savedForLater.filter(i => i.productId !== action.payload);
    },

    // Bulk operations
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.tax = 0;
      state.shipping = 0;
      state.total = 0;
      state.couponCode = undefined;
      state.discount = 0;
      state.appliedPromotions = [];
      state.error = undefined;
      state.lastUpdated = new Date().toISOString();
    },

    // Cart persistence
    loadCart: (state, action: PayloadAction<Partial<CartState>>) => {
      Object.assign(state, action.payload);
      state.lastUpdated = new Date().toISOString();
    },

    // Legacy coupon support (keeping for backward compatibility)
    applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.couponCode = action.payload.code;
      state.discount = action.payload.discount;
      recalculateTotals(state);
    },

    // Cart sharing (placeholder for now)
    shareCart: (state) => {
      // This would typically generate a share token from backend
      state.lastUpdated = new Date().toISOString();
    },
  },
});

function recalculateTotals(state: CartState) {
  // Calculate subtotal with discounts
  state.subtotal = state.items.reduce((sum, item) => {
    const itemPrice = item.originalPrice || item.price;
    const itemDiscount = item.discount || 0;
    const finalPrice = itemPrice - itemDiscount;
    return sum + (finalPrice * item.quantity);
  }, 0);

  // Apply promotions
  let promotionDiscount = 0;
  state.appliedPromotions.forEach(promotion => {
    if (promotion.minOrderAmount && state.subtotal < promotion.minOrderAmount) {
      return;
    }

    if (promotion.type === 'percentage') {
      const discount = (state.subtotal * promotion.value) / 100;
      const maxDiscount = promotion.maxDiscount || discount;
      promotionDiscount += Math.min(discount, maxDiscount);
    } else {
      promotionDiscount += promotion.value;
    }
  });

  // Apply coupon discount
  const totalDiscount = state.discount + promotionDiscount;

  // Calculate tax and shipping
  state.tax = (state.subtotal - totalDiscount) * 0.18;
  state.shipping = (state.subtotal - totalDiscount) > 500 ? 0 : 29.99;
  state.total = state.subtotal + state.tax + state.shipping - totalDiscount;
}

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  applyCoupon,
  clearCart,
  setGuestCheckout,
  setShareToken,
  setLoading,
  setError,
  applyPromotion,
  removePromotion,
  saveForLater,
  moveToCart,
  removeFromSaved,
  loadCart,
  shareCart
} = cartSlice.actions;

export default cartSlice.reducer;

