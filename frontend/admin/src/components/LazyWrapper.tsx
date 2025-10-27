'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import AsyncErrorBoundary from './AsyncErrorBoundary';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
}

// Default loading component
const DefaultLoading = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-ios-blue mx-auto mb-4" />
      <p className="text-ios-gray-600">Loading...</p>
    </div>
  </div>
);

// Default error component
const DefaultError = ({ retry }: { retry: () => void }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ios-gray-900 mb-2">
        Failed to load
      </h3>
      <p className="text-ios-gray-600 mb-4">
        Something went wrong while loading this component.
      </p>
      <button
        onClick={retry}
        className="bg-ios-blue text-white px-4 py-2 rounded-ios font-medium hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Higher-order component for lazy loading
export const withLazyLoading = <P extends Record<string, any>>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperProps = {}
) => {
  const LazyComponent = lazy(importFunc);
  const { fallback = <DefaultLoading />, errorBoundary = true } = options;

  const WrappedComponent = (props: P) => {
    const content = (
      <Suspense fallback={fallback}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );

    if (errorBoundary) {
      return (
        <AsyncErrorBoundary>
          {content}
        </AsyncErrorBoundary>
      );
    }

    return content;
  };

  return WrappedComponent;
};

// Hook for lazy loading with error handling
export const useLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyWrapperProps = {}
) => {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadComponent = React.useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      setComponent(() => module.default);
      return module.default;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [Component, importFunc]);

  const retry = React.useCallback(() => {
    setComponent(null);
    setError(null);
    loadComponent();
  }, [loadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    retry,
  };
};

// Lazy wrapper component
export const LazyWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
}> = ({ children, fallback = <DefaultLoading />, errorBoundary = true }) => {
  if (errorBoundary) {
    return (
      <AsyncErrorBoundary>
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      </AsyncErrorBoundary>
    );
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Preload function for critical components
export const preloadComponent = (importFunc: () => Promise<any>) => {
  return importFunc();
};

// Batch preload for multiple components
export const preloadComponents = (importFuncs: (() => Promise<any>)[]) => {
  return Promise.all(importFuncs.map(func => func()));
};

export default LazyWrapper;
