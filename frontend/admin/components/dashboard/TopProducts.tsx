'use client'

import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

const products = [
  { name: 'Wireless Headphones', sales: 245, revenue: '₺12,250', growth: '+15%' },
  { name: 'Smart Watch', sales: 189, revenue: '₺9,450', growth: '+22%' },
  { name: 'Laptop Stand', sales: 156, revenue: '₺4,680', growth: '+8%' },
  { name: 'USB-C Cable', sales: 134, revenue: '₺2,680', growth: '+12%' },
  { name: 'Phone Case', sales: 98, revenue: '₺1,960', growth: '+5%' },
]

export default function TopProducts() {
  return (
    <div className="ios-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-ios-gray-900">Top Products</h2>
          <p className="text-sm text-ios-gray-500 mt-1">Best selling items</p>
        </div>
        <TrendingUp className="w-5 h-5 text-ios-green" />
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-ios-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ios-blue to-ios-indigo flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ios-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-ios-gray-500">{product.sales} sales</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-semibold text-ios-gray-900">{product.revenue}</p>
              <p className="text-xs text-ios-green">{product.growth}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

