'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Search, Plus, Edit, Trash2, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
}

export default function WebhooksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/webhooks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Webhook\'ler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedWebhooks: Webhook[] = (data.data?.webhooks || data.data || []).map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name || webhook.title || '',
          url: webhook.url || webhook.endpoint || '',
          events: webhook.events || webhook.eventTypes || [],
          status: webhook.status || webhook.isActive ? 'active' : 'inactive',
          createdAt: webhook.createdAt ? new Date(webhook.createdAt).toISOString().split('T')[0] : '',
          lastTriggered: webhook.lastTriggered ? new Date(webhook.lastTriggered).toISOString().split('T')[0] : undefined,
        }));
        setWebhooks(transformedWebhooks);
      } else {
        setWebhooks([]);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu webhook\'ü silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/webhooks/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Webhook silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Webhook başarıyla silindi');
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Webhook silinirken hata oluştu');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL kopyalandı');
  };

  const filteredWebhooks = webhooks.filter(webhook =>
    webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webhook.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Webhook'ler</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Webhook yapılandırmalarını yönetin</p>
              </div>
              <button 
                onClick={() => toast.info('Webhook oluşturma özelliği yakında eklenecek')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Webhook
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Webhook ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredWebhooks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Webhook bulunamadı
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWebhooks.map((webhook) => (
                    <div key={webhook.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{webhook.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {webhook.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{webhook.url}</span>
                            <button
                              onClick={() => handleCopyUrl(webhook.url)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="URL'yi kopyala"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {webhook.events.map((event, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {event}
                              </span>
                            ))}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Oluşturulma: {webhook.createdAt}
                            {webhook.lastTriggered && ` • Son Tetikleme: ${webhook.lastTriggered}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button 
                            onClick={() => toast.info('Webhook düzenleme özelliği yakında eklenecek')}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(webhook.id)}
                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
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

