'use client'

import { motion } from 'framer-motion'
import { Download, Eye, RefreshCw, Truck, FileText } from 'lucide-react'

const orders = [
  { id: '1', orderNumber: 'ORD-251020-ABC', date: '2025-10-20', total: 124560, status: 'Kargoya Verildi', items: 45, tracking: 'TR123456789', payment: 'Net 30', dueDate: '2025-11-19' },
  { id: '2', orderNumber: 'ORD-251015-XYZ', date: '2025-10-15', total: 89430, status: 'Teslim Edildi', items: 32, tracking: 'TR987654321', payment: 'Ödendi', dueDate: null },
  { id: '3', orderNumber: 'ORD-251010-DEF', date: '2025-10-10', total: 156780, status: 'İşleniyor', items: 67, tracking: null, payment: 'Net 30', dueDate: '2025-11-09' },
  { id: '4', orderNumber: 'ORD-251005-GHI', date: '2025-10-05', total: 67890, status: 'Onay Bekliyor', items: 23, tracking: null, payment: 'Net 30', dueDate: '2025-11-04' },
]

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Siparişlerim</h1>
              <p className="text-gray-600 mt-1">{orders.length} sipariş bulundu</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Excel İndir
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold text-sm">Tümü</button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm">Onay Bekliyor</button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm">İşleniyor</button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm">Kargoda</button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm">Tamamlandı</button>
          </div>
        </div>

        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-600">{order.date} • {order.items} ürün</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    order.status === 'Teslim Edildi' ? 'bg-green-100 text-green-700' :
                    order.status === 'Kargoya Verildi' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'İşleniyor' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-6 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Toplam Tutar</p>
                    <p className="text-xl font-bold text-gray-900">₺{order.total.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ödeme</p>
                    <p className={`text-sm font-bold ${order.payment === 'Ödendi' ? 'text-green-600' : 'text-blue-600'}`}>
                      {order.payment}
                    </p>
                  </div>

                  {order.dueDate && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Vade Tarihi</p>
                      <p className="text-sm font-semibold text-gray-900">{order.dueDate}</p>
                    </div>
                  )}

                  {order.tracking && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Kargo Takip</p>
                      <p className="text-sm font-mono text-blue-600">{order.tracking}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Detayları Gör
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Yeniden Sipariş Ver
                  </button>
                  {order.tracking && (
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2 text-gray-700">
                      <Truck className="w-4 h-4" />
                      Kargoyu Takip Et
                    </button>
                  )}
                  {order.payment !== 'Ödendi' && (
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2 text-gray-700">
                      <FileText className="w-4 h-4" />
                      Fatura İndir
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

