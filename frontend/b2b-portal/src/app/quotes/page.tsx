'use client'

import { motion } from 'framer-motion'
import { FileText, Send, Eye, Download, Clock } from 'lucide-react'

const quotes = [
  { id: '1', number: 'QUO-20251020-001', date: '2025-10-20', validUntil: '2025-11-19', amount: 124560, status: 'pending', items: 45 },
  { id: '2', number: 'QUO-20251015-002', date: '2025-10-15', validUntil: '2025-11-14', amount: 89430, status: 'approved', items: 32 },
  { id: '3', number: 'QUO-20251010-003', date: '2025-10-10', validUntil: '2025-11-09', amount: 67890, status: 'rejected', items: 23 },
]

export default function QuotesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tekliflerim</h1>
              <p className="text-gray-600 mt-1">{quotes.length} teklif</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2">
              <Send className="w-5 h-5" />
              Yeni Teklif Talep Et
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {quotes.map((quote, index) => (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{quote.number}</h3>
                    <p className="text-sm text-gray-600">{quote.date} • {quote.items} ürün</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  quote.status === 'approved' ? 'bg-green-100 text-green-700' :
                  quote.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {quote.status === 'approved' ? 'Onaylandı' : quote.status === 'pending' ? 'Bekliyor' : 'Reddedildi'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Tutar</p>
                  <p className="text-xl font-bold text-gray-900">₺{quote.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Geçerlilik</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">{quote.validUntil}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Detayları Gör
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2 text-gray-700">
                  <Download className="w-4 h-4" />
                  PDF İndir
                </button>
                {quote.status === 'approved' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                    Sipariş Ver
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

