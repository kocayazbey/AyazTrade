'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Search, Bell, Trash2, Check, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = filterType !== 'all' 
        ? `/api/proxy/notifications?type=${filterType}`
        : '/api/proxy/notifications';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Bildirimler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedNotifications: Notification[] = (data.data?.notifications || data.data || []).map((notif: any) => ({
          id: notif.id,
          title: notif.title || notif.subject || '',
          message: notif.message || notif.content || '',
          type: notif.type || 'info',
          read: notif.read || notif.isRead || false,
          createdAt: notif.createdAt ? new Date(notif.createdAt).toISOString().split('T')[0] : '',
        }));
        setNotifications(transformedNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/proxy/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Bildirim okundu olarak işaretlenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Bildirim okundu olarak işaretlendi');
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('İşlem başarısız oldu');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/proxy/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Bildirim silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Bildirim silindi');
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Bildirim silinirken hata oluştu');
    }
  };

  const filteredNotifications = notifications.filter(notif =>
    notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notif.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Sistem bildirimlerini görüntüleyin</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Tümü</option>
                    <option value="info">Bilgi</option>
                    <option value="success">Başarılı</option>
                    <option value="warning">Uyarı</option>
                    <option value="error">Hata</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Bildirim bulunamadı
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotifications.map((notif) => (
                    <div key={notif.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{notif.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(notif.type)}`}>
                              {notif.type}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">{notif.message}</p>
                          <span className="text-sm text-gray-500">{notif.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Okundu olarak işaretle"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

