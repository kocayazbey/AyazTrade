'use client'

import { useState } from 'react'
import { Menu, Search, Bell, Sun, Moon, Settings as SettingsIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(3)

  return (
    <header className="h-16 bg-white border-b border-ios-gray-100 flex items-center justify-between px-6 shadow-ios">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
          <input
            type="text"
            placeholder="Search products, orders, customers..."
            className="pl-10 pr-4 py-2 w-96 rounded-ios bg-ios-gray-50 border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue focus:ring-opacity-20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors relative"
        >
          <AnimatePresence mode="wait">
            {darkMode ? (
              <motion.div
                key="moon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="w-5 h-5 text-ios-gray-700" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun className="w-5 h-5 text-ios-gray-700" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors relative"
        >
          <Bell className="w-5 h-5 text-ios-gray-700" />
          {notifications > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-2 h-2 bg-ios-red rounded-full"
            />
          )}
        </motion.button>

        {/* Settings */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
        >
          <SettingsIcon className="w-5 h-5 text-ios-gray-700" />
        </motion.button>

        {/* Quick Stats */}
        <div className="flex items-center space-x-2 pl-4 border-l border-ios-gray-200">
          <div className="text-right">
            <p className="text-xs text-ios-gray-500">Today's Sales</p>
            <p className="text-sm font-semibold text-ios-green">₺24,580</p>
          </div>
        </div>
      </div>
    </header>
  )
}

