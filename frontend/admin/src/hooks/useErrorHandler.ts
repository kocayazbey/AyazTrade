import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToService?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const {
    showToast = true,
    logToService = true,
    fallbackMessage = 'An unexpected error occurred',
  } = options;

  const handleError = useCallback(
    (error: any, context?: string) => {
      // Extract error message
      const errorMessage = 
        error?.message || 
        error?.error?.message || 
        error?.response?.data?.message || 
        fallbackMessage;

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error caught by useErrorHandler:', {
          error,
          context,
          timestamp: new Date().toISOString(),
        });
      }

      // Show toast notification
      if (showToast) {
        toast.error(errorMessage, {
          duration: 5000,
          position: 'top-right',
        });
      }

      // Log to external service
      if (logToService && process.env.NODE_ENV === 'production') {
        fetch('/api/v1/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              message: errorMessage,
              stack: error?.stack,
              name: error?.name,
            },
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: localStorage.getItem('userId'),
          }),
        }).catch((logError) => {
          console.error('Failed to log error to service:', logError);
        });
      }
    },
    [showToast, logToService, fallbackMessage]
  );

  const handleAsyncError = useCallback(
    async (asyncFn: () => Promise<any>, context?: string) => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        throw error;
      }
    },
    [handleError]
  );

  const handlePromiseError = useCallback(
    (promise: Promise<any>, context?: string) => {
      return promise.catch((error) => {
        handleError(error, context);
        throw error;
      });
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    handlePromiseError,
  };
};
