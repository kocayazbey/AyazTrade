'use client';

import React from 'react';
import { TagIcon, PercentBadgeIcon } from '@heroicons/react/24/outline';

export default function PricingTiers() {
  const tiers = [
    { name: 'Bronze', minOrder: '₺10,000', discount: '5%', products: 450, color: 'amber' },
    { name: 'Silver', minOrder: '₺50,000', discount: '10%', products: 520, color: 'gray' },
    { name: 'Gold', minOrder: '₺100,000', discount: '15%', products: 600, color: 'yellow' },
    { name: 'Platinum', minOrder: '₺250,000', discount: '20%', products: 650, color: 'purple' },
  ];

  const currentTier = 'Gold';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing Tiers</h1>
          <p className="text-gray-600">Your current tier: <span className="font-bold text-yellow-600">{currentTier}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div 
              key={tier.name} 
              className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${
                tier.name === currentTier ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <TagIcon className={`w-6 h-6 text-${tier.color}-600`} />
                <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-gray-600 text-sm">Minimum Order</p>
                  <p className="text-xl font-bold text-gray-900">{tier.minOrder}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Discount</p>
                  <p className="text-2xl font-bold text-green-600">{tier.discount}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Available Products</p>
                  <p className="text-xl font-bold text-gray-900">{tier.products}</p>
                </div>
              </div>

              {tier.name === currentTier && (
                <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-xl text-center text-sm font-medium">
                  Current Tier
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Purchase History</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-sm mb-1">Total Purchases (This Year)</p>
              <p className="text-3xl font-bold text-gray-900">₺145,000</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-sm mb-1">Total Savings</p>
              <p className="text-3xl font-bold text-green-600">₺21,750</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-sm mb-1">Next Tier Progress</p>
              <p className="text-3xl font-bold text-blue-600">58%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

