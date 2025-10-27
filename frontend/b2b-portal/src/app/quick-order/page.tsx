'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Upload, Download, ShoppingCart } from 'lucide-react'

export default function QuickOrderPage() {
  const [items, setItems] = useState([
    { id: '1', sku: '', quantity: 1 },
  ])

  const addRow = () => {
    setItems([...items, { id: `${Date.now()}`, sku: '', quantity: 1 }])
  }

  const removeRow = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleAddToCart = () => {
    const validItems = items.filter(item => item.sku && item.quantity > 0)
    console.log('Adding to cart:', validItems)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hızlı Sipariş</h1>
              <p className="text-gray-600 mt-1">SKU numarası ile hızlı sipariş oluşturun</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Şablon İndir
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Excel Yükle
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">#</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">SKU / Ürün Kodu</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Ürün Adı</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Miktar</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Birim Fiyat</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Toplam</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-gray-600">{index + 1}</td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                      placeholder="PROD-001"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600 text-sm">Premium Laptop</span>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₺35,999</td>
                  <td className="px-6 py-4 font-bold text-blue-600">₺35,999</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeRow(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          <div className="p-6 border-t bg-gray-50">
            <button
              onClick={addRow}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Satır Ekle
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Toplam Ürün: <span className="font-bold text-gray-900">{items.filter(i => i.sku).length}</span></p>
              <p className="text-gray-600">Toplam Miktar: <span className="font-bold text-gray-900">{items.reduce((sum, i) => sum + i.quantity, 0)}</span></p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 mb-2">Genel Toplam</p>
              <p className="text-3xl font-bold text-blue-600">₺45,890</p>
              <button
                onClick={handleAddToCart}
                className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Sepete Ekle ({items.filter(i => i.sku).length} ürün)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

