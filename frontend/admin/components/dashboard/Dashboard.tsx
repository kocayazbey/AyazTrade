'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react'
import StatsCard from './StatsCard'
import SalesChart from './SalesChart'
import RecentOrders from './RecentOrders'
import TopProducts from './TopProducts'

const stats = [
  {
    title: 'Total Revenue',
    value: '₺125,430',
    change: '+12.5%',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'green' as const,
  },
  {
    title: 'Orders',
    value: '1,234',
    change: '+8.2%',
    trend: 'up' as const,
    icon: ShoppingCart,
    color: 'blue' as const,
  },
  {
    title: 'Customers',
    value: '8,456',
    change: '+23.1%',
    trend: 'up' as const,
    icon: Users,
    color: 'purple' as const,
  },
  {
    title: 'Products',
    value: '456',
    change: '-2.4%',
    trend: 'down' as const,
    icon: Package,
    color: 'orange' as const,
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-6"
      >
        <h1 className="text-2xl font-bold text-ios-gray-900">Welcome back, Admin! 👋</h1>
        <p className="text-ios-gray-600 mt-1">Here's what's happening with your store today.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, index) => (
          <motion.div key={index} variants={item}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <SalesChart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <TopProducts />
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <RecentOrders />
      </motion.div>
    </div>
  )
}

