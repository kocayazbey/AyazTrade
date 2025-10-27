'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, ShoppingCart, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  total: number;
  status: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  createdAt: string;
  status: string;
  orders: Order[];
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy/customers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Müşteri bilgileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success && data.data.customer) {
        const customerData = data.data.customer;
        const transformedCustomer: Customer = {
          id: customerData.id,
          firstName: customerData.firstName || customerData.name?.split(' ')[0] || '',
          lastName: customerData.lastName || customerData.name?.split(' ').slice(1).join(' ') || '',
          email: customerData.email || '',
          phone: customerData.phone || customerData.phoneNumber || '',
          address: customerData.address?.address || customerData.address || '',
          city: customerData.address?.city || customerData.city || '',
          country: customerData.address?.country || customerData.country || '',
          totalOrders: customerData.totalOrders || customerData.orderCount || 0,
          totalSpent: parseFloat(customerData.totalSpent) || parseFloat(customerData.lifetimeValue) || 0,
          averageOrderValue: customerData.totalOrders > 0 
            ? (parseFloat(customerData.totalSpent) || 0) / customerData.totalOrders 
            : 0,
          lastOrderDate: customerData.lastOrderDate ? new Date(customerData.lastOrderDate).toISOString().split('T')[0] : '',
          createdAt: customerData.createdAt ? new Date(customerData.createdAt).toISOString().split('T')[0] : '',
          status: customerData.status || customerData.isActive ? 'active' : 'inactive',
          orders: customerData.orders?.map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            date: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
            total: parseFloat(order.totalAmount) || 0,
            status: order.status,
          })) || [],
        };
        setCustomer(transformedCustomer);
      } else {
        throw new Error(data.message || 'Müşteri bulunamadı');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Müşteri bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">Müşteri bulunamadı</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/customers/${id}/edit`} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Edit className="w-5 h-5" />
            Düzenle
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kişisel Bilgiler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ad Soyad</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {customer.firstName} {customer.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">E-posta</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">{customer.email}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">{customer.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kayıt Tarihi</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">{customer.createdAt}</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Adres</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <p className="font-medium text-gray-900 dark:text-white">
                    {customer.address}, {customer.city}, {customer.country}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders History */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş Geçmişi</h2>
            <div className="space-y-3">
              {customer.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{order.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {order.status}
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ₺{order.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İstatistikler</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Sipariş</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{customer.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Harcama</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₺{customer.totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ortalama Sipariş</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₺{customer.averageOrderValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Durum</h2>
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
              customer.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {customer.status === 'active' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
