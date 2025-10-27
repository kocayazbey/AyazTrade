'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, Search, Plus, Eye, Edit, Trash2, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  targetAudience: number;
  sent: number;
  opens: number;
  clicks: number;
}

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/marketing/campaigns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kampanyalar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedCampaigns: Campaign[] = (data.data?.campaigns || data.data || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name || campaign.title || '',
          type: campaign.type || campaign.channel || 'Email',
          status: campaign.status || 'draft',
          startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
          endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
          targetAudience: campaign.targetAudience || campaign.recipientCount || 0,
          sent: campaign.sent || campaign.sentCount || 0,
          opens: campaign.opens || campaign.openCount || 0,
          clicks: campaign.clicks || campaign.clickCount || 0,
        }));
        setCampaigns(transformedCampaigns);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Kampanyalar yüklenirken hata oluştu');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || ''}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kampanyalar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {campaigns.length} kampanya
          </p>
        </div>
        <Link
          href="/marketing/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Kampanya
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Kampanya ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="col-span-full text-center p-12">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Kampanya bulunamadı</p>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{campaign.type}</p>
                </div>
                {getStatusBadge(campaign.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toplam</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Açılma</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.opens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tıklama</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.clicks.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Oran</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.sent > 0 ? ((campaign.opens / campaign.sent) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors">
                  <Eye className="w-4 h-4" />
                  Detay
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
