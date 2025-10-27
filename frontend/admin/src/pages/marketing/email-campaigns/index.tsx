'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Search, Plus, Edit, Trash2, Send, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledDate?: string;
  sentDate?: string;
}

export default function EmailCampaignsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/marketing/email-campaigns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('E-posta kampanyaları yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedCampaigns: EmailCampaign[] = (data.data?.campaigns || data.data || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name || campaign.title || '',
          subject: campaign.subject || '',
          status: campaign.status || 'draft',
          recipientCount: campaign.recipientCount || campaign.targetCount || 0,
          sentCount: campaign.sentCount || campaign.sent || 0,
          openRate: campaign.openRate || 0,
          clickRate: campaign.clickRate || 0,
          scheduledDate: campaign.scheduledDate ? new Date(campaign.scheduledDate).toISOString().split('T')[0] : undefined,
          sentDate: campaign.sentDate ? new Date(campaign.sentDate).toISOString().split('T')[0] : undefined,
        }));
        setCampaigns(transformedCampaigns);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/marketing/email-campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kampanya silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Kampanya başarıyla silindi');
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Kampanya silinirken hata oluştu');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">E-posta Kampanyaları</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">E-posta kampanyalarını yönetin</p>
              </div>
              <button 
                onClick={() => toast.info('Kampanya oluşturma özelliği yakında eklenecek')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Kampanya
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Kampanya ara..."
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
              ) : filteredCampaigns.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Kampanya bulunamadı
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kampanya</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gönderim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Açılma</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tıklama</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCampaigns.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{campaign.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{campaign.subject}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {campaign.status === 'sent' ? 'Gönderildi' : campaign.status === 'sending' ? 'Gönderiliyor' : campaign.status === 'scheduled' ? 'Zamanlanmış' : 'Taslak'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {campaign.sentCount} / {campaign.recipientCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            %{campaign.openRate.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            %{campaign.clickRate.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => toast.info('Kampanya görüntüleme özelliği yakında eklenecek')}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => toast.info('Kampanya düzenleme özelliği yakında eklenecek')}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

