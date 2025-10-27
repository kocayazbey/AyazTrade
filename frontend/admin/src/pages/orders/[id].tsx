'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Edit, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  billingAddress: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy/orders/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sipariş bilgileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success && data.data.order) {
        const orderData = data.data.order;
        // Transform backend data to frontend format
        const transformedOrder: Order = {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customer?.name || 'Bilinmeyen Müşteri',
          customerEmail: orderData.customer?.email || '',
          customerPhone: orderData.customer?.phone || orderData.shippingAddress?.phone || '',
          shippingAddress: orderData.shippingAddress ? 
            `${orderData.shippingAddress.address}, ${orderData.shippingAddress.city}, ${orderData.shippingAddress.country}` :
            'Adres bilgisi yok',
          billingAddress: orderData.billingAddress ?
            `${orderData.billingAddress.address}, ${orderData.billingAddress.city}, ${orderData.billingAddress.country}` :
            'Adres bilgisi yok',
          status: orderData.status,
          paymentStatus: orderData.paymentStatus,
          paymentMethod: orderData.paymentMethod || 'Belirtilmemiş',
          items: orderData.items?.map((item: any) => ({
            id: item.id,
            productName: item.product?.name || item.productName || 'Ürün adı yok',
            sku: item.product?.sku || item.sku || '',
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            total: parseFloat(item.total) || 0,
          })) || [],
          subtotal: parseFloat(orderData.subtotal) || 0,
          shipping: parseFloat(orderData.shipping) || 0,
          tax: parseFloat(orderData.tax) || 0,
          discount: parseFloat(orderData.discount) || parseFloat(orderData.couponDiscount) || 0,
          total: parseFloat(orderData.totalAmount) || 0,
          createdAt: orderData.createdAt || orderData.orderDate,
          updatedAt: orderData.updatedAt,
        };
        setOrder(transformedOrder);
      } else {
        throw new Error(data.message || 'Sipariş bulunamadı');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Sipariş bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/proxy/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Durum güncellenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Sipariş durumu ${newStatus} olarak güncellendi`);
        fetchOrder();
      } else {
        throw new Error(data.message || 'Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      processing: <Package className="w-4 h-4" />,
      shipped: <Package className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${colors[status] || ''}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Sipariş bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sipariş Detayı</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Sipariş No: {order.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Printer className="w-5 h-5" />
            Yazdır
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-5 h-5" />
            PDF İndir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş İçeriği</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.productName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Adet: {item.quantity}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ₺{item.price.toLocaleString()}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      ₺{item.total.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teslimat Adresi</h2>
            <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress}</p>
          </div>

          {/* Billing Address */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fatura Adresi</h2>
            <p className="text-gray-600 dark:text-gray-400">{order.billingAddress}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Durum</h2>
            <div className="space-y-4">
              {getStatusBadge(order.status)}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleStatusChange('processing')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                >
                  İşleme Al
                </button>
                <button
                  onClick={() => handleStatusChange('shipped')}
                  className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors"
                >
                  Kargoya Ver
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="px-4 py-2 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900 transition-colors"
                >
                  Tamamlandı İşaretle
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş Özeti</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Ara Toplam</span>
                <span>₺{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Kargo</span>
                <span>₺{order.shipping.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>KDV</span>
                <span>₺{order.tax.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>İndirim</span>
                  <span>-₺{order.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                  <span>Toplam</span>
                  <span>₺{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Müşteri Bilgileri</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ad</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">E-posta</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.customerPhone}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ödeme Bilgileri</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ödeme Yöntemi</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ödeme Durumu</p>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                  order.paymentStatus === 'paid' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
