import React, { Suspense, lazy } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load components
const ProductsPage = lazy(() => import('../pages/products'));
const OrdersPage = lazy(() => import('../pages/orders'));
const UsersPage = lazy(() => import('../pages/users'));
const CustomersPage = lazy(() => import('../pages/customers'));
const AnalyticsPage = lazy(() => import('../pages/analytics'));

interface LazyComponentProps {
  component: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({ component }) => {
  const renderComponent = () => {
    switch (component) {
      case 'products':
        return <ProductsPage />;
      case 'orders':
        return <OrdersPage />;
      case 'users':
        return <UsersPage />;
      case 'customers':
        return <CustomersPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <div>Component not found</div>;
    }
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {renderComponent()}
    </Suspense>
  );
};
