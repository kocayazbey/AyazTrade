'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface PWAContextType {
  isInstallable: boolean;
  isOffline: boolean;
  installPrompt: () => void;
  dismissInstallPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Check online status
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully:', registration);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.success('Yeni güncelleme mevcut! Sayfayı yenileyin.', {
                    duration: 8000,
                  });
                  // Auto reload after 3 seconds
                  setTimeout(() => window.location.reload(), 3000);
                }
              });
            }
          });

          // Initialize push notifications
          await initializePushNotifications(registration);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    // Initialize push notifications
    const initializePushNotifications = async (registration: ServiceWorkerRegistration) => {
      if ('PushManager' in window) {
        setIsPushSupported(true);

        try {
          // Check for existing subscription
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            // Request permission and create subscription
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
              const publicKey = await getVAPIDPublicKey();
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey as ArrayBuffer,
              });

              // Save subscription to backend
              await savePushSubscription(subscription);
            }
          } else {
            // Check if subscription is still valid
            await savePushSubscription(subscription);
          }

          setPushSubscription(subscription);
        } catch (error) {
          console.error('Push notification initialization failed:', error);
        }
      }
    };

    // Get VAPID public key
    const getVAPIDPublicKey = async (): Promise<Uint8Array> => {
      try {
        const response = await fetch('/api/v1/web-push/public-key');
        const data = await response.json();

        if (data.publicKey) {
          return urlBase64ToUint8Array(data.publicKey);
        }
      } catch (error) {
        console.error('Failed to get VAPID public key:', error);
      }

      // Fallback key (should be replaced with actual key)
      return urlBase64ToUint8Array('BFakePublicKeyForDevelopmentPurposesOnly');
    };

    // Save push subscription to backend
    const savePushSubscription = async (subscription: PushSubscription) => {
      try {
        await fetch('/api/v1/web-push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(subscription.getKey('auth')!),
              },
            },
            userId: 'current-user-id', // Should come from auth context
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              vendor: navigator.vendor,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to save push subscription:', error);
      }
    };

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('AyazTrade Admin başarıyla yüklendi!');
    };

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial checks
    checkInstalled();
    updateOnlineStatus();
    registerServiceWorker();

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const installPrompt = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const dismissInstallPrompt = () => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const value: PWAContextType = {
    isInstallable,
    isOffline,
    installPrompt,
    dismissInstallPrompt,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      {isInstallable && !isInstalled && (
        <InstallPrompt onInstall={installPrompt} onDismiss={dismissInstallPrompt} />
      )}
      {isOffline && <OfflineIndicator />}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

interface InstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">AyazTrade Admin</h3>
          <p className="text-sm text-gray-500">Uygulamayı ana ekranınıza ekleyin</p>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onInstall}
          className="flex-1 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Yükle
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
        >
          İptal
        </button>
      </div>
    </div>
  );
}

// Utility functions for push notifications
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Push notification management hook
export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsSupported('PushManager' in window);
    setPermission(Notification.permission);
  }, []);

  const subscribe = async (): Promise<boolean> => {
    try {
      if (!('PushManager' in window)) {
        throw new Error('Push messaging is not supported');
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = await getVAPIDPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey as ArrayBuffer,
      });

      // Save subscription to backend
      await savePushSubscription(subscription);
      setIsSubscribed(true);
      setPermission('granted');

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from backend
        await removePushSubscription(subscription);
        setIsSubscribed(false);
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  };

  const getVAPIDPublicKey = async (): Promise<Uint8Array> => {
    try {
      const response = await fetch('/api/v1/web-push/public-key');
      const data = await response.json();

      if (data.publicKey) {
        return urlBase64ToUint8Array(data.publicKey);
      }
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
    }

    throw new Error('Could not get VAPID public key');
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/v1/web-push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
          },
          userId: 'current-user-id', // Should come from auth context
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to save push subscription:', error);
    }
  };

  const removePushSubscription = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/v1/web-push/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
          },
        }),
      });
    } catch (error) {
      console.error('Failed to remove push subscription:', error);
    }
  };

  return {
    isSubscribed,
    isSupported,
    permission,
    subscribe,
    unsubscribe,
  };
}

function OfflineIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        İnternet bağlantınız yok. Offline modda çalışıyorsunuz.
      </div>
    </div>
  );
}
