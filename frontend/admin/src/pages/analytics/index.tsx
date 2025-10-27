import React, { useState, useEffect } from 'react';
import { AyuCard, AyuButton, AyuInput } from '@/components';
import { RefreshCw, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    growth: number;
  };
  customers: {
    total: number;
    new: number;
    active: number;
    growth: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    growth: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  salesChart: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy/analytics/dashboard?days=${dateRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Analytics verileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedAnalytics: AnalyticsData = {
          revenue: {
            total: data.data.totalRevenue || 0,
            monthly: data.data.monthlyRevenue || 0,
            growth: data.data.revenueGrowth || 0,
          },
          orders: {
            total: data.data.totalOrders || 0,
            pending: data.data.pendingOrders || 0,
            completed: data.data.completedOrders || 0,
            growth: data.data.ordersGrowth || 0,
          },
          customers: {
            total: data.data.totalCustomers || 0,
            new: data.data.newCustomers || 0,
            active: data.data.activeCustomers || 0,
            growth: data.data.customersGrowth || 0,
          },
          products: {
            total: data.data.totalProducts || 0,
            active: data.data.activeProducts || 0,
            outOfStock: data.data.outOfStockProducts || 0,
            growth: data.data.productsGrowth || 0,
          },
          topProducts: data.data.topProducts || [],
          recentOrders: data.data.recentOrders || [],
          salesChart: data.data.salesChart || [],
        };
        setAnalytics(transformedAnalytics);
      } else {
        throw new Error(data.message || 'Analytics verileri yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    } else if (growth < 0) {
      return <TrendingDown className="w-4 h-4 text-error" />;
    }
    return null;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-success';
    if (growth < 0) return 'text-error';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="loading">
            <div className="spinner"></div>
            <span>Analitik veriler yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Veri bulunamadı</h2>
          <p className="text-gray-600">Analitik veriler yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analitik Dashboard</h1>
            <p className="text-gray-600 mt-2">İşletme performansınızı takip edin</p>
          </div>
          
          <div className="flex gap-4">
            <select
              className="form-input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7">Son 7 Gün</option>
              <option value="30">Son 30 Gün</option>
              <option value="90">Son 90 Gün</option>
              <option value="365">Son 1 Yıl</option>
            </select>
            
            <AyuButton
              variant="outline"
              onClick={fetchAnalytics}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </AyuButton>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AyuCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Toplam Gelir</div>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(analytics.revenue.total)}
                </div>
                <div className={`flex items-center gap-1 mt-2 ${getGrowthColor(analytics.revenue.growth)}`}>
                  {getGrowthIcon(analytics.revenue.growth)}
                  <span className="text-sm">
                    {analytics.revenue.growth > 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </AyuCard>

        <AyuCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Toplam Sipariş</div>
                <div className="text-3xl font-bold text-primary">
                  {formatNumber(analytics.orders.total)}
                </div>
                <div className={`flex items-center gap-1 mt-2 ${getGrowthColor(analytics.orders.growth)}`}>
                  {getGrowthIcon(analytics.orders.growth)}
                  <span className="text-sm">
                    {analytics.orders.growth > 0 ? '+' : ''}{analytics.orders.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
        </AyuCard>

        <AyuCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Toplam Müşteri</div>
                <div className="text-3xl font-bold text-primary">
                  {formatNumber(analytics.customers.total)}
                </div>
                <div className={`flex items-center gap-1 mt-2 ${getGrowthColor(analytics.customers.growth)}`}>
                  {getGrowthIcon(analytics.customers.growth)}
                  <span className="text-sm">
                    {analytics.customers.growth > 0 ? '+' : ''}{analytics.customers.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-success bg-opacity-10 rounded-lg">
                <Users className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </AyuCard>

        <AyuCard>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Toplam Ürün</div>
                <div className="text-3xl font-bold text-primary">
                  {formatNumber(analytics.products.total)}
                </div>
                <div className={`flex items-center gap-1 mt-2 ${getGrowthColor(analytics.products.growth)}`}>
                  {getGrowthIcon(analytics.products.growth)}
                  <span className="text-sm">
                    {analytics.products.growth > 0 ? '+' : ''}{analytics.products.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-warning bg-opacity-10 rounded-lg">
                <Package className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </AyuCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <AyuCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">En Çok Satan Ürünler</h3>
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sales} satış</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-gray-500">gelir</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AyuCard>

        {/* Recent Orders */}
        <AyuCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Son Siparişler</h3>
            <div className="space-y-4">
              {analytics.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(order.amount)}</div>
                    <div className="text-sm">
                      <span className={`badge badge-${order.status === 'completed' ? 'success' : 'warning'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AyuCard>
      </div>

      {/* Sales Chart Placeholder */}
      <AyuCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Satış Trendi</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 mb-2">Grafik burada görüntülenecek</div>
              <div className="text-sm text-gray-400">
                Chart.js veya Recharts kütüphanesi entegrasyonu gerekli
              </div>
            </div>
          </div>
        </div>
      </AyuCard>
    </div>
  );
};

export default AnalyticsPage;