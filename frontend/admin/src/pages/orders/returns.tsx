'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Return {
  id: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  status: string;
  refundAmount: number;
  requestedDate: string;
  type: 'return' | 'refund' | 'exchange';
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/orders/returns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İade talepleri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedReturns: Return[] = (data.data?.returns || data.data || []).map((ret: any) => ({
          id: ret.id,
          orderNumber: ret.orderNumber || ret.order?.orderNumber || '',
          customerName: ret.customerName || ret.customer?.name || 'Bilinmeyen Müşteri',
          reason: ret.reason || ret.description || '',
          status: ret.status || 'pending',
          refundAmount: parseFloat(ret.refundAmount) || 0,
          requestedDate: ret.requestedDate ? new Date(ret.requestedDate).toISOString().split('T')[0] : '',
          type: ret.type || 'return',
        }));
        setReturns(transformedReturns);
      } else {
        setReturns([]);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('İade talepleri yüklenirken hata oluştu');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || ret.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || ''}`}>
        {status === 'pending' && 'Bekliyor'}
        {status === 'approved' && 'Onaylandı'}
        {status === 'rejected' && 'Reddedildi'}
        {status === 'completed' && 'Tamamlandı'}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      return: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      exchange: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type as keyof typeof colors] || ''}`}>
        {type === 'return' && 'İade'}
        {type === 'refund' && 'Para İadesi'}
        {type === 'exchange' && 'Değişim'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">İade & İptal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredReturns.length} talep
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Talep ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Tüm Türler</option>
            <option value="return">İade</option>
            <option value="refund">Para İadesi</option>
            <option value="exchange">Değişim</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sipariş No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tür</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sebep</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İade Tutarı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ret.orderNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{ret.customerName}</td>
                  <td className="px-6 py-4">{getTypeBadge(ret.type)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{ret.reason}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">₺{ret.refundAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(ret.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{ret.requestedDate}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filteredReturns.length === 0 && (
          <div className="p-12 text-center">
            <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">İade talebi bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
