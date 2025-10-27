'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, ShoppingCart, Calendar, Package } from 'lucide-react'

export default function ShoppingListsPage() {
  const [lists] = useState([
    { id: '1', name: 'Aylık Ofis Malzemeleri', itemCount: 15, totalValue: 12450, lastUsed: '2025-10-15', frequency: 'Aylık' },
    { id: '2', name: 'Kırtasiye Listesi', itemCount: 23, totalValue: 5670, lastUsed: '2025-10-10', frequency: 'Haftalık' },
    { id: '3', name: 'Teknoloji Ürünleri', itemCount: 8, totalValue: 45600, lastUsed: '2025-10-01', frequency: null },
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Alışveriş Listelerim</h1>
              <p className="text-gray-600 mt-1">{lists.length} adet liste</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Yeni Liste Oluştur
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{list.name}</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{list.itemCount} ürün</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Son: {list.lastUsed}</span>
                </div>
                {list.frequency && (
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold inline-block">
                    {list.frequency} Tekrar
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">Toplam Değer</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">₺{list.totalValue.toLocaleString()}</p>
                <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Sepete Ekle
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

