'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  Mail,
  Layout,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Mail, label: 'Email Templates', href: '/emails' },
  { icon: Layout, label: 'Page Builder', href: '/builder' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-ios-gray-200 flex flex-col">
      <div className="p-6 border-b border-ios-gray-200">
        <h1 className="text-lg font-bold text-ios-gray-900">AyazComm</h1>
        <p className="text-sm text-ios-gray-600">Admin Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-ios-blue text-white shadow-lg'
                  : 'text-ios-gray-700 hover:bg-ios-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-ios-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-ios-blue/10 flex items-center justify-center">
            <span className="text-ios-blue font-bold">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ios-gray-900 truncate">Admin User</p>
            <p className="text-xs text-ios-gray-500">admin@ayazcomm.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
