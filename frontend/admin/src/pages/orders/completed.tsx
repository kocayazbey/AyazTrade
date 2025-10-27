'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentStatus: string;
  date: string;
  itemCount: number;
}

export default function CompletedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/orders?status=completed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Tamamlanan siparişler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedOrders: Order[] = data.data.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name || 'Bilinmeyen Müşteri',
          customerEmail: order.customer?.email || '',
          total: parseFloat(order.totalAmount) || 0,
          paymentStatus: order.paymentStatus,
          date: new Date(order.createdAt).toISOString().split('T')[0],
          itemCount: order.items?.length || 0,
        }));
        setOrders(transformedOrders);
      } else {
        throw new Error(data.message || 'Tamamlanan siparişler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching completed orders:', error);
      toast.error('Tamamlanan siparişler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tamamlanan Siparişler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredOrders.length} tamamlanan sipariş
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Sipariş ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün Sayısı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/orders/${order.id}`} className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{order.customerName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{order.customerEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.itemCount}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    ₺{order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.date}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400">
                      <Eye className="w-4 h-4" />
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Tamamlanan sipariş bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
