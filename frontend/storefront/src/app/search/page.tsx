'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SlidersHorizontal, Grid, List, ChevronDown } from 'lucide-react'

export default function SearchPage({ searchParams }) {
  const [query] = useState(searchParams?.q || '')
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    priceRange: [0, 10000],
    rating: 0,
    inStock: false,
  })
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [query, filters, sort])

  const fetchResults = async () => {
    setTimeout(() => {
      setProducts([
        { id: '1', name: 'Premium Laptop', price: 35999, image: 'https://via.placeholder.com/300', rating: 4.5, reviews: 120, stock: 15 },
        { id: '2', name: 'Wireless Mouse', price: 299, image: 'https://via.placeholder.com/300', rating: 4.8, reviews: 340, stock: 45 },
        { id: '3', name: 'Mechanical Keyboard', price: 1299, image: 'https://via.placeholder.com/300', rating: 4.6, reviews: 89, stock: 22 },
        { id: '4', name: 'Gaming Headset', price: 899, image: 'https://via.placeholder.com/300', rating: 4.3, reviews: 156, stock: 8 },
        { id: '5', name: 'Monitor 27"', price: 5999, image: 'https://via.placeholder.com/300', rating: 4.7, reviews: 201, stock: 12 },
        { id: '6', name: 'USB-C Hub', price: 599, image: 'https://via.placeholder.com/300', rating: 4.4, reviews: 67, stock: 31 },
      ])
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            "{query}" için sonuçlar
          </h1>
          <p className="text-gray-600 mt-1">{products.length} ürün bulundu</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className="w-64 flex-shrink-0"
              >
                <div className="bg-white rounded-xl p-6 sticky top-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-gray-900">Filtreler</h2>
                    <button className="text-blue-600 text-sm font-semibold">Temizle</button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <button className="w-full flex items-center justify-between py-2 font-semibold text-gray-900">
                        <span>Kategoriler</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <div className="mt-2 space-y-2">
                        {['Elektronik', 'Bilgisayar', 'Aksesuarlar', 'Oyun'].map((cat) => (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                            <span className="text-sm text-gray-700">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <button className="w-full flex items-center justify-between py-2 font-semibold text-gray-900">
                        <span>Markalar</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <div className="mt-2 space-y-2">
                        {['Asus', 'Dell', 'Lenovo', 'HP'].map((brand) => (
                          <label key={brand} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                            <span className="text-sm text-gray-700">{brand}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="font-semibold text-gray-900 mb-3">Fiyat Aralığı</p>
                      <input type="range" min="0" max="10000" className="w-full" />
                      <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>₺0</span>
                        <span>₺10,000</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="font-semibold text-gray-900 mb-3">Değerlendirme</p>
                      <div className="space-y-2">
                        {[5, 4, 3].map((rating) => (
                          <label key={rating} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                            <span className="text-sm text-gray-700">{rating} yıldız ve üzeri</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">Sadece stokta olanlar</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex-1">
            <div className="bg-white rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-medium">Filtreler</span>
                </button>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                >
                  <option value="relevance">En Uygun</option>
                  <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
                  <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
                  <option value="rating">En Yüksek Puan</option>
                  <option value="sales">En Çok Satan</option>
                  <option value="newest">En Yeni</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={view === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all cursor-pointer ${
                    view === 'list' ? 'flex' : ''
                  }`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className={view === 'grid' ? 'w-full h-48 object-cover' : 'w-32 h-32 object-cover'}
                  />
                  <div className="p-4 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-semibold">{product.rating}</span>
                      <span className="text-sm text-gray-500">({product.reviews})</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">₺{product.price.toLocaleString()}</p>
                        <p className="text-xs text-green-600">{product.stock} stokta</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm">
                        Sepete Ekle
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`w-10 h-10 rounded-lg font-semibold ${
                    page === 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

