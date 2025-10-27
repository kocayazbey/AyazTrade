# 📱 AyazTrade Mobile App Documentation

## Overview

The AyazTrade mobile application provides a comprehensive mobile experience for customers, sales representatives, and administrators. Built with React Native and Expo, it offers seamless integration with the AyazTrade enterprise platform.

## 🏗️ Architecture

### Tech Stack
- **React Native** 0.72+
- **Expo SDK** 49+
- **TypeScript** - Full type safety
- **Redux Toolkit** - State management
- **React Navigation** - Navigation
- **AsyncStorage** - Local storage
- **Socket.IO** - Real-time features

### Project Structure
```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (Button, Input, etc.)
│   │   ├── layout/         # Layout components (Header, Footer)
│   │   └── features/       # Feature-specific components
│   ├── screens/            # Screen components
│   │   ├── auth/          # Login, Register, Forgot Password
│   │   ├── main/         # Main tab screens
│   │   ├── products/     # Product browsing
│   │   ├── orders/       # Order management
│   │   └── profile/      # User profile
│   ├── services/         # API and business logic
│   │   ├── api.service.ts    # HTTP API client
│   │   ├── realtime.service.ts # WebSocket client
│   │   └── storage.service.ts # Local storage
│   ├── store/            # Redux store
│   │   ├── slices/       # Redux slices
│   │   └── index.ts      # Store configuration
│   ├── navigation/       # Navigation setup
│   ├── theme/           # Styling and theming
│   └── types/           # TypeScript definitions
├── App.tsx              # App entry point
└── package.json         # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator or Android Emulator (optional)

### Installation

```bash
# Navigate to mobile app directory
cd frontend/mobile-app

# Install dependencies
npm install

# Start development server
npx expo start

# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

### Environment Configuration

Create `src/config/env.ts`:
```typescript
export const config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  WS_URL: process.env.EXPO_PUBLIC_API_WS_URL || 'http://localhost:5000',
  APP_NAME: 'AyazTrade',
  VERSION: '1.0.0',
};
```

## 🔐 Authentication Flow

### Login Process
1. User enters credentials
2. App sends POST to `/auth/login`
3. Receives JWT tokens (access + refresh)
4. Stores tokens in AsyncStorage
5. Connects to WebSocket for real-time updates
6. Navigates to main app

### Token Management
- **Access Token**: 1 hour validity, used for API calls
- **Refresh Token**: 7 days validity, used to get new access tokens
- **Auto-refresh**: Interceptor handles token refresh automatically
- **Secure Storage**: Tokens stored in AsyncStorage (encrypted in production)

### Logout Process
1. Clear local storage
2. Disconnect WebSocket
3. Navigate to login screen

## 📱 Core Features

### 🏠 Main Navigation
- **Home**: Featured products, categories, promotions
- **Search**: Product search with filters
- **Cart**: Shopping cart management
- **Orders**: Order history and tracking
- **Profile**: User settings and preferences

### 🛒 Product Browsing
- Category navigation
- Product search and filters
- Product details and reviews
- Add to cart/wishlist
- Quick order by SKU (B2B)

### 🛍️ Shopping Cart
- Add/remove items
- Quantity management
- Price calculations
- Guest checkout
- Cart persistence

### 📦 Order Management
- Order placement
- Order history
- Order tracking
- Reorder functionality
- Order cancellation

### 👤 User Profile
- Profile management
- Address book
- Payment methods
- Order history
- Settings

## 🔄 Real-time Features

### WebSocket Integration
- Order status updates
- Inventory alerts
- Price changes
- Promotions
- Live chat support

### Event Types
```typescript
interface RealtimeEvents {
  order_updated: OrderUpdateEvent;
  inventory_alert: InventoryAlertEvent;
  price_change: PriceChangeEvent;
  promotion: PromotionEvent;
  chat_message: ChatMessageEvent;
}
```

## 🎨 UI/UX Guidelines

### Design System
- **Colors**: Primary blue (#007AFF), secondary purple (#5856D6)
- **Typography**: System fonts (SF Pro on iOS, Roboto on Android)
- **Spacing**: 4px base unit
- **Border Radius**: 8px standard, 16px for cards

### Component Library
- **Buttons**: Primary, Secondary, Ghost variants
- **Inputs**: Text, Email, Password, Search
- **Cards**: Product, Order, Profile cards
- **Modals**: Bottom sheet, Center modal
- **Navigation**: Tab bar, Stack navigation

### Responsive Design
- **Breakpoints**: Mobile (320px+), Tablet (768px+)
- **Flexible layouts**: Using Flexbox and Dimensions API
- **Safe areas**: Handling notches and home indicators

## 🔧 Development

### Code Organization
```typescript
// Feature-based structure
src/screens/products/
├── ProductListScreen.tsx
├── ProductDetailScreen.tsx
└── ProductSearchScreen.tsx

src/components/products/
├── ProductCard.tsx
├── ProductFilters.tsx
└── ProductGrid.tsx
```

### State Management
```typescript
// Redux slices
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface CartState {
  items: CartItem[];
  total: number;
  discount: number;
}
```

### API Integration
```typescript
// API service with error handling
class ApiService {
  private client: AxiosInstance;

  async getProducts(params: ProductFilters): Promise<Product[]> {
    const response = await this.client.get('/products', { params });
    return response.data.data;
  }
}
```

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e
```

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── screens/
│   ├── services/
│   └── store/
└── __e2e__/
    └── screens/
```

## 📦 Deployment

### Production Build
```bash
# Build for production
npx expo build:ios
npx expo build:android

# Submit to stores
npx expo submit --platform ios
npx expo submit --platform android
```

### Store Configuration
- **App Store**: Bundle ID, certificates, provisioning profiles
- **Google Play**: Package name, signing key, store listing

## 🔒 Security

### Best Practices
- Secure storage for sensitive data
- Certificate pinning for API calls
- Biometric authentication support
- Root/jailbreak detection
- Data encryption at rest

### Permissions
```json
{
  "permissions": [
    "CAMERA",
    "LOCATION",
    "NOTIFICATIONS",
    "STORAGE"
  ]
}
```

## 📈 Performance

### Optimization Techniques
- Image optimization and lazy loading
- Virtualized lists for large datasets
- Memoization for expensive computations
- Background tasks for non-critical operations
- Offline support with data synchronization

### Monitoring
- Crash reporting with Sentry
- Performance monitoring with Firebase
- Analytics with Mixpanel/Google Analytics

## 🚨 Troubleshooting

### Common Issues
1. **Metro bundler not starting**: Clear cache with `npx expo start -c`
2. **Network requests failing**: Check API URL configuration
3. **Storage issues**: Clear AsyncStorage manually
4. **Build failures**: Update Expo CLI and dependencies

### Debug Mode
```typescript
// Enable debug logging
console.log('Debug:', data);

// Enable Redux logger in development
const store = configureStore({
  reducer: rootReducer,
  middleware: [logger], // Only in development
});
```

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Redux Toolkit Guide](https://redux-toolkit.js.org/)
- [React Navigation Guide](https://reactnavigation.org/)

## 🤝 Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation
4. Submit PR with detailed description

## 📄 License

Proprietary - All rights reserved © 2025 Ayaz Technology
