'use client';

import React, { useState, useEffect } from 'react';
import { AyuCard, AyuButton, AyuBadge } from '../index';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Download,
  Filter,
  RefreshCw,
  Settings
} from 'lucide-react';

interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  lastUpdated: string;
}

export default function InteractiveCharts() {
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockCharts: ChartData[] = [
        {
          id: '1',
          type: 'line',
          title: 'Sales Trend',
          data: [
            { month: 'Jan', value: 1000 },
            { month: 'Feb', value: 1200 },
            { month: 'Mar', value: 1100 },
            { month: 'Apr', value: 1400 },
            { month: 'May', value: 1600 },
            { month: 'Jun', value: 1800 }
          ],
          lastUpdated: '2024-01-20T10:00:00Z'
        },
        {
          id: '2',
          type: 'bar',
          title: 'Product Performance',
          data: [
            { product: 'Product A', sales: 500 },
            { product: 'Product B', sales: 800 },
            { product: 'Product C', sales: 300 },
            { product: 'Product D', sales: 600 }
          ],
          lastUpdated: '2024-01-20T09:30:00Z'
        },
        {
          id: '3',
          type: 'pie',
          title: 'Customer Segments',
          data: [
            { segment: 'VIP', value: 25 },
            { segment: 'Regular', value: 60 },
            { segment: 'New', value: 15 }
          ],
          lastUpdated: '2024-01-20T08:45:00Z'
        }
      ];
      setCharts(mockCharts);
    } catch (error) {
      console.error('Error loading charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChart = async () => {
    setLoading(true);
    try {
      const newChart: ChartData = {
        id: Date.now().toString(),
        type: 'line',
        title: 'New Chart',
        data: [],
        lastUpdated: new Date().toISOString()
      };
      setCharts(prev => [...prev, newChart]);
    } catch (error) {
      console.error('Error creating chart:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportChart = async (chartId: string) => {
    try {
      // Mock export functionality
      console.log('Exporting chart:', chartId);
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line':
        return <LineChart className="h-5 w-5" />;
      case 'bar':
        return <BarChart3 className="h-5 w-5" />;
      case 'pie':
        return <PieChart className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getChartTypeColor = (type: string) => {
    switch (type) {
      case 'line':
        return 'info';
      case 'bar':
        return 'success';
      case 'pie':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading && charts.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Interactive Charts</h1>
          <p className="text-gray-600">Create and manage interactive data visualizations</p>
        </div>
        <AyuButton onClick={createChart} className="flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Create Chart
        </AyuButton>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {charts.map((chart) => (
          <AyuCard key={chart.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getChartIcon(chart.type)}
                  <h3 className="text-lg font-semibold">{chart.title}</h3>
                </div>
                <AyuBadge variant={getChartTypeColor(chart.type) as any}>
                  {chart.type}
                </AyuBadge>
              </div>
              
              {/* Chart Placeholder */}
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-gray-500 mb-2">Chart Preview</div>
                  <div className="text-sm text-gray-400">
                    {chart.data.length} data points
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Last updated: {new Date(chart.lastUpdated).toLocaleDateString()}</span>
                <span>{chart.data.length} items</span>
              </div>
              
              <div className="flex items-center justify-between">
                <AyuButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedChart(chart.id)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </AyuButton>
                <AyuButton
                  variant="ghost"
                  size="sm"
                  onClick={() => exportChart(chart.id)}
                >
                  <Download className="h-4 w-4" />
                </AyuButton>
              </div>
            </div>
          </AyuCard>
        ))}
      </div>

      {/* Chart Configuration Modal */}
      {selectedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AyuCard className="w-full max-w-2xl mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Chart Configuration</h3>
                <AyuButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChart(null)}
                >
                  ×
                </AyuButton>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter chart title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Source
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="sales">Sales Data</option>
                    <option value="customers">Customer Data</option>
                    <option value="products">Product Data</option>
                    <option value="inventory">Inventory Data</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <AyuButton variant="outline" onClick={() => setSelectedChart(null)}>
                  Cancel
                </AyuButton>
                <AyuButton>
                  Save Configuration
                </AyuButton>
              </div>
            </div>
          </AyuCard>
        </div>
      )}

      {charts.length === 0 && (
        <AyuCard>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No charts yet</h3>
            <p className="text-gray-600 mb-4">Create your first interactive chart</p>
            <AyuButton onClick={createChart}>
              Create Chart
            </AyuButton>
          </div>
        </AyuCard>
      )}
    </div>
  );
}