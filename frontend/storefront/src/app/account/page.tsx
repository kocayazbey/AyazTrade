'use client';

import React from 'react';
import { UserIcon, ShoppingBagIcon, HeartIcon, MapPinIcon, CreditCardIcon, BellIcon } from '@heroicons/react/24/outline';

export default function MyAccount() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: UserIcon, title: 'Profile', description: 'Manage your personal information', link: '/account/profile', color: 'blue' },
            { icon: ShoppingBagIcon, title: 'Orders', description: 'View your order history', link: '/account/orders', color: 'green' },
            { icon: HeartIcon, title: 'Wishlist', description: 'Saved items', link: '/wishlist', color: 'red' },
            { icon: MapPinIcon, title: 'Addresses', description: 'Manage shipping addresses', link: '/account/addresses', color: 'purple' },
            { icon: CreditCardIcon, title: 'Payment Methods', description: 'Saved payment options', link: '/account/payments', color: 'yellow' },
            { icon: BellIcon, title: 'Notifications', description: 'Notification preferences', link: '/account/notifications', color: 'indigo' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className={`w-14 h-14 bg-${item.color}-50 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 text-${item.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: 'Order placed', detail: 'Order #ORD-12345', time: '2 hours ago' },
              { action: 'Review submitted', detail: 'Product A - 5 stars', time: '1 day ago' },
              { action: 'Wishlist updated', detail: 'Added 3 items', time: '2 days ago' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.detail}</p>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

