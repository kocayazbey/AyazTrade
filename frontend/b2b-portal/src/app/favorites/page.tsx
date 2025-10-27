'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Trash2, Edit2, TrendingDown, TrendingUp } from 'lucide-react'

export default function FavoritesPage() {
  const [favorites] = useState([
    { id: '1', sku: 'PROD-001', name: 'Premium Laptop', price: 35999, lastPrice: 37999, defaultQty: 5, image: 'https://via.placeholder.com/100', stock: 45 },
    { id: '2', sku: 'PROD-002', name: 'Wireless Mouse', price: 299, lastPrice: 299, defaultQty: 20, image: 'https://via.placeholder.com/100', stock: 120 },
    { id: '3', sku: 'PROD-003', name: 'USB-C Hub', price: 599, lastPrice: 649, defaultQty: 10, image: 'https://via.placeholder.com/100', stock: 67 },
  ])

  const totalItems = favorites.reduce((sum, f) => sum + f.defaultQty, 0)
  const totalValue = favorites.reduce((sum, f) => sum + (f.price * f.defaultQty), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Favori Ürünlerim</h1>
              <p className="text-gray-600 mt-1">{favorites.length} ürün • Toplam: ₺{totalValue.toLocaleString()}</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Tümünü Sepete Ekle ({totalItems} adet)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {favorites.map((item, index) => {
            const priceChange = item.price - item.lastPrice
            const priceChangePercent = ((priceChange / item.lastPrice) * 100).toFixed(1)

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-6">
                  <img src={item.image} alt={item.name} className="w-24 h-24 rounded-lg object-cover" />

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600 font-mono">SKU: {item.sku}</p>
                      </div>
                      {priceChange !== 0 && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                          priceChange < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          <span className="text-sm font-bold">{priceChange > 0 ? '+' : ''}{priceChangePercent}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-8 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Fiyat</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-blue-600">₺{item.price.toLocaleString()}</p>
                          {item.price !== item.lastPrice && (
                            <p className="text-sm text-gray-400 line-through">₺{item.lastPrice.toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Varsayılan Miktar</p>
                        <p className="text-xl font-bold text-gray-900">{item.defaultQty} adet</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Toplam</p>
                        <p className="text-xl font-bold text-gray-900">₺{(item.price * item.defaultQty).toLocaleString()}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Stok</p>
                        <p className={`text-xl font-bold ${item.stock > 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {item.stock}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Sepete Ekle
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                        <Edit2 className="w-4 h-4" />
                        Düzenle
                      </button>
                      <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

