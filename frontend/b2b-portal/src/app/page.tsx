'use client';

import { useState } from 'react';
import { ShoppingCart, Search, Menu, X, Building2, Users, TrendingUp, Shield, Truck, CreditCard } from 'lucide-react';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function B2BHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ios-gray-50">
      {/* Header */}
      <header className="bg-white shadow-ios border-b border-ios-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-ios bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
                <span className="text-white font-bold text-lg">AT</span>
              </div>
              <span className="ml-2 text-xl font-bold text-ios-gray-900">AyazTrade B2B</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Ana Sayfa</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Ürünler</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Fiyat Listesi</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Siparişlerim</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Hesabım</a>
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-500" />
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  className="pl-10 pr-4 py-2 w-64 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                />
              </div>

              {/* Cart */}
              <button className="relative p-2 rounded-ios hover:bg-ios-gray-100 transition-colors">
                <ShoppingCart className="w-6 h-6 text-ios-gray-700" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-ios-red text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-ios-blue flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span className="hidden md:block text-sm font-medium text-ios-gray-700">Ahmet Yılmaz</span>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-ios-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Ana Sayfa</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Ürünler</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Fiyat Listesi</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Siparişlerim</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Hesabım</a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-ios-blue to-ios-purple text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              B2B Ticaret Platformu
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              İşletmeniz için özel fiyatlar ve toplu alım avantajları
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-ios-blue px-8 py-3 rounded-ios font-semibold hover:bg-gray-100 transition-colors">
                Ürünleri İncele
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-ios font-semibold hover:bg-white hover:text-ios-blue transition-colors">
                Fiyat Listesi
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-ios-gray-900 mb-4">
                B2B Avantajları
              </h2>
              <p className="text-xl text-ios-gray-600">
                İşletmeniz için özel olarak tasarlanmış çözümler
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-6 rounded-ios-lg shadow-ios">
                <div className="w-16 h-16 bg-ios-blue/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-ios-blue" />
                </div>
                <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Kurumsal Fiyatlar</h3>
                <p className="text-ios-gray-600">Toplu alımlarda özel indirimler ve kurumsal fiyatlar</p>
              </div>

              <div className="text-center p-6 rounded-ios-lg shadow-ios">
                <div className="w-16 h-16 bg-ios-green/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-ios-green" />
                </div>
                <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Dedicated Account Manager</h3>
                <p className="text-ios-gray-600">Size özel hesap yöneticisi ile kişisel hizmet</p>
              </div>

              <div className="text-center p-6 rounded-ios-lg shadow-ios">
                <div className="w-16 h-16 bg-ios-purple/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-ios-purple" />
                </div>
                <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Analitik Raporlar</h3>
                <p className="text-ios-gray-600">Detaylı satış ve performans raporları</p>
              </div>

              <div className="text-center p-6 rounded-ios-lg shadow-ios">
                <div className="w-16 h-16 bg-ios-orange/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-ios-orange" />
                </div>
                <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Güvenli Ödeme</h3>
                <p className="text-ios-gray-600">Kurumsal ödeme seçenekleri ve kredi limitleri</p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Categories */}
        <section className="py-20 bg-ios-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-ios-gray-900 mb-4">
                Ürün Kategorileri
              </h2>
              <p className="text-xl text-ios-gray-600">
                Geniş ürün yelpazesi ile ihtiyaçlarınızı karşılayın
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-ios-lg shadow-ios overflow-hidden hover:shadow-ios-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-ios-blue to-ios-indigo flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Elektronik</h3>
                  <p className="text-ios-gray-600 mb-4">Bilgisayar, telefon ve elektronik ürünler</p>
                  <button className="text-ios-blue font-semibold hover:text-blue-600">
                    Ürünleri Gör →
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-ios-lg shadow-ios overflow-hidden hover:shadow-ios-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-ios-green to-ios-teal flex items-center justify-center">
                  <Truck className="w-16 h-16 text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Lojistik</h3>
                  <p className="text-ios-gray-600 mb-4">Nakliye ve lojistik hizmetleri</p>
                  <button className="text-ios-blue font-semibold hover:text-blue-600">
                    Ürünleri Gör →
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-ios-lg shadow-ios overflow-hidden hover:shadow-ios-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-ios-purple to-ios-pink flex items-center justify-center">
                  <CreditCard className="w-16 h-16 text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-ios-gray-900 mb-2">Finansal Hizmetler</h3>
                  <p className="text-ios-gray-600 mb-4">Ödeme ve finansal çözümler</p>
                  <button className="text-ios-blue font-semibold hover:text-blue-600">
                    Ürünleri Gör →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-ios-gray-900 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              B2B Hesabınızı Oluşturun
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Kurumsal avantajlardan yararlanmaya başlayın
            </p>
            <button className="bg-ios-blue text-white px-8 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors">
              Hemen Başla
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-ios-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-ios bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
                  <span className="text-white font-bold">AT</span>
                </div>
                <span className="ml-2 text-lg font-bold text-ios-gray-900">AyazTrade B2B</span>
              </div>
              <p className="text-ios-gray-600">
                İşletmeniz için özel B2B çözümleri
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ios-gray-900 mb-4">Ürünler</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Elektronik</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Lojistik</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Finansal Hizmetler</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Danışmanlık</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ios-gray-900 mb-4">Destek</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Yardım Merkezi</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">API Dokümantasyonu</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">İletişim</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Topluluk</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ios-gray-900 mb-4">Şirket</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Hakkımızda</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Kariyer</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Blog</a></li>
                <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Basın</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-ios-gray-200 mt-8 pt-8 text-center">
            <p className="text-ios-gray-600">
              © 2024 AyazTrade B2B. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}