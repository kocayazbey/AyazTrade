'use client';

import React from 'react';
import { DocumentTextIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function B2BContracts() {
  const contracts = [
    { id: 'CTR-2025-001', company: 'ABC Teknoloji', type: 'Annual Agreement', startDate: '2025-01-01', endDate: '2025-12-31', value: '₺2,500,000', status: 'active', discount: '15%' },
    { id: 'CTR-2025-002', company: 'XYZ Elektronik', type: 'Quarterly Agreement', startDate: '2025-10-01', endDate: '2025-12-31', value: '₺650,000', status: 'active', discount: '10%' },
    { id: 'CTR-2024-045', company: 'Global Perakende', type: 'Annual Agreement', startDate: '2024-12-01', endDate: '2025-11-30', value: '₺1,800,000', status: 'expiring_soon', discount: '12%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">B2B Contracts</h1>
          <p className="text-gray-600">View and manage your business agreements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: DocumentTextIcon, label: 'Active Contracts', value: '2', color: 'green' },
            { icon: ClockIcon, label: 'Expiring Soon', value: '1', color: 'yellow' },
            { icon: CheckCircleIcon, label: 'Total Value', value: '₺5M', color: 'blue' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className={`w-12 h-12 bg-${stat.color}-50 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{contract.company}</h3>
                  <p className="text-gray-600 text-sm">{contract.type} • {contract.id}</p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {contract.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Contract Value</p>
                  <p className="text-xl font-bold text-gray-900">{contract.value}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Discount Rate</p>
                  <p className="text-xl font-bold text-green-600">{contract.discount}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Start Date</p>
                  <p className="text-sm font-medium text-gray-900">{contract.startDate}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">End Date</p>
                  <p className="text-sm font-medium text-gray-900">{contract.endDate}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  View Details
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

