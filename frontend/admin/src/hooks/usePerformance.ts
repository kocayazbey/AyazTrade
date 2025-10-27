import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

interface PerformanceOptions {
  trackRenderTime?: boolean;
  trackMemoryUsage?: boolean;
  trackNetworkRequests?: boolean;
  logToConsole?: boolean;
  logToService?: boolean;
}

export const usePerformance = (
  componentName: string,
  options: PerformanceOptions = {}
) => {
  const {
    trackRenderTime = true,
    trackMemoryUsage = false,
    trackNetworkRequests = false,
    logToConsole = false,
    logToService = false,
  } = options;

  const mountTimeRef = useRef<number>(0);
  const renderStartTimeRef = useRef<number>(0);
  const networkRequestsRef = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const totalMountTime = performance.now() - mountTimeRef.current;
      
      if (logToConsole) {
        console.log(`Component ${componentName} mounted in ${totalMountTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, logToConsole]);

  // Track render time
  const startRender = useCallback(() => {
    if (trackRenderTime) {
      renderStartTimeRef.current = performance.now();
    }
  }, [trackRenderTime]);

  const endRender = useCallback(() => {
    if (trackRenderTime && renderStartTimeRef.current > 0) {
      const renderTime = performance.now() - renderStartTimeRef.current;
      
      if (logToConsole) {
        console.log(`Component ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }

      if (logToService) {
        logPerformanceMetric(componentName, 'renderTime', renderTime);
      }
    }
  }, [componentName, trackRenderTime, logToConsole, logToService]);

  // Track memory usage
  useEffect(() => {
    if (trackMemoryUsage && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        if (logToConsole) {
          console.log(`Component ${componentName} memory usage: ${memoryUsage.toFixed(2)}MB`);
        }

        if (logToService) {
          logPerformanceMetric(componentName, 'memoryUsage', memoryUsage);
        }
      }
    }
  }, [componentName, trackMemoryUsage, logToConsole, logToService]);

  // Track network requests
  useEffect(() => {
    if (trackNetworkRequests) {
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        networkRequestsRef.current += 1;
        const startTime = performance.now();
        
        try {
          const response = await originalFetch(...args);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          if (logToConsole) {
            console.log(`Network request from ${componentName}: ${duration.toFixed(2)}ms`);
          }

          if (logToService) {
            logPerformanceMetric(componentName, 'networkRequest', duration);
          }
          
          return response;
        } catch (error) {
          if (logToConsole) {
            console.error(`Network request failed from ${componentName}:`, error);
          }
          throw error;
        }
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [componentName, trackNetworkRequests, logToConsole, logToService]);

  return {
    startRender,
    endRender,
    getMetrics: () => ({
      componentMountTime: performance.now() - mountTimeRef.current,
      networkRequests: networkRequestsRef.current,
    }),
  };
};

// Performance monitoring hook for specific operations
export const usePerformanceMonitor = (
  operationName: string,
  options: PerformanceOptions = {}
) => {
  const startTimeRef = useRef<number>(0);
  const { logToConsole = false, logToService = false } = options;

  const startOperation = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endOperation = useCallback(() => {
    if (startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      
      if (logToConsole) {
        console.log(`Operation ${operationName} completed in ${duration.toFixed(2)}ms`);
      }

      if (logToService) {
        logPerformanceMetric(operationName, 'operationTime', duration);
      }
    }
  }, [operationName, logToConsole, logToService]);

  return {
    startOperation,
    endOperation,
  };
};

// Log performance metrics to external service
const logPerformanceMetric = (
  componentName: string,
  metricName: string,
  value: number
) => {
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/v1/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        componentName,
        metricName,
        value,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch((error) => {
      console.error('Failed to log performance metric:', error);
    });
  }
};

// Hook for measuring component render performance
export const useRenderPerformance = (componentName: string) => {
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);

  const measureRender = useCallback(() => {
    const startTime = performance.now();
    renderCountRef.current += 1;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimesRef.current.push(renderTime);

      // Keep only last 10 render times
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }

      const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      
      console.log(`Component ${componentName} render #${renderCountRef.current}: ${renderTime.toFixed(2)}ms (avg: ${avgRenderTime.toFixed(2)}ms)`);
    };
  }, [componentName]);

  return {
    measureRender,
    renderCount: renderCountRef.current,
    averageRenderTime: renderTimesRef.current.length > 0 
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
      : 0,
  };
};
