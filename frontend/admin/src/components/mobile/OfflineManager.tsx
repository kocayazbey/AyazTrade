'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  HardDrive,
  Cloud
} from 'lucide-react';

interface OfflineStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingActions: number;
  cacheSize: number;
  syncProgress: number;
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
}

interface CacheInfo {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  items: number;
}

export default function OfflineManager() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    lastSync: null,
    pendingActions: 0,
    cacheSize: 0,
    syncProgress: 0
  });
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    totalSize: 100 * 1024 * 1024, // 100MB
    usedSize: 25 * 1024 * 1024, // 25MB
    availableSize: 75 * 1024 * 1024, // 75MB
    items: 150
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkOnlineStatus();
    loadOfflineActions();
    loadCacheInfo();
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const checkOnlineStatus = () => {
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine
    }));
  };

  const handleOnline = () => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastSync: new Date()
    }));
    
    // Auto-sync when coming back online
    syncOfflineActions();
  };

  const handleOffline = () => {
    setStatus(prev => ({
      ...prev,
      isOnline: false
    }));
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data.type === 'SYNC_PROGRESS') {
      setStatus(prev => ({
        ...prev,
        syncProgress: event.data.progress
      }));
    } else if (event.data.type === 'SYNC_COMPLETE') {
      setStatus(prev => ({
        ...prev,
        syncProgress: 100,
        lastSync: new Date(),
        pendingActions: 0
      }));
      setSyncing(false);
      loadOfflineActions();
    }
  };

  const loadOfflineActions = async () => {
    try {
      // Mock data - in real implementation, this would fetch from IndexedDB
      const mockActions: OfflineAction[] = [
        {
          id: '1',
          type: 'create',
          entity: 'order',
          data: { customer: 'John Doe', amount: 150.00 },
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'pending',
          retryCount: 0
        },
        {
          id: '2',
          type: 'update',
          entity: 'product',
          data: { id: '123', stock: 50 },
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          status: 'pending',
          retryCount: 1
        },
        {
          id: '3',
          type: 'delete',
          entity: 'customer',
          data: { id: '456' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'failed',
          retryCount: 3
        }
      ];
      
      setActions(mockActions);
      setStatus(prev => ({
        ...prev,
        pendingActions: mockActions.filter(a => a.status === 'pending').length
      }));
    } catch (error) {
      console.error('Error loading offline actions:', error);
    }
  };

  const loadCacheInfo = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setCacheInfo(prev => ({
          ...prev,
          totalSize: estimate.quota || 0,
          usedSize: estimate.usage || 0,
          availableSize: (estimate.quota || 0) - (estimate.usage || 0)
        }));
      }
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  };

  const syncOfflineActions = async () => {
    if (!status.isOnline) {
      alert('You are currently offline. Please check your internet connection.');
      return;
    }

    setSyncing(true);
    setStatus(prev => ({ ...prev, syncProgress: 0 }));

    try {
      // Simulate sync process
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.status === 'pending' || action.status === 'failed') {
          setStatus(prev => ({ ...prev, syncProgress: (i / actions.length) * 100 }));
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update action status
          setActions(prev => 
            prev.map(a => 
              a.id === action.id 
                ? { ...a, status: 'completed' as const }
                : a
            )
          );
        }
      }
      
      setStatus(prev => ({
        ...prev,
        syncProgress: 100,
        lastSync: new Date(),
        pendingActions: 0
      }));
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    } finally {
      setSyncing(false);
    }
  };

  const retryAction = async (actionId: string) => {
    setActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { ...action, status: 'pending' as const, retryCount: action.retryCount + 1 }
          : action
      )
    );
    
    if (status.isOnline) {
      await syncOfflineActions();
    }
  };

  const clearCompletedActions = () => {
    setActions(prev => prev.filter(action => action.status !== 'completed'));
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      if ('storage' in navigator && 'clear' in navigator.storage) {
        await navigator.storage.clear();
      }
      
      loadCacheInfo();
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Offline Manager</h1>
          <p className="text-gray-600">Manage offline data and synchronization</p>
        </div>
        <div className="flex items-center space-x-3">
          {status.isOnline ? (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                <p className="text-2xl font-bold text-gray-900">{status.pendingActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Cloud className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Sync</p>
                <p className="text-sm font-bold text-gray-900">
                  {status.lastSync ? status.lastSync.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cache Size</p>
                <p className="text-sm font-bold text-gray-900">{formatBytes(cacheInfo.usedSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sync Progress</p>
                <p className="text-sm font-bold text-gray-900">{status.syncProgress.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Sync Status</h3>
                <p className="text-sm text-gray-600">
                  {syncing ? 'Synchronizing data...' : 'Ready to sync'}
                </p>
              </div>
              <Button 
                onClick={syncOfflineActions}
                disabled={!status.isOnline || syncing}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
            
            {syncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{status.syncProgress.toFixed(0)}%</span>
                </div>
                <Progress value={status.syncProgress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Offline Actions</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={clearCompletedActions}>
                Clear Completed
              </Button>
              <Button variant="outline" size="sm" onClick={loadOfflineActions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No offline actions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(action.status)}
                    <div>
                      <p className="font-medium capitalize">{action.type} {action.entity}</p>
                      <p className="text-sm text-gray-600">
                        {action.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(action.status)}>
                      {action.status}
                    </Badge>
                    {action.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryAction(action.id)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Cache Usage</h3>
                <p className="text-sm text-gray-600">
                  {formatBytes(cacheInfo.usedSize)} of {formatBytes(cacheInfo.totalSize)} used
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {((cacheInfo.usedSize / cacheInfo.totalSize) * 100).toFixed(1)}%
                </p>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(cacheInfo.usedSize / cacheInfo.totalSize) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Available Space</p>
                <p className="font-medium">{formatBytes(cacheInfo.availableSize)}</p>
              </div>
              <div>
                <p className="text-gray-600">Cached Items</p>
                <p className="font-medium">{cacheInfo.items}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <h3 className="font-medium">Clear Cache</h3>
                <p className="text-sm text-gray-600">Remove all cached data</p>
              </div>
              <Button variant="outline" onClick={clearCache}>
                Clear Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
