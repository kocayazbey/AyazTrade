'use client';

import { TrendingUp, ShoppingCart, Users, DollarSign, Package, ArrowUp } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { 
      label: 'Toplam Satış', 
      value: '₺284,500', 
      change: '+12.5%', 
      icon: DollarSign,
      color: 'ios-green'
    },
    { 
      label: 'Siparişler', 
      value: '1,248', 
      change: '+8.2%', 
      icon: ShoppingCart,
      color: 'ios-blue'
    },
    { 
      label: 'Müşteriler', 
      value: '847', 
      change: '+23.1%', 
      icon: Users,
      color: 'ios-purple'
    },
    { 
      label: 'Ürünler', 
      value: '3,452', 
      change: '+5.4%', 
      icon: Package,
      color: 'ios-orange'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ios-gray-900">Dashboard</h1>
        <p className="text-ios-gray-600 mt-1">Hoş geldiniz! İşte bugünün özeti.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="ios-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-ios bg-${stat.color}/10`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-ios-green">
                <ArrowUp className="w-4 h-4" />
                {stat.change}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-ios-gray-900">{stat.value}</h3>
            <p className="text-sm text-ios-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="ios-card p-6">
        <h2 className="text-xl font-bold text-ios-gray-900 mb-4">Son Aktiviteler</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-ios hover:bg-ios-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-ios-blue/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-ios-blue" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ios-gray-900">Yeni sipariş alındı</p>
                <p className="text-xs text-ios-gray-500">{i} dakika önce</p>
              </div>
              <span className="text-sm font-semibold text-ios-gray-900">
                ₺{(Math.random() * 1000).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

