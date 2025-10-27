'use client';

import React, { useState, useEffect } from 'react';
import { AyuCard, AyuButton, AyuBadge } from '../index';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface KPIMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  target?: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export default function RealTimeDashboard() {
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for now
      const mockKpis: KPIMetric[] = [
        {
          name: 'Total Revenue',
          value: 125000,
          change: 12.5,
          trend: 'up',
          unit: 'USD',
          target: 150000
        },
        {
          name: 'Active Users',
          value: 2840,
          change: 8.2,
          trend: 'up',
          unit: 'users'
        },
        {
          name: 'Orders Today',
          value: 156,
          change: -2.1,
          trend: 'down',
          unit: 'orders'
        },
        {
          name: 'Conversion Rate',
          value: 3.2,
          change: 0.5,
          trend: 'up',
          unit: '%',
          target: 4.0
        }
      ];

      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'warning',
          message: 'High server load detected',
          severity: 'medium',
          timestamp: new Date(),
          resolved: false
        },
        {
          id: '2',
          type: 'info',
          message: 'Scheduled maintenance in 2 hours',
          severity: 'low',
          timestamp: new Date(),
          resolved: false
        }
      ];

      const mockPerformance: PerformanceMetrics = {
        responseTime: 120,
        throughput: 1250,
        errorRate: 0.02,
        uptime: 99.8
      };

      setKpis(mockKpis);
      setAlerts(mockAlerts);
      setPerformance(mockPerformance);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-time Dashboard</h1>
          <p className="text-gray-600">Live business metrics and system performance</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <AyuCard key={index} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  {kpi.name}
                </h3>
                {getTrendIcon(kpi.trend)}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(kpi.value, kpi.unit)}
                </div>
                <div className={`flex items-center text-sm ${getTrendColor(kpi.trend)}`}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                  <span className="ml-1">from last period</span>
                </div>
                {kpi.target && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500">Target: {formatValue(kpi.target, kpi.unit)}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full" 
                        style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AyuCard>
        ))}
      </div>

      {/* Alerts and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <AyuCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 mr-2" />
              System Alerts
            </h3>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        alert.severity === 'critical' ? 'bg-red-500' :
                        alert.severity === 'high' ? 'bg-orange-500' :
                        alert.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <AyuBadge variant={getSeverityColor(alert.severity) as any}>
                      {alert.severity}
                    </AyuBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AyuCard>

        {/* Performance Metrics */}
        <AyuCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <BarChart3 className="h-5 w-5 mr-2" />
              System Performance
            </h3>
            {performance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium">{performance.responseTime}ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      performance.responseTime < 200 ? 'bg-green-500' :
                      performance.responseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((performance.responseTime / 1000) * 100, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Throughput</span>
                  <span className="text-sm font-medium">{performance.throughput.toLocaleString()} req/s</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min((performance.throughput / 2000) * 100, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-sm font-medium">{(performance.errorRate * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      performance.errorRate < 0.01 ? 'bg-green-500' :
                      performance.errorRate < 0.05 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${performance.errorRate * 2000}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium">{performance.uptime.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      performance.uptime > 99.5 ? 'bg-green-500' :
                      performance.uptime > 99 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${performance.uptime}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No performance data available</p>
              </div>
            )}
          </div>
        </AyuCard>
      </div>

      {/* Quick Actions */}
      <AyuCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <AyuButton variant="outline" className="flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              View Charts
            </AyuButton>
            <AyuButton variant="outline" className="flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Generate Report
            </AyuButton>
            <AyuButton variant="outline" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Data
            </AyuButton>
            <AyuButton 
              variant="outline" 
              onClick={fetchDashboardData}
              className="flex items-center"
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh Data
            </AyuButton>
          </div>
        </div>
      </AyuCard>
    </div>
  );
}