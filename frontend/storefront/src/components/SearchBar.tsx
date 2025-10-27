'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, TrendingUp, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [recentSearches] = useState(['laptop', 'telefon', 'kulaklık'])
  const [popularSearches] = useState(['elektronik', 'telefon', 'laptop', 'mouse', 'klavye'])
  const inputRef = useRef(null)

  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true)
      fetchSuggestions()
    } else {
      setIsOpen(false)
      setSuggestions([])
      setProducts([])
    }
  }, [query])

  const fetchSuggestions = async () => {
    setLoading(true)
    setTimeout(() => {
      setSuggestions([
        'laptop asus',
        'laptop dell',
        'laptop lenovo',
        'laptop gaming',
      ])
      setProducts([
        { id: '1', name: 'Asus ROG Gaming Laptop', price: 45999, image: 'https://via.placeholder.com/80', sku: 'LAPTOP-001' },
        { id: '2', name: 'Dell XPS 15', price: 35999, image: 'https://via.placeholder.com/80', sku: 'LAPTOP-002' },
      ])
      setLoading(false)
    }, 200)
  }

  const handleSearch = (searchQuery: string) => {
    console.log('Searching for:', searchQuery)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
          placeholder="Ürün ara... (SKU, isim, açıklama, özellik)"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
          >
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-4">Aranıyor...</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {query.length < 2 && (
                  <>
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">Son Aramalar</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-semibold">Popüler Aramalar</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {query.length >= 2 && suggestions.length > 0 && (
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 px-3 py-2">ÖNERİLER</p>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSearch(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}

                {query.length >= 2 && products.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-500 px-3 py-2">ÜRÜNLER</p>
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => console.log('Product clicked:', product.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                          </div>
                          <p className="font-bold text-blue-600">₺{product.price.toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {query.length >= 2 && !loading && suggestions.length === 0 && products.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-gray-600">"{query}" için sonuç bulunamadı</p>
                    <p className="text-sm text-gray-500 mt-2">Farklı bir anahtar kelime deneyin</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

