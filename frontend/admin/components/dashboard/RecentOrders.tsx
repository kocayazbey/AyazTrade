'use client'

import { motion } from 'framer-motion'
import { Eye, Download } from 'lucide-react'

const orders = [
  { id: '#ORD-2024-001', customer: 'John Doe', amount: '₺1,250', status: 'Delivered', date: '2024-01-15' },
  { id: '#ORD-2024-002', customer: 'Jane Smith', amount: '₺890', status: 'Processing', date: '2024-01-15' },
  { id: '#ORD-2024-003', customer: 'Bob Johnson', amount: '₺2,340', status: 'Shipped', date: '2024-01-14' },
  { id: '#ORD-2024-004', customer: 'Alice Brown', amount: '₺675', status: 'Pending', date: '2024-01-14' },
  { id: '#ORD-2024-005', customer: 'Charlie Wilson', amount: '₺1,890', status: 'Delivered', date: '2024-01-13' },
]

const statusColors = {
  Delivered: 'bg-ios-green text-white',
  Processing: 'bg-ios-blue text-white',
  Shipped: 'bg-ios-orange text-white',
  Pending: 'bg-ios-gray-200 text-ios-gray-700',
}

export default function RecentOrders() {
  return (
    <div className="ios-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-ios-gray-900">Recent Orders</h2>
          <p className="text-sm text-ios-gray-500 mt-1">Latest customer orders</p>
        </div>
        <button className="ios-button-secondary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ios-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Order ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Customer</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-ios-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-ios-gray-100 hover:bg-ios-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <span className="text-sm font-medium text-ios-blue">{order.id}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-ios-gray-900">{order.customer}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm font-semibold text-ios-gray-900">{order.amount}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`ios-badge ${statusColors[order.status as keyof typeof statusColors]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-ios-gray-600">{order.date}</span>
                </td>
                <td className="py-4 px-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg hover:bg-ios-blue hover:text-white text-ios-gray-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

