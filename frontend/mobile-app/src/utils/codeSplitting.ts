import { lazy } from 'react';

// Lazy load screens
export const LazyProductsScreen = lazy(() => import('../screens/ProductsScreen'));
export const LazyOrdersScreen = lazy(() => import('../screens/OrdersScreen'));
export const LazyCartScreen = lazy(() => import('../screens/CartScreen'));
export const LazyCheckoutScreen = lazy(() => import('../screens/CheckoutScreen'));
export const LazyProfileScreen = lazy(() => import('../screens/ProfileScreen'));

// Lazy load components
export const LazyProductCard = lazy(() => import('../components/ProductCard'));
export const LazyOrderCard = lazy(() => import('../components/OrderCard'));
export const LazyCartItem = lazy(() => import('../components/CartItem'));
