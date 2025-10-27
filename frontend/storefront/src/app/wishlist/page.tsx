'use client';

import React from 'react';
import { HeartIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Wishlist() {
  const wishlistItems = [
    { id: '1', name: 'Premium Product A', price: '₺1,299', image: '🎁', rating: 4.8, stock: 'In Stock' },
    { id: '2', name: 'Deluxe Product B', price: '₺899', image: '📦', rating: 4.6, stock: 'Low Stock' },
    { id: '3', name: 'Standard Product C', price: '₺599', image: '🎨', rating: 4.5, stock: 'In Stock' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">{wishlistItems.length} items saved for later</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border p-6 relative group">
              <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-600 hover:text-red-600" />
              </button>

              <div className="text-6xl mb-4 text-center">{item.image}</div>
              
              <h3 className="font-bold text-gray-900 mb-2">{item.name}</h3>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < Math.floor(item.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">{item.rating}</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-2xl font-bold text-blue-600">{item.price}</p>
                <span className={`text-sm font-medium ${
                  item.stock === 'In Stock' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {item.stock}
                </span>
              </div>

              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                <ShoppingCartIcon className="w-5 h-5" />
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

