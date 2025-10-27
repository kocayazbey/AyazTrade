import { useState, useEffect, useCallback, useMemo } from 'react';

interface CodeSplittingOptions {
  fallback?: React.ComponentType;
  errorBoundary?: boolean;
  preload?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface CodeSplittingState<T> {
  Component: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

export const useCodeSplitting = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: CodeSplittingOptions = {}
) => {
  const {
    fallback: FallbackComponent,
    errorBoundary = true,
    preload = false,
    retryCount: maxRetryCount = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<CodeSplittingState<T>>({
    Component: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const loadComponent = useCallback(async (retryCount = 0) => {
    if (state.Component) return state.Component;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const module = await importFunc();
      setState(prev => ({
        ...prev,
        Component: module.default,
        loading: false,
        error: null,
        retryCount: 0,
      }));
      return module.default;
    } catch (error) {
      const err = error as Error;
      
      if (retryCount < maxRetryCount) {
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount);
        setTimeout(() => {
          loadComponent(retryCount + 1);
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err,
          retryCount,
        }));
      }
      throw err;
    }
  }, [importFunc, maxRetryCount, retryDelay, state.Component]);

  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      Component: null,
      error: null,
      retryCount: 0,
    }));
    loadComponent();
  }, [loadComponent]);

  // Preload component
  useEffect(() => {
    if (preload && !state.Component && !state.loading) {
      loadComponent();
    }
  }, [preload, state.Component, state.loading, loadComponent]);

  const renderComponent = useCallback((props: any) => {
    if (state.loading && FallbackComponent) {
      return <FallbackComponent {...props} />;
    }

    if (state.error && errorBoundary) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-red-500 mb-2">Failed to load component</div>
            <button
              onClick={retry}
              className="text-blue-500 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (state.Component) {
      return <state.Component {...props} />;
    }

    return null;
  }, [state, FallbackComponent, errorBoundary, retry]);

  return {
    Component: state.Component,
    loading: state.loading,
    error: state.error,
    loadComponent,
    retry,
    renderComponent,
  };
};

// Hook for dynamic imports with caching
export const useDynamicImport = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  cacheKey?: string
) => {
  const [cache, setCache] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    const key = cacheKey || importFunc.toString();
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    setLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      const Component = module.default;
      
      setCache(prev => new Map(prev).set(key, Component));
      setLoading(false);
      
      return Component;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [importFunc, cacheKey, cache]);

  return {
    loadComponent,
    loading,
    error,
    isCached: cacheKey ? cache.has(cacheKey) : false,
  };
};

// Hook for route-based code splitting
export const useRouteSplitting = <T extends React.ComponentType<any>>(
  routePath: string,
  importFunc: () => Promise<{ default: T }>
) => {
  const [components, setComponents] = useState<Map<string, T>>(new Map());
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());

  const loadRoute = useCallback(async (path: string) => {
    if (components.has(path) || loadingRoutes.has(path)) {
      return components.get(path);
    }

    setLoadingRoutes(prev => new Set(prev).add(path));

    try {
      const module = await importFunc();
      const Component = module.default;
      
      setComponents(prev => new Map(prev).set(path, Component));
      setLoadingRoutes(prev => {
        const newSet = new Set(prev);
        newSet.delete(path);
        return newSet;
      });
      
      return Component;
    } catch (error) {
      setLoadingRoutes(prev => {
        const newSet = new Set(prev);
        newSet.delete(path);
        return newSet;
      });
      throw error;
    }
  }, [importFunc, components, loadingRoutes]);

  const preloadRoute = useCallback((path: string) => {
    if (!components.has(path) && !loadingRoutes.has(path)) {
      loadRoute(path);
    }
  }, [loadRoute, components, loadingRoutes]);

  return {
    loadRoute,
    preloadRoute,
    isLoaded: (path: string) => components.has(path),
    isLoading: (path: string) => loadingRoutes.has(path),
    Component: components.get(routePath),
  };
};

// Hook for component preloading
export const useComponentPreloader = () => {
  const [preloadedComponents, setPreloadedComponents] = useState<Set<string>>(new Set());
  const [preloadingComponents, setPreloadingComponents] = useState<Set<string>>(new Set());

  const preloadComponent = useCallback(async (
    name: string,
    importFunc: () => Promise<any>
  ) => {
    if (preloadedComponents.has(name) || preloadingComponents.has(name)) {
      return;
    }

    setPreloadingComponents(prev => new Set(prev).add(name));

    try {
      await importFunc();
      setPreloadedComponents(prev => new Set(prev).add(name));
    } catch (error) {
      console.error(`Failed to preload component ${name}:`, error);
    } finally {
      setPreloadingComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }
  }, [preloadedComponents, preloadingComponents]);

  const preloadMultiple = useCallback(async (
    components: Array<{ name: string; importFunc: () => Promise<any> }>
  ) => {
    await Promise.all(
      components.map(({ name, importFunc }) => preloadComponent(name, importFunc))
    );
  }, [preloadComponent]);

  return {
    preloadComponent,
    preloadMultiple,
    isPreloaded: (name: string) => preloadedComponents.has(name),
    isPreloading: (name: string) => preloadingComponents.has(name),
  };
};

export default useCodeSplitting;
