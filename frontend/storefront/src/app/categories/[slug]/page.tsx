'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Grid, List, SlidersHorizontal } from 'lucide-react'

const products = [
  { id: '1', name: 'Premium Laptop', price: 35999, image: 'https://via.placeholder.com/300', slug: 'premium-laptop' },
  { id: '2', name: 'Wireless Mouse', price: 299, image: 'https://via.placeholder.com/300', slug: 'wireless-mouse' },
  { id: '3', name: 'USB-C Hub', price: 599, image: 'https://via.placeholder.com/300', slug: 'usb-c-hub' },
  { id: '4', name: 'Mechanical Keyboard', price: 1299, image: 'https://via.placeholder.com/300', slug: 'mechanical-keyboard' },
]

export default function CategoryPage() {
  const params = useParams()
  const categoryName = (params?.slug as string || '').replace(/-/g, ' ')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">{categoryName}</h1>
            <p className="text-gray-600 mt-1">{products.length} ürün bulundu</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Filtrele
            </button>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Grid className="w-5 h-5" />
            </button>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-xl font-bold text-blue-600">₺{product.price.toLocaleString()}</p>
                  <button className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                    Sepete Ekle
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

