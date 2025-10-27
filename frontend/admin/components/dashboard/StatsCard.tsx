'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: LucideIcon
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

const colorMap = {
  green: 'from-ios-green to-emerald-500',
  blue: 'from-ios-blue to-blue-600',
  purple: 'from-ios-purple to-purple-600',
  orange: 'from-ios-orange to-orange-600',
  red: 'from-ios-red to-red-600',
}

export default function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="ios-card p-6 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-ios-gray-600">{title}</p>
          <h3 className="text-2xl font-bold text-ios-gray-900 mt-2">{value}</h3>
          
          <div className="flex items-center mt-3">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-ios-green mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-ios-red mr-1" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-ios-green' : 'text-ios-red'}`}>
              {change}
            </span>
            <span className="text-sm text-ios-gray-500 ml-1">vs last month</span>
          </div>
        </div>

        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className={`w-12 h-12 rounded-ios bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-ios`}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    </motion.div>
  )
}

