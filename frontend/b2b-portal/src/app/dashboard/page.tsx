'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  CreditCard,
  Truck,
  BarChart3,
  Plus,
  Eye,
  Filter
} from 'lucide-react';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function B2BDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    creditLimit: 200000,
    creditUsed: 125000,
  });

  // Mock data - replace with real API calls
  useEffect(() => {
    // Load dashboard data from API
    // const loadDashboardData = async () => {
    //   try {
    //     const response = await fetch('/api/b2b/dashboard');
    //     if (response.ok) {
    //       const data = await response.json();
    //       setStats(data.data);
    //     }
    //   } catch (error) {
    //     console.error('Error loading dashboard data:', error);
    //   }
    // };
    // loadDashboardData();
  }, []);

  const quickActions = [
    {
      id: 'quick-order',
      title: 'Hızlı Sipariş',
      description: 'Kolay ve hızlı sipariş verin',
      icon: ShoppingCart,
      href: '/quick-order',
      color: 'bg-blue-500',
    },
    {
      id: 'bulk-order',
      title: 'Toplu Sipariş',
      description: 'Büyük miktarlarda sipariş verin',
      icon: Package,
      href: '/bulk-order',
      color: 'bg-green-500',
    },
    {
      id: 'view-orders',
      title: 'Siparişlerim',
      description: 'Mevcut siparişlerinizi görüntüleyin',
      icon: Eye,
      href: '/orders',
      color: 'bg-purple-500',
    },
    {
      id: 'reports',
      title: 'Raporlar',
      description: 'Satış ve performans raporları',
      icon: BarChart3,
      href: '/reports',
      color: 'bg-orange-500',
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="md:hidden p-2 rounded-md hover:bg-gray-100"
                  >
                    <Filter className="w-6 h-6" />
                  </button>
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                      Hoş Geldiniz, {user?.companyName || user?.firstName}!
                    </h1>
                    <p className="text-gray-600">
                      B2B portalınızdan tüm işlemlerinizi yönetebilirsiniz
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Bekleyen Sipariş</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Harcama</p>
                    <p className="text-2xl font-bold text-gray-900">₺{stats.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Kredi Limiti</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₺{stats.creditUsed.toLocaleString()} / ₺{stats.creditLimit.toLocaleString()}
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(stats.creditUsed / stats.creditLimit) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <div key={action.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-gray-600 text-sm">{action.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Siparişler</h3>
                <div className="space-y-3">
                  {/* Mock recent orders */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Sipariş #12345</p>
                      <p className="text-sm text-gray-600">2 gün önce</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₺1,250</p>
                      <p className="text-sm text-green-600">Tamamlandı</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Sipariş #12344</p>
                      <p className="text-sm text-gray-600">5 gün önce</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₺890</p>
                      <p className="text-sm text-blue-600">İşleniyor</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hesap Bilgileri</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Müşteri Tipi:</span>
                    <span className="font-medium">
                      {user?.customerType === 'b2b' ? 'B2B' :
                       user?.customerType === 'wholesale' ? 'Toptan' : 'Perakende'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Üyelik Tarihi:</span>
                    <span className="font-medium">Ocak 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Son Giriş:</span>
                    <span className="font-medium">Bugün</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
