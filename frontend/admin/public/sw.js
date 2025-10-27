const CACHE_NAME = 'ayaztrade-admin-v1.0.0';
const STATIC_CACHE = 'ayaztrade-static-v1.0.0';
const DYNAMIC_CACHE = 'ayaztrade-dynamic-v1.0.0';

// Initialize IndexedDB
const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AyazTradeOffline', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('offlineActions')) {
        const store = db.createObjectStore('offlineActions', { keyPath: 'id' });
        store.createIndex('endpoint', 'endpoint', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/analytics',
  '/orders',
  '/products',
  '/customers',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/analytics-enhanced\/real-time\/kpis/,
  /\/api\/v1\/analytics-enhanced\/real-time\/alerts/,
  /\/api\/v1\/analytics-enhanced\/real-time\/performance/,
  /\/api\/v1\/analytics-enhanced\/charts\/revenue/,
  /\/api\/v1\/analytics-enhanced\/charts\/sales/,
  /\/api\/v1\/analytics-enhanced\/reports\/templates/,
  /\/api\/v1\/products/,
  /\/api\/v1\/orders/,
  /\/api\/v1\/customers/,
  /\/api\/v1\/dashboard/,
  /\/api\/v1\/inventory/,
  /\/api\/v1\/reports/
];

// Install event - cache static assets and initialize IndexedDB
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      initIndexedDB()
        .then(() => {
          console.log('Service Worker: IndexedDB initialized');
        })
        .catch((error) => {
          console.error('Service Worker: Failed to initialize IndexedDB', error);
        })
    ])
    .then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request));
  } else {
    event.respondWith(handleOtherRequest(request));
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from AyazTrade Admin',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png'
      }
    ],
    tag: 'ayaztrade-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification('AyazTrade Admin', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/analytics')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsData());
  } else if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineActions());
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_ANALYTICS') {
    cacheAnalyticsData(event.data.payload);
  }
});

// Helper functions
function isStaticAsset(request) {
  return STATIC_ASSETS.includes(new URL(request.url).pathname) ||
         request.url.includes('/_next/static/') ||
         request.url.includes('/icons/') ||
         request.url.includes('/images/');
}

function isAPIRequest(request) {
  return request.url.includes('/api/');
}

function isPageRequest(request) {
  return request.headers.get('accept').includes('text/html');
}

async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle static asset', error);
    return new Response('Offline', { status: 503 });
  }
}

async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // For analytics APIs, try cache first, then network
    if (isAnalyticsAPI(request) && cachedResponse) {
      // Return cached data immediately
      fetchAndCache(request, cache);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle API request', error);
    
    // Return cached data if available
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle page request', error);
    
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/offline.html');
    
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function handleOtherRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle other request', error);
    return new Response('Offline', { status: 503 });
  }
}

function isAnalyticsAPI(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.error('Service Worker: Failed to fetch and cache', error);
  }
}

async function syncAnalyticsData() {
  console.log('Service Worker: Syncing analytics data');
  
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = [
      '/api/v1/analytics-enhanced/real-time/kpis',
      '/api/v1/analytics-enhanced/real-time/alerts',
      '/api/v1/analytics-enhanced/real-time/performance'
    ];
    
    for (const url of requests) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          cache.put(url, response.clone());
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync', url, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync analytics data', error);
  }
}

async function processOfflineActions() {
  console.log('Service Worker: Processing offline actions');

  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions();

    for (const action of offlineActions) {
      try {
        await processOfflineAction(action);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Service Worker: Failed to process offline action', action.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to process offline actions', error);
  }
}

async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AyazTradeOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const getAll = store.getAll();

      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

async function processOfflineAction(action) {
  console.log('Service Worker: Processing offline action', action);

  try {
    const response = await fetch(action.endpoint, {
      method: action.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.data)
    });

    if (response.ok) {
      console.log('Service Worker: Offline action synced successfully', action.id);
      // Notify the client
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'OFFLINE_ACTION_SYNCED',
            actionId: action.id
          });
        });
      });
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync offline action', error);
    throw error;
  }
}

async function removeOfflineAction(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AyazTradeOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const deleteRequest = store.delete(actionId);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function cacheAnalyticsData(data) {
  console.log('Service Worker: Caching analytics data');
  
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('/api/v1/analytics-enhanced/cached-data', response);
  } catch (error) {
    console.error('Service Worker: Failed to cache analytics data', error);
  }
}

// Periodic background sync (if supported)
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'analytics-sync') {
      event.waitUntil(syncAnalyticsData());
    }
  });
}
