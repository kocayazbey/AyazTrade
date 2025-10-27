'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Search, Link2, CheckCircle, XCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  icon?: string;
  category: string;
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Stripe',
    description: 'Ödeme işlemleri için Stripe entegrasyonu',
    status: 'connected',
    category: 'Ödeme',
  },
  {
    id: '2',
    name: 'SendGrid',
    description: 'E-posta gönderimi için SendGrid entegrasyonu',
    status: 'connected',
    category: 'E-posta',
  },
  {
    id: '3',
    name: 'SMS Gateway',
    description: 'SMS gönderimi için gateway entegrasyonu',
    status: 'disconnected',
    category: 'SMS',
  },
];

export default function IntegrationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/integrations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to mock data if API fails
        setIntegrations(mockIntegrations);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedIntegrations: Integration[] = (data.data?.integrations || data.data || []).map((integration: any) => ({
          id: integration.id,
          name: integration.name || '',
          description: integration.description || '',
          status: integration.status || integration.isConnected ? 'connected' : 'disconnected',
          icon: integration.icon,
          category: integration.category || 'Genel',
        }));
        setIntegrations(transformedIntegrations);
      } else {
        setIntegrations(mockIntegrations);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations(mockIntegrations);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
      const response = await fetch(`/api/proxy/integrations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Durum değiştirilemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Entegrasyon ${newStatus === 'connected' ? 'bağlandı' : 'bağlantısı kesildi'}`);
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error('İşlem başarısız oldu');
    }
  };

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Entegrasyonlar</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Üçüncü parti servis entegrasyonlarını yönetin</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Entegrasyon ara..."
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
              ) : filteredIntegrations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Entegrasyon bulunamadı
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {filteredIntegrations.map((integration) => (
                    <div key={integration.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <Link2 className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{integration.category}</p>
                          </div>
                        </div>
                        {integration.status === 'connected' ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(integration.id, integration.status)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                            integration.status === 'connected'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {integration.status === 'connected' ? 'Bağlantıyı Kes' : 'Bağlan'}
                        </button>
                        <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Settings className="w-5 h-5" />
                        </button>
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

