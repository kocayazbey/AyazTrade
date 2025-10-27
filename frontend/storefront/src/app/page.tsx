'use client';

import { useState, Suspense, lazy } from 'react';
import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const HeroSection = lazy(() => import('../components/HeroSection'));
const FeaturesSection = lazy(() => import('../components/FeaturesSection'));
const CTASection = lazy(() => import('../components/CTASection'));
const Footer = lazy(() => import('../components/Footer'));
const ProductCard = lazy(() => import('../components/ProductCard'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue"></div>
  </div>
);

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ios-gray-50">
      {/* Header */}
      <header className="bg-white shadow-ios border-b border-ios-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="AyazTrade Logo"
                width={40}
                height={40}
                className="rounded-ios"
                priority
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
              <span className="ml-2 text-xl font-bold text-ios-gray-900">AyazTrade</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Ana Sayfa</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Ürünler</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Kategoriler</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">Hakkımızda</a>
              <a href="#" className="text-ios-gray-700 hover:text-ios-blue transition-colors">İletişim</a>
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
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Kategoriler</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">Hakkımızda</a>
              <a href="#" className="block px-3 py-2 text-ios-gray-700 hover:text-ios-blue">İletişim</a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section - Lazy Loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <HeroSection />
        </Suspense>

        {/* Features Section - Lazy Loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <FeaturesSection />
        </Suspense>

        {/* CTA Section - Lazy Loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <CTASection />
        </Suspense>
      </main>

      {/* Footer - Lazy Loaded */}
      <Suspense fallback={<div className="h-32 bg-white border-t border-ios-gray-200"></div>}>
        <Footer />
      </Suspense>
    </div>
  );
}