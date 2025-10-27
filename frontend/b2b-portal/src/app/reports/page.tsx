'use client'

import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const monthlyData = [
  { month: 'Haz', spending: 145000, orders: 12 },
  { month: 'Tem', spending: 189000, orders: 15 },
  { month: 'Ağu', spending: 167000, orders: 14 },
  { month: 'Eyl', spending: 234000, orders: 18 },
  { month: 'Eki', spending: 198000, orders: 16 },
]

const topProducts = [
  { sku: 'PROD-001', name: 'Premium Laptop', quantity: 125, spending: 4499875, orders: 25 },
  { sku: 'PROD-015', name: 'Wireless Mouse', quantity: 340, spending: 101660, orders: 17 },
  { sku: 'PROD-089', name: 'Monitor 27"', quantity: 89, spending: 533911, orders: 12 },
]

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Harcama Raporları</h1>
              <p className="text-gray-600 mt-1">Son 6 aylık analiz</p>
            </div>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-2">
              <Download className="w-5 h-5" />
              Excel İndir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-10 h-10 text-blue-600" />
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">+18%</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Toplam Harcama</p>
            <p className="text-3xl font-bold text-gray-900">₺1,245,890</p>
            <p className="text-xs text-gray-500 mt-1">Son 6 ay</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart className="w-10 h-10 text-green-600" />
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">+12%</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Toplam Sipariş</p>
            <p className="text-3xl font-bold text-gray-900">89</p>
            <p className="text-xs text-gray-500 mt-1">Son 6 ay</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Ort. Sipariş</p>
            <p className="text-3xl font-bold text-gray-900">₺14,010</p>
            <p className="text-xs text-gray-500 mt-1">Sipariş başına</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Sipariş Sıklığı</p>
            <p className="text-3xl font-bold text-gray-900">6.7</p>
            <p className="text-xs text-gray-500 mt-1">Gün arayla</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Aylık Harcama Trendi</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `₺${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="spending" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Aylık Sipariş Sayısı</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">En Çok Sipariş Edilen Ürünler</h2>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <motion.div
                key={product.sku}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600 font-mono">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₺{product.spending.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{product.quantity} adet • {product.orders} sipariş</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

