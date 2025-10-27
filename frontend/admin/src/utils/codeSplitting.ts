import { lazy } from 'react';

// Lazy load pages
export const LazyProductsPage = lazy(() => import('../pages/products'));
export const LazyOrdersPage = lazy(() => import('../pages/orders'));
export const LazyUsersPage = lazy(() => import('../pages/users'));
export const LazyCustomersPage = lazy(() => import('../pages/customers'));
export const LazyAnalyticsPage = lazy(() => import('../pages/analytics'));

// Lazy load components
export const LazyProductForm = lazy(() => import('../components/ProductForm'));
export const LazyOrderForm = lazy(() => import('../components/OrderForm'));
export const LazyUserForm = lazy(() => import('../components/UserForm'));
export const LazyCustomerForm = lazy(() => import('../components/CustomerForm'));
