'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
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
  Store,
  Truck,
  CreditCard,
  FileText,
  Star,
  Target,
  TrendingUp,
  Warehouse,
  Building2,
  UserCircle,
  DollarSign,
  Briefcase,
  Calendar,
  MessageSquare,
  Bell,
  Shield,
  GitBranch,
  Globe,
  Zap,
  Package2,
  Tags,
  ShoppingBag,
  LogOut,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  badge?: string;
  roles?: string[];
  section?: string;
  permission?: string;
  children?: MenuItem[];
}

const menuSections = {
  'Ana Menü': [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', permission: 'all' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', permission: 'all' },
    { icon: Bell, label: 'Bildirimler', href: '/notifications', badge: '5', permission: 'all' },
  ],
  'E-Ticaret': [
    { 
      icon: Package, 
      label: 'Ürünler', 
      href: '/products', 
      permission: 'view_products',
      children: [
        { icon: Package, label: 'Tüm Ürünler', href: '/products/all', permission: 'view_products' },
        { icon: Plus, label: 'Ürün Ekle', href: '/products/add', permission: 'add_edit_products' },
        { icon: Tags, label: 'Kategoriler', href: '/products/categories', permission: 'manage_categories' },
        { icon: Star, label: 'Markalar', href: '/products/brands', permission: 'manage_categories' },
      ]
    },
    { 
      icon: ShoppingCart, 
      label: 'Siparişler', 
      href: '/orders', 
      permission: 'view_orders',
      children: [
        { icon: ShoppingCart, label: 'Tüm Siparişler', href: '/orders/all', permission: 'view_orders' },
        { icon: Clock, label: 'Bekleyen Siparişler', href: '/orders/pending', permission: 'view_orders' },
        { icon: CheckCircle, label: 'Tamamlanan Siparişler', href: '/orders/completed', permission: 'view_orders' },
        { icon: XCircle, label: 'İade & İptal', href: '/orders/returns', permission: 'refunds' },
      ]
    },
    { icon: Users, label: 'Müşteriler', href: '/customers', permission: 'all' },
    { icon: Star, label: 'Değerlendirmeler', href: '/reviews', permission: 'all' },
  ],
  'CRM': [
    { icon: Users, label: 'Müşteriler', href: '/customers', permission: 'all' },
    { icon: UserCircle, label: 'Leads', href: '/crm/leads', permission: 'all' },
    { icon: FileText, label: 'Teklifler', href: '/crm/quotes', permission: 'all' },
    { icon: Briefcase, label: 'Sözleşmeler', href: '/crm/contracts', permission: 'all' },
    { icon: Calendar, label: 'Aktiviteler', href: '/crm/activities', permission: 'all' },
  ],
  'Pazarlama': [
    { 
      icon: Megaphone, 
      label: 'Kampanyalar', 
      href: '/marketing/campaigns', 
      permission: 'manage_campaigns',
      children: [
        { icon: Megaphone, label: 'E-posta Kampanyaları', href: '/marketing/email-campaigns', permission: 'manage_campaigns' },
        { icon: Mail, label: 'SMS Kampanyaları', href: '/marketing/sms', permission: 'manage_campaigns' },
        { icon: Target, label: 'Hedef Kitlemler', href: '/marketing/segments', permission: 'manage_campaigns' },
      ]
    },
    { icon: FileText, label: 'İndirimler', href: '/marketing/discounts', permission: 'discounts' },
    { icon: Mail, label: 'Bülten', href: '/marketing/newsletter', permission: 'newsletter' },
    { icon: Mail, label: 'E-posta Şablonları', href: '/emails', permission: 'manage_campaigns' },
  ],
  'Finans': [
    { icon: DollarSign, label: 'Faturalar', href: '/erp/invoices', permission: 'invoices' },
    { icon: CreditCard, label: 'Ödemeler', href: '/erp/payments', permission: 'view_payments' },
    { icon: Building2, label: 'Muhasebe', href: '/erp/accounting', permission: 'invoices' },
    { icon: TrendingUp, label: 'Raporlar', href: '/erp/financial-reports', permission: 'reports' },
  ],
  'Tedarikçiler': [
    { icon: ShoppingBag, label: 'Tedarikçiler', href: '/suppliers', permission: 'all' },
  ],
  'WMS & Lojistik': [
    { icon: Warehouse, label: 'Depo Yönetimi', href: '/wms/warehouse', permission: 'all' },
    { icon: Package2, label: 'Stok Yönetimi', href: '/wms/inventory', permission: 'all' },
    { icon: Truck, label: 'Sevkiyat', href: '/shipping', permission: 'all' },
    { icon: GitBranch, label: 'Transfer', href: '/wms/transfers', permission: 'all' },
  ],
  'İçerik': [
    { icon: FileText, label: 'Sayfalar', href: '/content/pages', permission: 'all' },
    { icon: FileText, label: 'Blog', href: '/content/blogs', permission: 'all' },
    { icon: FileText, label: 'Bannerlar', href: '/content/banners', permission: 'all' },
    { icon: Layout, label: 'Sayfa Düzenleyici', href: '/builder', permission: 'all' },
  ],
  'Sistem': [
    { icon: Settings, label: 'Ayarlar', href: '/settings', permission: 'all' },
    { icon: Shield, label: 'Güvenlik', href: '/security', permission: 'all' },
    { icon: Zap, label: 'Webhook\'ler', href: '/webhooks', permission: 'all' },
    { icon: Globe, label: 'Entegrasyonlar', href: '/integrations', permission: 'all' },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasPermission } = useRole();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemHref: string) => {
    setExpandedItems(prev => 
      prev.includes(itemHref) 
        ? prev.filter(href => href !== itemHref)
        : [...prev, itemHref]
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isActive = pathname === item.href;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const hasAccess = !item.permission || hasPermission(item.permission);

    if (!hasAccess) return null;

    return (
      <div key={item.href}>
        <div className="flex items-center">
          <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-ios transition-all flex-1 ${
              isActive
                ? 'bg-ios-blue text-white shadow-ios-md'
                : 'text-ios-gray-700 hover:bg-ios-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm flex-1">{item.label}</span>
            {'badge' in item && item.badge && (
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-semibold
                ${isActive ? 'bg-white/20 text-white' : 'bg-ios-red text-white'}
              `}>
                {item.badge}
              </span>
            )}
          </Link>
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(item.href)}
              className="p-1 hover:bg-ios-gray-100 rounded-ios"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-white border-r border-ios-gray-200 
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-ios-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-ios bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
              <span className="text-white font-bold text-lg">AT</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-ios-gray-900">AyazTrade</h1>
              <p className="text-xs text-ios-gray-600">Enterprise Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(menuSections).map(([section, items]) => (
            <div key={section}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-ios-gray-500 uppercase tracking-wider">
                {section}
              </h3>
              <div className="space-y-1">
                {items.map((item) => renderMenuItem(item))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-ios-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-ios bg-ios-gray-50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ios-blue to-ios-indigo flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-ios-gray-900 truncate">
                {user?.firstName || 'User'}
              </p>
              <p className="text-xs text-ios-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-ios text-ios-red hover:bg-ios-red/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
}

