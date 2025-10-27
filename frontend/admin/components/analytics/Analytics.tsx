'use client'

import { motion } from 'framer-motion'

export default function Analytics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-6"
    >
      <h1 className="text-2xl font-bold text-ios-gray-900">Analytics</h1>
      <p className="text-ios-gray-600 mt-1">View detailed analytics and insights</p>
      <div className="mt-8 text-center py-20">
        <p className="text-ios-gray-500">Analytics component - Coming soon</p>
      </div>
    </motion.div>
  )
}

