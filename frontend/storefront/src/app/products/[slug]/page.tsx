'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus } from 'lucide-react';
import Image from 'next/image';

export default function ProductDetail() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock product data - replace with actual API call
    const mockProduct = {
      id: '1',
      name: 'MacBook Pro 14"',
      slug: 'macbook-pro-14',
      sku: 'MBP-14-001',
      price: 35999,
      salePrice: 32999,
      description: 'Powerful laptop for professionals with M2 chip',
      longDescription: 'The MacBook Pro 14-inch features the powerful M2 chip, delivering exceptional performance for professional workflows. With its stunning Liquid Retina XDR display, advanced camera system, and all-day battery life, it\'s the perfect tool for creators and professionals.',
      images: [
        'https://via.placeholder.com/800x600/007AFF/FFFFFF?text=MacBook+Pro+14+Front',
        'https://via.placeholder.com/800x600/007AFF/FFFFFF?text=MacBook+Pro+14+Side',
        'https://via.placeholder.com/800x600/007AFF/FFFFFF?text=MacBook+Pro+14+Back',
        'https://via.placeholder.com/800x600/007AFF/FFFFFF?text=MacBook+Pro+14+Open'
      ],
      category: {
        id: '1',
        name: 'Laptops',
        slug: 'laptops'
      },
      stock: 15,
      status: 'active',
      featured: true,
      rating: 4.8,
      reviewCount: 124,
      tags: ['laptop', 'apple', 'professional'],
      specifications: {
        processor: 'Apple M2',
        memory: '16GB',
        storage: '512GB SSD',
        display: '14-inch Liquid Retina XDR',
        graphics: '10-core GPU',
        battery: 'Up to 17 hours',
        weight: '1.6 kg',
        color: 'Space Gray'
      },
      features: [
        'M2 chip with 8-core CPU',
        '16GB unified memory',
        '512GB SSD storage',
        '14-inch Liquid Retina XDR display',
        'Advanced camera system',
        'All-day battery life'
      ],
      reviews: [
        {
          id: '1',
          userName: 'Ahmet Yılmaz',
          rating: 5,
          title: 'Mükemmel performans!',
          comment: 'Çok hızlı ve güçlü bir laptop. Tüm işlerimi rahatlıkla yapabiliyorum.',
          date: '2024-01-15',
          verified: true
        },
        {
          id: '2',
          userName: 'Fatma Demir',
          rating: 4,
          title: 'İyi ürün',
          comment: 'Genel olarak memnunum, fiyat biraz yüksek ama kalite çok iyi.',
          date: '2024-01-10',
          verified: true
        }
      ]
    };

    setProduct(mockProduct);
    setLoading(false);
  }, [params.slug]);

  const handleAddToCart = () => {
    // Add to cart logic
    console.log('Added to cart:', { productId: product.id, quantity });
  };

  const handleAddToWishlist = () => {
    // Add to wishlist logic
    console.log('Added to wishlist:', product.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ios-gray-900 mb-2">Ürün Bulunamadı</h1>
          <p className="text-ios-gray-600">Aradığınız ürün mevcut değil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ios-gray-50">
      {/* Header */}
      <header className="bg-white shadow-ios border-b border-ios-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-ios bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
                <span className="text-white font-bold text-lg">AT</span>
              </div>
              <span className="ml-2 text-xl font-bold text-ios-gray-900">AyazTrade</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 rounded-ios hover:bg-ios-gray-100 transition-colors">
                <ShoppingCart className="w-6 h-6 text-ios-gray-700" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-ios-red text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-ios-gray-600 mb-8">
          <a href="/" className="hover:text-ios-blue">Ana Sayfa</a>
          <span>/</span>
          <a href="/categories" className="hover:text-ios-blue">Kategoriler</a>
          <span>/</span>
          <a href={`/categories/${product.category.slug}`} className="hover:text-ios-blue">{product.category.name}</a>
          <span>/</span>
          <span className="text-ios-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-ios-lg overflow-hidden bg-white shadow-ios">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-ios overflow-hidden border-2 ${
                    selectedImage === index ? 'border-ios-blue' : 'border-ios-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-ios-gray-900 mb-2">{product.name}</h1>
              <p className="text-ios-gray-600 mb-4">{product.description}</p>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating) ? 'text-ios-yellow fill-current' : 'text-ios-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-ios-gray-600">
                    {product.rating} ({product.reviewCount} değerlendirme)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <span className="text-3xl font-bold text-ios-gray-900">
                  ₺{product.salePrice ? product.salePrice.toLocaleString('tr-TR') : product.price.toLocaleString('tr-TR')}
                </span>
                {product.salePrice && (
                  <span className="text-xl text-ios-gray-500 line-through">
                    ₺{product.price.toLocaleString('tr-TR')}
                  </span>
                )}
                {product.salePrice && (
                  <span className="bg-ios-red text-white px-2 py-1 rounded-ios text-sm font-semibold">
                    %{Math.round(((product.price - product.salePrice) / product.price) * 100)} İndirim
                  </span>
                )}
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-ios-gray-700">Adet:</span>
                <div className="flex items-center border border-ios-gray-300 rounded-ios">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-ios-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-2 hover:bg-ios-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-ios-gray-600">
                  {product.stock} adet stokta
                </span>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-ios-blue text-white px-6 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Sepete Ekle</span>
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className="p-3 border border-ios-gray-300 rounded-ios hover:bg-ios-gray-100 transition-colors"
                >
                  <Heart className="w-5 h-5 text-ios-gray-700" />
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ios-gray-900">Özellikler</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-ios-green rounded-full"></div>
                    <span className="text-ios-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shipping Info */}
            <div className="bg-ios-gray-50 rounded-ios p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-ios-blue" />
                <span className="text-sm font-medium text-ios-gray-900">Ücretsiz Kargo</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-ios-green" />
                <span className="text-sm font-medium text-ios-gray-900">Güvenli Ödeme</span>
              </div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-ios-orange" />
                <span className="text-sm font-medium text-ios-gray-900">14 Gün İade Garantisi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <div className="border-b border-ios-gray-200">
            <nav className="flex space-x-8">
              <button className="py-4 px-1 border-b-2 border-ios-blue text-ios-blue font-medium">
                Ürün Detayları
              </button>
              <button className="py-4 px-1 border-b-2 border-transparent text-ios-gray-500 hover:text-ios-gray-700">
                Özellikler
              </button>
              <button className="py-4 px-1 border-b-2 border-transparent text-ios-gray-500 hover:text-ios-gray-700">
                Değerlendirmeler ({product.reviewCount})
              </button>
            </nav>
          </div>

          <div className="py-8">
            <div className="prose max-w-none">
              <p className="text-ios-gray-700 leading-relaxed">{product.longDescription}</p>
            </div>

            {/* Specifications */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">Teknik Özellikler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-ios-gray-100">
                    <span className="font-medium text-ios-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-ios-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}