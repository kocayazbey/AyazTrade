'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  ShoppingCart,
  TrendingUp,
  Users
} from 'lucide-react';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface NotificationSettings {
  orderUpdates: boolean;
  analyticsAlerts: boolean;
  systemNotifications: boolean;
  marketingUpdates: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'analytics' | 'system' | 'marketing';
  timestamp: Date;
  read: boolean;
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [settings, setSettings] = useState<NotificationSettings>({
    orderUpdates: true,
    analyticsAlerts: true,
    systemNotifications: true,
    marketingUpdates: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    loadNotificationHistory();
    registerServiceWorker();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermission({
        granted: Notification.permission === 'granted',
        denied: Notification.permission === 'denied',
        default: Notification.permission === 'default'
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission({
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default'
      });
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      // Mock data - in real implementation, this would fetch from API
      const mockHistory: NotificationHistory[] = [
        {
          id: '1',
          title: 'New Order Received',
          message: 'Order #12345 has been placed by John Doe',
          type: 'order',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          read: false
        },
        {
          id: '2',
          title: 'Analytics Alert',
          message: 'Revenue increased by 15% this week',
          type: 'analytics',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: true
        },
        {
          id: '3',
          title: 'System Update',
          message: 'Database maintenance completed successfully',
          type: 'system',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          read: true
        }
      ];
      
      setHistory(mockHistory);
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!permission.granted) {
      alert('Please enable notifications first');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification from AyazTrade Admin',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
        data: {
          url: '/analytics'
        }
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const updateSettings = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const markAsRead = (notificationId: string) => {
    setHistory(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'analytics':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      case 'marketing':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analytics':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'marketing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Push Notifications</h1>
          <p className="text-gray-600">Manage notification preferences and settings</p>
        </div>
        <div className="flex items-center space-x-3">
          {permission.granted ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : permission.denied ? (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              Blocked
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Not Set
            </Badge>
          )}
        </div>
      </div>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Permission
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permission.granted ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-600">Notifications are enabled</p>
                <p className="text-sm text-gray-600">You will receive push notifications</p>
              </div>
              <Button variant="outline" onClick={sendTestNotification}>
                Send Test
              </Button>
            </div>
          ) : permission.denied ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Notifications are blocked</p>
                <p className="text-sm text-gray-600">Please enable notifications in your browser settings</p>
              </div>
              <Button variant="outline" disabled>
                <BellOff className="h-4 w-4 mr-2" />
                Blocked
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-600">Notifications not enabled</p>
                <p className="text-sm text-gray-600">Click to enable push notifications</p>
              </div>
              <Button 
                onClick={requestNotificationPermission}
                disabled={loading}
                className="flex items-center"
              >
                <Bell className="h-4 w-4 mr-2" />
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Order Updates</h3>
              <p className="text-sm text-gray-600">Get notified about new orders and status changes</p>
            </div>
            <Switch
              checked={settings.orderUpdates}
              onCheckedChange={(checked) => updateSettings('orderUpdates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Analytics Alerts</h3>
              <p className="text-sm text-gray-600">Receive alerts about important metrics and trends</p>
            </div>
            <Switch
              checked={settings.analyticsAlerts}
              onCheckedChange={(checked) => updateSettings('analyticsAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">System Notifications</h3>
              <p className="text-sm text-gray-600">Get notified about system updates and maintenance</p>
            </div>
            <Switch
              checked={settings.systemNotifications}
              onCheckedChange={(checked) => updateSettings('systemNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Marketing Updates</h3>
              <p className="text-sm text-gray-600">Receive marketing insights and campaign updates</p>
            </div>
            <Switch
              checked={settings.marketingUpdates}
              onCheckedChange={(checked) => updateSettings('marketingUpdates', checked)}
            />
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Quiet Hours</h3>
                <p className="text-sm text-gray-600">Pause notifications during specific hours</p>
              </div>
              <Switch
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => updateSettings('quietHours', { ...settings.quietHours, enabled: checked })}
              />
            </div>
            
            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => updateSettings('quietHours', { ...settings.quietHours, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => updateSettings('quietHours', { ...settings.quietHours, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge className={getNotificationColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={sendTestNotification}>
              <Bell className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
            <Button variant="outline" onClick={loadNotificationHistory}>
              <Info className="h-4 w-4 mr-2" />
              Refresh History
            </Button>
            <Button variant="outline" onClick={() => setHistory([])}>
              <XCircle className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
