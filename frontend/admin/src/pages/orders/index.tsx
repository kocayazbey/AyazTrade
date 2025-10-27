'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Eye, Search, Filter, Download, Plus, MoreVertical, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/shared/Pagination';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
  date: string;
  itemCount: number;
}

interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const statusColors: { [key: string]: string } = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const paymentStatusColors: { [key: string]: string } = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.paymentStatus !== 'all') queryParams.append('paymentStatus', filters.paymentStatus);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/proxy/orders?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Siparişler yüklenemedi');
      }

      const data: OrdersResponse = await response.json();

      if (data.success) {
        // Transform backend data to frontend format
        const transformedOrders: Order[] = data.data.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name || 'Bilinmeyen Müşteri',
          customerEmail: order.customer?.email || '',
          total: parseFloat(order.totalAmount) || 0,
          status: order.status,
          paymentStatus: order.paymentStatus,
          date: new Date(order.createdAt).toISOString().split('T')[0],
          itemCount: order.items?.length || 0,
        }));
        setOrders(transformedOrders);
        setPagination({
          total: data.data.total,
          page: data.data.page,
          limit: data.data.limit,
          totalPages: data.data.totalPages
        });
      } else {
        throw new Error(data.message || 'Siparişler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Siparişler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/proxy/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchOrders();
          toast.success('Sipariş durumu güncellendi');
        } else {
          throw new Error(data.message || 'Durum güncellenemedi');
        }
      } else {
        throw new Error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Sipariş durumu güncellenirken hata oluştu');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/proxy/orders/${orderId}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            await fetchOrders();
            toast.success('Sipariş iptal edildi');
          } else {
            throw new Error(data.message || 'Sipariş iptal edilemedi');
          }
        } else {
          throw new Error('Sipariş iptal edilemedi');
        }
      } catch (error) {
        console.error('Error canceling order:', error);
        toast.error('Sipariş iptal edilirken hata oluştu');
      }
    }
  };

  const handleEditOrder = (orderId: string) => {
    router.push(`/orders/${orderId}/edit`);
  };

  // Orders are filtered on backend, no client-side filtering needed

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Siparişler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {pagination.total} sipariş
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-5 h-5" />
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Sipariş ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="processing">İşleniyor</option>
            <option value="shipped">Kargoya Verildi</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>

          {/* Payment Filter */}
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Tüm Ödeme Durumları</option>
            <option value="pending">Ödeme Bekliyor</option>
            <option value="paid">Ödendi</option>
            <option value="failed">Başarısız</option>
            <option value="refunded">İade Edildi</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ödeme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
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
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                      {getStatusIcon(order.status)}
                      {order.status === 'pending' && 'Bekliyor'}
                      {order.status === 'processing' && 'İşleniyor'}
                      {order.status === 'shipped' && 'Kargoya Verildi'}
                      {order.status === 'completed' && 'Tamamlandı'}
                      {order.status === 'cancelled' && 'İptal Edildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColors[order.paymentStatus]}`}>
                      {order.paymentStatus === 'pending' && 'Bekliyor'}
                      {order.paymentStatus === 'paid' && 'Ödendi'}
                      {order.paymentStatus === 'failed' && 'Başarısız'}
                      {order.paymentStatus === 'refunded' && 'İade Edildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.date}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/orders/${order.id}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Link>
                      <button
                        onClick={() => handleEditOrder(order.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && orders.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Sipariş bulunamadı</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </div>
      )}
    </div>
  );
}