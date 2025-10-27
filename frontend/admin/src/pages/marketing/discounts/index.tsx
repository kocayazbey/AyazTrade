'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Search, Plus, Edit, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Discount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  usageLimit?: number;
  usedCount: number;
  status: 'active' | 'inactive' | 'expired';
  startDate: string;
  endDate: string;
}

export default function DiscountsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/marketing/discounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İndirimler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedDiscounts: Discount[] = (data.data?.discounts || data.data || []).map((discount: any) => ({
          id: discount.id,
          code: discount.code || discount.couponCode || '',
          name: discount.name || discount.title || '',
          type: discount.type || 'percentage',
          value: discount.value || discount.amount || 0,
          minAmount: discount.minAmount || discount.minimumPurchase || undefined,
          maxAmount: discount.maxAmount || discount.maximumDiscount || undefined,
          usageLimit: discount.usageLimit || discount.maxUses || undefined,
          usedCount: discount.usedCount || discount.uses || 0,
          status: discount.status || 'active',
          startDate: discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : '',
          endDate: discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : '',
        }));
        setDiscounts(transformedDiscounts);
      } else {
        setDiscounts([]);
      }
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu indirimi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/marketing/discounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İndirim silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('İndirim başarıyla silindi');
        fetchDiscounts();
      } else {
        throw new Error(data.message || 'İndirim silinemedi');
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error('İndirim silinirken hata oluştu');
    }
  };

  const filteredDiscounts = discounts.filter(discount =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">İndirimler</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">İndirim kodlarını yönetin</p>
              </div>
              <button 
                onClick={() => toast.info('İndirim oluşturma özelliği yakında eklenecek')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni İndirim
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="İndirim kodu veya isim ara..."
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
              ) : filteredDiscounts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  İndirim bulunamadı
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kod</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İsim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Değer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kullanım</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarihler</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredDiscounts.map((discount) => (
                        <tr key={discount.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{discount.code}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {discount.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {discount.type === 'percentage' ? `%${discount.value}` : `${discount.value} TL`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {discount.usedCount} / {discount.usageLimit || '∞'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(discount.status)}`}>
                              {discount.status === 'active' ? 'Aktif' : discount.status === 'expired' ? 'Süresi Dolmuş' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {discount.startDate} - {discount.endDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => toast.info('İndirim düzenleme özelliği yakında eklenecek')}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(discount.id)}
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

