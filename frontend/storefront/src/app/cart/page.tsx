'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock cart data - replace with actual API call
    const mockCart = {
      id: 'cart_1',
      userId: 'user1',
      items: [
        {
          id: '1',
          productId: '1',
          productName: 'MacBook Pro 14"',
          productImage: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=MBP',
          sku: 'MBP-14-001',
          price: 35999,
          salePrice: 32999,
          quantity: 1,
          totalPrice: 32999,
          addedAt: new Date().toISOString()
        },
        {
          id: '2',
          productId: '2',
          productName: 'iPhone 15 Pro',
          productImage: 'https://via.placeholder.com/100x100/FF3B30/FFFFFF?text=iPhone',
          sku: 'IPH-15-PRO-001',
          price: 45999,
          salePrice: null,
          quantity: 2,
          totalPrice: 91998,
          addedAt: new Date().toISOString()
        },
        {
          id: '3',
          productId: '3',
          productName: 'Samsung Galaxy S24 Ultra',
          productImage: 'https://via.placeholder.com/100x100/34C759/FFFFFF?text=Galaxy',
          sku: 'SGS-24-ULTRA-001',
          price: 39999,
          salePrice: 36999,
          quantity: 1,
          totalPrice: 36999,
          addedAt: new Date().toISOString()
        }
      ],
      subtotal: 161996,
      shippingCost: 0,
      taxAmount: 29159.28,
      discountAmount: 0,
      totalAmount: 191155.28,
      itemCount: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCart(mockCart);
    setLoading(false);
  }, []);

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity, totalPrice: (item.salePrice || item.price) * newQuantity } : item
      )
    }));
  };

  const removeItem = (itemId) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.id !== itemId)
    }));
  };

  const clearCart = () => {
    setCart(prevCart => ({
      ...prevCart,
      items: []
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
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
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingCart className="w-24 h-24 text-ios-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-ios-gray-900 mb-4">Sepetiniz Boş</h1>
            <p className="text-ios-gray-600 mb-8">Henüz sepetinize ürün eklemediniz.</p>
            <Link
              href="/"
              className="bg-ios-blue text-white px-8 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Alışverişe Devam Et</span>
            </Link>
          </div>
        </main>
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
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-ios-red text-white text-xs rounded-full flex items-center justify-center">
                  {cart.itemCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-ios-gray-600 mb-8">
          <Link href="/" className="hover:text-ios-blue">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-ios-gray-900">Sepet</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-ios-lg shadow-ios overflow-hidden">
              <div className="px-6 py-4 border-b border-ios-gray-200">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-ios-gray-900">Sepetim ({cart.itemCount} ürün)</h1>
                  <button
                    onClick={clearCart}
                    className="text-ios-red hover:text-red-700 text-sm font-medium"
                  >
                    Sepeti Temizle
                  </button>
                </div>
              </div>

              <div className="divide-y divide-ios-gray-200">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-20 h-20 rounded-ios object-cover"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-ios-gray-900 truncate">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-ios-gray-600">SKU: {item.sku}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-lg font-bold text-ios-gray-900">
                            ₺{(item.salePrice || item.price).toLocaleString('tr-TR')}
                          </span>
                          {item.salePrice && (
                            <span className="text-sm text-ios-gray-500 line-through">
                              ₺{item.price.toLocaleString('tr-TR')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center border border-ios-gray-300 rounded-ios">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-ios-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 min-w-[60px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-ios-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-ios-gray-900">
                            ₺{item.totalPrice.toLocaleString('tr-TR')}
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-ios-red hover:bg-red-50 rounded-ios transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-ios-lg shadow-ios p-6 sticky top-8">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Sipariş Özeti</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-ios-gray-600">Ara Toplam</span>
                  <span className="font-medium">₺{cart.subtotal.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ios-gray-600">Kargo</span>
                  <span className="font-medium text-ios-green">Ücretsiz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ios-gray-600">KDV</span>
                  <span className="font-medium">₺{cart.taxAmount.toLocaleString('tr-TR')}</span>
                </div>
                {cart.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ios-gray-600">İndirim</span>
                    <span className="font-medium text-ios-green">-₺{cart.discountAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-ios-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-ios-gray-900">Toplam</span>
                  <span className="text-2xl font-bold text-ios-blue">₺{cart.totalAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-ios-blue text-white px-6 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 mb-4"
              >
                <CreditCard className="w-5 h-5" />
                <span>Ödemeye Geç</span>
              </Link>

              <Link
                href="/"
                className="w-full border border-ios-gray-300 text-ios-gray-700 px-6 py-3 rounded-ios font-semibold hover:bg-ios-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Alışverişe Devam Et</span>
              </Link>

              <div className="mt-6 text-xs text-ios-gray-500">
                <p>• Güvenli ödeme garantisi</p>
                <p>• 14 gün iade garantisi</p>
                <p>• Ücretsiz kargo</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}