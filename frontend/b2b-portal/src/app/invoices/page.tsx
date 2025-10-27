'use client'

import { motion } from 'framer-motion'
import { Download, Mail, CreditCard, AlertCircle } from 'lucide-react'

const invoices = [
  { id: '1', number: 'INV-20251020-001', orderNumber: 'ORD-251020-ABC', date: '2025-10-20', dueDate: '2025-11-19', amount: 124560, status: 'pending', days: 26 },
  { id: '2', number: 'INV-20251015-002', orderNumber: 'ORD-251015-XYZ', date: '2025-10-15', dueDate: '2025-11-14', amount: 89430, status: 'pending', days: 21 },
  { id: '3', number: 'INV-20250928-003', orderNumber: 'ORD-250928-DEF', date: '2025-09-28', dueDate: '2025-10-28', amount: 156780, status: 'paid', paidDate: '2025-10-25' },
  { id: '4', number: 'INV-20250920-004', orderNumber: 'ORD-250920-GHI', date: '2025-09-20', dueDate: '2025-10-20', amount: 67890, status: 'overdue', days: -4 },
]

export default function InvoicesPage() {
  const pendingTotal = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0)
  const overdueTotal = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Faturalarım</h1>
          <p className="text-gray-600 mt-1">Ödeme ve fatura takibi</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6">
            <CreditCard className="w-10 h-10 mb-3 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Bekleyen Ödemeler</p>
            <p className="text-3xl font-bold">₺{pendingTotal.toLocaleString()}</p>
            <p className="text-sm opacity-90 mt-2">{invoices.filter(i => i.status === 'pending').length} fatura</p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl p-6">
            <AlertCircle className="w-10 h-10 mb-3 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Vadesi Geçmiş</p>
            <p className="text-3xl font-bold">₺{overdueTotal.toLocaleString()}</p>
            <p className="text-sm opacity-90 mt-2">{invoices.filter(i => i.status === 'overdue').length} fatura</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-6">
            <Download className="w-10 h-10 mb-3 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Bu Ay Ödenen</p>
            <p className="text-3xl font-bold">₺{invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
            <p className="text-sm opacity-90 mt-2">{invoices.filter(i => i.status === 'paid').length} fatura</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Fatura No</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Sipariş</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tarih</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Vade</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tutar</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Durum</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-mono font-semibold text-gray-900">{invoice.number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{invoice.orderNumber}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{invoice.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{invoice.dueDate || '-'}</p>
                      {invoice.status === 'pending' && invoice.days && (
                        <p className={`text-xs ${invoice.days > 7 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {invoice.days} gün kaldı
                        </p>
                      )}
                      {invoice.status === 'overdue' && (
                        <p className="text-xs text-red-600 font-semibold">
                          {Math.abs(invoice.days)} gün gecikti
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">₺{invoice.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {invoice.status === 'paid' ? 'Ödendi' : invoice.status === 'pending' ? 'Bekliyor' : 'Vadesi Geçti'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Fatura İndir">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Email Gönder">
                        <Mail className="w-4 h-4 text-gray-600" />
                      </button>
                      {invoice.status !== 'paid' && (
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">
                          Öde
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {overdueTotal > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Vadesi Geçmiş Faturalar</h3>
              <p className="text-sm text-red-700 mb-3">
                Toplam ₺{overdueTotal.toLocaleString()} tutarında vadesi geçmiş faturanız bulunmaktadır.
                Lütfen en kısa sürede ödeme yapınız.
              </p>
              <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                Hemen Öde
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

