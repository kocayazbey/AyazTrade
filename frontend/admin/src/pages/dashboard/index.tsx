import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../services/api';
import { useRole } from '../../contexts/RoleContext';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  salesGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
}

const Dashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useRole();
  
  // Real API call to backend
  const { data: stats, loading, error } = useApi<DashboardStats>(
    async () => {
      const response = await fetch('/api/proxy/analytics/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Dashboard verileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          totalSales: data.data.totalSales || 0,
          totalOrders: data.data.totalOrders || 0,
          totalCustomers: data.data.totalCustomers || 0,
          totalProducts: data.data.totalProducts || 0,
          salesGrowth: data.data.salesGrowth || 0,
          ordersGrowth: data.data.ordersGrowth || 0,
          customersGrowth: data.data.customersGrowth || 0,
          productsGrowth: data.data.productsGrowth || 0
        };
      } else {
        throw new Error(data.message || 'Dashboard verileri yüklenemedi');
      }
    },
    {
      onError: (err) => {
        console.error('Dashboard stats error:', err);
      }
    }
  );

  // Use real API data or default to zeros
  const currentStats: DashboardStats = stats || {
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
    customersGrowth: 0,
    productsGrowth: 0
  };

  // Sayı formatlaması için tutarlı fonksiyon
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const statsData = [
    {
      label: 'Toplam Satış',
      value: `₺${formatNumber(currentStats.totalSales)}`,
      change: `+${currentStats.salesGrowth}%`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Siparişler',
      value: formatNumber(currentStats.totalOrders),
      change: `+${currentStats.ordersGrowth}%`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Müşteriler',
      value: formatNumber(currentStats.totalCustomers),
      change: `+${currentStats.customersGrowth}%`,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Ürünler',
      value: formatNumber(currentStats.totalProducts),
      change: `+${currentStats.productsGrowth}%`,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Hoş geldiniz{user?.firstName ? `, ${user.firstName}` : ''}! İşte bugünün özeti.
              </p>
              {loading && (
                <div className="text-sm text-blue-600 mt-2">
                  Veriler yükleniyor...
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 mt-2">
                  Veri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900" suppressHydrationWarning>{stat.value}</h3>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Son Aktiviteler</h2>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Yeni sipariş alındı</p>
                      <p className="text-xs text-gray-500">{i * 2} dakika önce</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ₺{(100 + i * 50).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
