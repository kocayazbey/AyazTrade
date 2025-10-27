'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  List,
  Upload,
  FileText,
  CreditCard,
  Megaphone,
  BarChart3,
  Settings,
  Users,
  Heart,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  requiredPermission?: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    requiredPermission: 'dashboard:read'
  },
  {
    icon: ShoppingCart,
    label: 'Hızlı Sipariş',
    href: '/quick-order',
    requiredPermission: 'orders:create'
  },
  {
    icon: Upload,
    label: 'Toplu Sipariş',
    href: '/bulk-order',
    requiredPermission: 'orders:bulk_create',
    roles: ['wholesale', 'b2b']
  },
  {
    icon: Heart,
    label: 'Favoriler',
    href: '/favorites',
    requiredPermission: 'products:read'
  },
  {
    icon: List,
    label: 'Alışveriş Listeleri',
    href: '/shopping-lists',
    requiredPermission: 'products:read'
  },
  {
    icon: Package,
    label: 'Siparişlerim',
    href: '/orders',
    requiredPermission: 'orders:read'
  },
  {
    icon: FileText,
    label: 'Teklifler',
    href: '/quotes',
    requiredPermission: 'quotes:read'
  },
  {
    icon: CreditCard,
    label: 'Faturalar',
    href: '/invoices',
    requiredPermission: 'invoices:read'
  },
  {
    icon: Megaphone,
    label: 'Kampanyalar',
    href: '/campaigns',
    requiredPermission: 'campaigns:read'
  },
  {
    icon: BarChart3,
    label: 'Raporlar',
    href: '/reports',
    requiredPermission: 'reports:read'
  },
  {
    icon: Users,
    label: 'Kullanıcılar',
    href: '/users',
    requiredPermission: 'users:manage',
    roles: ['b2b']
  },
  {
    icon: Settings,
    label: 'Ayarlar',
    href: '/settings',
    requiredPermission: 'settings:read'
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, hasPermission, logout } = useAuth()

  // Filter menu items based on user permissions and role
  const filteredMenuItems = menuItems.filter((item) => {
    // If no user, only show basic items
    if (!user) {
      return ['/', '/quick-order', '/favorites', '/orders'].includes(item.href)
    }

    // Check role-based access
    if (item.roles && !item.roles.includes(user.customerType)) {
      return false
    }

    // Check permission-based access
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission)
    }

    return true
  })

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">AyazComm</h1>
        <p className="text-sm text-gray-600">B2B Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        {user && (
          <div className="bg-blue-50 rounded-xl p-4 mb-3">
            <p className="text-xs text-blue-600 font-semibold mb-1">Kredi Limiti</p>
            <p className="text-lg font-bold text-blue-900">₺125,000</p>
            <p className="text-xs text-blue-600 mt-1">/ ₺200,000</p>
            <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: '62.5%' }}></div>
            </div>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user.companyName || `${user.firstName} ${user.lastName}`}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}

