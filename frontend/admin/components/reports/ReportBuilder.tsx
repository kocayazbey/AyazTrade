'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  PieChart,
  Activity,
  FileText,
} from 'lucide-react'

const reportTypes = [
  { id: 'sales', name: 'Sales Report', icon: DollarSign, color: 'green' },
  { id: 'orders', name: 'Orders Report', icon: ShoppingCart, color: 'blue' },
  { id: 'customers', name: 'Customers Report', icon: Users, color: 'purple' },
  { id: 'products', name: 'Products Report', icon: Package, color: 'orange' },
  { id: 'revenue', name: 'Revenue Analysis', icon: TrendingUp, color: 'red' },
  { id: 'custom', name: 'Custom Report', icon: FileText, color: 'gray' },
]

const timeRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

const chartTypes = [
  { value: 'line', label: 'Line Chart', icon: Activity },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'table', label: 'Table', icon: FileText },
]

export default function ReportBuilder() {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [timeRange, setTimeRange] = useState('last30days')
  const [chartType, setChartType] = useState('line')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [filters, setFilters] = useState({
    status: [],
    category: [],
    channel: [],
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      console.log('Report generated')
    }, 2000)
  }

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`)
  }

  return (
    <div className="min-h-screen bg-ios-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="ios-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ios-gray-900">Report Builder</h1>
              <p className="text-ios-gray-600 mt-1">Create and export custom reports</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Report Type</h2>
              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReport(type.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedReport === type.id
                        ? 'bg-ios-blue text-white shadow-lg'
                        : 'text-ios-gray-700 hover:bg-ios-gray-100'
                    }`}
                  >
                    <type.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Time Range</h2>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>

              {timeRange === 'custom' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="w-full px-4 py-2 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="w-full px-4 py-2 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Chart Type</h2>
              <div className="space-y-2">
                {chartTypes.map((chart) => (
                  <button
                    key={chart.value}
                    onClick={() => setChartType(chart.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      chartType === chart.value
                        ? 'bg-ios-blue text-white'
                        : 'text-ios-gray-700 hover:bg-ios-gray-100'
                    }`}
                  >
                    <chart.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{chart.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="ios-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-ios-gray-900">Filters</h2>
                <button className="text-ios-blue hover:text-blue-600 transition-colors flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Advanced Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Order Status
                  </label>
                  <select
                    multiple
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    multiple
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="home">Home & Garden</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Sales Channel
                  </label>
                  <select
                    multiple
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  >
                    <option value="web">Web Store</option>
                    <option value="mobile">Mobile App</option>
                    <option value="pos">POS</option>
                    <option value="marketplace">Marketplace</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Report Preview</h2>

              {!isGenerating ? (
                <div className="text-center py-16">
                  <BarChart3 className="w-20 h-20 mx-auto mb-4 text-ios-gray-300" />
                  <p className="text-ios-gray-600 mb-6">
                    Configure your report settings and click generate
                  </p>
                  <button
                    onClick={handleGenerateReport}
                    className="px-8 py-3 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                  >
                    Generate Report
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="animate-spin w-12 h-12 border-4 border-ios-blue border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-ios-gray-600">Generating report...</p>
                </div>
              )}
            </div>

            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Key Metrics</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-600 font-medium">Total Revenue</span>
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">₺245,890</p>
                  <p className="text-xs text-green-600 mt-1">+15.3% vs last period</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-600 font-medium">Total Orders</span>
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">2,456</p>
                  <p className="text-xs text-blue-600 mt-1">+8.7% vs last period</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-600 font-medium">Customers</span>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700">12,345</p>
                  <p className="text-xs text-purple-600 mt-1">+23.1% vs last period</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orange-600 font-medium">Avg Order</span>
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-700">₺100.15</p>
                  <p className="text-xs text-orange-600 mt-1">+6.2% vs last period</p>
                </div>
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Scheduled Reports</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-ios-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-ios-blue" />
                    </div>
                    <div>
                      <p className="font-semibold text-ios-gray-900">Daily Sales Report</p>
                      <p className="text-sm text-ios-gray-600">Every day at 9:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                      Active
                    </span>
                    <button className="text-ios-gray-600 hover:text-ios-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-ios-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-ios-gray-900">Weekly Customer Report</p>
                      <p className="text-sm text-ios-gray-600">Every Monday at 10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                      Active
                    </span>
                    <button className="text-ios-gray-600 hover:text-ios-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-ios-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-ios-gray-900">Monthly Revenue Report</p>
                      <p className="text-sm text-ios-gray-600">1st of each month at 8:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg">
                      Paused
                    </span>
                    <button className="text-ios-gray-600 hover:text-ios-gray-900">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-3 border-2 border-dashed border-ios-gray-300 rounded-xl text-ios-gray-600 hover:border-ios-blue hover:text-ios-blue transition-colors">
                + Schedule New Report
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

